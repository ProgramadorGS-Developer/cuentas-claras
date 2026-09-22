import type { Server as SocketServer } from "socket.io";
import { serializeItem, type ItemRow } from "../services/reservation.service";
import { serializeSession, type SessionRow } from "../services/sessions.service";
import type { SessionResult } from "../services/balance.service";

// Difunde el nuevo estado de un ítem a todos los dispositivos de la sesión.
// `io` puede no estar seteado (p. ej. en los tests, que levantan solo Express sin Socket.IO):
// en ese caso simplemente no se emite nada.
export function broadcastItemUpdated(io: SocketServer | undefined, item: ItemRow) {
  io?.to(`session:${item.session_id}`).emit("item:updated", serializeItem(item));
}

// RF-04: avisa a todos los dispositivos conectados que el anfitrión cerró la sesión,
// para que el Home de cada uno lo refleje sin necesidad de reabrir la app.
export function broadcastSessionClosed(io: SocketServer | undefined, session: SessionRow) {
  io?.to(`session:${session.id}`).emit("session:closed", serializeSession(session));
}

// Difunde el balance recalculado (RF-14, EDT 1.1.4.2) tras cualquier cambio que lo afecte:
// una compra con precio o un aporte de presupuesto. El payload es el resultado completo
// (balances + transferencias + totales), para que el cliente no tenga que recalcular.
export function broadcastResultUpdated(io: SocketServer | undefined, result: SessionResult) {
  io?.to(`session:${result.sessionId}`).emit("result:updated", result);
}
