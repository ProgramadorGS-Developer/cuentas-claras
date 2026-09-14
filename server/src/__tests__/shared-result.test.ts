import request from "supertest";
import { v4 as uuid } from "uuid";
import { app } from "../app";
import { db } from "../db/connection";

// EDT 1.1.4.3 — API para compartir la pantalla de resultado. RF-16 / CU-04 A1.
// El resultado de una sesión es accesible por su share_token, sin login, solo lectura.

const now = new Date().toISOString();

function seed({ closed = false }: { closed?: boolean } = {}) {
  const sessionId = uuid();
  const shareToken = uuid();
  db.prepare(
    `INSERT INTO sessions (id, name, host_name, created_at, closed_at, share_token) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(sessionId, "Asado", "Ana", now, closed ? now : null, shareToken);

  const ana = uuid();
  const beto = uuid();
  db.prepare(`INSERT INTO participants (id, session_id, name, is_host, joined_at) VALUES (?, ?, 'Ana', 1, ?)`).run(
    ana,
    sessionId,
    now,
  );
  db.prepare(`INSERT INTO participants (id, session_id, name, is_host, joined_at) VALUES (?, ?, 'Beto', 0, ?)`).run(
    beto,
    sessionId,
    now,
  );
  db.prepare(
    `INSERT INTO items (id, session_id, name, status, reserved_by, price_paid, updated_at)
     VALUES (?, ?, 'Carbón', 'comprado', ?, 200, ?)`,
  ).run(uuid(), sessionId, ana, now);

  return { sessionId, shareToken, ana, beto };
}

describe("GET /sessions/shared/:shareToken/result", () => {
  it("devuelve el balance correcto por el share_token, sin login", async () => {
    const { shareToken, ana, beto } = seed();

    const res = await request(app).get(`/sessions/shared/${shareToken}/result`);

    expect(res.status).toBe(200);
    expect(res.body.session).toEqual({ name: "Asado", hostName: "Ana", closedAt: null });
    expect(res.body.result.totals.spent).toBe(200);
    expect(res.body.result.transfers).toEqual([
      { fromParticipantId: beto, toParticipantId: ana, amount: 100 },
    ]);
  });

  it("incluye el deep link de resultado y el texto compartible con nombres", async () => {
    const { shareToken } = seed();

    const res = await request(app).get(`/sessions/shared/${shareToken}/result`);

    expect(res.body.deepLink).toBe(`cuentasclaras://result?token=${shareToken}`);
    expect(res.body.shareText).toContain('Resultado de "Asado"');
    expect(res.body.shareText).toContain("Beto le paga $100.00 a Ana");
    expect(res.body.shareText).toContain(`cuentasclaras://result?token=${shareToken}`);
  });

  it("404 si el token no existe", async () => {
    const res = await request(app).get(`/sessions/shared/${uuid()}/result`);
    expect(res.status).toBe(404);
  });

  it("una sesión cerrada sigue exponiendo su resultado final", async () => {
    const { shareToken } = seed({ closed: true });

    const res = await request(app).get(`/sessions/shared/${shareToken}/result`);

    expect(res.status).toBe(200);
    expect(res.body.session.closedAt).not.toBeNull();
    expect(res.body.result.totals.spent).toBe(200);
  });

  it("sin gastos: texto 'Todos están a mano'", async () => {
    const sessionId = uuid();
    const shareToken = uuid();
    db.prepare(
      `INSERT INTO sessions (id, name, host_name, created_at, closed_at, share_token) VALUES (?, 'Vacía', 'Ana', ?, NULL, ?)`,
    ).run(sessionId, now, shareToken);
    db.prepare(`INSERT INTO participants (id, session_id, name, is_host, joined_at) VALUES (?, ?, 'Ana', 1, ?)`).run(
      uuid(),
      sessionId,
      now,
    );

    const res = await request(app).get(`/sessions/shared/${shareToken}/result`);
    expect(res.body.result.transfers).toEqual([]);
    expect(res.body.shareText).toContain("Todos están a mano.");
  });
});
