import request from "supertest";
import { v4 as uuid } from "uuid";
import { app } from "../app";
import { db } from "../db/connection";

// RF-07 / RF-08 / 1.1.2.2 — arbitraje atómico de reserva.
// Ver docs/12-diseno-concurrencia-de-reserva.md (§12.7 Fase 1, §12.8 casos de borde).

function seed(opts: { participants?: number } = {}) {
  const sessionId = uuid();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO sessions (id, name, host_name, created_at, closed_at, share_token) VALUES (?, ?, ?, ?, NULL, ?)`,
  ).run(sessionId, "Asado", "Ana", now, uuid());

  const itemId = uuid();
  db.prepare(`INSERT INTO items (id, session_id, name, status, updated_at) VALUES (?, ?, ?, 'pendiente', ?)`).run(
    itemId,
    sessionId,
    "Carbón",
    now,
  );

  const participantIds = Array.from({ length: opts.participants ?? 2 }, (_, i) => {
    const id = uuid();
    db.prepare(`INSERT INTO participants (id, session_id, name, is_host, joined_at) VALUES (?, ?, ?, 0, ?)`).run(
      id,
      sessionId,
      `P${i + 1}`,
      now,
    );
    return id;
  });

  return { sessionId, itemId, participantIds };
}

function reservedBy(itemId: string): string | null {
  return (db.prepare("SELECT reserved_by FROM items WHERE id = ?").get(itemId) as { reserved_by: string | null })
    .reserved_by;
}

describe("POST /items/:itemId/reserve", () => {
  it("ante N intentos en paralelo sobre el mismo ítem, exactamente uno gana (200) y el resto recibe 409", async () => {
    const { itemId, participantIds } = seed({ participants: 12 });

    const responses = await Promise.all(
      participantIds.map((participantId) =>
        request(app).post(`/items/${itemId}/reserve`).send({ participantId }),
      ),
    );

    const ok = responses.filter((r) => r.status === 200);
    const conflict = responses.filter((r) => r.status === 409);

    expect(ok).toHaveLength(1);
    expect(conflict).toHaveLength(11);
    expect(reservedBy(itemId)).toBe(ok[0].body.reservedBy);
    conflict.forEach((r) => expect(r.body.reservedBy).toBe(ok[0].body.reservedBy));
  });

  it("reservar dos veces el mismo ítem con el mismo participante es idempotente (200)", async () => {
    const { itemId, participantIds } = seed();
    const [p1] = participantIds;

    const first = await request(app).post(`/items/${itemId}/reserve`).send({ participantId: p1 });
    const second = await request(app).post(`/items/${itemId}/reserve`).send({ participantId: p1 });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
  });

  it("rechaza reservar un ítem ya comprado (409)", async () => {
    const { itemId, participantIds } = seed();
    const [p1] = participantIds;
    await request(app).post(`/items/${itemId}/reserve`).send({ participantId: p1 });
    await request(app).post(`/items/${itemId}/purchase`).send({ participantId: p1, pricePaid: 100 });

    const res = await request(app).post(`/items/${itemId}/reserve`).send({ participantId: participantIds[1] });
    expect(res.status).toBe(409);
  });

  it("404 si el participante no existe", async () => {
    const { itemId } = seed();
    const res = await request(app).post(`/items/${itemId}/reserve`).send({ participantId: uuid() });
    expect(res.status).toBe(404);
  });
});

describe("POST /items/:itemId/release", () => {
  it("solo el titular puede liberar; un tercero recibe 403", async () => {
    const { itemId, participantIds } = seed();
    const [holder, other] = participantIds;
    await request(app).post(`/items/${itemId}/reserve`).send({ participantId: holder });

    const forbidden = await request(app).post(`/items/${itemId}/release`).send({ participantId: other });
    expect(forbidden.status).toBe(403);
    expect(reservedBy(itemId)).toBe(holder);

    const ok = await request(app).post(`/items/${itemId}/release`).send({ participantId: holder });
    expect(ok.status).toBe(200);
    expect(reservedBy(itemId)).toBeNull();
  });
});

describe("POST /items/:itemId/purchase", () => {
  it("marca comprado si lo pide el titular con el ítem pendiente", async () => {
    const { itemId, participantIds } = seed();
    const [p1] = participantIds;
    await request(app).post(`/items/${itemId}/reserve`).send({ participantId: p1 });

    const res = await request(app).post(`/items/${itemId}/purchase`).send({ participantId: p1, pricePaid: 250 });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("comprado");
    expect(res.body.pricePaid).toBe(250);
  });

  it("rechaza marcar comprado a quien no tiene la reserva (409)", async () => {
    const { itemId, participantIds } = seed();
    const [holder, other] = participantIds;
    await request(app).post(`/items/${itemId}/reserve`).send({ participantId: holder });

    const res = await request(app).post(`/items/${itemId}/purchase`).send({ participantId: other, pricePaid: 250 });
    expect(res.status).toBe(409);
  });

  it("una doble compra sobre el mismo ítem: una 200 y la segunda 409", async () => {
    const { itemId, participantIds } = seed();
    const [p1] = participantIds;
    await request(app).post(`/items/${itemId}/reserve`).send({ participantId: p1 });

    const first = await request(app).post(`/items/${itemId}/purchase`).send({ participantId: p1, pricePaid: 100 });
    const second = await request(app).post(`/items/${itemId}/purchase`).send({ participantId: p1, pricePaid: 999 });

    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
    expect((db.prepare("SELECT price_paid FROM items WHERE id = ?").get(itemId) as { price_paid: number }).price_paid).toBe(
      100,
    );
  });
});
