import { Request, Response } from "express";
import type { Server as SocketServer } from "socket.io";
import { db } from "../db/connection";
import {
  reserveItem,
  releaseItem,
  purchaseItem,
  listItems,
  serializeItem,
} from "../services/reservation.service";
import { broadcastItemUpdated } from "../sockets/broadcast";

// RF-05..RF-12: consulta de ítems, reserva/liberación atómica y marcar como comprado.
// El arbitraje de reserva se resuelve acá por REST (una respuesta 200/409 por intento),
// no por socket. Ver docs/12-diseno-concurrencia-de-reserva.md.
export const itemsController = {
  listBySession(req: Request, res: Response) {
    res.json(listItems(req.params.sessionId).map(serializeItem));
  },

  // RF-05 / RF-08: gana quien llega primero al servidor.
  reserve(req: Request, res: Response) {
    const { itemId } = req.params;
    const { participantId } = req.body as { participantId: string };
    if (!participantId) return res.status(400).json({ error: "Falta participantId" });

    const result = reserveItem(itemId, participantId);
    if (!result.ok) {
      if (result.reason === "not_found") return res.status(404).json({ error: "Ítem o participante no encontrado" });
      if (result.reason === "already_purchased") return res.status(409).json({ error: "El ítem ya fue comprado" });
      return res.status(409).json({
        error: `El ítem ya está reservado${result.reservedByName ? ` por ${result.reservedByName}` : ""}`,
        reservedBy: result.reservedBy,
        reservedByName: result.reservedByName,
      });
    }

    broadcastItemUpdated(getIo(req), result.item);
    res.json(serializeItem(result.item));
  },

  // RF-06: solo el titular puede liberar su reserva.
  release(req: Request, res: Response) {
    const { itemId } = req.params;
    const { participantId } = req.body as { participantId: string };
    if (!participantId) return res.status(400).json({ error: "Falta participantId" });

    const result = releaseItem(itemId, participantId);
    if (!result.ok) {
      if (result.reason === "not_found") return res.status(404).json({ error: "Ítem no encontrado" });
      return res.status(403).json({ error: "Solo quien tiene la reserva puede liberar el ítem" });
    }

    broadcastItemUpdated(getIo(req), result.item);
    res.json(serializeItem(result.item));
  },

  // RF-07 + RF-11: marcar como comprado exige tener la reserva y que el ítem siga pendiente.
  markPurchased(req: Request, res: Response) {
    const { itemId } = req.params;
    const { participantId, pricePaid } = req.body as { participantId: string; pricePaid: number };

    if (!participantId) return res.status(400).json({ error: "Falta participantId" });
    if (typeof pricePaid !== "number" || pricePaid <= 0) {
      // A2 (CU-03): precio inválido.
      return res.status(400).json({ error: "El precio debe ser un número positivo" });
    }

    const result = purchaseItem(itemId, participantId, pricePaid);
    if (!result.ok) {
      if (result.reason === "not_found") return res.status(404).json({ error: "Ítem no encontrado" });
      if (result.reason === "already_purchased") return res.status(409).json({ error: "El ítem ya fue comprado" });
      return res.status(409).json({ error: "Solo quien tiene la reserva puede marcar el ítem como comprado (RF-07)" });
    }

    broadcastItemUpdated(getIo(req), result.item);
    res.json(serializeItem(result.item));
  },

  attachTicket(req: Request, res: Response) {
    const { itemId } = req.params;
    const { ticketImageUri } = req.body as { ticketImageUri: string };
    db.prepare("UPDATE items SET ticket_image_uri = ?, updated_at = ? WHERE id = ?").run(
      ticketImageUri,
      new Date().toISOString(),
      itemId,
    );
    res.json({ ok: true });
  },
};

function getIo(req: Request): SocketServer | undefined {
  return req.app.get("io") as SocketServer | undefined;
}
