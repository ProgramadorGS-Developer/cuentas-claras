import { useCallback, useEffect, useState } from "react";
import { useSessionStore } from "@/store/sessionStore";
import { budgetRepository } from "@/database/repositories/budgetRepository";
import { budgetApi } from "@/services/api/budgetApi";
import { generateId } from "@/utils/idGenerator";
import { BudgetContribution } from "@/domain/models";

// RF-13 (EDT 1.2.3.1): sección "Presupuesto", opcional. Mismo patrón offline-first que
// useShoppingList: se lee primero de la cache local, y el aporte se persiste ahí ANTES de
// llamar al backend — si falla por falta de red, el aporte ya quedó guardado en el celular.
export function useBudget(sessionId: string) {
  const contributions = useSessionStore((s) => s.contributions);
  const setContributions = useSessionStore((s) => s.setContributions);
  const addContribution = useSessionStore((s) => s.addContribution);
  const [syncError, setSyncError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sessionId) return;
    try {
      const local = await budgetRepository.listBySession(sessionId);
      setContributions(local);
    } catch {
      // Sin SQLite disponible (ej. preview web): la sección queda vacía, no rompe la pantalla.
    }
  }, [sessionId, setContributions]);

  useEffect(() => {
    load();
  }, [load]);

  async function contribute(participantId: string, amount: number) {
    setSyncError(null);
    const contribution: BudgetContribution = {
      id: await generateId(),
      sessionId,
      participantId,
      amount,
      createdAt: new Date().toISOString(),
    };

    // Se guarda local primero: el aporte no se pierde aunque falle la llamada de abajo.
    try {
      await budgetRepository.insert(contribution);
    } catch {
      // Sin SQLite disponible (ej. preview web): seguimos igual, solo queda en memoria.
    }
    addContribution(contribution);

    try {
      await budgetApi.contribute(sessionId, { participantId, amount });
    } catch {
      // El aporte ya está guardado local; el balance del servidor (RF-14) no lo va a reflejar
      // hasta que se reintente con conexión. No hay cola de reintento automático todavía.
      setSyncError("Se guardó en tu teléfono, pero no pudimos confirmarlo con el servidor todavía.");
    }
  }

  return { contributions, contribute, syncError };
}
