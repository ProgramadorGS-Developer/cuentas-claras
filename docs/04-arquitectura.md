# 4. Arquitectura técnica

## 4.1 La pregunta central: ¿alcanza con SQLite en el celular?

El material original de la cátedra pide una app **web** con lógica de
**concurrencia en tiempo real** (RF-08: dos usuarios reservando el mismo
ítem al mismo tiempo) y **acceso multiusuario** a una misma sesión de
compra desde distintos dispositivos.

SQLite es una base de datos **embebida y local a un solo proceso**: el
`archivo .db` vive dentro de cada teléfono. Si cada dispositivo tuviera
*solamente* su propia SQLite, dos usuarios en dos teléfonos distintos
jamás podrían enterarse en tiempo real de lo que el otro está haciendo, y
sería imposible implementar RF-08 tal como está especificado ("el sistema
debe determinar quién lo reservó primero").

**Por eso este proyecto usa una arquitectura de dos capas, ambas basadas en
SQLite, cada una con un propósito distinto:**

```
┌─────────────────────────┐        REST + WebSockets       ┌──────────────────────────┐
│   App móvil (cliente)    │ ───────────────────────────▶  │   Backend (Node.js)       │
│   React Native + Expo    │ ◀───────────────────────────  │   Express + Socket.IO     │
│                          │                                │                          │
│   SQLite LOCAL           │                                │   SQLite del SERVIDOR     │
│   (expo-sqlite)          │                                │   (better-sqlite3)        │
│   = cache offline-first  │                                │   = fuente de verdad      │
│   de la sesión activa    │                                │   compartida entre todos  │
└─────────────────────────┘                                └──────────────────────────┘
```

- **SQLite en el servidor** (`server/src/db/`): es la fuente de verdad
  única y compartida. Todas las reservas, conflictos, precios y aportes se
  validan y persisten ahí. Es lo que permite que el Usuario A y el Usuario B,
  en teléfonos distintos, vean exactamente el mismo estado de la sesión.
- **SQLite en el dispositivo** (`mobile/src/database/`): es una **cache
  local offline-first**. Sirve para que la lista de compras se vea al
  instante (sin esperar a la red), para poder seguir consultando/leyendo la
  sesión sin conexión, y para encolar acciones (`pending_sync`) que se
  reenvían al backend cuando vuelve la señal.

Esta decisión es exactamente lo que la app *necesita* como app móvil real:
uso en movimiento, en una previa o un asado, con conectividad inestable.
Es, de hecho, una mejora respecto del enunciado original (que no
contemplaba el modo offline).

> Si el docente/cátedra exige una app **100% sin backend**, la alternativa
> es una sincronización peer-to-peer (ej. CRDTs sobre Bluetooth/WiFi
> Direct), que queda fuera del alcance de una Tecnicatura y no resuelve
> RF-08 de forma determinista. La arquitectura cliente-servidor aquí
> documentada es la opción estándar de la industria para este tipo de
> problema y es la recomendada.

## 4.2 Stack tecnológico

### App móvil (`mobile/`)

| Capa | Tecnología | Motivo |
|---|---|---|
| Framework | React Native + **Expo** (SDK 51, managed workflow) | Curva de aprendizaje más suave, `expo-sqlite`/`expo-camera`/`expo-image-picker` listos para usar, build en la nube con EAS sin instalar Android Studio/Xcode. |
| Lenguaje | TypeScript | Tipado fuerte sobre los modelos de dominio (RF-09 estados, RF-11 precios, etc.), menos errores en tiempo de ejecución. |
| Navegación | React Navigation (native-stack + bottom-tabs) | Estándar de facto en RN. |
| Estado global | Zustand | Alternativa liviana a Redux, ideal para el tamaño de este proyecto. |
| Persistencia local | `expo-sqlite` | Requisito explícito del proyecto (SQLite). |
| Tiempo real | `socket.io-client` | Conflictos de reserva y actualizaciones de estado con latencia \<1s. |
| HTTP | `axios` | Cliente REST para operaciones que no requieren tiempo real estricto. |
| Cámara / imágenes | `expo-image-picker`, `expo-camera` | RF-12: escaneo/carga de tickets. |
| Compartir | `Share` (API de React Native) + deep link `wa.me` | RF-01, RF-16: reemplaza la integración con la API de WhatsApp Business. |

### Backend (`server/`)

| Capa | Tecnología | Motivo |
|---|---|---|
| Runtime | Node.js + TypeScript | Mismo lenguaje que el cliente, reduce el costo cognitivo del equipo. |
| Framework HTTP | Express | Simple, suficiente para el volumen de endpoints del proyecto. |
| Base de datos | **SQLite** vía `better-sqlite3` | Requisito del proyecto; motor sincrónico, rápido y sin infraestructura adicional — ideal para un proyecto académico o un MVP de bajo volumen. |
| Tiempo real | Socket.IO | *Broadcast* de cambios de estado (`item:updated`) y avisos de ofrecimiento (RF-08a). El arbitraje de la reserva (RF-08) se resuelve por REST de forma atómica, no por socket. |
| Subida de archivos | `multer` | RF-12: recepción de fotos de tickets. |

> **Nota de escalabilidad**: `better-sqlite3` con modo `WAL` soporta
> cómodamente el volumen de un grupo de amigos/familiar (decenas de
> usuarios concurrentes por sesión). Si el proyecto creciera a miles de
> sesiones simultáneas, el mismo esquema relacional migra sin cambios de
> diseño a PostgreSQL — ver `09-despliegue.md`.

## 4.3 Flujo de datos: ejemplo completo (RF-08)

1. Usuario A y Usuario B, en dos teléfonos, tocan "Reservar" sobre el mismo
   ítem casi al mismo tiempo.
2. Cada app hace `POST /items/:itemId/reserve` contra el backend.
3. El backend ejecuta, por cada request,
   `UPDATE items SET reserved_by = ? WHERE id = ? AND reserved_by IS NULL`.
   Como `node:sqlite` (`DatabaseSync`) es sincrónico y Node es de un solo
   hilo, las dos sentencias se serializan: una afecta 1 fila (gana), la
   otra afecta 0.
4. El que ganó recibe `200 { item }`. El que perdió recibe
   `409 { reservedBy, name }` y su UI muestra "ya reservado por \<nombre\>".
   No hay cola, ni modal bloqueante, ni confirmación humana.
5. El backend emite `item:updated` a **todos** los dispositivos conectados
   a esa sesión (`io.to("session:<id>")`).
6. Cada app recibe el evento, actualiza su SQLite local (cache) y
   re-renderiza la lista.

Si B igual quiere ese ítem, puede crear un **ofrecimiento**
(`POST /items/:itemId/offers`, RF-08a): A recibe `offer:created` como
aviso no bloqueante y decide comprarlo, cederlo o liberarlo; el resultado
viaja por `offer:resolved`. Ver `12-diseno-concurrencia-de-reserva.md`.

Este mismo patrón (REST → SQLite servidor → *broadcast* → SQLite cliente)
se repite para: marcar un ítem como comprado, cargar un aporte de
presupuesto, y actualizar el balance de resultado.

## 4.4 Offline-first: qué pasa sin conexión

- **Lectura**: la UI siempre lee primero de la SQLite local
  (`itemRepository`, `sessionRepository`, etc.), así que la lista de
  compras, el historial de sesiones y los balances ya calculados se ven
  aunque no haya señal.
- **Escritura**: las acciones que requieren arbitraje central (reservar,
  marcar como comprado, aportar presupuesto) se intentan primero contra el
  backend; si falla por falta de red, se guardan en la tabla
  `pending_sync` de la SQLite local (`services/sync/syncEngine.ts`) y se
  reintentan automáticamente al recuperar conexión
  (`hooks/useOfflineSync.ts`).
- La reserva de ítems, por su naturaleza (RF-08 exige arbitraje central),
  **no puede confirmarse en firme sin conexión**: la UI puede mostrar la
  intención como "pendiente de confirmar" hasta que el backend responda.

## 4.5 Seguridad y acceso (alcance académico)

- No hay usuarios/contraseñas (fiel al RF-02 original: solo un nombre).
- El `shareToken` de cada sesión funciona como capacidad de acceso: quien
  lo tiene, entra. Es equivalente al nivel de seguridad de un link de
  WhatsApp compartido, consistente con el alcance del proyecto original.
- Las fotos de tickets se sirven desde `/uploads/<archivo>` sin listado
  público de directorio.

## 4.6 Diagrama de despliegue (visión general)

```
[ Celular Usuario A ] ─┐
[ Celular Usuario B ] ─┼── HTTPS/WSS ──▶ [ Backend Node.js + Socket.IO ] ── SQLite (better-sqlite3)
[ Celular Anfitrión ] ─┘                          │
                                                   └── /uploads (fotos de tickets)
```

Ver `09-despliegue.md` para el detalle de cómo publicar cada pieza.
