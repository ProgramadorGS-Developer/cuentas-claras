import { v4 as uuid } from "uuid";
import { db } from "../db/connection";

// CRUD de sesiones (RF-03/RF-04, EDT 1.1.2.1). Ver docs/05-modelo-de-datos.md.
//
// "Actualizar" (nombre/ítems) solo está permitido mientras la sesión no tenga
// ningún participante además del anfitrión: ni bien se une alguien más, la
// lista deja de poder tocarse por acá. "Cerrar" solo lo puede hacer el
// anfitrión, mismo criterio que RF-06 (solo el titular libera su reserva).

export interface SessionRow {
  id: string;
  name: string;
  host_name: string;
  created_at: string;
  closed_at: string | null;
  share_token: string;
}

export type UpdateSessionResult =
  | { ok: true; session: SessionRow }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "not_host" }
  | { ok: false; reason: "locked" };

export type CloseSessionResult =
  | { ok: true; session: SessionRow }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "not_host" }
  | { ok: false; reason: "already_closed" };

function rowsAffected(result: { changes: number | bigint }): number {
  return Number(result.changes);
}

export function findSession(sessionId: string): SessionRow | undefined {
  return db.prepare("SELECT * FROM sessions WHERE id = ?").get(sessionId) as SessionRow | undefined;
}

function isHost(sessionId: string, participantId: string): boolean {
  const row = db
    .prepare("SELECT id FROM participants WHERE id = ? AND session_id = ? AND is_host = 1")
    .get(participantId, sessionId);
  return !!row;
}

// true si nadie además del anfitrión se unió todavía (ver docs/05, participants.is_host).
function hasOnlyHost(sessionId: string): boolean {
  const row = db
    .prepare("SELECT COUNT(*) AS n FROM participants WHERE session_id = ? AND is_host = 0")
    .get(sessionId) as { n: number };
  return row.n === 0;
}

export function updateSession(
  sessionId: string,
  participantId: string,
  changes: { name?: string; items?: string[] },
): UpdateSessionResult {
  const session = findSession(sessionId);
  if (!session) return { ok: false, reason: "not_found" };
  if (!isHost(sessionId, participantId)) return { ok: false, reason: "not_host" };
  if (session.closed_at || !hasOnlyHost(sessionId)) return { ok: false, reason: "locked" };

  if (changes.name !== undefined) {
    db.prepare("UPDATE sessions SET name = ? WHERE id = ?").run(changes.name, sessionId);
  }

  if (changes.items !== undefined) {
    db.prepare("DELETE FROM items WHERE session_id = ?").run(sessionId);
    const now = new Date().toISOString();
    const insertItem = db.prepare(
      "INSERT INTO items (id, session_id, name, status, updated_at) VALUES (?, ?, ?, 'pendiente', ?)",
    );
    for (const itemName of changes.items) {
      insertItem.run(uuid(), sessionId, itemName, now);
    }
  }

  return { ok: true, session: findSession(sessionId)! };
}

export function closeSession(sessionId: string, participantId: string): CloseSessionResult {
  const session = findSession(sessionId);
  if (!session) return { ok: false, reason: "not_found" };
  if (!isHost(sessionId, participantId)) return { ok: false, reason: "not_host" };

  const result = db
    .prepare("UPDATE sessions SET closed_at = ? WHERE id = ? AND closed_at IS NULL")
    .run(new Date().toISOString(), sessionId);

  if (rowsAffected(result) === 0) return { ok: false, reason: "already_closed" };
  return { ok: true, session: findSession(sessionId)! };
}

export function serializeSession(row: SessionRow) {
  return {
    id: row.id,
    name: row.name,
    hostName: row.host_name,
    createdAt: row.created_at,
    closedAt: row.closed_at,
    shareToken: row.share_token,
  };
}
