import request from "supertest";
import { v4 as uuid } from "uuid";
import { app } from "../app";
import { db } from "../db/connection";

// RF-02 / 1.1.1.2: el nombre ingresado al entrar por el link queda vinculado
// a la sesión correcta y dos usuarios con el mismo nombre quedan diferenciados
// internamente, incluso bajo acceso múltiple/concurrente.

function createSession() {
  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO sessions (id, name, host_name, created_at, closed_at, share_token) VALUES (?, ?, ?, ?, NULL, ?)`,
  ).run(id, "Asado de fin de año", "Ana", now, uuid());
  return id;
}

describe("POST /sessions/:sessionId/participants", () => {
  it("vincula el nombre a la sesión correcta y diferencia a dos usuarios con el mismo nombre", async () => {
    const sessionId = createSession();

    const res1 = await request(app).post(`/sessions/${sessionId}/participants`).send({ name: "Juan" });
    const res2 = await request(app).post(`/sessions/${sessionId}/participants`).send({ name: "Juan" });

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);
    expect(res1.body.id).not.toBe(res2.body.id);
    expect(res1.body.sessionId).toBe(sessionId);
    expect(res2.body.sessionId).toBe(sessionId);

    const rows = db
      .prepare("SELECT id FROM participants WHERE session_id = ? AND name = ?")
      .all(sessionId, "Juan") as { id: string }[];
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((r) => r.id)).size).toBe(2);
  });

  it("rechaza unirse a una sesión inexistente", async () => {
    const res = await request(app)
      .post(`/sessions/${uuid()}/participants`)
      .send({ name: "Maria" });

    expect(res.status).toBe(404);
  });

  it("rechaza unirse a una sesión ya cerrada", async () => {
    const sessionId = createSession();
    db.prepare("UPDATE sessions SET closed_at = ? WHERE id = ?").run(new Date().toISOString(), sessionId);

    const res = await request(app).post(`/sessions/${sessionId}/participants`).send({ name: "Pedro" });

    expect(res.status).toBe(409);
  });

  it("soporta acceso múltiple concurrente con el mismo nombre sin perder ni mezclar registros", async () => {
    const sessionId = createSession();

    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app).post(`/sessions/${sessionId}/participants`).send({ name: "Carla" }),
      ),
    );

    responses.forEach((res) => expect(res.status).toBe(201));
    const ids = responses.map((res) => res.body.id);
    expect(new Set(ids).size).toBe(5);

    const count = db
      .prepare("SELECT COUNT(*) as c FROM participants WHERE session_id = ?")
      .get(sessionId) as { c: number };
    expect(count.c).toBe(5);
  });
});
