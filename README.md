# CuentasClaras — App móvil (React Native + SQLite)

> Sistema de gestión de compras grupales a tiempo real, originalmente
> especificado como proyecto académico de Ingeniería de Software
> (Tecnicatura Superior en Desarrollo de Software) en formato web, y
> documentado aquí para implementarse como **app móvil con React Native y
> SQLite**.

Permite que un grupo de personas (ej. organizando un asado, una previa o un
viaje) reserve ítems de una lista de compras sin duplicarse, registre lo
que cada uno gastó y aportó, y calcule automáticamente quién le debe pagar
a quién al finalizar.

## Documentación completa

Toda la documentación del proyecto está en [`docs/`](./docs), en el orden
recomendado de lectura:

| # | Documento | Contenido |
|---|---|---|
| 1 | [Visión y alcance](./docs/01-vision-y-alcance.md) | Qué es el proyecto, qué problema resuelve, qué queda dentro y fuera de alcance. |
| 2 | [Actores y requisitos](./docs/02-actores-y-requisitos.md) | Usuario/Anfitrión/WhatsApp, los 16 requisitos funcionales (RF-01..RF-16) y los no funcionales, con su adaptación a mobile. |
| 3 | [Casos de uso](./docs/03-casos-de-uso.md) | CU-01 a CU-04(a), incluida la trazabilidad RF → CU → pantalla concreta del código. |
| 4 | [**Arquitectura técnica**](./docs/04-arquitectura.md) | La pieza clave: por qué SQLite sola en el celular no alcanza, y cómo se resuelve con cliente offline-first + backend con SQLite como fuente de verdad. |
| 5 | [Modelo de datos](./docs/05-modelo-de-datos.md) | Diccionario de datos completo: tablas, campos, tipos y a qué requisito responde cada uno. |
| 6 | [Estructura de carpetas](./docs/06-estructura-de-carpetas.md) | Recorrido guiado del árbol de `mobile/` y `server/`, y cómo instalarlo/correrlo. |
| 7 | [Guía de implementación por fases](./docs/07-guia-de-implementacion.md) | Roadmap de construcción en 5 fases, mapeado al EDT y cronograma originales. |
| 8 | [Plan de pruebas](./docs/08-plan-de-pruebas.md) | Unitarias, integración, prueba de estrés de concurrencia y checklist de aceptación. |
| 9 | [Despliegue](./docs/09-despliegue.md) | Opciones recomendadas de hosting en general (Railway/Render/VPS) — para lo que el proyecto usa **de verdad**, ver el documento 17. |
| 10 | [Manuales de usuario](./docs/10-manuales-de-usuario.md) | Guía rápida para el Anfitrión y para Participantes, en lenguaje llano. |
| 11 | [Cambios para el despliegue real](./docs/11-cambios-para-despliegue.md) | Los 4 cambios de código que hizo falta hacer para desplegar de verdad en MonsterASP.net (motivo y alternativas descartadas de cada uno). |
| 12 | [Diseño de concurrencia de reserva](./docs/12-diseno-concurrencia-de-reserva.md) | Rediseño del arbitraje de RF-08/RF-08a: por qué se reemplazó la negociación por cola por un arbitraje atómico instantáneo. |
| 13 | [Reporte de pruebas de estrés](./docs/13-reporte-pruebas-estres.md) | Resultado de la prueba de concurrencia con 12/50/100 usuarios simultáneos. |
| 14 | [Auditoría: backend hardcodeado](./docs/14-auditoria-backend-produccion.md) | Historial del hallazgo "la URL del backend está fija y el servidor real quedó desactualizado". |
| 15 | [Estado actual del proyecto](./docs/15-estado-actual-del-proyecto.md) | Auditoría completa (código, git, tablero, backend en vivo) — el diagnóstico más reciente de dónde está parado el proyecto. |
| 16 | [**Referencia de API**](./docs/16-referencia-api.md) | Todos los endpoints REST y eventos de Socket.IO en un solo lugar, con sus respuestas y errores. |
| 17 | [**Runbook de despliegue real**](./docs/17-runbook-despliegue.md) | Cómo se despliega de verdad hoy (MonsterASP + EAS), paso a paso — reemplaza en la práctica al documento 9. |
| 18 | [Trazabilidad de requisitos](./docs/18-trazabilidad-requisitos.md) | Cada RF/RNF: dónde está implementado, qué test lo cubre, si está realmente terminado. |
| 19 | [Problemas conocidos y soluciones](./docs/19-problemas-conocidos-y-soluciones.md) | FAQ técnico: cada bug/gotcha real que ya pisamos, con su causa y su solución. |
| 20 | [**Tutorial de inicio rápido**](./docs/20-tutorial-inicio-rapido.md) | Levantar el proyecto y probarlo de punta a punta hoy mismo, sin leer los otros 19 documentos primero. |
| 21 | [Acta de aceptación final](./docs/21-acta-aceptacion-final.md) | Veredicto de cumplimiento de cada requisito, listo para firma del equipo. |
| 22 | [Informe de lecciones aprendidas](./docs/22-informe-lecciones-aprendidas.md) | Qué costó más de lo esperado y por qué, para no repetirlo. |

> Documentos superseded/históricos (no desactualizarlos activamente, pero no son la fuente de verdad): `docs/analisis-concurrencia-reserva.txt` (reemplazado por el 12), `docs/tablero-trello-cuentasclaras.md`. El zip `cuentas-claras-rn.zip` en la carpeta padre del repo es el scaffold del primer día (2026-08-18) — histórico, no documentación vigente.

## Resumen de la arquitectura

```
┌─────────────────────────┐        REST + WebSockets       ┌──────────────────────────┐
│   App móvil (cliente)    │ ───────────────────────────▶  │   Backend (Node.js)       │
│   React Native + Expo    │ ◀───────────────────────────  │   Express + Socket.IO     │
│   SQLite LOCAL            │                                │   SQLite del SERVIDOR     │
│   (cache offline-first)  │                                │   (fuente de verdad)      │
└─────────────────────────┘                                └──────────────────────────┘
```

SQLite se usa en **ambos lados**: en el dispositivo como cache offline
(la lista de compras se ve al instante, incluso sin señal) y en el
servidor como fuente de verdad compartida (necesaria para resolver en
tiempo real el requisito más importante del sistema: que dos personas no
reserven el mismo producto a la vez). El detalle completo, con el porqué
de esta decisión, está en [`docs/04-arquitectura.md`](./docs/04-arquitectura.md).

## Estructura del repositorio

```
cuentas-claras/
├── docs/       → toda la documentación (tabla de arriba)
├── mobile/     → app React Native (Expo + TypeScript)
└── server/     → backend Node.js + Express + Socket.IO + SQLite
```

## Puesta en marcha rápida

```bash
# 1) Backend
cd server
cp .env.example .env
npm install
npm run dev              # http://localhost:3000

# 2) App móvil (en otra terminal)
cd mobile
cp .env.example .env     # editar API_URL / SOCKET_URL con la IP de tu backend
npm install
npx expo start           # escanear el QR con la app Expo Go
```

Más detalle en [`docs/06-estructura-de-carpetas.md`](./docs/06-estructura-de-carpetas.md)
y en [`docs/07-guia-de-implementacion.md`](./docs/07-guia-de-implementacion.md).

## Estado actual (2026-09-29)

Los 16 requisitos funcionales están implementados y probados (server
57/57 tests, `tsc --noEmit` limpio en ambos proyectos) — detalle
requisito por requisito en
[`docs/18-trazabilidad-requisitos.md`](./docs/18-trazabilidad-requisitos.md)
y veredicto formal en
[`docs/21-acta-aceptacion-final.md`](./docs/21-acta-aceptacion-final.md).
El backend está desplegado y en uso real en
`https://cuentasclaras.runasp.net` (WebSocket verificado el 2026-10-20).
Antes de dar el sistema por entregado quedan: un build de EAS corrido de
punta a punta, backups de la base de producción y confirmar la
persistencia de las fotos de tickets — ver
[`docs/21-acta-aceptacion-final.md`](./docs/21-acta-aceptacion-final.md)
§21.2.

Para levantarlo y probarlo hoy mismo: [`docs/20-tutorial-inicio-rapido.md`](./docs/20-tutorial-inicio-rapido.md).

## Origen del proyecto

Este trabajo parte de la especificación funcional definida por la cátedra
de Ingeniería de Software (EDT, actores, requisitos y casos de uso
originales, ver `docs/01` a `docs/03`), reinterpretada íntegramente para
una implementación **React Native + SQLite** en lugar de la aplicación web
originalmente planteada. Ninguna regla de negocio fue modificada: solo la
plataforma y las decisiones técnicas de implementación.
