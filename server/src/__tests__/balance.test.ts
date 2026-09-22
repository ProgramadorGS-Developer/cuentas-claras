import request from "supertest";
import { v4 as uuid } from "uuid";
import { app } from "../app";
import { db } from "../db/connection";
import { computeSessionResult, simplifySettlement, type BalanceEntry } from "../services/balance.service";

// EDT 1.1.4.2 — Motor de cálculo de gastos y balances. RF-13/RF-14, CU-04/CU-04a.
// Fórmula: docs/05-modelo-de-datos.md §5.3.

const now = new Date().toISOString();

function seed(participantNames: string[]) {
  const sessionId = uuid();
  db.prepare(
    `INSERT INTO sessions (id, name, host_name, created_at, closed_at, share_token) VALUES (?, ?, ?, ?, NULL, ?)`,
  ).run(sessionId, "Asado", participantNames[0] ?? "Ana", now, uuid());

  const ids: Record<string, string> = {};
  for (const name of participantNames) {
    const id = uuid();
    ids[name] = id;
    db.prepare(`INSERT INTO participants (id, session_id, name, is_host, joined_at) VALUES (?, ?, ?, 0, ?)`).run(
      id,
      sessionId,
      name,
      now,
    );
  }
  return { sessionId, ids };
}

// Crea un ítem ya comprado por `participantId` a `price`.
function purchasedItem(sessionId: string, participantId: string, price: number) {
  db.prepare(
    `INSERT INTO items (id, session_id, name, status, reserved_by, price_paid, updated_at)
     VALUES (?, ?, ?, 'comprado', ?, ?, ?)`,
  ).run(uuid(), sessionId, `item-${uuid().slice(0, 6)}`, participantId, price, now);
}

function contribute(sessionId: string, participantId: string, amount: number) {
  db.prepare(
    `INSERT INTO budget_contributions (id, session_id, participant_id, amount, created_at) VALUES (?, ?, ?, ?, ?)`,
  ).run(uuid(), sessionId, participantId, amount, now);
}

const net = (r: { balances: BalanceEntry[] }, name: string, ids: Record<string, string>) =>
  r.balances.find((b) => b.participantId === ids[name])!.net;

describe("computeSessionResult — sin presupuesto (partes iguales, A2 de CU-04)", () => {
  it("reparte el total gastado en partes iguales entre los participantes", () => {
    const { sessionId, ids } = seed(["Ana", "Beto", "Cata"]);
    purchasedItem(sessionId, ids.Ana, 300);

    const r = computeSessionResult(sessionId);

    expect(r.totals).toEqual({ spent: 300, contributed: 0, noBudgetLoaded: true });
    expect(net(r, "Ana", ids)).toBe(200); // gastó 300, parte justa 100
    expect(net(r, "Beto", ids)).toBe(-100);
    expect(net(r, "Cata", ids)).toBe(-100);
    expect(r.balances.reduce((s, b) => s + b.net, 0)).toBe(0);
  });

  it("división no exacta: 100 entre 3 → netos redondeados a 2 decimales", () => {
    const { sessionId, ids } = seed(["Ana", "Beto", "Cata"]);
    purchasedItem(sessionId, ids.Ana, 100);

    const r = computeSessionResult(sessionId);
    expect(net(r, "Ana", ids)).toBe(66.67); // 100 - 33.333...
    expect(net(r, "Beto", ids)).toBe(-33.33);
    expect(net(r, "Cata", ids)).toBe(-33.33);
  });

  it("ítems comprados sin precio cargado no cuentan", () => {
    const { sessionId, ids } = seed(["Ana", "Beto"]);
    db.prepare(
      `INSERT INTO items (id, session_id, name, status, reserved_by, price_paid, updated_at)
       VALUES (?, ?, 'sin precio', 'comprado', ?, NULL, ?)`,
    ).run(uuid(), sessionId, ids.Ana, now);

    const r = computeSessionResult(sessionId);
    expect(r.totals.spent).toBe(0);
    expect(r.balances.every((b) => b.net === 0)).toBe(true);
  });
});

describe("computeSessionResult — con presupuesto", () => {
  it("neto = aportado − gastado", () => {
    const { sessionId, ids } = seed(["Ana", "Beto"]);
    contribute(sessionId, ids.Ana, 1000);
    contribute(sessionId, ids.Beto, 1000);
    purchasedItem(sessionId, ids.Ana, 1500);
    purchasedItem(sessionId, ids.Beto, 500);

    const r = computeSessionResult(sessionId);
    expect(r.totals).toEqual({ spent: 2000, contributed: 2000, noBudgetLoaded: false });
    expect(net(r, "Ana", ids)).toBe(-500); // aportó 1000, gastó 1500
    expect(net(r, "Beto", ids)).toBe(500);
  });

  it("presupuesto parcial: quien no aportó queda con neto = −gastado", () => {
    const { sessionId, ids } = seed(["Ana", "Beto"]);
    contribute(sessionId, ids.Ana, 1000);
    purchasedItem(sessionId, ids.Beto, 300);

    const r = computeSessionResult(sessionId);
    expect(r.totals.noBudgetLoaded).toBe(false);
    expect(net(r, "Ana", ids)).toBe(1000);
    expect(net(r, "Beto", ids)).toBe(-300);
  });
});

describe("computeSessionResult — casos límite", () => {
  it("sin ítems comprados: todos en cero, sin transferencias", () => {
    const { sessionId } = seed(["Ana", "Beto"]);
    const r = computeSessionResult(sessionId);
    expect(r.balances.every((b) => b.net === 0)).toBe(true);
    expect(r.transfers).toEqual([]);
  });

  it("sesión inexistente: payload vacío", () => {
    const r = computeSessionResult(uuid());
    expect(r.balances).toEqual([]);
    expect(r.transfers).toEqual([]);
    expect(r.totals).toEqual({ spent: 0, contributed: 0, noBudgetLoaded: true });
  });
});

describe("simplifySettlement", () => {
  const entry = (id: string, net: number): BalanceEntry => ({
    participantId: id,
    participantName: id,
    contributed: 0,
    spent: 0,
    net,
  });

  it("empareja deudores con acreedores y cierra en cero", () => {
    const transfers = simplifySettlement([entry("A", 200), entry("B", -100), entry("C", -100)]);
    expect(transfers).toEqual([
      { fromParticipantId: "B", toParticipantId: "A", amount: 100 },
      { fromParticipantId: "C", toParticipantId: "A", amount: 100 },
    ]);
  });

  it("todos a mano: sin transferencias", () => {
    expect(simplifySettlement([entry("A", 0), entry("B", 0)])).toEqual([]);
  });

  it("un deudor paga a dos acreedores", () => {
    const transfers = simplifySettlement([entry("A", -300), entry("B", 200), entry("C", 100)]);
    expect(transfers).toEqual([
      { fromParticipantId: "A", toParticipantId: "B", amount: 200 },
      { fromParticipantId: "A", toParticipantId: "C", amount: 100 },
    ]);
  });
});

describe("GET /sessions/:sessionId/result", () => {
  it("devuelve el payload completo (balances + transfers + totals)", async () => {
    const { sessionId, ids } = seed(["Ana", "Beto"]);
    purchasedItem(sessionId, ids.Ana, 200);

    const res = await request(app).get(`/sessions/${sessionId}/result`);
    expect(res.status).toBe(200);
    expect(res.body.sessionId).toBe(sessionId);
    expect(res.body.totals.spent).toBe(200);
    expect(res.body.balances).toHaveLength(2);
    expect(res.body.transfers).toEqual([
      { fromParticipantId: ids.Beto, toParticipantId: ids.Ana, amount: 100 },
    ]);
  });
});

describe("POST /sessions/:sessionId/budget", () => {
  it("registra el aporte y responde 201 con el balance recalculado", async () => {
    const { sessionId, ids } = seed(["Ana", "Beto"]);

    const res = await request(app)
      .post(`/sessions/${sessionId}/budget`)
      .send({ participantId: ids.Ana, amount: 500 });

    expect(res.status).toBe(201);
    expect(res.body.totals.contributed).toBe(500);
    expect(net(res.body, "Ana", ids)).toBe(500);
  });

  it.each([
    ["negativo", -1],
    ["cero", 0],
    ["mayor al límite", 1_000_000],
    ["con más de 2 decimales", 10.999],
    ["no numérico", "500"],
    ["faltante", undefined],
  ])("rechaza monto %s (400) y no inserta", async (_caso, amount) => {
    const { sessionId, ids } = seed(["Ana"]);
    const res = await request(app)
      .post(`/sessions/${sessionId}/budget`)
      .send({ participantId: ids.Ana, amount });

    expect(res.status).toBe(400);
    expect(
      db.prepare("SELECT COUNT(*) c FROM budget_contributions WHERE session_id = ?").get(sessionId),
    ).toEqual({ c: 0 });
  });

  it("rechaza (404) si el participante no pertenece a la sesión", async () => {
    const { sessionId } = seed(["Ana"]);
    const res = await request(app)
      .post(`/sessions/${sessionId}/budget`)
      .send({ participantId: uuid(), amount: 100 });
    expect(res.status).toBe(404);
  });
});
