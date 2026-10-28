# 15. Estado actual del proyecto (auditoría completa)

| | |
|---|---|
| **Fecha** | 2026-09-29 |
| **Alcance de esta auditoría** | Documentación (`docs/01` a `14`), código (`server/`, `mobile/`), git (`master`/`production`/ramas), tablero CollabKit/Trello, backend en vivo |
| **Motivo** | El equipo reportó sentirse desorientado sobre el estado real del proyecto |

> **Actualización 2026-10-20** — este documento es una foto del 2026-09-29.
> Desde entonces se resolvieron dos de sus pendientes principales:
> los commits de `production` (§15.3) ya están en `master`, y el WebSocket
> de producción quedó verificado con una conexión real. Siguen vigentes
> §15.2 (documentación vieja en `docs/02`/`04`/`06`) y §15.5 (tablero);
> sobre el tablero, además, el archivado por API **no funciona** (las
> tarjetas "archivadas" nunca desaparecieron, hay que borrarlas a mano).
> El estado actualizado está en la respuesta de auditoría del 2026-10-20 y
> en `docs/21` §21.2.

## 15.1 Resumen ejecutivo

El proyecto **funciona y está más avanzado de lo que el tablero refleja**.
La desorientación tiene tres causas concretas, no una sensación vaga:

1. **El tablero de Trello tiene tickets duplicados y contradictorios** —
   el mismo número de EDT aparece "Hecho" en un lado y "sin hacer" en
   otro (detalle en §15.4).
2. **La rama `production` tiene código real que nunca volvió a `master`**
   ni se reflejó en ningún ticket (detalle en §15.3).
3. **Tres documentos de diseño (`docs/02`, `04`, `06`) describen un
   diseño anterior** que ya fue reemplazado a propósito, y nunca se
   actualizaron para decirlo (detalle en §15.2).

Ninguno de los tres es un problema del código en sí — el código
funciona (tests en verde, backend en producción respondiendo) — es un
problema de **que la documentación y el tablero no están contando la
misma historia que el código**.

## 15.2 Documentación: qué describe algo que ya cambió

| Documento | Qué dice | Qué es cierto hoy |
|---|---|---|
| `docs/04-arquitectura.md` §4.2 | Backend usa `better-sqlite3` | Se migró a `node:sqlite` (nativo de Node, sin compilación) desde el 2026-09-01, documentado en `docs/11`, por una limitación real de MonsterASP.net. `docs/04` nunca se actualizó. |
| `docs/06-estructura-de-carpetas.md` línea 64 | "Conexión SQLite (better-sqlite3)" | Mismo caso. |
| `docs/04-arquitectura.md` §4.3 | RF-08a se resuelve con `POST /items/:itemId/offers`, el titular recibe `offer:created` y decide comprar/ceder/liberar | **Ese endpoint no existe en el código** (verificado, cero resultados al buscarlo). El diseño real —documentado y aprobado en `docs/12`— reemplazó esa negociación por un aviso no bloqueante al que **pierde** la carrera (`ReservationNoticeBanner.tsx`, "Fulano lo reservó justo antes que vos"). La negociación completa (Fase 2 de `docs/12`) quedó explícitamente pendiente, no es un bug. |
| `docs/02-actores-y-requisitos.md` RF-08a | Describe la misma negociación completa | Mismo desfasaje — es el requisito original, `docs/12` lo reformuló pero `docs/02` no se tocó. |

**Recomendación**: actualizar esas referencias a `better-sqlite3` (2
líneas) y agregar una nota en `docs/02`/`04` que redirija a `docs/12`
para el estado real de RF-08a, tal como ya se hizo en `docs/12` mismo.
Es trabajo de documentación, no de código — bajo esfuerzo, alto impacto
en que el equipo deje de leer cosas que ya no son así.

## 15.3 Git: `production` tiene código que `master` no tiene

`master` está sincronizado con `origin/master` (nada pendiente ahí). Pero
`production` le lleva **7 commits** a `master`, de los cuales 3 son
cambios reales de Santiago que nunca volvieron:

1. **Redirección HTTP para el link de WhatsApp** (`7a214d3`, RF-01) —
   hallazgo importante: WhatsApp solo convierte en link clickeable las
   URLs `http(s)://`, no esquemas propios como `cuentasclaras://`. Sin
   este cambio, el link que se comparte por WhatsApp **no es clickeable**
   en el chat. La solución agrega `GET /join/:token` en el backend (una
   página HTML puente que redirige al deep link nativo) y un campo
   `joinUrl` en la respuesta de `POST /sessions`. Está probado y en
   producción, pero **no existe en `master`**.
2. **Fix real del build de Android en EAS** (`f17240e`, 2026-09-22) —
   descubrimiento posterior al que ya habíamos traído a `master`: el hook
   `eas-build-post-install` (que usamos para vendorizar SQLite y evitar
   el error de red en el build de EAS) **no lo ejecuta EAS realmente**.
   Santiago lo reemplazó por un script `postinstall` normal (que sí corre
   siempre en `npm install`) más una variable de entorno
   `REACT_NATIVE_DOWNLOADS_DIR`. **Esto es importante: la versión que hoy
   tiene `master` de este fix probablemente no funcione en un build real
   de EAS**, porque depende del hook que no se ejecuta.
3. **Corrección de documentación** (`3c01b8b`) — Santiago confirmó y
   documentó exactamente lo que detectamos juntos en la auditoría
   anterior: el deploy de MonsterASP no es automático por push, hay que
   entrar al panel y apretar "Pull latest" + "Build & publish" a mano.

**Recomendación**: traer estos 3 commits a `master` (especialmente el
punto 2, que puede estar bloqueando silenciosamente cualquier build de
EAS que se intente desde `master` hoy).

## 15.4 Backend en producción: HOY FUNCIONA (cambio respecto a la última auditoría)

La última vez que se verificó (2026-09-21) el backend real
(`https://cuentasclaras.runasp.net`) devolvía 404 en rutas nuevas — bloqueante,
reportado en `docs/14-auditoria-backend-produccion.md`. **Se volvió a
verificar recién y ya funciona**: la ruta de resultado compartido
responde con un error de aplicación real (`{"error":"Sesión no encontrada
o link inválido"}`, no el 404 genérico de antes), y hay **32 sesiones
reales creadas entre el 2026-09-01 y hoy**, incluida una de hace unas
horas — el equipo ya está usando la app de verdad contra el backend real.

Esto confirma que el diagnóstico y los pasos que se le pasaron a
Santiago (§15.3 punto 3) se aplicaron y funcionaron.

## 15.5 Tablero (CollabKit/Trello): 53 tarjetas, columnas y el problema real

| Columna | Cantidad |
|---|---|
| Backlog - Pendientes | 16 |
| To Do - Por hacer | 4 |
| Testing | 13 |
| Hecho | 20 |
| **Total** | **53** |

El problema no es la cantidad — es que **el mismo ticket aparece con
estados contradictorios en más de un lugar**, algo que solo se ve
comparando todas las columnas a la vez:

- **1.1.1.2 — Lógica de registro de nombres por sesión**: existe una
  copia activa y asignada a Pablo en "To Do", y **otra copia vacía y sin
  asignar en "Hecho"**. Según el registro de trabajo, Pablo ya lo terminó
  el 2026-08-26 — la copia de "To Do" es la que sobra.
- **1.3.1.2 — Creación de la base de datos**: duplicado entre "To Do" y
  "Testing", ambos asignados a Pablo pero uno vacío y otro con contenido.
- **1.1.1.1 — Servicio de generación de links de WhatsApp**: dos copias en
  "Testing", una asignada a Gustavo (identidad vieja de Trello + la
  nueva de CollabKit, ya unificadas en un ticket) y otra a Santiago —
  probablemente una haya que fusionarla con el hallazgo de §15.3.1 (el
  fix de la redirección).
- **1.3.1.1 — Selección de arquitectura y herramientas**: duplicado
  dentro de "Hecho" mismo, una completa y otra vacía sin asignar (esta ya
  la habíamos visto la semana pasada).

Aparte de los duplicados:

- **2 tarjetas de prueba que ya se habían archivado reaparecieron**:
  `[TEST verificación native member - borrar]` y `[TEST2 ... - borrar]`,
  otra vez en "Backlog", asignadas a Pablo. Se habían archivado el
  2026-09-15 — o se desarchivaron solas (quirk ya visto antes de
  CollabKit) o alguien las volvió a crear.
- **6 tickets sin asignar**: 1.2.2.3, 1.3.2.2, 1.4.3.2 (Backlog), 1.2.2.4
  (Testing), más las 2 de Hecho ya mencionadas arriba.
- **13 tickets en "Testing" sin mover**, varios de los cuales ya están
  verificados hace semanas (las 3 tarjetas de Presupuesto/Resultado de
  Gianna, las 3 de documentación de Gianna, 1.3.4.1 de CI/CD) — parecen
  simplemente no haberse pasado a "Hecho" después de confirmarlas.

**Recomendación**: antes de re-priorizar nada, hacer una limpieza de una
sola pasada: fusionar los 4 duplicados (quedándose con la copia completa
en cada caso), archivar de nuevo las 2 de test, y mover a "Hecho" lo que
ya está confirmado hace semanas. Esto por sí solo probablemente reduzca
la sensación de desorden más que cualquier otra cosa.

## 15.6 Estado del código (verificado ahora, no asumido)

- `server`: **57/57 tests en verde** (`npm test`).
- `mobile`: `npx tsc --noEmit` **sin errores**.
- Nada de esto detecta lo de §15.3 (el fix de EAS es de configuración de
  build, no de tipos ni tests) — por eso hace falta traer esos commits
  aparte, no alcanza con "todo pasa en verde".

## 15.7 Qué hacer primero (orden sugerido)

1. Traer los 3 commits reales de `production` a `master` (§15.3) — el fix
   de EAS en particular puede estar bloqueando builds ahora mismo sin que
   nadie lo sepa.
2. Limpieza de tablero: fusionar duplicados, re-archivar las tarjetas de
   test, mover a Hecho lo ya confirmado (§15.5).
3. Actualizar las 2 referencias a `better-sqlite3` y la nota de RF-08a en
   `docs/02`/`04`/`06` (§15.2) — 15 minutos de trabajo, elimina una fuente
   real de confusión para cualquiera que lea la documentación de arriba
   hacia abajo.
4. Recién con eso, decidir si conviene generar un build de EAS nuevo
   (ya con el backend en producción funcionando, tiene sentido probarlo).
