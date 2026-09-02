import { useSessionStore } from "@/store/sessionStore";
import { useUserStore } from "@/store/userStore";

// Punto único para "entrar" a una sesión desde el Home/Historial: si ya nos identificamos
// como participante en esta corrida de la app, vamos directo a las tabs; si no (por ejemplo,
// tras reabrir la app), CU-01 pide el nombre de nuevo antes de continuar.
export function goToSession(navigation: any, sessionId: string) {
  const { session } = useSessionStore.getState();
  const { participantId } = useUserStore.getState();

  if (session?.id === sessionId && participantId) {
    navigation.replace("Tabs");
  } else {
    navigation.navigate("EnterName", { sessionId });
  }
}
