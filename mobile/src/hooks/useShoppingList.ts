import { useCallback, useEffect } from "react";
import { useSessionStore } from "@/store/sessionStore";
import { itemRepository } from "@/database/repositories/itemRepository";
import { itemApi } from "@/services/api/itemApi";
import { onItemUpdated, joinSessionRoom } from "@/services/realtime/reservationEvents";

// Hook central de la pantalla de lista (RF-04..RF-11).
// Estrategia offline-first: primero pinta lo que hay en SQLite local, y luego se mantiene
// al día con los eventos en tiempo real que llegan del backend.
//
// Importante: actualizar el estado que ve la pantalla (setItems/upsertItem) NUNCA debe
// depender de que el cacheo en SQLite tenga éxito — son pasos independientes. Si el guardado
// local falla (ej. sin SQLite en el preview web) el usuario igual tiene que ver los ítems que
// ya llegaron del servidor; solo pierde la persistencia offline, no la pantalla.
export function useShoppingList(sessionId: string) {
  const items = useSessionStore((s) => s.items);
  const setItems = useSessionStore((s) => s.setItems);
  const upsertItem = useSessionStore((s) => s.upsertItem);

  const loadFromLocalCache = useCallback(async () => {
    try {
      const local = await itemRepository.listBySession(sessionId);
      setItems(local);
    } catch {
      // Sin SQLite disponible (ej. preview web) o todavía sin caché: no rompe nada,
      // syncFromServer se encarga de traer los datos reales igual.
    }
  }, [sessionId, setItems]);

  const syncFromServer = useCallback(async () => {
    try {
      const { data: serverItems } = await itemApi.listBySession(sessionId);
      setItems(serverItems);

      try {
        for (const item of serverItems) {
          await itemRepository.upsert(item);
        }
      } catch {
        // Cacheo local best-effort; ya se actualizó la pantalla arriba.
      }
    } catch {
      // Sin red: nos quedamos con lo que ya había en caché local.
    }
  }, [sessionId, setItems]);

  useEffect(() => {
    if (!sessionId) return;
    loadFromLocalCache();
    syncFromServer();
    joinSessionRoom(sessionId);

    const unsubscribe = onItemUpdated((raw) => {
      upsertItem(raw);
      itemRepository.upsert(raw).catch(() => {
        // Cacheo local best-effort.
      });
    });

    return unsubscribe;
  }, [sessionId, loadFromLocalCache, syncFromServer, upsertItem]);

  return { items, refresh: syncFromServer };
}
