import { useCallback, useEffect, useState } from "react";
import { sessionRepository } from "@/database/repositories/sessionRepository";
import { userRepository } from "@/database/repositories/userRepository";
import { itemRepository } from "@/database/repositories/itemRepository";
import { Session } from "@/domain/models";
import { StatusPillVariant } from "@/components/common/StatusPill";
import { joinSessionRoom } from "@/services/realtime/socket";
import { onSessionClosed } from "@/services/realtime/sessionEvents";

export interface SessionSummary {
  session: Session;
  participantCount: number;
  totalSpent: number;
  perPersonShare: number;
  status: StatusPillVariant;
  statusLabel: string;
}

// Importante: las consultas a SQLite van SIEMPRE en serie (nunca Promise.all entre ellas).
// expo-sqlite en Android no tolera bien múltiples queries concurrentes sobre la misma
// conexión — dispararlas en paralelo puede colgar el hilo nativo (se vio como "la app se
// congela sola a los pocos segundos" en dispositivo real; en web no aparece porque ahí
// SQLite ni siquiera está disponible).
async function summarize(session: Session, isFeatured: boolean): Promise<SessionSummary> {
  const participants = await userRepository.listBySession(session.id);
  const items = await itemRepository.listBySession(session.id);
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
    try {
      const sessions = await sessionRepository.listAll();
      const activeSession = sessions.find((s) => !s.closedAt) ?? null;
      const otherSessions = sessions.filter((s) => s.id !== activeSession?.id).slice(0, 5);

      const activeSummary = activeSession ? await summarize(activeSession, true) : null;
      const recentSummaries: SessionSummary[] = [];
      for (const s of otherSessions) {
        recentSummaries.push(await summarize(s, false));
      }

      setActive(activeSummary);
      setRecent(recentSummaries);
    } catch {
      // Sin caché local todavía (o SQLite no disponible, ej. preview web): dashboard vacío.
      setActive(null);
      setRecent([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // RF-04: si el anfitrión cierra la sesión desde otro dispositivo, este Home lo refleja
  // sin esperar a que el usuario reabra la app (ver server/src/sockets/broadcast.ts).
  const activeSessionId = active?.session.id;
  useEffect(() => {
    if (!activeSessionId) return;
    joinSessionRoom(activeSessionId);

    const unsubscribe = onSessionClosed(async (raw) => {
      if (raw.id !== activeSessionId) return;
      await sessionRepository.upsert(raw);
      refresh();
    });

    return unsubscribe;
  }, [activeSessionId, refresh]);

  return { loading, active, recent, refresh };
}
