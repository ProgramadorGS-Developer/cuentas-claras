# 16. Referencia de API (REST + Socket.IO)

| | |
|---|---|
| **Fuente** | `server/src/routes/*.ts`, `server/src/controllers/*.ts`, `server/src/sockets/*.ts` (verificado contra el código el 2026-09-29) |
| **Base URL** | Local: `http://localhost:3000` · Producción: `https://cuentasclaras.runasp.net` |
| **Formato** | JSON sobre REST + eventos Socket.IO. Sin autenticación (ver `docs/04-arquitectura.md` §4.5): el `shareToken` de cada sesión funciona como capacidad de acceso. |

Este documento existe porque, antes de escribirlo, no había un solo lugar
que listara todos los endpoints y eventos — estaban repartidos en 6
archivos de rutas y 3 de sockets, lo que ya causó al menos un desfasaje
real entre lo documentado (`docs/02`/`04`) y lo implementado (RF-08a, ver
`docs/15` §15.2). Cada vez que se agregue o cambie un endpoint, actualizar
esta tabla en el mismo commit.

## 16.1 Sesiones (`sessions.routes.ts`, `sessions.controller.ts`)

| Método y ruta | Body / params | Respuesta OK | Errores |
|---|---|---|---|
| `POST /sessions` | `{ name, hostName, items: string[] }` | `201 { id, name, hostName, createdAt, closedAt, shareToken, hostId }` | — |
| `GET /sessions` | — | `200 [{ id, name, hostName, createdAt, closedAt, shareToken }]` (todas, sin filtrar) | — |
| `GET /sessions/by-token/:token` | — | `200` sesión (camelCase) | `404` link inválido/inexistente |
| `GET /sessions/:sessionId` | — | `200` sesión (`serializeSession`) | `404` no encontrada |
| `PATCH /sessions/:sessionId` | `{ participantId, name?, items? }` | `200` sesión actualizada | `404` no encontrada · `403` no es anfitrión · `409` ya se unió otro participante o está cerrada (edición solo mientras el anfitrión esté solo) |
| `POST /sessions/:sessionId/close` | `{ participantId }` | `200` sesión (`closedAt` seteado) | `404` no encontrada · `403` no es anfitrión · `409` ya estaba cerrada |
| `GET /sessions/shared/:shareToken/result` | — | `200 { session: {name, hostName, closedAt}, result: SessionResult, deepLink, shareText }` | `404` link inválido — **solo lectura, sin login** (RF-16/CU-04 A1) |
| `GET /sessions/:sessionId/items` | — | `200 [Item]` | — |
| `POST /sessions/:sessionId/budget` | `{ participantId, amount }` | `201 SessionResult` | `400` monto inválido (0.01–999999.99, 2 decimales) · `404` participante no pertenece a la sesión |
| `GET /sessions/:sessionId/result` | — | `200 SessionResult` | — |

`GET /join/:token` (ya en `master` y en producción desde el 2026-10-20, verificado): puente HTML que redirige al deep link nativo `cuentasclaras://join?token=...`, necesario porque WhatsApp solo linkea `http(s)://`. Con un token real responde 200 con un botón "Abrir en la app" y redirección automática; con un token inexistente responde 404 con una página de "link inválido" (no es el 404 genérico de Express). La respuesta de `POST /sessions` incluye además `joinUrl`.

## 16.2 Participantes (`users.routes.ts`)

| Método y ruta | Body | Respuesta OK | Errores |
|---|---|---|---|
| `POST /sessions/:sessionId/participants` | `{ name }` (mín. 2 caracteres) | `201 { id, sessionId, name, isHost: false, joinedAt }` | `400` nombre faltante/corto · `404` sesión no encontrada · `409` sesión cerrada |
| `GET /sessions/:sessionId/participants` | — | `200 [Participant]` (snake_case tal cual la fila de SQLite, sin `toCamel`) | — |

## 16.3 Ítems (`items.routes.ts`, `items.controller.ts`)

`serializeItem` (forma común de un ítem en toda respuesta):
```ts
{ id, sessionId, name, status: "pendiente"|"comprado", reservedBy, observation, pricePaid, ticketImageUri, updatedAt }
```

| Método y ruta | Body | Respuesta OK | Errores |
|---|---|---|---|
| `POST /items/:itemId/reserve` | `{ participantId }` | `200 Item` — arbitraje atómico, gana quien llega primero (`docs/12`) | `400` falta participantId · `404` ítem/participante no encontrado · `409 { error, reservedBy, reservedByName }` ya reservado por otro · `409` ya comprado |
| `POST /items/:itemId/release` | `{ participantId }` | `200 Item` | `400` falta participantId · `404` no encontrado · `403` solo el titular libera (RF-06) |
| `POST /items/:itemId/purchase` | `{ participantId, pricePaid }` | `200 Item` (además dispara `broadcastResultUpdated`) | `400` falta participantId o precio inválido · `404` no encontrado · `409` ya comprado / no es el titular (RF-07) |
| `POST /items/:itemId/ticket` | `{ ticketImageUri }` | `200 { ok: true }` — solo actualiza el campo, sin validar archivo | — |
| `POST /items/:itemId/ticket-upload` | `multipart/form-data`, campo `ticket` (imagen, máx. 8MB) | `200 { url }` (`/uploads/<archivo>`, servido estático) | `400` falta el archivo |

`esMontoValido`: número entre 0 y 999999.99 con hasta 2 decimales (0 se acepta a propósito, ver comentario en el controller — un ítem puede "regalarse").

## 16.4 Otros

- `GET /health` → `200 { ok: true }`.
- `/uploads/*` servido estático desde `config.uploadsDir` (montado antes de los routers en `app.ts`).

## 16.5 Eventos de Socket.IO

Un solo `httpServer` sirve HTTP y WebSocket (mismo dominio/puerto, ver `server/src/index.ts`). El cliente se une a una sala por sesión (`session:<id>`) — ver `joinSessionRoom` en el mobile.

### Vigentes (usados por el cliente actual)

| Evento | Quién lo emite | Payload | Cuándo |
|---|---|---|---|
| `item:updated` | Servidor → sala `session:<id>` | `Item` (serializeItem) | Tras reserve/release/purchase |
| `session:closed` | Servidor → sala `session:<id>` | Sesión (`serializeSession`) | Tras `POST /sessions/:id/close` |
| `result:updated` | Servidor → sala `session:<id>` | `SessionResult` | Tras un aporte de presupuesto o una compra (recalcula el balance) |

El cliente no emite ningún evento propio para reservar/liberar/comprar —
esas tres acciones son siempre REST. El único uso de sockets del lado
cliente es unirse a la sala y escuchar estos tres eventos.

### Legado — registrados en el servidor pero sin ningún cliente que los use

`server/src/sockets/reservation.handlers.ts` sigue activo (lo llama
`sockets/index.ts` en cada conexión), pero implementa el diseño **viejo**
de negociación por cola, reemplazado por el arbitraje atómico REST de
`docs/12` (Fase 1+3). Nadie en el cliente mobile emite estos eventos hoy:

| Evento | Sentido | Estado |
|---|---|---|
| `session:join` | Cliente → servidor | Legado, sin uso |
| `reserve:attempt` | Cliente → servidor | Legado — reemplazado por `POST /items/:id/reserve` |
| `reserve:respond` | Cliente → servidor | Legado — el modelo de "insistir/ceder" nunca se completó (Fase 2 de `docs/12`, pendiente) |
| `item:release` | Cliente → servidor | Legado — reemplazado por `POST /items/:id/release` |
| `reserve:conflict` | Servidor → cliente (`reservationQueue.service.ts`) | Legado, sin listener |
| `reserve:granted` | Servidor → cliente (`reservationQueue.service.ts`) | Legado, sin listener |

Borrar `reservationQueue.service.ts` y `reservation.handlers.ts` es la
Fase 4 pendiente de `docs/12` (tarjeta 1.1.3.2 del tablero) — mientras no
se borre, cualquiera que lea el código de sockets puede confundirse
pensando que ese mecanismo sigue vigente. Si tocás este código, no le
agregues features nuevas: es candidato a borrado, no a mantenimiento.

## 16.6 Modelos de dominio compartidos

`BalanceEntry`, `SettlementTransfer` y `SessionResult`
(`server/src/services/balance.service.ts`) son **idénticos** a los tipos
del mismo nombre en `mobile/src/domain/models.ts` — el cliente los
consume directo, sin transformar nada:

```ts
interface BalanceEntry { participantId; participantName; contributed; spent; net }
interface SettlementTransfer { fromParticipantId; toParticipantId; amount }
interface SessionResult {
  sessionId;
  totals: { spent; contributed; noBudgetLoaded };
  balances: BalanceEntry[];
  transfers: SettlementTransfer[];
}
```

Fórmula (`docs/05-modelo-de-datos.md` §5.3): si nadie cargó presupuesto
(`noBudgetLoaded`), el gasto se reparte en partes iguales; si alguien
cargó, el balance es `aportado − gastado` por participante.
