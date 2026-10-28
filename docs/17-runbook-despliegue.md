# 17. Runbook de despliegue (cómo funciona de verdad, hoy)

`docs/09-despliegue.md` describe **opciones recomendadas en general**
(Railway, Render, VPS). Este documento describe **lo que el equipo eligió
y tiene corriendo realmente**: MonsterASP.net para el backend, EAS para
la app. Si en algún momento se migra de proveedor, actualizar este doc,
no `docs/09`.

## 17.1 Backend en MonsterASP.net

**Panel**: `admin.monsterasp.net`, sitio `sitio88814` (`cuentasclaras.runasp.net`).

### Cómo publicar un cambio (paso a paso, manual — no automático)

Pese a que la sección se llama "Despliegue de git", **no hay CI/CD real**:
nadie se entera de un push nuevo salvo que entre acá y lo dispare a mano.

1. Entrar a **Despliegue de git** en el panel.
2. Apretar **"Saca la última"** — hace `git pull` de la rama configurada
   (confirmar que sea `production`) a una carpeta de staging (`/.source`).
   Esto solo trae el código, no publica nada todavía.
3. Apretar **"Construir y publicar"** — instala dependencias, corre
   `npm run build` (que compila con `tsc` y copia `schema.sql`, ver
   `docs/11`) y publica el resultado en `/wwwroot`, el sitio en vivo.
   Tarda unos minutos.
4. Revisar el log en "Versiones recientes" — si dice algo tipo *"blocked
   by group policy"*, es la misma familia de problema de `docs/11`
   (Windows/IIS bloqueando ejecutar un binario externo).
5. Verificar en vivo: `curl https://cuentasclaras.runasp.net/health` debe
   dar `{"ok":true}`, y una ruta más nueva (ej.
   `GET /sessions/shared/x/result`) debe dar `404 {"error":"Sesión no
   encontrada o link inválido"}` — si en cambio da el 404 genérico de
   Express ("Cannot GET ..."), esa ruta específica no llegó todavía.
6. Si el build fue bien pero el sitio sigue viejo: usar **"Reinicio"**
   (arriba a la derecha) — evitar **"Reinicio (difícil)"** salvo que lo
   anterior no alcance, está marcado como riesgoso a propósito.

### Configuración fija del sitio

- **Proyecto**: `servidor package.json` (o sea `server/package.json`, no
  la raíz del monorepo).
- **Comando de inicio**: `.\dist\index.js`.
- **Variables de entorno** (equivalentes a `server/.env.example`, se
  configuran en el panel, no como archivo `.env` en el servidor):
  `PORT`, `DB_FILE`, `UPLOADS_DIR`, `CORS_ORIGIN`, y `PUBLIC_BASE_URL`
  (esta última solo existe en la rama `production`, para armar la URL del
  puente `/join/:token` — ver `docs/16` §16.1).

### Limitaciones conocidas de este hosting (ver `docs/11` para el detalle completo)

1. No compila código nativo (`node-gyp` bloqueado por política de grupo)
   → por eso el backend usa `node:sqlite`, no `better-sqlite3`.
2. `tsc` invocado vía su `.cmd` también está bloqueado → el `build` script
   lo invoca directo con `node node_modules/typescript/bin/tsc`.
3. `schema.sql` no es TypeScript, `tsc` no lo copia a `dist/` solo →
   `server/scripts/copy-schema.js` lo hace a mano después del build.
4. WebSocket: **confirmado el 2026-10-20** — una conexión Socket.IO
   forzada a `websocket` (sin polling) contra producción conecta bien. Ojo:
   un `curl` a una ruta REST no prueba esto; si se quiere re-verificar, usar
   `socket.io-client` con `transports: ["websocket"]`.
5. Sin confirmar: si `UPLOADS_DIR` (disco local para fotos de tickets)
   persiste entre redeploys, o si un "Construir y publicar" nuevo lo
   borra. Si se pierde, migrar a un bucket externo (S3/Cloudinary) sin
   cambiar el contrato del endpoint `ticket-upload` (`docs/09` §9.1 ya lo
   anticipa).

## 17.2 App móvil con EAS Build

```bash
cd mobile
npm install -g eas-cli   # o npx eas-cli, sin instalar global
eas login                # cuenta con acceso a la organización Expo "cuentasclaras"
eas build --platform android --profile preview
```

`mobile/app.json` → `owner: "cuentasclaras"`: el build tiene que correr
con una cuenta Expo invitada a esa organización (expo.dev → Members). Sin
la invitación, `eas build` falla con un error de permisos que **no tiene
nada que ver con GitHub** — son cuentas y permisos completamente
separados. Ver el hilo del 2026-09-16 con Pablo si vuelve a pasar.

### Problema conocido: `expo-sqlite` no compila en EAS

`expo-sqlite` descarga el código fuente de SQLite desde `sqlite.org`
durante el build nativo de Android — los workers de EAS no llegan a ese
host (`java.net.SocketException: Network is unreachable`,
[expo/eas-cli#2321](https://github.com/expo/eas-cli/issues/2321)).
Solución: vendorizar el zip localmente
(`mobile/vendor/sqlite/sqlite-amalgamation-*.zip`) y copiarlo antes de
que corra Gradle.

**Ojo**: el hook `eas-build-post-install` **no lo ejecuta EAS realmente**
— se descubrió en `production` (commit `f17240e`, 2026-09-22). Desde el
2026-10-20 la solución definitiva **ya está en `master`**: un script
`postinstall` (que sí corre siempre en `npm install`), la variable
`REACT_NATIVE_DOWNLOADS_DIR` en `eas.json`, y un parche de `patch-package`
sobre `expo-sqlite` (`mobile/patches/`, commit `c863a3b`, de Pablo):

```json
// mobile/package.json
"scripts": { "postinstall": "patch-package && node scripts/prepare-sqlite.js" }
```
```json
// mobile/eas.json, en cada perfil de build
"env": { "REACT_NATIVE_DOWNLOADS_DIR": "/tmp/expo-sqlite-downloads" }
```

Un build de EAS desde `master` ya no debería fallar por esto. Lo que
todavía **no se confirmó** con una corrida real en la nube es que ese
build termine bien de punta a punta — el primer intento desde `master`
actualizado sigue siendo la prueba.

### Apuntar el build al backend correcto

`mobile/app.json` → `extra.apiUrl` / `extra.socketUrl` son **fijos** —
`eas build` corre en la nube de Expo y no lee tu `.env` local (eso solo
lo usa `expo start` en tu propia máquina). Confirmar que apunten a
`https://cuentasclaras.runasp.net` (nunca `localhost`) antes de generar un
build para repartir al equipo.

## 17.3 Orden recomendado para generar un build nuevo

1. Estar parado en `master` actualizado (`git fetch` + `git log
   master..origin/master` vacío). Los commits de `production` ya se
   integraron a `master` el 2026-10-20.
2. Confirmar que el backend en producción está al día
   (`curl .../health`, y una ruta reciente; para el puente de WhatsApp,
   `GET /join/<token real>` debe devolver 200 con el botón "Abrir en la app").
3. `eas build --platform android --profile preview`.
4. Instalar el `.apk` resultante en un dispositivo real y probar el flujo
   completo (`docs/20-tutorial-inicio-rapido.md` tiene los pasos).
