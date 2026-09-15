import { Request, Response } from "express";
import { v4 as uuid } from "uuid";
import { db } from "../db/connection";
import { generateShareToken, buildSessionJoinUrl, buildSessionDeepLink } from "../services/whatsappLink.service";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

    res.status(201).json({
      id: sessionId,
      name,
      hostName,
      createdAt: now,
      closedAt: null,
      shareToken,
      joinUrl: buildSessionJoinUrl(shareToken),
    });
  },

  // EDT 1.1.1.1: puente para el link compartido por WhatsApp (que solo linkea http/https) ->
  // redirige al esquema nativo que abre la app directo en la sesión correspondiente.
  joinRedirect(req: Request, res: Response) {
    const { token } = req.params;
    if (!UUID_RE.test(token)) {
      return res.status(400).send("Link inválido");
    }
    const deepLink = buildSessionDeepLink(token);
    res.type("html").send(
      `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${deepLink}" />` +
        `<script>location.href=${JSON.stringify(deepLink)};</script></head>` +
        `<body>Abriendo CuentasClaras…</body></html>`,
    );
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
