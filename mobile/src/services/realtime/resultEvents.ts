import { getSocket } from "./socket";
import { SessionResult } from "@/domain/models";

// RF-14 (EDT 1.1.4.2): el servidor difunde el balance recalculado tras cada compra con precio
// o cada aporte de presupuesto, para que todos los dispositivos converjan sin recalcular nada.
export function onResultUpdated(cb: (result: SessionResult) => void) {
  getSocket().on("result:updated", cb);
  return () => {
    getSocket().off("result:updated", cb);
  };
}
