import request from "supertest";
import { v4 as uuid } from "uuid";
import { app } from "../app";
import { db } from "../db/connection";

// EDT 1.1.2.1 — CRUD de sesiones: actualizar (solo mientras nadie más se unió)
// y cerrar (solo el anfitrión). Ver docs/12-diseno-concurrencia-de-reserva.md
// para el estilo de servicio/tests que este archivo sigue (mismo patrón que
// reservation.test.ts).

function seed() {
  const sessionId = uuid();
  const hostId = uuid();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO sessions (id, name, host_name, created_at, closed_at, share_token) VALUES (?, ?, ?, ?, NULL, ?)`,
  ).run(sessionId, "Asado", "Ana", now, uuid());
  db.prepare(`INSERT INTO participants (id, session_id, name, is_host, joined_at) VALUES (?, ?, ?, 1, ?)`).run(
    hostId,
    sessionId,
    "Ana",
    now,
  );
  return { sessionId, hostId };
}

function joinAsGuest(sessionId: string): string {
  const guestId = uuid();
  db.prepare(`INSERT INTO participants (id, session_id, name, is_host, joined_at) VALUES (?, ?, ?, 0, ?)`).run(
    guestId,
    sessionId,
    "Beto",
    new Date().toISOString(),
  );
  return guestId;
}

describe("GET /sessions/:sessionId", () => {
  it("200 si existe, 404 si no", async () => {
    const { sessionId } = seed();
    const found = await request(app).get(`/sessions/${sessionId}`);
    expect(found.status).toBe(200);
    expect(found.body.id).toBe(sessionId);

    const missing = await request(app).get(`/sessions/${uuid()}`);
    expect(missing.status).toBe(404);
  });
});

describe("PATCH /sessions/:sessionId", () => {
  it("el anfitrión puede renombrar y reemplazar los ítems mientras está solo", async () => {
    const { sessionId, hostId } = seed();

    const res = await request(app)
      .patch(`/sessions/${sessionId}`)
      .send({ participantId: hostId, name: "Asado del sábado", items: ["Carbón", "Carne"] });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Asado del sábado");

    const items = db.prepare("SELECT name FROM items WHERE session_id = ? ORDER BY name").all(sessionId) as {
      name: string;
    }[];
    expect(items.map((i) => i.name)).toEqual(["Carbón", "Carne"]);
  });

  it("403 si quien pide el cambio no es el anfitrión", async () => {
    const { sessionId } = seed();
    const guestId = joinAsGuest(sessionId);

    const res = await request(app).patch(`/sessions/${sessionId}`).send({ participantId: guestId, name: "Otro nombre" });
    expect(res.status).toBe(403);
  });

  it("409 una vez que se unió otro participante además del anfitrión", async () => {
    const { sessionId, hostId } = seed();
    joinAsGuest(sessionId);

    const res = await request(app).patch(`/sessions/${sessionId}`).send({ participantId: hostId, name: "Otro nombre" });
    expect(res.status).toBe(409);
  });

  it("409 si la sesión ya está cerrada", async () => {
    const { sessionId, hostId } = seed();
    await request(app).post(`/sessions/${sessionId}/close`).send({ participantId: hostId });

    const res = await request(app).patch(`/sessions/${sessionId}`).send({ participantId: hostId, name: "Otro nombre" });
    expect(res.status).toBe(409);
  });
});

describe("POST /sessions/:sessionId/close", () => {
  it("el anfitrión cierra la sesión (200, closedAt seteado)", async () => {
    const { sessionId, hostId } = seed();

    const res = await request(app).post(`/sessions/${sessionId}/close`).send({ participantId: hostId });
    expect(res.status).toBe(200);
    expect(res.body.closedAt).not.toBeNull();
  });

  it("403 si quien pide el cierre no es el anfitrión", async () => {
    const { sessionId } = seed();
    const guestId = joinAsGuest(sessionId);

    const res = await request(app).post(`/sessions/${sessionId}/close`).send({ participantId: guestId });
    expect(res.status).toBe(403);
  });

  it("409 en un segundo cierre", async () => {
    const { sessionId, hostId } = seed();
    await request(app).post(`/sessions/${sessionId}/close`).send({ participantId: hostId });

    const res = await request(app).post(`/sessions/${sessionId}/close`).send({ participantId: hostId });
    expect(res.status).toBe(409);
  });

  it("404 si la sesión no existe", async () => {
    const res = await request(app).post(`/sessions/${uuid()}/close`).send({ participantId: uuid() });
    expect(res.status).toBe(404);
  });
});
