# 13. Reporte de pruebas de estrés de concurrencia (EDT 1.4.3.1)

| | |
|---|---|
| **Paquete de trabajo (EDT)** | 1.4.3.1 — Reporte de pruebas de estrés para clicks instantáneos |
| **Requisito** | RF-08, criterio §8.3 y §8.6 de `docs/08-plan-de-pruebas.md` |
| **Herramienta** | `server/scripts/stress-reserve.ts` (entregado en la Fase 1, `npm run stress:reserve`) |
| **Fecha** | 2026-09-15 |
| **Resultado** | ✅ Aprobado — arbitraje determinista en las 3 corridas |

## 13.1 Qué valida esta prueba

Reproduce el problema original que motivó el proyecto (RF-08): **N usuarios
reservando el mismo ítem en el mismo instante**. El script:

1. Crea una sesión con un ítem ("Carbón").
2. Da de alta N participantes.
3. Dispara `POST /items/:itemId/reserve` para los N en paralelo
   (`Promise.all`, mismo milisegundo).
4. Verifica que exactamente uno reciba `200` y el resto `409` apuntando
   al mismo ganador (`reservedBy`), que `items.reserved_by` en la base
   coincida con ese ganador, y que una doble compra sobre el mismo ítem
   dé `200`/`409`.

## 13.2 Corridas ejecutadas

Contra el backend corriendo localmente (`node:sqlite`, WAL), tres
volúmenes de carga:

| N (usuarios simultáneos) | 200 | 409 | ¿Único ganador consistente? | ¿`reserved_by` final correcto? | Doble compra (200/409) | Tiempo total del script |
|---|---|---|---|---|---|---|
| 12 (mínimo del criterio §8.3) | 1 | 11 | ✅ | ✅ | ✅ | — |
| 50 | 1 | 49 | ✅ | ✅ | ✅ | — |
| 100 | 1 | 99 | ✅ | ✅ | ✅ | ~2.1s (incluye arranque de `tsx`, alta de 100 participantes y las 100 reservas en paralelo) |

En las tres corridas: **cero respuestas fuera de 200/409** (sin errores
5xx, sin timeouts, sin estados inconsistentes), y el ganador reportado en
cada respuesta `409` coincidió siempre con quien efectivamente quedó con
`items.reserved_by` en la base — no hubo ningún caso de "doble reserva"
ni de ganador ambiguo.

## 13.3 Por qué es determinista (no solo "no falló esta vez")

El resultado no depende de que el test haya tenido suerte: `reserveItem()`
(`server/src/services/reservation.service.ts`) resuelve la carrera con una
única sentencia condicional —

```sql
UPDATE items SET reserved_by = ? WHERE id = ? AND reserved_by IS NULL AND status = 'pendiente'
```

— y `node:sqlite` (`DatabaseSync`) ejecuta de forma sincrónica sobre un
Node de un solo hilo: cada `UPDATE` se completa entero antes de que
empiece el siguiente, así que nunca hay dos escrituras intercaladas sobre
el mismo ítem. El resultado es binario y observable (`changes === 1` o
`0`), no una carrera de "quién le gana a quién en el event loop". El
detalle completo del diseño está en `docs/12-diseno-concurrencia-de-reserva.md`
§12.2.

## 13.4 Criterio de aceptación (§8.3 / §8.6 del plan de pruebas)

- [x] Las pruebas cubren al menos 10 usuarios simultáneos (corridas con
      12, 50 y 100).
- [x] El sistema no produce estados inconsistentes en ningún caso.
- [x] Solo un participante queda con `item.reserved_by` seteado al final,
      en las tres corridas.
- [x] Ningún cliente recibe un estado contradictorio (dos "ganadores"
      para el mismo ítem): no ocurrió en ninguna corrida.

## 13.5 Fuera de alcance de este reporte

- La prueba mide el arbitraje **REST** (Fase 1 + Fase 3, ya migrado en el
  cliente). No mide la latencia de propagación del evento `item:updated`
  por Socket.IO a otros dispositivos conectados (RNF-06, <1s) — eso
  requiere un test con clientes Socket.IO reales, no solo `fetch`
  concurrente, y queda fuera del alcance de este ticket puntual.
- No se probó con el backend desplegado en producción (MonsterASP.net),
  solo en local — la latencia de red real podría diferir, aunque el
  resultado del arbitraje (quién gana) no depende de la latencia.
