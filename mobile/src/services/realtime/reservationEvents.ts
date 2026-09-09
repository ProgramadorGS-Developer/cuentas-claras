import { getSocket, joinSessionRoom } from "./socket";

// La reserva/liberación de ítems se resuelve por REST (200/409 al instante, ver useReservation.ts
// y docs/12-diseno-concurrencia-de-reserva.md). Lo único que sigue viajando por socket es la
// difusión del nuevo estado del ítem tras cualquier cambio (item:updated), que useShoppingList
// escucha para mantener la lista al día en todos los dispositivos.

// Re-exportado para que los hooks puedan importar todo lo relacionado a la sesión en tiempo
// real desde un único módulo.
export { joinSessionRoom };

// Nota: el "unsubscribe" devuelto retorna `void` a propósito (no `Socket`), para poder usarse
// directamente como cleanup de un useEffect de React.
export function onItemUpdated(cb: (item: any) => void) {
  getSocket().on("item:updated", cb);
  return () => {
    getSocket().off("item:updated", cb);
  };
}
