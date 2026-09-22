import { useCallback, useState } from "react";
import { AxiosError } from "axios";
import { useUserStore } from "@/store/userStore";
import { itemApi } from "@/services/api/itemApi";

export interface ReservationNotice {
  itemName: string;
  message: string;
}

// CU-02 / CU-02a / RF-05..RF-08: reservar y liberar ítems.
// El arbitraje ahora es atómico por REST (ver docs/12-diseno-concurrencia-de-reserva.md):
// no hay negociación "insistir/ceder" — quien llega primero al servidor se queda con el
// ítem, y el resto recibe un 409 con quién lo tiene. Acá solo mostramos ese resultado como
// un aviso breve y no bloqueante (§12.6.5), nunca como un modal que frena a nadie.
export function useReservation() {
  const participantId = useUserStore((s) => s.participantId);
  const [notice, setNotice] = useState<ReservationNotice | null>(null);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);

  const dismissNotice = useCallback(() => setNotice(null), []);

  const reserve = useCallback(
    async (itemId: string, itemName: string) => {
      if (!participantId) return;
      setPendingItemId(itemId);
      try {
        await itemApi.reserve(itemId, participantId);
        // El nuevo estado llega también por "item:updated" (useShoppingList), así que no
        // hace falta actualizar nada acá además de limpiar el estado de carga.
      } catch (err) {
        const axiosErr = err as AxiosError<{ error?: string; reservedByName?: string | null }>;
        if (axiosErr.response?.status === 409) {
          const holder = axiosErr.response.data?.reservedByName;
          setNotice({
            itemName,
            message: holder
              ? `${holder} lo reservó justo antes que vos.`
              : "Alguien más ya lo reservó.",
          });
        }
      } finally {
        setPendingItemId(null);
      }
    },
    [participantId],
  );

  const release = useCallback(
    async (itemId: string) => {
      if (!participantId) return;
      setPendingItemId(itemId);
      try {
        await itemApi.release(itemId, participantId);
      } catch {
        // 403 esperable si por algún motivo ya no es el titular; el estado real llega por socket.
      } finally {
        setPendingItemId(null);
      }
    },
    [participantId],
  );

  return { reserve, release, pendingItemId, notice, dismissNotice };
}
