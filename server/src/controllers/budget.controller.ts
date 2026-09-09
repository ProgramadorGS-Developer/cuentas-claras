import { Request, Response } from "express";
import type { Server as SocketServer } from "socket.io";
import { v4 as uuid } from "uuid";
import { db } from "../db/connection";
import { computeSessionResult } from "../services/balance.service";
import { broadcastResultUpdated } from "../sockets/broadcast";
import { esMontoValido } from "../utils/money";

// RF-13 (Presupuesto) / RF-14 (Resultado) — EDT 1.1.4.2.
export const budgetController = {
  // RF-13: registra un aporte de presupuesto y difunde el balance recalculado.
  contribute(req: Request, res: Response) {
    const { sessionId } = req.params;
    const { participantId, amount } = req.body as { participantId: string; amount: number };

    if (!participantId) return res.status(400).json({ error: "Falta participantId" });
    if (!esMontoValido(amount, 0.01)) {
      return res.status(400).json({
        error: "Monto inválido: debe ser un número entre 0.01 y 999999.99, con hasta 2 decimales",
      });
    }

    const participant = db
      .prepare("SELECT id FROM participants WHERE id = ? AND session_id = ?")
      .get(participantId, sessionId);
    if (!participant) return res.status(404).json({ error: "El participante no pertenece a la sesión" });

    db.prepare(
      `INSERT INTO budget_contributions (id, session_id, participant_id, amount, created_at) VALUES (?, ?, ?, ?, ?)`,
    ).run(uuid(), sessionId, participantId, amount, new Date().toISOString());

    const result = computeSessionResult(sessionId);
    broadcastResultUpdated(getIo(req), result);
    res.status(201).json(result);
  },

  // RF-14 / CU-04: balance actual de la sesión (fuente de verdad).
  getResult(req: Request, res: Response) {
    res.json(computeSessionResult(req.params.sessionId));
  },
};

function getIo(req: Request): SocketServer | undefined {
  return req.app.get("io") as SocketServer | undefined;
}
