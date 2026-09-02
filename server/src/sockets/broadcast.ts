import type { Server as SocketServer } from "socket.io";
import { serializeItem, type ItemRow } from "../services/reservation.service";

// Difunde el nuevo estado de un ítem a todos los dispositivos de la sesión.
// `io` puede no estar seteado (p. ej. en los tests, que levantan solo Express sin Socket.IO):
// en ese caso simplemente no se emite nada.
export function broadcastItemUpdated(io: SocketServer | undefined, item: ItemRow) {
  io?.to(`session:${item.session_id}`).emit("item:updated", serializeItem(item));
}
