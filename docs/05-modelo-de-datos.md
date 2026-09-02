# 5. Modelo de datos (diccionario de datos)

Basado en `Tabla_yDiccionario.xlsx` (hoja *Diccionario*) y en los requisitos
funcionales, traducido a un esquema relacional SQLite. El mismo esquema
lógico se usa en el servidor (fuente de verdad, `server/src/db/schema.sql`)
y — de forma reducida — en la cache local del cliente
(`mobile/src/database/schema.ts`).

## 5.1 Diagrama entidad-relación (descripción textual)

```
sessions (1) ────< participants (N)
sessions (1) ────< items (N)
sessions (1) ────< budget_contributions (N)
participants (1) ─< items (N)              [items.reserved_by]
participants (1) ─< budget_contributions (N)
items (1) ────────< item_offers (N)            [solo backend]
participants (1) ─< item_offers (N)            [solo backend]
```

## 5.2 Tablas

### `sessions`

| Campo | Tipo | Descripción | RF relacionado |
|---|---|---|---|
| id | TEXT (PK, UUID) | Identificador único de la sesión de compra. | RF-04 |
| name | TEXT | Nombre de la sesión (ej. "Asado del sábado"). | RF-03 |
| host_name | TEXT | Nombre del anfitrión que la creó. | RF-03 |
| created_at | TEXT (ISO 8601) | Fecha de creación. | RF-04 |
| closed_at | TEXT (ISO 8601, nullable) | Fecha de cierre; `NULL` si sigue activa. | RF-04 |
| share_token | TEXT (UNIQUE) | Token embebido en el deep link de WhatsApp. | RF-01 |

### `participants`

| Campo | Tipo | Descripción | RF relacionado |
|---|---|---|---|
| id | TEXT (PK, UUID) | Identificador del participante. | RF-02 |
| session_id | TEXT (FK → sessions.id) | Sesión a la que pertenece. | — |
| name | TEXT | Nombre ingresado al entrar (único dato pedido). | RF-02 |
| is_host | INTEGER (0/1) | `1` si es el Anfitrión de la sesión. | — |
| joined_at | TEXT (ISO 8601) | Momento en que se identificó. | — |

### `items`

| Campo | Tipo | Descripción | RF relacionado |
|---|---|---|---|
| id | TEXT (PK, UUID) | Identificador del ítem de la lista. | — |
| session_id | TEXT (FK → sessions.id) | Sesión a la que pertenece. | — |
| name | TEXT | Nombre del producto (ej. "Carbón"). | RF-03 |
| status | TEXT (`pendiente` \| `comprado`) | Estado del ítem. | RF-09 |
| reserved_by | TEXT (FK → participants.id, nullable) | Quién lo tiene reservado. | RF-05 |
| observation | TEXT (nullable) | Texto libre, ej. "Reservado por Pedro". | RF-10 |
| price_paid | REAL (nullable) | Precio pagado al marcarlo comprado. | RF-11 |
| ticket_image_uri | TEXT (nullable) | URL de la foto del ticket. | RF-12 |
| updated_at | TEXT (ISO 8601) | Última modificación (usado para sincronizar). | — |

### `item_offers` (solo backend)

Registra los ofrecimientos de traspaso de tarea (RF-08a): cuando un
participante quiere un ítem que ya tiene otro. El **arbitraje de reserva**
(RF-08) no usa tabla: se resuelve con un `UPDATE` condicional sobre
`items.reserved_by` (ver `12-diseno-concurrencia-de-reserva.md`).

| Campo | Tipo | Descripción | RF relacionado |
|---|---|---|---|
| id | TEXT (PK, UUID) | Identificador del ofrecimiento. | RF-08a |
| item_id | TEXT (FK → items.id) | Ítem ofrecido. | RF-08a |
| from_participant_id | TEXT (FK → participants.id) | Quién se ofrece a comprarlo. | RF-08a |
| to_participant_id | TEXT (FK → participants.id) | Titular actual de la reserva. | RF-08a |
| created_at | TEXT (ISO 8601) | Cuándo se creó el ofrecimiento. | — |
| status | TEXT (`pendiente` \| `aceptado` \| `rechazado` \| `vencido`) | Estado del ofrecimiento. | RF-08a |
| resolved_at | TEXT (ISO 8601, nullable) | Cuándo lo resolvió el titular. | — |

Índice: `idx_item_offers_item (item_id)`.

Esta tabla no tiene equivalente en el cliente: es un detalle interno del
backend. La antigua `reservation_attempts` se elimina (Fase 4 del plan);
la evidencia de la prueba de estrés (EDT 1.4.3.1) pasa a ser el conjunto
de respuestas HTTP 200/409 del script `stress-reserve.ts`.

### `budget_contributions`

| Campo | Tipo | Descripción | RF relacionado |
|---|---|---|---|
| id | TEXT (PK, UUID) | Identificador del aporte. | RF-13 |
| session_id | TEXT (FK → sessions.id) | Sesión a la que pertenece. | RF-13 |
| participant_id | TEXT (FK → participants.id) | Quién aportó. | RF-13 |
| amount | REAL | Monto aportado. | RF-13 |
| created_at | TEXT (ISO 8601) | Momento del aporte. | — |

### `pending_sync` (solo cliente)

| Campo | Tipo | Descripción |
|---|---|---|
| id | TEXT (PK) | Identificador de la operación encolada. |
| entity | TEXT | Entidad afectada (`item`, `budget_contribution`, `participant`). |
| entity_id | TEXT | ID de la entidad afectada. |
| operation | TEXT | `create` \| `update`. |
| payload | TEXT (JSON) | Datos a reenviar al backend. |
| created_at | TEXT (ISO 8601) | Momento en que se generó offline. |

Soporte del modo offline-first (ver `04-arquitectura.md`, sección 4.4).

## 5.3 Balance de gastos (derivado, no persistido)

El "Resultado" (RF-14) **no se guarda** como tabla: se calcula en caliente a
partir de `items` (comprados) y `budget_contributions`, tanto en el cliente
(`mobile/src/domain/balanceCalculator.ts`, cálculo optimista/inmediato)
como en el servidor (`server/src/services/balance.service.ts`, fuente de
verdad). Fórmula:

```
para cada participante P:
  aportado(P)     = Σ budget_contributions.amount donde participant_id = P
  gastado(P)      = Σ items.price_paid donde reserved_by = P y status = 'comprado'

  si nadie cargó presupuesto (Σ aportado global = 0):
    parte_justa(P) = total_gastado_sesión / cantidad_de_participantes
    neto(P)        = gastado(P) − parte_justa(P)
  si no:
    neto(P)        = aportado(P) − gastado(P)

  neto(P) > 0  → debe recibir dinero
  neto(P) < 0  → debe pagar dinero
```

Luego se simplifican las transferencias con un algoritmo *greedy* que
empareja al mayor deudor con el mayor acreedor hasta saldar todas las
cuentas con el menor número posible de transferencias
(`simplifySettlement`).

## 5.4 "Gastos en reunión" (RF-15)

No requiere persistencia de sesión: es una calculadora rápida
(`splitMeetingExpense(total, personas) = total / personas`), pensada para
usarse sin crear una sesión completa (ej. dividir la cuenta de un
restaurante en el momento).
