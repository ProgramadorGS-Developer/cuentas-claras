import { Request, Response } from "express";
import { v4 as uuid } from "uuid";
import { db } from "../db/connection";
import { generateShareToken, buildResultDeepLink } from "../services/whatsappLink.service";
import { computeSessionResult, buildResultShareText } from "../services/balance.service";

// RF-03/RF-04: CRUD de sesiones (EDT 1.1.2.1).
export const sessionsController = {
  create(req: Request, res: Response) {
    const { name, hostName, items } = req.body as { name: string; hostName: string; items: string[] };
    const sessionId = uuid();
    const hostId = uuid();
    const now = new Date().toISOString();
    const shareToken = generateShareToken();

    db.prepare(
      `INSERT INTO sessions (id, name, host_name, created_at, closed_at, share_token) VALUES (?, ?, ?, ?, NULL, ?)`,
    ).run(sessionId, name, hostName, now, shareToken);

    db.prepare(
      `INSERT INTO participants (id, session_id, name, is_host, joined_at) VALUES (?, ?, ?, 1, ?)`,
    ).run(hostId, sessionId, hostName, now);

    const insertItem = db.prepare(
      `INSERT INTO items (id, session_id, name, status, updated_at) VALUES (?, ?, ?, 'pendiente', ?)`,
    );
    for (const itemName of items ?? []) {
      insertItem.run(uuid(), sessionId, itemName, now);
    }

    // hostId: el cliente lo necesita para poder reservar/liberar/comprar ítems como anfitrión
    // (ver docs/12-diseno-concurrencia-de-reserva.md) — sin esto, el id de participante del
    // anfitrión solo existe acá y toda acción sobre ítems le devolvería 404.
    res.status(201).json({ id: sessionId, name, hostName, createdAt: now, closedAt: null, shareToken, hostId });
  },

  getByToken(req: Request, res: Response) {
    const { token } = req.params;
    const session = db.prepare("SELECT * FROM sessions WHERE share_token = ?").get(token) as any;
    if (!session) {
      // A1 (CU-01): link inválido o sesión inexistente/cerrada.
      return res.status(404).json({ error: "Sesión no encontrada o link inválido" });
    }
    res.json(toCamel(session));
  },

  list(_req: Request, res: Response) {
    const sessions = db.prepare("SELECT * FROM sessions ORDER BY created_at DESC").all();
    res.json((sessions as any[]).map(toCamel));
  },

  // RF-16 / CU-04 A1 / EDT 1.1.4.3: resultado de una sesión accesible por su share_token,
  // sin login (el token es la capacidad de acceso, igual que el link de invitación). Solo lectura.
  // Balance en vivo: no se persiste un snapshot (ver docs/05-modelo-de-datos.md §5.3).
  getSharedResult(req: Request, res: Response) {
    const { shareToken } = req.params;
    const session = db.prepare("SELECT * FROM sessions WHERE share_token = ?").get(shareToken) as any;
    if (!session) {
      return res.status(404).json({ error: "Sesión no encontrada o link inválido" });
    }

    const result = computeSessionResult(session.id);
    const deepLink = buildResultDeepLink(shareToken);
    res.json({
      session: { name: session.name, hostName: session.host_name, closedAt: session.closed_at },
      result,
      deepLink,
      shareText: buildResultShareText(result, session.name, deepLink),
    });
  },
};

function toCamel(row: any) {
  return {
    id: row.id,
    name: row.name,
    hostName: row.host_name,
    createdAt: row.created_at,
    closedAt: row.closed_at,
    shareToken: row.share_token,
  };
}
