import { getSocket, joinSessionRoom } from "./socket";

// El arbitraje de reserva se resuelve por REST (ver services/api/itemApi.ts y
// docs/12-diseno-concurrencia-de-reserva.md, §12.6.2): HTTP garantiza una respuesta por
// intento (200 o 409), lo que hace el flujo determinista. El socket ya no participa en la
// negociación de la reserva — solo difunde el nuevo estado del ítem a toda la sala para que
// todos los dispositivos converjan al instante.

export { joinSessionRoom };

export function onItemUpdated(cb: (item: any) => void) {
  getSocket().on("item:updated", cb);
  return () => {
    getSocket().off("item:updated", cb);
  };
}
