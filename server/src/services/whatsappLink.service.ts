// RF-01 / EDT 1.1.1.1: genera el link de acceso a la sesión.
// En la versión móvil no se depende de la API paga de WhatsApp Business: el link generado aquí
// es simplemente la URL/deep-link que el cliente abre con wa.me o el Share sheet nativo
// (ver mobile/src/services/whatsapp/shareLink.ts). El servidor solo necesita emitir un shareToken único.
import { v4 as uuid } from "uuid";

export function generateShareToken(): string {
  return uuid();
}

export function buildSessionDeepLink(shareToken: string): string {
  // Esquema propio registrado en app.json (mobile) para abrir la app directamente.
  return `cuentasclaras://join?token=${shareToken}`;
}

// RF-16 / CU-04 A1 / EDT 1.1.4.3: link para compartir la pantalla de resultado.
// Reutiliza el share_token de la sesión (misma capacidad de acceso que el link de invitación,
// consistente con docs/04-arquitectura.md §4.5). Abre la app en la pantalla de Resultado (read-only).
export function buildResultDeepLink(shareToken: string): string {
  return `cuentasclaras://result?token=${shareToken}`;
}
