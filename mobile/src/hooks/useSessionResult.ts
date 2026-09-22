import { useEffect, useState } from "react";
import { useBalance } from "./useBalance";
import { useSessionStore } from "@/store/sessionStore";
import { budgetApi } from "@/services/api/budgetApi";
import { joinSessionRoom } from "@/services/realtime/socket";
import { onResultUpdated } from "@/services/realtime/resultEvents";
import { SessionResult } from "@/domain/models";

// RF-14 / CU-04 (EDT 1.2.3.2): balance de la sesión. Arranca con el cálculo local (offline,
// useBalance + balanceCalculator.ts) y en cuanto llega el resultado del servidor —al pedirlo
// al montar, o por el evento result:updated tras cualquier compra/aporte— lo reemplaza, porque
// el servidor es la fuente de verdad y el único que converge entre todos los dispositivos.
export function useSessionResult(sessionId: string) {
  const contributions = useSessionStore((s) => s.contributions);
  const local = useBalance(contributions);
  const [server, setServer] = useState<SessionResult | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    setServer(null);

    budgetApi
      .getResult(sessionId)
      .then(({ data }) => setServer(data))
      .catch(() => {
        // Sin conexión: seguimos mostrando el cálculo local hasta que se pueda pedir de nuevo.
      });

    joinSessionRoom(sessionId);
    const unsubscribe = onResultUpdated((result) => {
      if (result.sessionId === sessionId) setServer(result);
    });

    return unsubscribe;
  }, [sessionId]);

  return {
    balances: server?.balances ?? local.balances,
    transfers: server?.transfers ?? local.transfers,
    noBudgetLoaded: server?.totals.noBudgetLoaded ?? contributions.length === 0,
  };
}
