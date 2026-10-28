# 19. Problemas conocidos y soluciones (FAQ técnico)

Cada entrada acá es un problema real que el equipo ya pisó, con la causa
raíz y la solución que funcionó — para no volver a perder el tiempo
redescubriéndolo. Si encontrás uno nuevo que te tomó más de 15 minutos
resolver, agregalo.

## 19.1 Backend / hosting

**"npm error ... blocked by group policy" al instalar o compilar en MonsterASP.net**
Causa: el hosting compartido de MonsterASP bloquea ejecutar binarios
nativos/externos (`node-gyp`, y también `.cmd` como el de `tsc`). Pasó dos
veces por motivos distintos — ver `docs/11` completo. Solución ya
aplicada: `node:sqlite` en vez de `better-sqlite3`, e invocar `tsc`
directo con `node` en vez de vía su `.cmd`.

**El sitio en producción responde con código viejo después de pushear**
Causa: el "Git deploy" de MonsterASP **no es automático** — hace falta
entrar al panel y apretar "Pull latest" + "Build & publish" a mano después
de cada push a `production`. Ver el paso a paso completo en
`docs/17-runbook-despliegue.md` §17.1.

**El backend responde bien a REST pero no se sabe si Socket.IO funciona**
Un `curl` a una ruta REST no prueba nada sobre WebSocket. Se verificó el
2026-10-20 con `socket.io-client` forzado a `transports: ["websocket"]`
contra producción: conecta bien (la primera conexión tardó ~5 s, por el
arranque en frío del sitio). Si vuelve a dudarse, repetir esa misma
prueba en vez de asumir.

## 19.2 Build de Android / EAS

**`eas build` falla con un error de permisos, y no tiene que ver con GitHub**
Confusión real que tuvo Pablo: ser colaborador del repo de GitHub no da
ningún permiso sobre el proyecto Expo. `mobile/app.json` tiene
`"owner": "cuentasclaras"` — hay que estar invitado a esa organización en
expo.dev (Members), con una cuenta de **Expo**, no de GitHub.

**`:expo-sqlite:downloadSQLite` falla con `Network is unreachable` en EAS**
`expo-sqlite` intenta descargar el código fuente de SQLite desde
`sqlite.org` durante el build nativo, y los workers de EAS no llegan a ese
host ([expo/eas-cli#2321](https://github.com/expo/eas-cli/issues/2321)).
Solución: vendorizar el zip (`mobile/vendor/sqlite/`) + copiarlo antes de
Gradle. Detalle completo, incluido un sub-problema (el hook
`eas-build-post-install` no lo ejecuta EAS de verdad), en
`docs/17-runbook-despliegue.md` §17.2.

**Build de Gradle local falla con `ninja: error: manifest 'build.ninja' still dirty after 100 tries`**
Pasó al intentar un build de debug 100% local (sin EAS) en Windows. Causa
más probable: un espacio en la ruta del proyecto (ej. `...\Cuentas
Claras\...`) — CMake/ninja en Windows no maneja bien las rutas con
espacios en algunos casos. Solución que funcionó: copiar el proyecto a
una ruta sin espacios (ej. `C:\dev\cuentas-claras`) y compilar desde ahí.
Causa alternativa a probar si el problema persiste: antivirus (Windows
Defender) escaneando en tiempo real la carpeta de build — requiere agregar
una exclusión (necesita permisos de administrador).

**El `.apk` de debug pesa demasiado para compartirlo fácil**
Un build de debug de Expo/RN incluye las 4 arquitecturas de CPU sin
comprimir ni minificar (puede pesar 150-200MB). Para compartir con el
equipo conviene un build de EAS (`--profile preview`), que sí optimiza, o
generar un build de `release` firmado con un keystore.

## 19.3 App móvil (general)

**Cambiar `mobile/.env` no tiene ningún efecto**
`app.json` tenía `extra.apiUrl`/`extra.socketUrl` **hardcodeados** — Expo
resuelve `Constants.expoConfig.extra` desde ese JSON fijo, no desde
`.env`. Solución: `mobile/app.config.js` (config dinámico) lee
`process.env.API_URL`/`SOCKET_URL` con fallback al valor de `app.json` —
pero esto **solo funciona con `expo start` en tu máquina**, no en un
build de EAS (que no lee tu `.env` local en absoluto, ver `docs/17` §17.2
"Apuntar el build al backend correcto").

**`better-sqlite3` no instala en Windows con Node nuevo**
No hay binario prebuilt para la combinación de versiones y no había
Visual C++ Build Tools instalados. Ya no aplica del lado del servidor
(migrado a `node:sqlite`); si aparece en algún otro contexto, la solución
más simple es bumpear a una versión de `better-sqlite3` con prebuilt
disponible para tu Node, o instalar las Build Tools.

## 19.4 Tablero / proceso

**Una tarjeta archivada "success: true" sigue apareciendo en el tablero**
Pasó más de una vez con `edit_card(archived: true)` de CollabKit — a
veces es un desfasaje de sincronización del lado de CollabKit/Trello, no
un error real de la llamada. Si vuelve a pasar: reintentar el archivado
una vez más antes de asumir que es un bug de otra cosa.

**El mismo ticket EDT aparece en dos columnas con contenido distinto**
Causa raíz identificada en la auditoría de `docs/15`: cuando se completa
un trabajo y "se archiva un duplicado", a veces queda el duplicado vacío
en vez del real, o directamente no se mueve la tarjeta correcta de
columna. Antes de dar un ticket por perdido/duplicado, revisar el
registro de trabajo (`get_worklog_history`) por el `trelloCardId` exacto
— ahí queda registrado cuál copia es la que tiene el trabajo real.
