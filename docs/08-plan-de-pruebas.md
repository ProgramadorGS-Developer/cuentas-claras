# 8. Plan de pruebas y aseguramiento de calidad

Adaptación del paquete de trabajo **1.4.3 "Plan de Pruebas y Aseguramiento
de Calidad"** del EDT original a las herramientas del ecosistema React
Native / Node.

## 8.1 Pruebas unitarias

**Objetivo**: lógica de negocio pura, sin UI ni red.

| Módulo | Casos a cubrir |
|---|---|
| `mobile/src/domain/balanceCalculator.ts` | Balance con presupuesto cargado; balance sin presupuesto (reparto igualitario); simplificación de deudas con 2, 3 y N participantes; montos con decimales. |
| `mobile/src/utils/validators.ts` | Nombres vacíos/con espacios; precios con coma decimal, negativos, no numéricos. |
| `server/src/services/balance.service.ts` | Mismos casos que el cálculo del cliente, para verificar que ambos coinciden (regla de oro: nunca deben divergir). |

Herramienta: **Jest** (ya configurado en ambos `package.json`).

```bash
cd mobile && npm test
cd server && npm test
```

## 8.2 Pruebas de integración

| Escenario | Verifica |
|---|---|
| Crear sesión → unirse con 2 participantes → reservar ítems distintos → marcar comprados → consultar resultado | El flujo feliz completo, de punta a punta contra el backend real (no mockeado). |
| Reservar y luego liberar un ítem | RF-06: el ítem vuelve a estar disponible para otro usuario. |
| Cargar presupuesto parcial (solo algunos participantes aportan) | RF-13/RF-14: el balance considera correctamente a quienes no aportaron. |
| Subida de ticket con imagen inválida / demasiado grande | Manejo de errores del endpoint `ticket-upload` (límite de 8MB configurado en `multer`). |

## 8.3 Prueba de estrés de concurrencia (EDT 1.4.3.1 — la más crítica)

Reproduce el problema original que motivó el proyecto: **dos o más
usuarios reservando el mismo ítem al mismo tiempo**.

**Procedimiento sugerido:**

1. Levantar el backend localmente.
2. Escribir un script (`server/scripts/stress-reserve.ts`, a crear cuando
   se implemente esta fase) que dispare N requests
   `POST /items/:itemId/reserve` sobre el mismo `itemId` en paralelo
   (`Promise.all`).
3. Verificar:
   - Exactamente **una** respuesta `200` y el resto `409` con el mismo
     titular ganador.
   - Solo un participante queda con `item.reserved_by` seteado al final.
   - Ningún cliente recibe un estado contradictorio vía `item:updated`.
   - Doble `POST /items/:itemId/purchase` sobre el mismo ítem → una `200`,
     la segunda `409` (RF-07).
4. Repetir con al menos 10 requests simultáneos (criterio de aceptación
   original de la Tabla_yDiccionario, fila 1.4.3.1).

Detalle del algoritmo y casos de borde: `12-diseno-concurrencia-de-reserva.md`.

## 8.4 Validación de criterios mobile-first y usabilidad (EDT 1.4.3.2)

- Probar en un dispositivo físico de gama media, no solo en emulador.
- Verificar que los textos sean legibles sin hacer zoom (tipografía
  definida en `mobile/src/theme/typography.ts`, mínimo 15sp para
  `caption`, 18sp para `body`).
- Botones con área táctil mínima de 44x44dp (ya aplicado en
  `AppButton.tsx`, `minHeight: 52`).
- Al menos 3 personas ajenas al equipo de desarrollo completan el flujo
  principal (crear sesión → reservar → comprar → ver resultado) sin
  asistencia.

## 8.5 Pruebas end-to-end (E2E) en el dispositivo

Herramienta recomendada: **Maestro** (más simple de configurar que Detox
para un proyecto de esta escala) o **Detox** si el equipo ya lo conoce.

Flujos mínimos a automatizar:

1. Abrir la app vía deep link → ingresar nombre → llegar al Home.
2. Crear una sesión con 2 ítems → reservar uno → marcar como comprado con
   precio → ver que aparece en "Resultado".
3. Simular pérdida de conectividad (modo avión) → reservar un ítem →
   verificar que queda en `pending_sync` → reactivar red → verificar que
   se sincroniza.

## 8.6 Checklist de aceptación final (equivalente EDT 1.4.4.1)

- [ ] Los requisitos funcionales (RF-01 a RF-16, más RF-08a) tienen al
      menos un caso de prueba manual o automatizado que los cubre.
- [ ] La prueba de estrés de concurrencia (8.3) pasa con 10 usuarios
      simultáneos sin estados inconsistentes.
- [ ] La app funciona (lectura) sin conexión y sincroniza al reconectar.
- [ ] Al menos 3 usuarios reales validaron la usabilidad mobile-first.
- [ ] El balance calculado en cliente y en servidor coinciden en todos los
      casos de prueba de 8.1.
