import { useCallback, useEffect, useState } from "react";
import { sessionRepository } from "@/database/repositories/sessionRepository";
import { userRepository } from "@/database/repositories/userRepository";
import { itemRepository } from "@/database/repositories/itemRepository";
import { Session } from "@/domain/models";
import { StatusPillVariant } from "@/components/common/StatusPill";

export interface SessionSummary {
  session: Session;
  participantCount: number;
  totalSpent: number;
  perPersonShare: number;
  status: StatusPillVariant;
  statusLabel: string;
}

async function summarize(session: Session, isFeatured: boolean): Promise<SessionSummary> {
  const [participants, items] = await Promise.all([
    userRepository.listBySession(session.id),
    itemRepository.listBySession(session.id),
  ]);
  const totalSpent = items
    .filter((i) => i.status === "comprado" && i.pricePaid != null)
    .reduce((sum, i) => sum + (i.pricePaid ?? 0), 0);
  const participantCount = participants.length;
  const perPersonShare = participantCount > 0 ? totalSpent / participantCount : 0;

  const status: StatusPillVariant = session.closedAt ? "closed" : isFeatured ? "pending" : "active";
  const statusLabel = session.closedAt ? "Cerrada" : isFeatured ? "Pendiente de cierre" : "Activo";

  return { session, participantCount, totalSpent, perPersonShare, status, statusLabel };
}

// Home-dashboard: separa la sesión activa (sin cerrar) del resto del historial local,
// con los totales ya calculados para no repetir esta lógica en cada pantalla.
export function useHomeDashboard() {
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<SessionSummary | null>(null);
  const [recent, setRecent] = useState<SessionSummary[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const sessions = await sessionRepository.listAll();
    const activeSession = sessions.find((s) => !s.closedAt) ?? null;
    const otherSessions = sessions.filter((s) => s.id !== activeSession?.id).slice(0, 5);

    const [activeSummary, recentSummaries] = await Promise.all([
      activeSession ? summarize(activeSession, true) : Promise.resolve(null),
      Promise.all(otherSessions.map((s) => summarize(s, false))),
    ]);

    setActive(activeSummary);
    setRecent(recentSummaries);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { loading, active, recent, refresh };
}
