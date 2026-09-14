import { useCallback, useEffect } from "react";
import { useSessionStore } from "@/store/sessionStore";
import { itemRepository } from "@/database/repositories/itemRepository";
import { itemApi } from "@/services/api/itemApi";
import { onItemUpdated, joinSessionRoom } from "@/services/realtime/reservationEvents";

// Hook central de la pantalla de lista (RF-04..RF-11).
// Estrategia offline-first: primero pinta lo que hay en SQLite local (rápido, funciona sin
// red), y en paralelo trae la versión del servidor para converger. Esto es indispensable para
// quien se une por link (no el anfitrión): esa persona nunca tuvo los ítems en su caché local,
// solo existen en el servidor hasta este fetch.
export function useShoppingList(sessionId: string) {
  const items = useSessionStore((s) => s.items);
  const setItems = useSessionStore((s) => s.setItems);
  const upsertItem = useSessionStore((s) => s.upsertItem);

  const loadFromLocalCache = useCallback(async () => {
    const local = await itemRepository.listBySession(sessionId);
    setItems(local);
  }, [sessionId, setItems]);

  const syncFromServer = useCallback(async () => {
    try {
      const { data: serverItems } = await itemApi.listBySession(sessionId);
      for (const item of serverItems) {
        await itemRepository.upsert(item);
      }
      await loadFromLocalCache();
    } catch {
      // Sin red: nos quedamos con lo que ya había en caché local.
    }
  }, [sessionId, loadFromLocalCache]);

  useEffect(() => {
    if (!sessionId) return;
    loadFromLocalCache();
    syncFromServer();
    joinSessionRoom(sessionId);

    const unsubscribe = onItemUpdated(async (raw) => {
      await itemRepository.upsert(raw);
      upsertItem(raw);
    });

    return unsubscribe;
  }, [sessionId, loadFromLocalCache, syncFromServer, upsertItem]);

  return { items, refresh: syncFromServer };
}
