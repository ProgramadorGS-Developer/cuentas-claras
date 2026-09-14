import { useSessionStore } from "@/store/sessionStore";
import { useUserStore } from "@/store/userStore";
import { Session } from "@/domain/models";

// Punto único para "entrar" a una sesión desde el Home/Historial: si ya nos identificamos
// como participante en esta corrida de la app, vamos directo a las tabs; si no (por ejemplo,
// tras reabrir la app), CU-01 pide el nombre de nuevo antes de continuar. Cuando quien llama
// ya tiene el objeto Session a mano (ej. el historial local), lo pasamos para que
// EnterNameScreen no tenga que volver a buscarlo.
export function goToSession(navigation: any, sessionId: string, session?: Session) {
  const { session: activeSession } = useSessionStore.getState();
  const { participantId } = useUserStore.getState();

  if (activeSession?.id === sessionId && participantId) {
    navigation.replace("Tabs");
  } else {
    navigation.navigate("EnterName", { sessionId, session });
  }
}
