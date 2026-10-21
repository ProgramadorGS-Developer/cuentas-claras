import { Router } from "express";
import { v4 as uuid } from "uuid";
import { db } from "../db/connection";
import { findSession } from "../services/sessions.service";
import { MAX_NOMBRE, normalizarNombrePersona } from "../utils/validation";

export const usersRouter = Router();

// RF-02: registrar el nombre del usuario al ingresar por el link.
usersRouter.post("/sessions/:sessionId/participants", (req, res) => {
  const { sessionId } = req.params;
  const name = normalizarNombrePersona(req.body?.name);
  if (!name) {
    return res.status(400).json({ error: `El nombre debe tener entre 2 y ${MAX_NOMBRE} caracteres` });
  }

  // Reusa sessions.service.ts para no duplicar el criterio de "sesión abierta"
  // (antes era una query propia acá, que podía desincronizarse de closeSession()).
  const session = findSession(sessionId);
  if (!session) {
    return res.status(404).json({ error: "Sesión no encontrada" });
  }
  if (session.closed_at) {
    return res.status(409).json({ error: "La sesión ya está cerrada" });
  }

  const id = uuid();
  const joinedAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO participants (id, session_id, name, is_host, joined_at) VALUES (?, ?, ?, 0, ?)`,
  ).run(id, sessionId, name, joinedAt);

  res.status(201).json({ id, sessionId, name, isHost: false, joinedAt });
});

usersRouter.get("/sessions/:sessionId/participants", (req, res) => {
  const rows = db.prepare("SELECT * FROM participants WHERE session_id = ?").all(req.params.sessionId);
  res.json(rows);
});
