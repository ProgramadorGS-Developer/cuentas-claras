import { useCallback } from "react";
import { useUserStore } from "@/store/userStore";
import { itemApi } from "@/services/api/itemApi";

// CU-02/CU-02a + RF-06 (EDT 1.1.2.2/1.1.3.3): reservar y liberar ítems por REST.
// El arbitraje ya es atómico e instantáneo en el servidor (ver docs/12-diseno-concurrencia-de-reserva.md):
// no hay negociación de conflicto, quien pierde la carrera recibe un 409 y listo. El estado del ítem
// se actualiza solo vía el evento "item:updated" que ya escucha useShoppingList — no hace falta
// tocar SQLite/estado local acá, mismo patrón que ya usa markPurchased en ItemDetailScreen.
export function useReservation() {
  const participantId = useUserStore((s) => s.participantId);

  const reserve = useCallback(
    async (itemId: string) => {
      if (!participantId) return;
      await itemApi.reserve(itemId, participantId);
    },
    [participantId],
  );

  const release = useCallback(
    async (itemId: string) => {
      if (!participantId) return;
      await itemApi.release(itemId, participantId);
    },
    [participantId],
  );

  return { reserve, release };
}
