import { db } from "../db/connection";

// Arbitraje de reserva (RF-08, EDT 1.1.3.3 / 1.1.2.2). Ver docs/12-diseno-concurrencia-de-reserva.md.
//
// La prioridad la define el orden de llegada al servidor: gana quien ejecuta primero el UPDATE
// condicional. No hay cola ni desempate por marca de tiempo del cliente. Es determinista porque
// node:sqlite (DatabaseSync) es sincrónico y Node es de un solo hilo: cada UPDATE se completa
// entero antes del siguiente, y la condición `reserved_by IS NULL` viaja en la misma sentencia
// que la escritura.

export interface ItemRow {
  id: string;
  session_id: string;
  name: string;
  status: "pendiente" | "comprado";
  reserved_by: string | null;
  observation: string | null;
  price_paid: number | null;
  ticket_image_uri: string | null;
  updated_at: string;
}

export type ReserveResult =
  | { ok: true; item: ItemRow }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "already_purchased"; item: ItemRow }
  | { ok: false; reason: "already_reserved"; reservedBy: string; reservedByName: string | null };

export type ReleaseResult =
  | { ok: true; item: ItemRow }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "not_holder" };

export type PurchaseResult =
  | { ok: true; item: ItemRow }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "already_purchased" }
  | { ok: false; reason: "not_holder" };

export function findItem(itemId: string): ItemRow | undefined {
  return db.prepare("SELECT * FROM items WHERE id = ?").get(itemId) as ItemRow | undefined;
}

export function listItems(sessionId: string): ItemRow[] {
  return db.prepare("SELECT * FROM items WHERE session_id = ? ORDER BY name").all(sessionId) as unknown as ItemRow[];
}

// node:sqlite tipa `changes` como number | bigint; lo normalizamos a number para comparar.
function rowsAffected(result: { changes: number | bigint }): number {
  return Number(result.changes);
}

export function reserveItem(itemId: string, participantId: string): ReserveResult {
  const participant = db.prepare("SELECT id, name FROM participants WHERE id = ?").get(participantId) as
    | { id: string; name: string }
    | undefined;
  if (!participant) return { ok: false, reason: "not_found" };

  const now = new Date().toISOString();
  const result = db
    .prepare(
      `UPDATE items
          SET reserved_by = ?, observation = ?, updated_at = ?
        WHERE id = ? AND reserved_by IS NULL AND status = 'pendiente'`,
    )
    .run(participantId, `Reservado por ${participant.name}`, now, itemId);

  if (rowsAffected(result) === 1) return { ok: true, item: findItem(itemId)! };

  // El UPDATE no tocó ninguna fila: averiguar por qué.
  const item = findItem(itemId);
  if (!item) return { ok: false, reason: "not_found" };
  if (item.reserved_by === participantId) return { ok: true, item }; // idempotente: ya lo tenía este mismo usuario
  if (item.status === "comprado") return { ok: false, reason: "already_purchased", item };

  const holder = item.reserved_by
    ? (db.prepare("SELECT name FROM participants WHERE id = ?").get(item.reserved_by) as { name: string } | undefined)
    : undefined;
  return {
    ok: false,
    reason: "already_reserved",
    reservedBy: item.reserved_by as string,
    reservedByName: holder?.name ?? null,
  };
}

export function releaseItem(itemId: string, participantId: string): ReleaseResult {
  const item = findItem(itemId);
  if (!item) return { ok: false, reason: "not_found" };
  if (item.reserved_by !== participantId) return { ok: false, reason: "not_holder" }; // RF-06: solo el titular libera

  db.prepare(
    "UPDATE items SET reserved_by = NULL, observation = NULL, updated_at = ? WHERE id = ? AND reserved_by = ?",
  ).run(new Date().toISOString(), itemId, participantId);

  return { ok: true, item: findItem(itemId)! };
}

// RF-07 + RF-11: marcar como comprado exige tener la reserva y que el ítem siga pendiente.
// La transición 'pendiente' -> 'comprado' es la única válida; no hay vuelta atrás sin acción explícita.
export function purchaseItem(itemId: string, participantId: string, pricePaid: number): PurchaseResult {
  const result = db
    .prepare(
      `UPDATE items
          SET status = 'comprado', price_paid = ?, updated_at = ?
        WHERE id = ? AND reserved_by = ? AND status = 'pendiente'`,
    )
    .run(pricePaid, new Date().toISOString(), itemId, participantId);

  if (rowsAffected(result) === 1) return { ok: true, item: findItem(itemId)! };

  const item = findItem(itemId);
  if (!item) return { ok: false, reason: "not_found" };
  if (item.status === "comprado") return { ok: false, reason: "already_purchased" };
  return { ok: false, reason: "not_holder" };
}

export function serializeItem(row: ItemRow) {
  return {
    id: row.id,
    sessionId: row.session_id,
    name: row.name,
    status: row.status,
    reservedBy: row.reserved_by,
    observation: row.observation,
    pricePaid: row.price_paid,
    ticketImageUri: row.ticket_image_uri,
    updatedAt: row.updated_at,
  };
}
