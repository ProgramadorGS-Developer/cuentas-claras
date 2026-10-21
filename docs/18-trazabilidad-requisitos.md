# 18. Matriz de trazabilidad de requisitos

| | |
|---|---|
| **Propósito** | Un solo lugar que responda, para cada requisito: ¿dónde está implementado?, ¿qué prueba lo cubre?, ¿está realmente terminado? |
| **Fecha de verificación** | 2026-09-29 (server 57/57 tests, `tsc --noEmit` limpio en ambos proyectos — ver `docs/15`) |
| **Cómo mantenerlo** | Actualizar la fila correspondiente en el mismo commit que cierre o modifique un requisito — si esto se desactualiza, vuelve a pasar lo de `docs/15` §15.2 |

Convención de estado: ✅ Hecho y probado · 🟡 Hecho, reformulado o con
alcance reducido a propósito (con nota) · ⬜ Pendiente.

## 18.1 Requisitos funcionales

| RF | Descripción breve | Implementación | Test | Estado |
|---|---|---|---|---|
| RF-01 | Acceso vía link de WhatsApp | `whatsappLink.service.ts`, `shareSessionLinkViaWhatsApp` (mobile). Puente `/join/:token` para que WhatsApp linkee el deep link — en `master` y en producción desde el 2026-10-20, verificado con un token real | — (manual) | ✅ backend. Falta probar el clic desde un chat real de WhatsApp en un celular |
| RF-02 | Solo pide nombre al ingresar | `POST /sessions/:sessionId/participants`, `EnterNameScreen.tsx` | `participants.test.ts` | ✅ |
| RF-03 | Anfitrión carga lista sugerida | `POST /sessions` con `items: string[]`, `NewSessionScreen.tsx` | `sessions.test.ts` | ✅ |
| RF-04 | Home con Nueva sesión / Historial | `HomeScreen.tsx`, `useHomeDashboard.ts`, `SessionHistoryScreen.tsx` | — (manual) | ✅ |
| RF-05 | Reservar uno o varios ítems | `POST /items/:id/reserve`, `useReservation.ts` | `reservation.test.ts` | ✅ |
| RF-06 | Quitar una reserva propia | `POST /items/:id/release` (403 si no es titular) | `reservation.test.ts` | ✅ |
| RF-07 | Reserva obligatoria antes de comprar | `purchaseItem()` exige `reserved_by === participantId` | `reservation.test.ts` (bloque purchase) | ✅ |
| RF-08 | Arbitraje determinista de reserva simultánea | `UPDATE ... WHERE reserved_by IS NULL` (`docs/12`) | `reservation.test.ts` + `stress-reserve.ts` (N=12/50/100, `docs/13`) | ✅ |
| RF-08a | Ofrecerse por un ítem ya reservado, titular decide | **Reformulado** (`docs/12` §12.1): el original (negociación completa insistir/ceder) fue reemplazado por un aviso no bloqueante al que **pierde** la carrera (`ReservationNoticeBanner.tsx`). El modelo de negociación completa (Fase 2 de `docs/12`) sigue sin construirse | — | 🟡 alcance reducido a propósito — falta actualizar `docs/02`/`04` para que dejen de describir la versión original (`docs/15` §15.2) |
| RF-09 | Estado pendiente/comprado | `items.status`, `markPurchased()` (única transición válida) | `reservation.test.ts` | ✅ |
| RF-10 | Campo de observaciones por ítem | `items.observation`, se completa solo con "Reservado por \<nombre\>" al reservar/liberar | `reservation.test.ts` (bloque observation) | ✅ backend. Sin UI de edición libre — se evaluó y no hacía falta (worklog 2026-09-15) |
| RF-11 | Precio pagado al marcar comprado | `POST /items/:id/purchase { pricePaid }`, `esMontoValido()` | `reservation.test.ts` | ✅ |
| RF-12 | Escanear/subir ticket | `POST /items/:id/ticket-upload` (multer, 8MB), `expo-camera`/`expo-image-picker` | — (manual, verificado con curl) | ✅ — riesgo abierto: persistencia del disco entre redeploys sin confirmar (`docs/17` §17.1) |
| RF-13 | Presupuesto (opcional) | `POST /sessions/:id/budget`, `BudgetScreen.tsx`, `useBudget.ts` (offline-first) | `balance.test.ts` | ✅ |
| RF-14 | Resultado con balance | `computeSessionResult()`, `ResultScreen.tsx`, `useSessionResult.ts` | `balance.test.ts` | ✅ |
| RF-15 | Gastos en reunión | `MeetingExpensesScreen.tsx` + `splitMeetingExpense()` — 100% local, sin backend | — (manual) | ✅ |
| RF-16 | Compartir resultado | `GET /sessions/shared/:token/result`, `buildResultShareText()`, `handleShare` en `ResultScreen.tsx` | `shared-result.test.ts` | ✅ |

## 18.2 Requisitos no funcionales

| RNF | Descripción | Estado | Nota |
|---|---|---|---|
| RNF-01 | Distribución como `.apk`/`.aab`/`.ipa` vía EAS | 🟡 | Build de Android probado exitosamente una vez (`docs/11`); el fix real de SQLite para EAS todavía no está en `master` (`docs/17` §17.2). iOS: no intentado, requiere cuenta Apple Developer |
| RNF-02 | Mobile-first | ✅ | App nativa, no aplica adaptación |
| RNF-03 | Integración con WhatsApp | ✅ | Deep link + Share sheet + puente `/join/:token` (clickeable desde WhatsApp) en `master` y producción. Pendiente solo la prueba en un celular real |
| RNF-04 | UI minimalista, alto contraste, letras grandes | ✅ | `mobile/src/theme/` centralizado |
| RNF-05 | Resiliencia offline | ✅ | SQLite local + `pending_sync` (`syncEngine.ts`) para lectura y cola de reintento |
| RNF-06 | Propagación de cambios <1s | 🟡 | Arbitraje REST es instantáneo (200/409 al toque); la propagación por Socket.IO a otros dispositivos nunca se midió con clientes reales, solo con `fetch` concurrente (`docs/13` §13.5, fuera de alcance de ese reporte) |
| RNF-07 | Acceso solo por `shareToken` | ✅ | Sin listado público de sesiones ajenas por token; `GET /sessions` sin filtrar sí lista todas — revisar si corresponde restringirlo antes de un despliegue no académico |

## 18.3 Cómo leer esta tabla junto con el resto de la documentación

- Una fila 🟡 con "reformulado" apunta a `docs/12` — ese es el documento
  con la decisión de diseño real, no el requisito original.
- Una fila 🟡 con "falta traer a master" apunta a `docs/15` §15.3 y
  `docs/17` — el código existe y funciona, pero en la rama equivocada.
- Ningún RF quedó en ⬜ (sin empezar) al día de esta verificación.
