# 21. Acta de aceptación final (EDT 1.4.4.1)

| | |
|---|---|
| **Fecha** | 2026-09-29 |
| **Base de la evaluación** | `docs/18-trazabilidad-requisitos.md` (verificación técnica: 57/57 tests de servidor, `tsc --noEmit` limpio en `mobile` y `server`, backend de producción verificado en vivo) |
| **Alcance** | Los 16 requisitos funcionales (RF-01 a RF-16, más RF-08a) y los 7 no funcionales (RNF-01 a RNF-07) definidos en `docs/02-actores-y-requisitos.md` |

## 21.1 Veredicto general

El sistema **cumple su objetivo central**: un grupo puede coordinar una
compra compartida sin duplicar reservas (RF-08, el requisito que motivó
todo el proyecto, probado de forma determinista con hasta 100 usuarios
simultáneos — `docs/13`), y al final obtiene un balance correcto de quién
le debe pagar a quién (RF-13/RF-14). Los 16 requisitos funcionales están
implementados; ninguno quedó sin empezar.

Se aceptan dos desvíos respecto de la especificación original, ambos
documentados y con decisión de diseño explícita (no son omisiones):

1. **RF-08a** se reformuló de una negociación completa
   (insistir/ceder/liberar) a un aviso no bloqueante para quien pierde la
   carrera. Motivo: la negociación completa exige una segunda máquina de
   estados con otro dueño de decisión y otra escala de tiempo (minutos,
   no milisegundos) — análisis completo en `docs/12`. El PM y el equipo
   dieron por buena esta simplificación durante el desarrollo.
2. **RNF-06** (propagación <1s) se probó de forma indirecta: el arbitraje
   REST es instantáneo, pero la propagación por Socket.IO a otros
   dispositivos nunca se midió con clientes reales conectados, solo con
   requests concurrentes (`docs/13` §13.5).

## 21.2 Condición para considerar el sistema "listo para repartir" (no solo "código completo")

Al 2026-09-29 había 2 items de infraestructura que bloqueaban una
entrega real. **Ambos se resolvieron el 2026-10-20:**

1. ~~Traer a `master` los 3 commits que solo existían en `production`~~ —
   hecho: están en `master` (más un parche de `expo-sqlite` y la suite E2E
   de Maestro, ambos de Pablo).
2. ~~Confirmar el soporte de WebSocket en el hosting~~ — hecho: una
   conexión Socket.IO solo-websocket contra producción conecta bien.

Quedan como condiciones abiertas, no bloqueantes pero necesarias antes de
dar el sistema por entregado:

- Un build de EAS desde `master` actualizado, corrido de punta a punta,
  para confirmar que el fix de SQLite funciona en la nube (nunca se probó
  con el commit definitivo).
- Backups de la base de producción (EDT 1.3.4.3): hoy no existe ninguno y
  la base ya tiene datos reales (34 sesiones).
- Confirmar que las fotos de tickets (disco local del servidor) sobreviven
  a un redeploy.

## 21.3 Checklist de aceptación (heredado de `docs/08-plan-de-pruebas.md` §8.6)

- [x] RF-01 a RF-16 tienen al menos un caso de prueba manual o
      automatizado (ver `docs/18` para el detalle por requisito).
- [x] La prueba de estrés de concurrencia pasa con 10+ usuarios
      simultáneos sin estados inconsistentes (`docs/13`, hasta 100).
- [x] La app funciona (lectura) sin conexión y sincroniza al reconectar
      (`syncEngine.ts`, `pending_sync`).
- [ ] Al menos 3 usuarios reales, ajenos al equipo de desarrollo,
      validaron la usabilidad mobile-first — **no verificado formalmente**;
      sí hay uso real del equipo contra producción (32 sesiones creadas
      entre el 2026-09-01 y el 2026-09-29), pero no es lo mismo que una
      validación de usabilidad con terceros.
- [x] El balance calculado en cliente y en servidor coinciden en todos
      los casos de prueba (`balanceCalculator.ts` vs `balance.service.ts`,
      mismos tipos, misma fórmula).

## 21.4 Recomendación

Aprobar el sistema como **funcionalmente completo**, con las condiciones
abiertas de §21.2 (build de EAS verificado, backups, persistencia de
fotos) como requisito antes de la entrega final, y con la validación de
usabilidad con terceros (§21.3) pendiente de agendar antes de la
presentación.

## 21.5 Firmas

| Rol | Nombre | Fecha | Conforme |
|---|---|---|---|
| Tech Lead | | | |
| PM | Gustavo Olivera | | |
| Backend | Pablo Casi | | |
| Backend/Infra | Santiago Casi | | |
| Frontend | Lucas Britos | | |
| Frontend/Docs | Gianna Branca | | |
