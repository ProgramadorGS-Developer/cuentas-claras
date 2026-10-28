# 14. Auditoría: backend de producción con URL hardcodeada y sin comunicación real

| | |
|---|---|
| **Relacionado a** | 1.1.2.1 (avisado), 1.3.1.3 — Provisión y configuración de servidores (Santiago) |
| **Fecha del hallazgo** | 2026-09-15/16 |
| **Última verificación en vivo** | 2026-09-21 — **el problema sigue sin resolver** |
| **Responsable de la corrección** | Santiago (rol backend + infra, dueño del pipeline de deploy) |
| **Bloquea** | Generar un APK nuevo que funcione de verdad para el equipo |

## 14.1 Resumen

Dos hallazgos combinados hacen que, si se genera un APK hoy, la app
instalada **no puede comunicarse de verdad con el backend real**:

1. La URL del backend está **hardcodeada** en `mobile/app.json`, no se
   puede cambiar editando `.env`.
2. El backend en producción (donde esa URL hardcodeada apunta) **todavía
   no tiene desplegado el código nuevo** — responde 404 en rutas que ya
   existen en el repositorio hace días.

Juntos, esto significa: cualquier APK que se compile va a apuntar sí o sí
a un backend que no entiende varias de las funciones ya implementadas
(cerrar sesión, presupuesto, resultado compartido, etc.).

## 14.2 Hallazgo 1 — URL del backend hardcodeada en `app.json`

`mobile/app.json`:

```json
"extra": {
  "apiUrl": "https://cuentasclaras.runasp.net",
  "socketUrl": "https://cuentasclaras.runasp.net"
}
```

Cuando se corre `eas build`, la compilación ocurre en los servidores de
Expo en la nube — **no lee el `.env` local**, eso solo lo lee `expo
start` corriendo en la propia PC. Por lo tanto:

- No importa desde qué rama local se builder, ni qué tenga configurado el
  `.env` de quien compila.
- El APK resultante va a apuntar siempre al valor fijo del JSON:
  `https://cuentasclaras.runasp.net`.

(Nota aparte, ya resuelta: originalmente ese mismo campo estaba
hardcodeado a `http://localhost:3000`, lo que rompía cualquier prueba
fuera de la PC del desarrollador. Se corrigió apuntándolo al dominio real
de producción, y se agregó `mobile/app.config.js` para que además se
pueda pisar por variable de entorno al levantar el CLI localmente — pero
esto último **no aplica a un build de EAS**, solo a `expo start`.)

## 14.3 Hallazgo 2 — El backend de producción no tiene el código nuevo

Verificado con una petición directa contra el dominio real:

```
GET https://cuentasclaras.runasp.net/sessions/shared/test-token-inexistente/result
→ 404 "Cannot GET /sessions/shared/..."
```

Esa ruta existe en el repositorio (`server/src/routes/sessions.routes.ts`)
desde hace varios días, y **la rama `production` ya tenía en Git** todo lo
de `master`, incluyendo esta ruta, cuando se hizo esta verificación. Es
decir: a nivel de código fuente estaba todo — el problema es que el
servidor real (MonsterASP.net) nunca terminó de aplicar ese deploy.

Repetí la misma verificación hoy (2026-09-21) y **el resultado es
idéntico**: la ruta sigue sin existir en el servidor real, 5 días después
del hallazgo original.

## 14.4 Por qué importa combinarlos

No son dos problemas independientes — el Hallazgo 1 hace que el Hallazgo
2 sea imposible de esquivar. Si el APK pudiera apuntar a otro backend (o
a uno local actualizado), el problema 2 no bloquearía nada. Pero como la
URL está fija en `app.json` apuntando justo al backend desactualizado,
**todo lo que dependa del servidor le va a fallar a cualquiera que
instale el APK**: reservar, liberar, cerrar sesión, cargar presupuesto,
ver el resultado y compartirlo. Lo único que sigue funcionando offline es
lo que no depende del backend (ej. la calculadora de gastos de reunión).

## 14.5 Diagnóstico de causa (deploy)

MonsterASP.net hace deploy automático por Git: al pushear a la rama
`production`, redeploya el servidor solo (`docs/09-despliegue.md`,
`docs/11-cambios-para-despliegue.md`). Git está bien — el código llegó a
`production`. Las causas más probables de que el servidor real no lo
haya tomado, en orden de probabilidad:

1. La rama configurada para auto-deploy en el panel de MonsterASP no
   coincide con `production` (quedó apuntando a otra rama, o nunca se
   confirmó al adoptar esta convención).
2. El deploy corrió pero el proceso de Node no se reinició solo (común en
   hostings compartidos: los archivos se actualizan pero el proceso viejo
   sigue corriendo en memoria hasta reiniciarlo a mano).
3. El deploy falló silenciosamente (error de build) y quedó la versión
   anterior como fallback.

Este diagnóstico y los pasos sugeridos para destrabarlo ya están
comentados en la tarjeta **1.3.1.3** (Santiago), junto con el pedido de
revisar el log del último deploy, confirmar la rama de auto-deploy, y
reiniciar el proceso manualmente si hace falta.

## 14.6 Cómo se arregla

1. Alguien con acceso al panel de MonsterASP (Santiago) revisa el log del
   último deploy: ¿corrió?, ¿cuándo?, ¿terminó bien?
2. Si corrió bien pero no reinició el proceso, reiniciar la app
   manualmente desde el panel.
3. Confirmar que la rama configurada para auto-deploy sea `production`.
4. Volver a probar la ruta (`GET /sessions/shared/.../result` u otra
   nueva) para confirmar que ya responde bien.
5. Recién ahí tiene sentido correr `eas build` para generar un APK que
   funcione de verdad — no antes.

## 14.7 Estado

**Sin resolver al 2026-09-21.** El hallazgo se reportó en la tarjeta
1.1.2.1 (registro de trabajo) y en un comentario en la tarjeta 1.3.1.3
(Santiago). No es una tarea del diccionario EDT numerada — es un paso
operativo de infraestructura, se está trackeando como comentario en Trello
hasta que se resuelva.
