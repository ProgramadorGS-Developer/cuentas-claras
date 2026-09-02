# 7. Guía de implementación por fases

Esta guía traduce el EDT original del proyecto (`EDT.docx`,
`Tabla_yDiccionario.xlsx`) y el cronograma de 10 semanas
(`Cronograma_Oficial.xlsx`) a un plan de implementación concreto sobre el
scaffold de `mobile/` y `server/` ya generado. Cada fase indica qué
paquetes de trabajo del EDT cubre y qué archivos del proyecto tocar.

## Fase 0 — Puesta a punto del entorno (previa a S1)

1. Instalar Node.js LTS, y `npx expo-cli` / Expo Go en un celular físico
   (recomendado) o un emulador Android/iOS.
2. Clonar el proyecto, correr `npm install` en `mobile/` y en `server/`.
3. Confirmar que `npm run dev` (server) y `npx expo start` (mobile) levantan
   sin errores. Esto reemplaza el paquete **1.3.1.1 "Selección de
   arquitectura y herramientas"** del EDT: la decisión ya está tomada y
   documentada en `04-arquitectura.md`.

## Fase 1 — Autenticación y sesión (EDT 1.1.1, 1.1.2 / S1-S3)

Cubre RF-01, RF-02, RF-03, RF-04, CU-01.

1. Backend: implementar y probar `POST /sessions`, `GET
   /sessions/by-token/:token`, `POST /sessions/:id/participants`
   (`sessions.controller.ts`, `users.routes.ts` — ya scaffoldeados).
2. Mobile: conectar `JoinSessionScreen` y `EnterNameScreen` a
   `sessionApi`/`userRepository`. Configurar el *deep link* `cuentasclaras://`
   en `app.json` (clave `scheme`) y probar que abrir el link desde
   WhatsApp lanza la app (`services/whatsapp/shareLink.ts`).
3. Implementar `HomeScreen` (RF-04: nueva sesión + historial) contra
   `sessionRepository.listAll()`.
4. **Criterio de aceptación** (heredado de la Tabla_yDiccionario): un link
   generado abre la app correctamente y el nombre ingresado queda
   vinculado a la sesión correcta, incluso con dos usuarios de igual
   nombre (se diferencian por `participant.id`).

## Fase 2 — Lista de compras y concurrencia (EDT 1.1.3, 1.2.2 / S3-S6)

El corazón del proyecto. Cubre RF-05..RF-10 y RF-08a, CU-02, CU-02a. El
diseño detallado está en `12-diseno-concurrencia-de-reserva.md`.

1. Backend (Fase 1 del plan): endpoint `POST /items/:itemId/reserve`
   atómico (`UPDATE ... WHERE reserved_by IS NULL`, éxito si
   `changes === 1`), `POST /items/:itemId/release` restringido al titular,
   y `markPurchased()` con verificación de titular y estado previo.
   Emitir `item:updated` a la sala tras cada cambio. Prueba de estrés:
   `server/scripts/stress-reserve.ts` con ≥ 10 requests en paralelo →
   una `200`, el resto `409`.
2. Backend (Fase 2): tabla `item_offers`, endpoints de `offers` /
   `resolve` con autorización por titular, eventos `offer:created` /
   `offer:resolved`.
3. Mobile (Fase 3): conectar `ShoppingListScreen`, `ItemRow` y el hook
   `useReservation` (reserva/liberación por REST) y un `useItemOffers`
   para el aviso **no bloqueante** de ofrecimiento (`ItemOfferNotice`),
   con tres acciones: comprar, ceder, liberar.
4. Validar el criterio de aceptación EDT 1.2.2.4: el cambio de estado se
   refleja en los demás dispositivos en menos de 1 segundo.
5. Implementar la liberación de reservas (RF-06) y el campo de
   observaciones (RF-10, ya incluido en `items.observation`).

## Fase 3 — Compra, precios y tickets (EDT 1.1.4.1, 1.1.5, 1.2.4 / S5-S7)

Cubre RF-11, RF-12, CU-03.

1. Mobile: completar `ItemDetailScreen` — marcar como comprado, validar
   precio (`utils/validators.ts`), adjuntar ticket (`services/media/
   ticketUpload.ts` con `expo-camera`/`expo-image-picker`).
2. Backend: `items.controller.markPurchased`, `uploads.routes.ts` con
   `multer` (ya scaffoldeados); verificar que la URL devuelta sea
   accesible públicamente vía `/uploads/...`.
3. **Criterio de aceptación**: solo se aceptan precios numéricos positivos;
   la imagen sube correctamente desde un dispositivo real (no solo
   emulador, la cámara real importa para RF-12).

## Fase 4 — Presupuesto y resultado (EDT 1.1.4.2/.3, 1.2.3 / S6-S8)

Cubre RF-13, RF-14, RF-16, CU-04, CU-04a.

1. Implementar `BudgetScreen` contra `budgetApi.contribute` /
   `budgetRepository`.
2. Implementar `ResultScreen` usando `useBalance` +
   `domain/balanceCalculator.ts`. Validar el caso "nadie cargó
   presupuesto" (reparto en partes iguales, ver `05-modelo-de-datos.md`
   sección 5.3).
3. Conectar `shareResultSummary` (Share sheet nativo) para RF-16.
4. Implementar `MeetingExpensesScreen` (RF-15), independiente de una
   sesión completa.

## Fase 5 — Calidad, empaquetado y despliegue (EDT 1.3, 1.4 / S8-S10)

1. Ejecutar el plan de pruebas completo (`08-plan-de-pruebas.md`),
   incluyendo la prueba de estrés de concurrencia (EDT 1.4.3.1) y de
   usabilidad mobile-first (EDT 1.4.3.2).
2. Configurar EAS Build para generar el `.apk`/`.aab` de Android (y `.ipa`
   si hay cuenta de Apple Developer) — ver `09-despliegue.md`.
3. Desplegar el backend (Render/Railway/Fly.io) con volumen persistente
   para el archivo SQLite y la carpeta `uploads/`.
4. Redactar los manuales de usuario (`10-manuales-de-usuario.md`, ya
   incluidos en este set de documentación) y el acta de aceptación final
   (EDT 1.4.4.1), fuera del alcance de este repositorio de código.

## 7.1 Orden de dependencias resumido

```
Fase 0 (entorno)
   └─▶ Fase 1 (sesión/acceso)
          └─▶ Fase 2 (lista + concurrencia)  ◀── depende de Fase 1 (necesita participantes)
                 ├─▶ Fase 3 (compra/tickets)  ◀── depende de Fase 2 (necesita ítems reservados)
                 └─▶ Fase 4 (presupuesto/resultado) ◀── depende de Fase 3 (necesita precios cargados)
                        └─▶ Fase 5 (QA + despliegue)
```

Este orden respeta las dependencias ya identificadas en
`Cronograma_Oficial.xlsx` (hitos HITO 1 tras autenticación, HITO 2 tras
concurrencia) y las traslada del par backend-web/frontend-web al par
backend-server/frontend-mobile.
