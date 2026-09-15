// RF-01 / EDT 1.1.1.1: genera el link de acceso a la sesión.
// En la versión móvil no se depende de la API paga de WhatsApp Business: el link generado aquí
// es simplemente la URL/deep-link que el cliente abre con wa.me o el Share sheet nativo
// (ver mobile/src/services/whatsapp/shareLink.ts). El servidor solo necesita emitir un shareToken único.
import { v4 as uuid } from "uuid";
import { config } from "../config/env";

export function generateShareToken(): string {
  return uuid();
}

// Link público (http/https) para compartir por WhatsApp: WhatsApp solo vuelve clickeables los
// links http(s), no esquemas propios. Al abrirse, GET /join/:token redirige al deep link nativo.
export function buildSessionJoinUrl(shareToken: string): string {
  return `${config.publicBaseUrl}/join/${shareToken}`;
}

export function buildSessionDeepLink(shareToken: string): string {
  // Esquema propio registrado en app.json (mobile) para abrir la app directamente.
  return `cuentasclaras://join?token=${shareToken}`;
}
