import type { Server as SocketServer } from "socket.io";
import { serializeItem, type ItemRow } from "../services/reservation.service";
import { serializeSession, type SessionRow } from "../services/sessions.service";

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
