# 11. Cambios de código realizados para poder desplegar el backend

Este documento registra tres cambios puntuales hechos en `server/` el
2026-09-01, durante el trabajo de selección y configuración de hosting
(alcance: 1.1 "Selección y configuración del alojamiento" del EDT). No
modifican ninguna regla de negocio ni el modelo de datos: son ajustes de
infraestructura de build/runtime necesarios para que el backend arranque
en un proveedor de hosting real, algo que hasta ahora nunca se había
probado (solo se había corrido en local con `npm run dev`).

## Cambio 1 — Driver de SQLite: `better-sqlite3` → `node:sqlite`

**Archivo:** `server/src/db/connection.ts`

Código anterior:

```ts
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config/env";

// Conexión única a la base SQLite del servidor (fuente de verdad para todos los clientes).
fs.mkdirSync(path.dirname(config.dbFile), { recursive: true });

export const db = new Database(config.dbFile);
db.pragma("journal_mode = WAL"); // mejor concurrencia de lecturas/escrituras, clave para RF-08.
//Activación de foreign keys para que se cumplan las restricciones de integridad referencial.Pablo Casi.
db.pragma("foreign_keys = ON"); // SQLite no enforcea FKs por defecto; sin esto los REFERENCES del schema son solo documentación.

const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
db.exec(schema);
```

Código nuevo:

```ts
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config/env";

// Conexión única a la base SQLite del servidor (fuente de verdad para todos los clientes).
fs.mkdirSync(path.dirname(config.dbFile), { recursive: true });

export const db = new DatabaseSync(config.dbFile);
db.exec("PRAGMA journal_mode = WAL"); // mejor concurrencia de lecturas/escrituras, clave para RF-08.
//Activación de foreign keys para que se cumplan las restricciones de integridad referencial.Pablo Casi.
db.exec("PRAGMA foreign_keys = ON"); // SQLite no enforcea FKs por defecto; sin esto los REFERENCES del schema son solo documentación.

const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
db.exec(schema);
```

**Archivo:** `server/src/db/schema.sql` (solo el comentario de encabezado, línea 2)

Código anterior:
```sql
-- Motor: SQLite (better-sqlite3). Ver docs/05-modelo-de-datos.md para el diccionario de datos completo
```

Código nuevo:
```sql
-- Motor: SQLite (node:sqlite). Ver docs/05-modelo-de-datos.md para el diccionario de datos completo
```

**Archivo:** `server/package.json`

Código anterior (fragmentos relevantes):
```json
"dependencies": {
  "better-sqlite3": "^13.0.3",
  "cors": "^2.8.5",
  "dotenv": "^16.4.5",
  "express": "^4.19.2",
  "multer": "^1.4.5-lts.1",
  "socket.io": "^4.7.5",
  "uuid": "^9.0.1"
},
"devDependencies": {
  "@types/better-sqlite3": "^9.6.0",
  "@types/cors": "^2.8.17",
  "@types/express": "^4.17.21",
  ...
  "@types/node": "^20.14.2",
  ...
}
```

Código nuevo:
```json
"dependencies": {
  "cors": "^2.8.5",
  "dotenv": "^16.4.5",
  "express": "^4.19.2",
  "multer": "^1.4.5-lts.1",
  "socket.io": "^4.7.5",
  "uuid": "^9.0.1"
},
"devDependencies": {
  "@types/cors": "^2.8.17",
  "@types/express": "^4.17.21",
  ...
  "@types/node": "^22.10.0",
  ...
}
```

`@types/node` se actualizó de `^20.14.2` a `^22.10.0` porque las
declaraciones de tipos de `node:sqlite` para TypeScript recién existen en
versiones de `@types/node` alineadas con Node 22+ (antes tampoco
coincidía con el Node 22 que ya fija `mise.toml` — quedó desactualizado
sin que afectara nada, porque `better-sqlite3` traía sus propios tipos
independientes).

## Cambio 2 — Copiar `schema.sql` al compilar (`server/dist/`)

**Archivo nuevo:** `server/scripts/copy-schema.js`

```js
const fs = require("node:fs");
const path = require("node:path");

// tsc solo compila archivos .ts a dist/; schema.sql no es TypeScript, así que
// hay que copiarlo a mano para que connection.ts lo encuentre en producción.
const src = path.join(__dirname, "..", "src", "db", "schema.sql");
const dest = path.join(__dirname, "..", "dist", "db", "schema.sql");

fs.copyFileSync(src, dest);
```

**Archivo:** `server/package.json` (script `build`)

Código anterior:
```json
"build": "tsc -p tsconfig.json",
```

Código nuevo (primera versión, ver Cambio 3 para el ajuste final):
```json
"build": "tsc -p tsconfig.json && node scripts/copy-schema.js",
```

## Cambio 3 — Invocar `tsc` directamente con `node`, no vía su `.cmd`

**Archivo:** `server/package.json` (script `build`)

Código anterior:
```json
"build": "tsc -p tsconfig.json && node scripts/copy-schema.js",
```

Código nuevo:
```json
"build": "node node_modules/typescript/bin/tsc -p tsconfig.json && node scripts/copy-schema.js",
```

---

## Por qué se hicieron estos cambios

Al intentar desplegar el backend por primera vez en un hosting real
(hasta ahora solo se había corrido en local con `npm run dev`), aparecieron
dos problemas que nunca se habían manifestado en desarrollo. Se probó en
dos proveedores distintos y cada uno destapó uno de los dos problemas:

### Limitación 1 — Compilación nativa bloqueada (encontrada en MonsterASP.net)

`better-sqlite3` no es JavaScript puro: tiene una parte en C++ que se
compila durante `npm install` con una herramienta llamada `node-gyp`.
Al intentar el deploy automático en MonsterASP.net (hosting compartido
Windows/IIS), el build falló con:

```
npm error command C:\Windows\system32\cmd.exe /d /s /c node-gyp rebuild
npm error This program is blocked by group policy. For more information, contact your system administrator.
```

El proveedor bloquea explícitamente la compilación de código nativo en
sus servidores compartidos gratuitos. Esto no depende de qué tipo de
deploy se elija (Git deploy automático o FTP manual con build en el
servidor): cualquier intento de correr `npm install` de `better-sqlite3`
ahí falla igual.

**Por qué `node:sqlite`:** es el módulo de SQLite incorporado en el propio
Node.js (disponible desde Node 22.5, sin necesidad de flag desde Node
22.13) — no requiere compilar nada, viene con el runtime. Expone el mismo
patrón de API que ya usaba el resto del código (`db.prepare(sql).get()`,
`.all()`, `.run()`), así que **no hizo falta tocar ningún archivo del
proyecto salvo `connection.ts`** — los 8 archivos restantes que consultan
la base (`controllers/`, `services/`, `routes/`) siguen exactamente
iguales.

**Alternativas consideradas y descartadas:**
- Seguir con `better-sqlite3`, compilando en la máquina local y subiendo
  `node_modules` ya armado por FTP manual: viable, pero obliga a repetir
  ese proceso a mano en cada actualización — mucha fricción para un
  proyecto que va a seguir teniendo cambios seguido.
- Migrar a otro motor (Postgres/MSSQL): cambio mucho más grande, implica
  reescribir el esquema y las queries; no se justifica solo para resolver
  un problema de hosting.

### Limitación 2 — `schema.sql` no llegaba a `dist/` (encontrada en Railway)

Con `better-sqlite3` reemplazado, se probó igual el deploy en Railway (que
sí compila nativo sin restricciones) para descartar que el primer
problema fuera el único. Ahí el build terminó bien, pero la app se caía
al arrancar:

```
Error: ENOENT: no such file or directory, open '/app/dist/db/schema.sql'
    at Object.<anonymous> (/app/dist/db/connection.js:17:34)
```

Causa: el script de build (`tsc -p tsconfig.json`) solo compila archivos
`.ts` a `.js`. `schema.sql` no es TypeScript, así que el compilador nunca
lo copia a `dist/`. En desarrollo (`npm run dev`, que corre con `tsx`
directo desde `src/`) esto nunca se notó, porque ahí `schema.sql` sí está
al lado del código fuente. El bug solo aparece al correr la versión
compilada (`npm run build` + `npm start`) — que es exactamente lo que
hace cualquier hosting en producción, sin importar cuál.

Es decir: **este bug iba a pasar en MonsterASP.net igual que en Railway**,
independientemente de qué driver de SQLite se usara — no tiene relación
con el cambio 1.

**Solución:** un paso explícito de copia (`server/scripts/copy-schema.js`)
después de `tsc`, ya que el compilador no lo hace por diseño.

### Limitación 3 — La misma política de grupo también bloqueaba `tsc` (encontrada en MonsterASP.net, segundo intento)

Con los cambios 1 y 2 ya subidos, se reintentó el deploy en MonsterASP.net.
`npm install` esta vez funcionó sin problema (ya no intenta compilar nada
nativo), pero `npm run build` falló con el mismo mensaje que había dado
`node-gyp`:

```
Running: npm run build
> tsc -p tsconfig.json && node scripts/copy-schema.js
This program is blocked by group policy. For more information, contact your system administrator.
npm run build failed (exit=1), site not changed.
```

Causa: en Windows, `tsc` no se ejecuta directo — el script `.bin/tsc.cmd`
que genera `npm` es en sí mismo un programa separado (un `.cmd`), y la
política de grupo del hosting bloquea la ejecución de programas externos
así, igual que había bloqueado `node-gyp`. En cambio, `node
scripts/copy-schema.js` sí corrió bien en el intento anterior, porque ahí
el único programa que se ejecuta es `node.exe` (ya permitido).

**Solución:** invocar el compilador de TypeScript directamente con `node`
(`node node_modules/typescript/bin/tsc ...`) en vez de a través de su
atajo `.cmd` — mismo compilador, mismo resultado, pero sin que Windows
tenga que lanzar un programa externo adicional.

## Qué se verificó localmente antes de dar esto por resuelto

- `npm install` en `server/`: instala sin intentar compilar nada nativo
- `npm run build` (con el `tsc` invocado vía `node`, cambio 3 incluido):
  compila y genera `dist/db/schema.sql` correctamente
- Arranque manual de `node dist/index.js`: conecta a la base, aplica el
  schema y responde a pedidos HTTP sin errores
- `npm test`: 8/8 tests pasan igual que antes de los tres cambios

Pendiente: repetir el intento de deploy en MonsterASP.net con los tres
cambios ya subidos a la rama `production`, para confirmar que resuelven
el problema también en el entorno real del proveedor.
