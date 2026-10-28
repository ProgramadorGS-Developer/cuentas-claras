# 22. Informe de lecciones aprendidas (EDT 1.4.4.2)

Repaso honesto de qué costó más de lo esperado en este proyecto y por
qué, para no repetir los mismos costos en el próximo. Agrupado por tipo,
no por orden cronológico.

## 22.1 Técnicas

**El hosting elegido determinó cambios de código que no tenían que ver con el diseño.**
Tres limitaciones reales de MonsterASP.net (bloqueo de compilación nativa,
bloqueo de ejecutar `.cmd`, `schema.sql` no copiado por `tsc`) obligaron a
migrar de `better-sqlite3` a `node:sqlite` y a tocar el script de build —
nada de esto estaba mal diseñado, era imposible de anticipar sin haber
intentado un deploy real antes. **Lección**: probar un deploy real al
hosting elegido lo antes posible en el proyecto, no al final — un "hola
mundo" desplegado destapa estos problemas mucho más barato que
descubrirlos con todo el backend ya escrito.

**Un "deploy automático" resultó no ser automático.**
Se documentó (`docs/09`) y se asumió durante semanas que MonsterASP
redeployaba solo al pushear a `production`. Era falso: hay que entrar al
panel y apretar dos botones a mano. El nombre de la función en el panel
("Despliegue de git") invitaba a esa suposición. **Lección**: verificar
el comportamioiento real de una herramienta de infraestructura con una
prueba concreta (pushear algo trivial y cronometrar cuándo se refleja),
no asumirlo por el nombre de la función o la documentación del proveedor.

**Un hook de EAS (`eas-build-post-install`) no se ejecutaba, y nadie lo notó hasta un build real.**
El primer fix del problema de `expo-sqlite` se validó solo localmente
(`node scripts/prepare-sqlite.js` corrido a mano) — funcionaba, pero
nunca se probó que **EAS lo dispare solo**. Cuando finalmente se corrió un
build real en la nube, seguía fallando. **Lección**: cuando la solución
depende de que una plataforma externa ejecute algo automáticamente
(un hook, un webhook, un script post-install), verificarlo con una
corrida real de esa plataforma, no asumir que el nombre del mecanismo
implica que funciona.

**Rutas de Windows con espacios rompieron una herramienta de compilación nativa (ninja/CMake).**
Costó dos intentos de build completos (∼15 minutos cada uno) antes de
identificar la causa real. **Lección**: en proyectos con módulos nativos
(React Native, Expo), evitar carpetas de trabajo con espacios en el
nombre desde el principio — es una clase entera de problemas de Windows
que se evita gratis.

## 22.2 De documentación

**La documentación describía un diseño que ya había sido reemplazado, y nadie se dio cuenta hasta auditar todo junto.**
`docs/02` y `docs/04` seguían describiendo el mecanismo original de
RF-08a (negociación completa) mucho después de que `docs/12` lo
reemplazara por algo más simple — y seguían mencionando
`better-sqlite3` mucho después de la migración documentada en `docs/11`.
Cada documento individual estaba "bien" en el momento en que se escribió;
el problema apareció porque nadie volvió a leerlos juntos. **Lección**:
un cambio de diseño que reemplaza a otro documento tiene que actualizar
ese documento en el mismo commit, no solo agregar uno nuevo que lo
reemplaza en la práctica.

**No existía un solo lugar con todos los endpoints y eventos.**
Estaban repartidos en 6 archivos de rutas — cualquiera que necesitara
integrar contra el backend tenía que leer código, no documentación. Se
resolvió con `docs/16-referencia-api.md`, pero se podría haber evitado el
desfasaje de RF-08a antes mencionado si hubiera existido desde el
principio.

## 22.3 De proceso / equipo

**El tablero acumuló tickets duplicados y contradictorios sin que nadie lo notara trabajando de a uno.**
El mismo número de EDT llegó a existir en dos columnas con estados
opuestos ("Hecho" en un lado, "sin hacer" en otro) — no por mala fe, sino
porque cada persona miraba su propia columna, no el tablero completo.
**Lección**: una revisión periódica de tablero completo (no por
persona/columna) detecta este tipo de cosas mucho antes que esperar a que
alguien "se sienta desorientado".

**Trabajo real terminó en la rama `production` y nunca volvió a `master`, más de una vez.**
Pasó al menos dos veces en este proyecto (el vendorizado de SQLite y
luego el fix del link de WhatsApp) — alguien resuelve un problema
directamente donde lo encuentra (en producción, bajo presión), y el paso
de "traerlo de vuelta a la rama principal" se pierde. **Lección**: cuando
se permite tocar código directo en una rama de producción, agregar un
paso explícito de checklist ("¿esto ya está en `master`?") antes de dar
el problema por cerrado — no alcanza con que el fix funcione donde se
aplicó.

**Reasignar identidades duplicadas (Trello nativo vs. cuenta vinculada) costó más de lo esperado.**
Dos integrantes tuvieron su trabajo repartido entre dos identidades
distintas del mismo sistema de tablero, lo que generó tarjetas
"asignadas a nadie" en la práctica aunque tuvieran un nombre puesto.
**Lección**: unificar las identidades de cada integrante en el tablero
el primer día, antes de empezar a asignar tickets.

## 22.4 Qué se haría distinto en un próximo proyecto

1. Probar un deploy real al hosting elegido en la primera semana, no
   cuando el backend ya esté completo.
2. Mantener `docs/16` (referencia de API) desde el principio, actualizado
   en cada PR que toque una ruta o un evento — no reconstruirlo al final
   por auditoría.
3. Hacer una pasada de "tablero completo" (todas las columnas a la vez,
   no por persona) cada una o dos semanas, no solo cuando algo se siente
   raro.
4. Cualquier fix aplicado directo en una rama de despliegue/producción
   entra con un recordatorio explícito de "traer a master" en el mismo
   comentario del ticket, no como una tarea implícita.
