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

// URL propia y estable para el APK: redirige a config.apkUrl (ver /descargar en sessions.routes.ts).
export function buildApkDownloadUrl(): string {
  return `${config.publicBaseUrl}/descargar`;
}

// Mensaje listo para compartir por WhatsApp: invitación arriba, instalación abajo. Se arma acá
// (y no en la app) para que el link y el texto salgan de una sola fuente, igual que
// buildResultShareText.
export function buildSessionInviteText(sessionName: string, shareToken: string): string {
  return [
    `Sumate a la sesión "${sessionName}" en CuentasClaras:`,
    buildSessionJoinUrl(shareToken),
    "",
    "Si todavía no tenés la app instalada, descargala acá:",
    buildApkDownloadUrl(),
  ].join("\n");
}

// RF-16 / CU-04 A1 / EDT 1.1.4.3: link para compartir la pantalla de resultado.
// Reutiliza el share_token de la sesión (misma capacidad de acceso que el link de invitación,
// consistente con docs/04-arquitectura.md §4.5). Abre la app en la pantalla de Resultado (read-only).
export function buildResultDeepLink(shareToken: string): string {
  return `cuentasclaras://result?token=${shareToken}`;
}
