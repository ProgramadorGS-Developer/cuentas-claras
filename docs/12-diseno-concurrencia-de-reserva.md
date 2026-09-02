# 12. Diseño de concurrencia de reserva (algoritmo de prioridad)

| | |
|---|---|
| **Paquete de trabajo (EDT)** | 1.1.3.1 — Algoritmo de prioridad de reserva |
| **Requisitos afectados** | RF-05, RF-06, RF-07, RF-08, RF-08a / CU-02, CU-02a |
| **Estado** | Aprobado por el Tech Lead — base para las fases de Backend y Cliente |
| **Fecha** | 2026-08-31 (análisis) · 2026-09-01 (aprobación) |
| **Avance** | Fase 1 implementada (EDT 1.1.2.2 + 1.1.3.3): `server/src/services/reservation.service.ts`, endpoints `POST /items/:id/reserve` y `/release`, `markPurchased()` endurecido, `server/scripts/stress-reserve.ts`. Fases 2–4 pendientes. |

> Este documento reemplaza al borrador `analisis-concurrencia-reserva.txt`.
> Las §12.3 y §12.4 describen el estado del código **previo** a la Fase 1
> (es el diagnóstico que motivó el rediseño), no el estado actual.

---

## 12.1 Resumen

El requisito central del sistema (RF-08: "que dos personas no reserven el
mismo producto a la vez") está implementado hoy con un servicio de cola en
el backend que arbitra los intentos simultáneos y, ante un conflicto,
interrumpe con un modal al usuario que ya tiene la reserva para que decida
si insiste o cede.

La revisión del código detecta dos clases de problema:

- **A. Robustez de la implementación actual.** La exclusión mutua real
  depende de un detalle del driver (`node:sqlite` / `DatabaseSync` es
  sincrónico), no de una garantía explícita; y varios caminos quedan sin
  control de concurrencia, sin límites y sin pruebas.
- **B. Diseño.** Un único mecanismo mezcla dos responsabilidades de
  naturaleza, tiempos y dueño de decisión distintos:
  - arbitrar una carrera técnica (milisegundos, decide el servidor);
  - permitir el traspaso de una tarea entre participantes (minutos,
    decide quien tiene la reserva).

Este documento describe ambos problemas a nivel código y propone un plan
por fases para resolverlos.

## 12.2 Definición del algoritmo de prioridad

**Regla:** ante dos o más intentos de reserva sobre el mismo ítem, gana
**quien llegó primero al servidor**. No hay desempate por marca de tiempo
del cliente, ni cola de espera, ni intervención humana.

**Implementación:** una única sentencia condicional sobre la fuente de
verdad.

```sql
UPDATE items
   SET reserved_by = :participantId,
       updated_at  = :now
 WHERE id = :itemId
   AND reserved_by IS NULL;
```

```
ganó = (filas_afectadas == 1)
```

**Por qué es determinista:**

1. `node:sqlite` (`DatabaseSync`) ejecuta de forma sincrónica y Node
   corre en un solo hilo: cada `UPDATE` se completa entero antes de que
   empiece el siguiente. No hay intercalado posible entre la evaluación
   del `WHERE` y la escritura.
2. La condición `reserved_by IS NULL` está en la misma sentencia que la
   escritura: es el motor quien garantiza la atomicidad, no el orden del
   código de la aplicación.
3. El resultado es binario y observable: `changes === 1` (ganó) o
   `changes === 0` (otro llegó primero). Siempre hay exactamente un
   ganador.
4. Si en el futuro se migra a PostgreSQL, la misma sentencia sigue siendo
   correcta (el `UPDATE ... WHERE` condicional es atómico en cualquier
   motor relacional); sólo cambia el driver.

**Contraste con el diseño anterior:** el orden lo definía el momento en
que un evento de socket era procesado y, ante empate, una fila en
`reservation_attempts` ordenada por `requested_at`. Eso agregaba una cola
en memoria, un modal bloqueante y una dependencia de respuesta humana sin
timeout — todo para resolver algo que el motor ya resuelve en una
sentencia.

## 12.3 Estado actual del código

### Backend

| Archivo | Rol |
|---|---|
| `server/src/services/reservationQueue.service.ts` | `attempt()` lee el ítem y, si está libre, llama a `grant()`; si está tomado, encola el intento en un `Map` en memoria, inserta una fila en `reservation_attempts` y emite `reserve:conflict` a la sala. `respond()`: si `insist=true` re-otorga al titular; si `insist=false` hace `shift()` de la cola y otorga al siguiente, o libera. `grant()`: `UPDATE items SET reserved_by = ?` (incondicional). `release()`: `UPDATE items SET reserved_by = NULL`. |
| `server/src/sockets/reservation.handlers.ts` | Registra `reserve:attempt` / `reserve:respond` / `item:release` por socket. `createReservationQueueService(io)` se invoca una vez por conexión. |
| `server/src/controllers/items.controller.ts` | `markPurchased()`: `UPDATE items SET status='comprado', price_paid=?` sin verificar estado previo ni titular. |
| `server/src/db/connection.ts` | `journal_mode = WAL`, `foreign_keys = ON`. |
| `server/src/db/schema.sql` | `items.reserved_by TEXT REFERENCES participants(id)`; `reservation_attempts(id, item_id, participant_id, requested_at, resolved)`. |
| `server/src/routes/items.routes.ts` | Sólo expone `POST /items/:itemId/purchase` y `/ticket`. El comentario afirma que `/reserve` y `/release` "también existen vía REST como respaldo", pero no hay ninguna ruta que los registre. |

### Cliente

| Archivo | Rol |
|---|---|
| `mobile/src/services/realtime/reservationEvents.ts` | `attemptReserve()`, `respondToConflict()` y listeners de `reserve:conflict` / `reserve:granted` / `item:updated`. |
| `mobile/src/hooks/useReservation.ts` | Mantiene un único `conflict` en estado y lo resuelve con `insist` true/false. |
| `mobile/src/components/list/ReservationConflictModal.tsx` | Modal bloqueante con dos opciones: "Sí, insistir" / "No, cederlo". |

## 12.4 Problemas a nivel código

### 12.4.1 La decisión de reserva no es atómica por diseño

En `attempt()` hay un patrón "leer y después escribir":

```ts
const item = db.prepare("SELECT * FROM items WHERE id = ?").get(itemId);
if (!item.reserved_by) { grant(itemId, participantId); return; }
```

y `grant()` hace un `UPDATE` incondicional. Entre el `SELECT` y el
`UPDATE` no hay transacción ni condición en el `WHERE`. Hoy no se produce
una condición de carrera únicamente porque `node:sqlite` (`DatabaseSync`)
ejecuta de forma sincrónica y Node es de un solo hilo, de modo que el
bloque corre sin intercalado.

Esa garantía es implícita y frágil: se rompe si en el futuro se introduce
un `await` entre la lectura y la escritura, si se migra a un driver
asincrónico, o si se cambia de motor. El requisito más importante del
sistema no debería depender de eso. La forma correcta es la sentencia
condicional única de §12.2.

### 12.4.2 "Marcar como comprado" no tiene control de concurrencia

`items.controller.ts` `markPurchased()` hace:

```sql
UPDATE items SET status='comprado', price_paid=?, updated_at=? WHERE id=?
```

sin verificar quién tiene la reserva (RF-07 exige reserva previa) ni si el
ítem ya estaba comprado. Dos participantes pueden marcar comprado el mismo
ítem con precios distintos; el segundo pisa al primero sin conflicto ni
aviso. Todo el arbitraje está puesto en "reservar" y nada en "comprar",
que es la acción con impacto económico.

### 12.4.3 Colas en memoria del proceso, sin límite ni expiración

El `Map` `queues` de `reservationQueue.service.ts` vive en el proceso:

- Se pierde ante cualquier reinicio o despliegue del backend.
- No hay de-duplicación: el mismo participante que toca "reservar" varias
  veces se encola varias veces y genera filas repetidas en
  `reservation_attempts`. El plan de pruebas (§8.3) pide explícitamente
  "sin filas duplicadas ni inconsistentes".
- No hay tamaño máximo ni TTL.

### 12.4.4 El flujo depende de una respuesta humana sin timeout

`respond()` sólo avanza si el titular actual emite `reserve:respond`. Si
esa persona cerró la app o perdió señal, el ítem queda reservado por ella
de forma indefinida y la cola de interesados queda congelada. No hay
vencimiento del conflicto ni reversión automática.

### 12.4.5 Autorización ausente en los eventos de socket

`reservation.handlers.ts` no valida nada:

- `reserve:respond` con `insist` lo puede enviar cualquier socket; no se
  comprueba que el emisor sea el titular de la reserva. Un tercero puede
  ceder o confirmar la reserva de otro.
- No se verifica que el socket haya hecho `session:join`, ni que el
  `participantId` pertenezca a la sesión del ítem. Con sólo conocer un
  `itemId` se puede operar sobre cualquier sesión.

### 12.4.6 La cola queda inconsistente ante liberación

`release()` actualiza el ítem pero no toca `queues`. Si se libera un ítem
con interesados encolados, esas entradas quedan huérfanas en memoria; el
próximo `attempt()` de un tercero encuentra el ítem libre y lo toma,
salteando a quienes esperaban.

### 12.4.7 `reservation_attempts.resolved` nunca se actualiza

Se insertan filas con `resolved = 0` y no hay ningún `UPDATE` que las
marque resueltas. La columna no cumple ninguna función y la tabla no
sirve como traza de estado.

### 12.4.8 El evento de conflicto se difunde a toda la sala

`attempt()` emite `reserve:conflict` con `io.to("session:<id>")`, es
decir a todos los dispositivos de la sesión, no sólo al titular. El
cliente (`useReservation.ts`) no filtra por `currentHolderId`, así que
cualquier usuario podría llegar a ver el modal de conflicto de un ítem
ajeno.

### 12.4.9 Doble notificación del mismo cambio

`grant()` emite `reserve:granted` y además llama a `broadcastItem()`, que
emite `item:updated`. El cliente maneja los dos eventos para el mismo
hecho.

### 12.4.10 Sin pruebas de concurrencia

El único test es `participants.test.ts`. El plan de pruebas define la
prueba de estrés de concurrencia (§8.3) como "la más crítica" y menciona
un script `server/scripts/stress-reserve.ts` "a crear"; no existe. El
criterio de aceptación §8.6 sobre concurrencia no puede verificarse.

### 12.4.11 Documentación desalineada

`items.routes.ts` documenta endpoints REST de reserva que no están
implementados. CU-02a y `04-arquitectura.md` describían "cola de
prioridad" y "el siguiente en la fila" como parte del arbitraje.

## 12.5 Problema de fondo: dos responsabilidades mezcladas

El diseño actual resuelve con un solo mecanismo dos cosas distintas:

| | Arbitraje de concurrencia | Traspaso de tarea |
|---|---|---|
| Naturaleza | carrera técnica | negociación entre personas |
| Ventana de tiempo | milisegundos | minutos / horas |
| Quién decide | el servidor, solo | quien tiene la reserva |
| Si nadie responde | no aplica (es instantáneo) | debe seguir funcionando |
| UI adecuada | ninguna (transparente) | aviso no bloqueante |

El código las fusiona: el intento de un segundo participante sobre un ítem
tomado dispara a la vez "quiero competir por la reserva" y "me ofrezco a
comprarlo". De ahí salen casi todos los problemas de §12.4: la cola
ordenada por tiempo de toque, el modal bloqueante, la dependencia de una
respuesta humana sin timeout, y la asignación automática al siguiente que
le quita la decisión al titular.

RF-08, tal como estaba redactado, describía literalmente el flujo de
"insistir / siguiente en la fila", por lo que la implementación era fiel
al requisito. La propuesta implica ajustar la redacción del requisito
(ver §12.9), además del código.

## 12.6 Propuesta

### 12.6.1 Separar los dos mecanismos

1. **Arbitraje de concurrencia.** Quien reserva primero se queda con el
   ítem. Punto. El segundo recibe un rechazo y ve el estado actualizado
   (quién lo tiene).
2. **Traspaso de tarea** (opcional, sobre un ítem ya reservado). Otro
   participante puede "ofrecerse" a comprarlo. Se crea un ofrecimiento. El
   titular recibe un aviso no bloqueante y decide: comprarlo igual,
   cederlo a esa persona, o liberar el ítem para cualquiera. Si el titular
   no responde, no pasa nada: sigue siendo suyo.

### 12.6.2 Arbitraje: reserva atómica

- **`POST /items/:itemId/reserve`** `{ participantId }`
  - `200 { item }` si la reserva se otorgó
  - `409 { reservedBy, name }` si ya estaba reservado

  Implementación: `UPDATE ... WHERE id = ? AND reserved_by IS NULL`,
  éxito sólo si `changes === 1`. Sin transacción explícita alcanza con la
  sentencia condicional; si se prefiere, envolver en `db.transaction()`.

- **`POST /items/:itemId/release`** `{ participantId }`
  - `200` si el emisor es el titular; `403` en caso contrario.
  - Sólo el titular puede liberar (RF-06).

- El socket deja de recibir intentos de reserva. El servidor sólo emite
  `item:updated` a la sala tras cada cambio para que todos los
  dispositivos converjan.
- Se elimina la cola en memoria y los eventos `reserve:attempt`,
  `reserve:conflict`, `reserve:respond`, `reserve:granted`.

**Motivo de mover la decisión a REST:** HTTP garantiza una respuesta por
intento (200/409), lo que hace el flujo determinista y testeable. El
socket queda para lo que realmente necesita empuje en tiempo real: la
difusión del nuevo estado.

### 12.6.3 Proteger "marcar como comprado"

`markPurchased()` debe verificar, en la misma sentencia o en una
transacción:

- que el ítem esté reservado por el `participantId` que compra (RF-07);
- que no esté ya en estado `comprado`.

Responder `409` si la precondición no se cumple.

### 12.6.4 Traspaso de tarea: modelo de ofrecimiento

Nueva tabla:

```sql
CREATE TABLE item_offers (
  id                  TEXT PRIMARY KEY,
  item_id             TEXT NOT NULL REFERENCES items(id),
  from_participant_id TEXT NOT NULL REFERENCES participants(id),
  to_participant_id   TEXT NOT NULL REFERENCES participants(id),
  created_at          TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pendiente'
                      CHECK (status IN
                      ('pendiente','aceptado','rechazado','vencido')),
  resolved_at         TEXT
);
CREATE INDEX idx_item_offers_item ON item_offers(item_id);
```

Endpoints:

- **`POST /items/:itemId/offers`** `{ participantId }`
  Crea un ofrecimiento pendiente de `participantId` hacia el titular
  actual. `409` si el ítem no está reservado o si el emisor ya es el
  titular. Evitar duplicar ofrecimientos pendientes del mismo
  participante sobre el mismo ítem.
- **`POST /items/:itemId/offers/:offerId/resolve`**
  `{ participantId, action }`
  `action ∈ { aceptar, rechazar }`. Sólo el titular actual puede
  resolver. `aceptar` transfiere `reserved_by` al oferente y marca el
  resto de ofrecimientos pendientes de ese ítem como `vencido`.
  `rechazar` marca ese ofrecimiento y el titular conserva la reserva.
- Liberar es el endpoint de §12.6.2; deja el ítem disponible para todos y
  vence los ofrecimientos pendientes.

Eventos de socket (servidor → clientes de la sala):

| Evento | Destino | Significado |
|---|---|---|
| `item:updated` | sala | estado del ítem tras cualquier cambio |
| `offer:created` | titular | hay un nuevo ofrecimiento |
| `offer:resolved` | involucrados | cómo terminó |

**Comportamiento ante inacción:** un ofrecimiento pendiente no bloquea
nada. Opcionalmente, un job simple marca `vencido` los ofrecimientos con
más de N horas.

### 12.6.5 Cliente

- Reemplazar `ReservationConflictModal` por un aviso **no bloqueante**
  (banner o notificación en la lista) dirigido sólo al titular, con tres
  acciones: "La compro yo", "Que la compre \<nombre\>", "Liberar".
- Si hay varios ofrecimientos sobre un ítem, mostrarlos como lista y
  dejar que el titular elija a quién ceder.
- Separar `useReservation` en dos hooks: uno para reservar/liberar (REST)
  y otro para ofrecimientos.
- El que se ofrece ve el ítem como "reservado por X — te ofreciste" hasta
  que llegue `offer:resolved`.

## 12.7 Plan por fases

### Fase 1 — Corrección del arbitraje (prioridad alta)

- Endpoint `POST /items/:itemId/reserve` atómico (`UPDATE` condicional).
- Endpoint `POST /items/:itemId/release` restringido al titular.
- `markPurchased()` con verificación de titular y estado previo.
- Emisión de `item:updated` a la sala tras cada cambio.
- Pruebas: N solicitudes de reserva en paralelo (`Promise.all`) sobre el
  mismo ítem → exactamente una `200`, el resto `409`, un único
  `reserved_by`. Doble `purchase` → una `200`, una `409`.
- Script `server/scripts/stress-reserve.ts` con ≥ 10 clientes
  simultáneos (criterio §8.3 / §8.6).

### Fase 2 — Modelo de ofrecimiento (backend)

- Tabla `item_offers` y migración.
- Endpoints de `offers` y `resolve`, con autorización por titular.
- Eventos `offer:created` / `offer:resolved`.
- Pruebas de integración: crear ofrecimiento, aceptar (transfiere),
  rechazar (conserva), liberar (vence pendientes), ofrecimientos
  múltiples.

### Fase 3 — Cliente

- Aviso no bloqueante con las tres acciones.
- Lista de ofrecimientos múltiples.
- Separación de hooks y ajuste de la UI del oferente.

### Fase 4 — Limpieza

- Quitar `reservationQueue.service.ts`, los eventos `reserve:*` y la
  tabla `reservation_attempts`.
- Actualizar RF-08 / RF-08a, CU-02a, `04-arquitectura.md` y
  `05-modelo-de-datos.md`.
- Quitar el comentario engañoso de `items.routes.ts`.

**Dependencias:** la Fase 1 es independiente y entrega ya el requisito
crítico de forma robusta y probada. Las Fases 2 y 3 agregan el traspaso
de tarea. La Fase 4 se hace una vez que 2 y 3 están integradas.

## 12.8 Casos de borde

| Caso | Comportamiento esperado |
|---|---|
| N intentos de `reserve` en el mismo milisegundo | Exactamente uno recibe `200`; el resto `409` con el titular ganador. |
| `reserve` sobre un ítem ya `comprado` | `409` (no se puede reservar lo ya comprado). |
| `release` por alguien que no es el titular | `403`, el ítem no cambia. |
| `release` de un ítem con ofrecimientos pendientes | El ítem queda libre; los ofrecimientos pasan a `vencido`. |
| `purchase` sin ser el titular de la reserva | `409` (RF-07). |
| Doble `purchase` sobre el mismo ítem | Una `200`, la segunda `409`. |
| `offer` del propio titular sobre su ítem | `409` (no tiene sentido ofrecerse a uno mismo). |
| Segundo `offer` pendiente del mismo participante sobre el mismo ítem | Se ignora / `409` (sin duplicar). |
| El titular nunca resuelve un ofrecimiento | Nada se bloquea; el ítem sigue siendo suyo. Job opcional lo marca `vencido` tras N horas. |
| Reinicio del backend con ofrecimientos pendientes | Se conservan (están en tabla, no en memoria). |

## 12.9 Ajuste de requisitos y documentación

- **RF-08 (reformulado):** "Si dos o más usuarios intentan reservar el
  mismo ítem casi al mismo tiempo, el sistema otorga la reserva a quien
  llegó primero al servidor y notifica a los demás que el ítem ya está
  reservado."
- **RF-08a (nuevo):** "Un usuario puede ofrecerse a comprar un ítem
  reservado por otro. El usuario que tiene la reserva recibe un aviso y
  decide si lo compra igual, cede la reserva al que se ofreció, o libera
  el ítem."
- Actualizar CU-02a, `04-arquitectura.md` (§4.3), `05-modelo-de-datos.md`
  y el comentario de `items.routes.ts`.
- Eliminar la tabla `reservation_attempts` (su función de traza la cubre
  `item_offers` y el log de la aplicación).
