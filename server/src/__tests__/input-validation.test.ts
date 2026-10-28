import request from "supertest";
import { v4 as uuid } from "uuid";
import { app } from "../app";
import { db } from "../db/connection";

// #66 — validación de entrada al crear/editar sesión y al unirse. Cada caso es una fila
// de la tabla de la tarjeta: antes respondían 201 o 500, ahora 400 (o 413).

const valida = { name: "Asado", hostName: "Ana", items: ["Carbón"] };

function itemsDe(sessionId: string): string[] {
  return (db.prepare("SELECT name FROM items WHERE session_id = ? ORDER BY name").all(sessionId) as { name: string }[]).map(
    (r) => r.name,
  );
}

describe("POST /sessions — validación", () => {
  it.each([
    ["body vacío", {}],
    ["nombre de sesión vacío", { ...valida, name: "" }],
    ["nombre de sesión solo espacios", { ...valida, name: "   " }],
    ["anfitrión de 1 letra", { ...valida, hostName: "A" }],
    ["nombre de sesión de 100.000 caracteres", { ...valida, name: "x".repeat(100_000) }],
    ["anfitrión de 61 caracteres", { ...valida, hostName: "x".repeat(61) }],
    ["items como string suelto", { ...valida, items: "Carbón" }],
    ["items con valores que no son texto", { ...valida, items: [123, null] }],
    ["ítem de 81 caracteres", { ...valida, items: ["x".repeat(81)] }],
  ])("400 con %s", async (_caso, body) => {
    const res = await request(app).post("/sessions").send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual(expect.any(String));
  });

  it("acepta los límites exactos (60 caracteres para nombres, 80 para ítems)", async () => {
    const res = await request(app)
      .post("/sessions")
      .send({ name: "s".repeat(60), hostName: "h".repeat(60), items: ["i".repeat(80)] });
    expect(res.status).toBe(201);
  });

  it("descarta ítems vacíos y recorta espacios en vez de crear filas sin nombre", async () => {
    const res = await request(app)
      .post("/sessions")
      .send({ name: "  Asado  ", hostName: " Ana ", items: ["", "   ", " Carbón ", "Pan"] });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Asado");
    expect(res.body.hostName).toBe("Ana");
    expect(itemsDe(res.body.id)).toEqual(["Carbón", "Pan"]);
  });

  it("sin items crea la sesión con la lista vacía", async () => {
    const res = await request(app).post("/sessions").send({ name: "Asado", hostName: "Ana" });
    expect(res.status).toBe(201);
    expect(itemsDe(res.body.id)).toEqual([]);
  });
});

describe("PATCH /sessions/:sessionId — validación", () => {
  async function crear() {
    const res = await request(app).post("/sessions").send(valida);
    return { sessionId: res.body.id as string, hostId: res.body.hostId as string };
  }

  it.each([
    ["nombre vacío", { name: "" }],
    ["items como string suelto", { items: "Carbón" }],
  ])("400 con %s y no modifica la sesión", async (_caso, cambios) => {
    const { sessionId, hostId } = await crear();
    const res = await request(app).patch(`/sessions/${sessionId}`).send({ participantId: hostId, ...cambios });
    expect(res.status).toBe(400);
    expect(itemsDe(sessionId)).toEqual(["Carbón"]);
  });
});

describe("POST /sessions/:sessionId/participants — validación", () => {
  let sessionId: string;
  beforeAll(async () => {
    sessionId = (await request(app).post("/sessions").send(valida)).body.id;
  });

  it.each([
    ["nombre de 50.000 caracteres", { name: "x".repeat(50_000) }],
    ["nombre numérico", { name: 12345 }],
    ["sin nombre", {}],
    ["nombre de 1 letra", { name: "B" }],
  ])("400 con %s", async (_caso, body) => {
    const res = await request(app).post(`/sessions/${sessionId}/participants`).send(body);
    expect(res.status).toBe(400);
  });

  it("acepta un nombre válido y lo devuelve recortado", async () => {
    const res = await request(app).post(`/sessions/${sessionId}/participants`).send({ name: "  Beto  " });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Beto");
  });
});

describe("errores generales", () => {
  it("un JSON malformado responde 400, no 500", async () => {
    const res = await request(app).post("/sessions").set("Content-Type", "application/json").send('{"name": "Asado",');
    expect(res.status).toBe(400);
  });

  it("un archivo de más de 8 MB responde 413, no 500", async () => {
    const res = await request(app)
      .post(`/items/${uuid()}/ticket-upload`)
      .attach("ticket", Buffer.alloc(8 * 1024 * 1024 + 1), "ticket.jpg");
    expect(res.status).toBe(413);
  });
});
