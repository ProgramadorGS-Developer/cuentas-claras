import { Request, Response } from "express";
import type { Server as SocketServer } from "socket.io";
import { v4 as uuid } from "uuid";
import { db } from "../db/connection";
import { generateShareToken } from "../services/whatsappLink.service";
import { findSession, updateSession, closeSession, serializeSession } from "../services/sessions.service";
import { broadcastSessionClosed } from "../sockets/broadcast";

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

    res.status(201).json({ id: sessionId, name, hostName, createdAt: now, closedAt: null, shareToken });
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

  getById(req: Request, res: Response) {
    const session = findSession(req.params.sessionId);
    if (!session) return res.status(404).json({ error: "Sesión no encontrada" });
    res.json(serializeSession(session));
  },

  // Solo el anfitrión, y solo mientras nadie más se unió (ver sessions.service.ts).
  update(req: Request, res: Response) {
    const { participantId, name, items } = req.body as {
      participantId: string;
      name?: string;
      items?: string[];
    };
    if (!participantId) return res.status(400).json({ error: "Falta participantId" });

    const result = updateSession(req.params.sessionId, participantId, { name, items });
    if (!result.ok) {
      if (result.reason === "not_found") return res.status(404).json({ error: "Sesión no encontrada" });
      if (result.reason === "not_host") return res.status(403).json({ error: "Solo el anfitrión puede editar la sesión" });
      return res.status(409).json({ error: "La sesión ya no admite edición: ya se unió otro participante o está cerrada" });
    }

    res.json(serializeSession(result.session));
  },

  // RF-04: solo el anfitrión puede cerrar la sesión.
  close(req: Request, res: Response) {
    const { participantId } = req.body as { participantId: string };
    if (!participantId) return res.status(400).json({ error: "Falta participantId" });

    const result = closeSession(req.params.sessionId, participantId);
    if (!result.ok) {
      if (result.reason === "not_found") return res.status(404).json({ error: "Sesión no encontrada" });
      if (result.reason === "not_host") return res.status(403).json({ error: "Solo el anfitrión puede cerrar la sesión" });
      return res.status(409).json({ error: "La sesión ya estaba cerrada" });
    }

    broadcastSessionClosed(getIo(req), result.session);
    res.json(serializeSession(result.session));
  },
};

function getIo(req: Request): SocketServer | undefined {
  return req.app.get("io") as SocketServer | undefined;
}

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
