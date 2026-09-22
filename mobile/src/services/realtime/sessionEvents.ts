import { getSocket } from "./socket";

// RF-04: el servidor emite "session:closed" cuando el anfitrión cierra la sesión,
// para que los demás dispositivos lo reflejen sin reabrir la app.
export function onSessionClosed(cb: (session: any) => void) {
  getSocket().on("session:closed", cb);
  return () => {
    getSocket().off("session:closed", cb);
  };
}
