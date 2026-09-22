// EDT 1.1.1.1: página puente del link de invitación. WhatsApp solo vuelve clickeables los links
// http(s), así que el link compartido apunta acá y esta página salta al esquema nativo
// (cuentasclaras://) que abre la app en la sesión. Si la app no está instalada el salto no hace
// nada y queda a la vista el botón de descarga del APK.

interface JoinPageOptions {
  sessionName?: string;
  deepLink?: string;
  apkUrl: string;
  error?: string;
}

// El nombre de la sesión lo escribe el usuario: sin escapar, un nombre con HTML adentro se
// ejecutaría en el navegador de quien abre el link.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderJoinPage({ sessionName, deepLink, apkUrl, error }: JoinPageOptions): string {
  const body = error
    ? `<p class="error">${escapeHtml(error)}</p>`
    : `<p class="lead">Te invitaron a la sesión<br /><strong>${escapeHtml(sessionName ?? "")}</strong></p>
       <a class="btn primary" href="${escapeHtml(deepLink ?? "")}">Abrir en la app</a>`;

  // El salto automático va con un pequeño retraso: si se dispara durante la carga, algunos
  // navegadores lo bloquean y la página queda en blanco sin mostrar el botón de descarga.
  const autoOpen = deepLink
    ? `<script>setTimeout(function () { location.href = ${JSON.stringify(deepLink)}; }, 400);</script>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>CuentasClaras</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    padding: 24px; background: #F4F6F5; color: #10182F;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  main { width: 100%; max-width: 380px; text-align: center; background: #fff;
         border-radius: 22px; padding: 32px 24px; box-shadow: 0 12px 28px rgba(16,24,40,.08); }
  h1 { margin: 0 0 20px; font-size: 22px; color: #2E7D32; }
  .lead { margin: 0 0 24px; font-size: 16px; line-height: 1.5; }
  .error { margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #B3261E; }
  .btn { display: block; padding: 14px 20px; border-radius: 999px; font-weight: 700;
         text-decoration: none; font-size: 15px; }
  .primary { background: #2E7D32; color: #fff; }
  .secondary { background: #E8F0E9; color: #1B5E20; }
  .hint { margin: 28px 0 12px; font-size: 14px; color: #5B6472; }
  @media (prefers-color-scheme: dark) {
    body { background: #10182F; color: #F4F6F5; }
    main { background: #1B2440; box-shadow: none; }
    .secondary { background: #24365C; color: #C8E6C9; }
    .hint { color: #A9B2C1; }
  }
</style>
</head>
<body>
  <main>
    <h1>CuentasClaras</h1>
    ${body}
    <p class="hint">¿Todavía no tenés la app instalada?</p>
    <a class="btn secondary" href="${escapeHtml(apkUrl)}">Descargar la app</a>
  </main>
  ${autoOpen}
</body>
</html>`;
}
