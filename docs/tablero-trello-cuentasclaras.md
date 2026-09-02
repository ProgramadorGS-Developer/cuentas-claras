# Tablero Trello — CuentasClaras

> Backlog priorizado listo para cargar en el tablero real
> **"Cuentas Claras"** (columnas por estado: *Backlog - Pendientes → To Do
> - Por hacer → En Progreso → Testing → Hecho*), construido a partir de
> `EDT.docx`, `Tabla_yDiccionario.xlsx` (hoja *Diccionario*) y
> `Cronograma_Oficial.xlsx`.
>
> Cada **`####` card** de este documento es una tarjeta con su propia
> descripción de tarea, criterio de aceptación y prioridad. Los `##
> Sprint` y `### 🏷️ Función` son agrupadores visuales de este documento
> (para leerlo ordenado) — **no representan listas nuevas del tablero**:
> todas las tarjetas se cargan en la única lista **"Backlog - Pendientes"**,
> respetando el orden en que aparecen acá (de arriba hacia abajo = de
> mayor a menor prioridad).

## Cómo cargarlo en tu tablero de Trello

1. Todas las tarjetas van a la lista **"Backlog - Pendientes"**, en el
   mismo orden en que aparecen en este documento (ya vienen ordenadas por
   prioridad/sprint). A medida que el equipo las va tomando, se mueven
   manualmente a *To Do → En Progreso → Testing → Hecho*, como ya vienen
   trabajando.
2. Por cada card `####` (ej. `1.1.1.1 — Servicio de generación de links
   de WhatsApp`), creá una tarjeta con ese mismo título. El bloque
   *Descripción* se pega tal cual en el campo "Descripción" de la
   tarjeta; el *Criterio de aceptación* funciona bien como **checklist**.
3. Agregá dos **etiquetas** (labels) de color a cada tarjeta:
   - **Función** (el texto que está bajo `### 🏷️ Función:`, ej.
     "Autenticación y Usuarios") — agrupa lo mismo que antes eran las
     listas separadas, pero ahora como etiqueta dentro de un único
     backlog.
   - **Prioridad**: 🔴 Crítica, 🟠 Alta, 🟡 Media o 🟢 Baja.
4. Usá el campo **Sprint** (ej. "Sprint 2") como fecha de vencimiento o
   como un campo personalizado ("Sprint") si tu Power-Up lo permite.

## Leyenda de prioridad

| Ícono | Prioridad | Significado |
|---|---|---|
| 🔴 | Crítica | Bloquea al resto del equipo si no se resuelve primero. |
| 🟠 | Alta | Núcleo funcional del sistema (RF centrales). |
| 🟡 | Media | Necesario para el sistema completo, pero no bloquea el desarrollo del resto. |
| 🟢 | Baja | Cierre, documentación complementaria o pulido final. |

## Orden de carga en el Backlog (sprints sugeridos sobre las 10 semanas del cronograma)

| Sprint | Semanas | Funciones incluidas (etiquetas) |
|---|---|---|
| 0 | S1 | Infraestructura y Base de Datos (fundacional) |
| 1 | S1–S2 | Autenticación y Usuarios · Pantallas de Acceso y Sesión |
| 2 | S3–S4 | Gestión de Ítems y Listas · Concurrencia y Reservas · Interfaz de Gestión de la Lista *(HITO 1)* |
| 3 | S5–S6 | Gestión de Archivos y Tickets · Módulo de Registro y Carga de Fotos |
| 4 | S6–S7 | Motor de Cálculo de Gastos y Balances · Presupuesto y Resultados *(HITO 2)* |
| 5 | S7–S8 | Entorno Web y Acceso · Integración de Servicios Externos · Scripts de Despliegue |
| 6 | S8–S9 | Manuales y Guías · Documentación Técnica |
| 7 | S9–S10 | Plan de Pruebas y QA · Cierre y Lecciones Aprendidas *(HITO F)* |

> **Nota de adaptación**: este backlog sigue fielmente la estructura del
> EDT original. Donde la conversión a **React Native + SQLite** (ver
> documentación de arquitectura entregada previamente) cambió el enfoque
> técnico de una tarea puntual, se aclara en una nota debajo del ticket —
> sin alterar el nombre ni el objetivo de negocio del paquete de trabajo.

---

## 🔴 Sprint 0 — Fundacional

### 🏷️ Función: Infraestructura y Base de Datos (1.3.1)

**Prioridad general de la función:** 🔴 Crítica · **Sprint:** 0 (S1)

#### 1.3.1.1 — Selección de arquitectura y herramientas
**Prioridad:** 🔴 Crítica
**Descripción:** Documento de decisión técnica que define la arquitectura
(WebSockets/Socket.IO, motor de base de datos, framework de cliente) y las
herramientas a utilizar para manejar reservas simultáneas y la persistencia
del sistema.
**Criterio de aceptación:** El Tech Lead y el PM aprueban el documento. La
decisión queda registrada y es la base para el resto de los paquetes de
Backend y Operaciones.
**Recursos clave:** Tech Lead, Dev backend senior.
*Nota de adaptación:* esta decisión ya está tomada y documentada — app
cliente en React Native + Expo con SQLite local (cache offline-first) y
backend en Node.js + Express + Socket.IO con SQLite como fuente de verdad.
Convertir este ticket en una tarea de **revisión/aprobación** del
documento ya redactado, no de investigación desde cero.

#### 1.3.1.2 — Creación de la base de datos
**Prioridad:** 🔴 Crítica
**Descripción:** Creación del esquema SQLite del servidor (tablas
`sessions`, `participants`, `items`, `item_offers`,
`budget_contributions`) según el diccionario de datos, con sus claves
primarias, foráneas e índices.
**Criterio de aceptación:** El esquema se aplica sin errores al levantar el
servidor. Cada tabla respeta los tipos y relaciones definidos en el
diccionario de datos.
**Recursos clave:** 1 Dev backend, DBA.

#### 1.3.1.3 — Provisión y configuración de servidores
**Prioridad:** 🟡 Media
**Descripción:** Servidor de producción aprovisionado y configurado
(sistema operativo, dependencias base de Node.js, accesos), listo para
recibir el deploy del backend.
**Criterio de aceptación:** El equipo de desarrollo puede hacer deploy
exitoso sobre el servidor. Los accesos están documentados y asegurados.
**Recursos clave:** 1 DevOps / SysAdmin.

#### 1.3.1.4 — Instalación y seguridad de base de datos
**Prioridad:** 🟡 Media
**Descripción:** Base de datos SQLite del servidor instalada sobre un
volumen persistente, con permisos de archivo restringidos y sin acceso
directo desde fuera del proceso del backend.
**Criterio de aceptación:** La app se conecta correctamente a la base de
datos. El archivo `.db` no es accesible desde fuera del servidor de
aplicación.
**Recursos clave:** 1 DevOps, DBA.

#### 1.3.1.5 — Configuración de almacenamiento para fotos de tickets
**Prioridad:** 🟡 Media
**Descripción:** Carpeta/servicio de almacenamiento de archivos configurado
para las fotos de tickets, con permisos de lectura pública para URLs y
escritura solo desde el backend.
**Criterio de aceptación:** Las fotos subidas desde la app son accesibles
por URL pública. No se puede subir archivos desde fuera del backend.
**Recursos clave:** 1 DevOps, servicio de almacenamiento (local en disco o
S3/Cloudinary).

---

## 🔴 Sprint 1 — Acceso y Sesión

### 🏷️ Función: Autenticación y Usuarios (1.1.1)

**Prioridad general de la función:** 🔴 Crítica · **Sprint:** 1 (S1–S2) · **RF:** RF-01, RF-02

#### 1.1.1.1 — Servicio de generación de links de WhatsApp
**Prioridad:** 🔴 Crítica
**Descripción:** Endpoint funcional que genera un identificador único
(`shareToken`) por sesión de compra, embebido en un link/deep link que al
ser abierto redirige al usuario a la app.
**Criterio de aceptación:** El link generado abre la app correctamente en
mobile. QA valida que el parámetro de sesión llega al frontend sin
errores.
**Recursos clave:** 1 Dev backend, API de WhatsApp Business.
*Nota de adaptación:* en la versión React Native no se integra la API paga
de WhatsApp Business; el backend solo genera el `shareToken`, y el cliente
arma un deep link (`cuentasclaras://join?token=...`) que se comparte con
`wa.me` o el *Share sheet* nativo.

#### 1.1.1.2 — Lógica de registro de nombres por sesión
**Prioridad:** 🔴 Crítica
**Descripción:** Módulo backend que recibe el nombre ingresado por el
usuario al entrar por el link, lo asocia a la sesión activa y lo persiste
en la base de datos.
**Criterio de aceptación:** El nombre queda vinculado a la sesión correcta.
Dos usuarios con el mismo nombre quedan diferenciados internamente.
Validado por QA con pruebas de acceso múltiple.
**Recursos clave:** 1 Dev backend, base de datos.

### 🏷️ Función: Pantallas de Acceso y Sesión (1.2.1)

**Prioridad general de la función:** 🔴 Crítica · **Sprint:** 1 (S1–S2) · **RF:** RF-01, RF-02, RF-04

#### 1.2.1.1 — Maquetado de Landing Page (Mobile First)
**Prioridad:** 🔴 Crítica
**Descripción:** Pantalla de entrada de la app, responsive y optimizada
para mobile, con identidad visual de CuentasClaras y acceso claro al flujo
de ingreso.
**Criterio de aceptación:** La pantalla carga correctamente en dispositivos
mobile. El diseño respeta los criterios de minimalismo, letras grandes y
claridad de los requisitos no funcionales. Aprobado por PM.
**Recursos clave:** 1 Dev frontend, diseñador UX/UI.
*Nota de adaptación:* en la app nativa esto es la pantalla
`JoinSessionScreen` en lugar de una landing web.

#### 1.2.1.2 — Formulario de registro de nombre de usuario
**Prioridad:** 🔴 Crítica
**Descripción:** Pantalla que aparece al ingresar por el link de WhatsApp,
con un único campo para ingresar el nombre, validación básica y botón de
confirmación.
**Criterio de aceptación:** El nombre ingresado se envía al backend y el
usuario queda identificado en la sesión. La pantalla es clara y usable en
mobile. Validado por QA y criterio de usabilidad (1.4.3.2).
**Recursos clave:** 1 Dev frontend.

#### 1.2.1.3 — Interfaz de la Home con selectores de Nueva Sesión e Historial
**Prioridad:** 🔴 Crítica
**Descripción:** Pantalla principal de la app con dos acciones destacadas:
iniciar una nueva sesión de compra y acceder al listado de sesiones
anteriores para consulta.
**Criterio de aceptación:** El anfitrión puede iniciar una sesión nueva
desde la Home. Cualquier usuario puede ver el historial de sesiones
anteriores. Aprobado por PM en staging.
**Recursos clave:** 1 Dev frontend.

---

## 🔴 Sprint 2 — Lista, Reservas y Concurrencia (HITO 1)

### 🏷️ Función: Servicio de Gestión de Ítems y Listas (1.1.2)

**Prioridad general de la función:** 🔴 Crítica · **Sprint:** 2 (S3–S4) · **RF:** RF-03, RF-04, RF-09, RF-10

#### 1.1.2.1 — CRUD de sesiones de compra (nuevas y viejas)
**Prioridad:** 🔴 Crítica
**Descripción:** API REST con endpoints para crear, leer, actualizar y
cerrar sesiones de compra. Las sesiones cerradas quedan accesibles como
historial.
**Criterio de aceptación:** El anfitrión puede crear una sesión nueva y
consultarla luego como sesión vieja. Los datos persisten correctamente.
Aprobado por PM en ambiente de staging.
**Recursos clave:** 1 Dev backend, base de datos.

#### 1.1.2.2 — Gestión de estados de ítem
**Prioridad:** 🔴 Crítica
**Descripción:** Lógica backend que maneja los dos estados posibles de un
ítem (pendiente / comprado), con transición válida entre ellos y
persistencia en base de datos.
**Criterio de aceptación:** Un ítem marcado como comprado no puede volver a
pendiente sin acción explícita. Los cambios de estado se reflejan en
tiempo real para todos los usuarios. Validado por QA.
**Recursos clave:** 1 Dev backend, base de datos.

#### 1.1.2.3 — Módulo de observaciones por ítem
**Prioridad:** 🟠 Alta
**Descripción:** Endpoint que permite guardar, editar y leer una línea de
texto libre como observación asociada a un ítem de la lista (ej.
"reservado por Pedro").
**Criterio de aceptación:** La observación se guarda y muestra
correctamente asociada al ítem. Los cambios son visibles para todos los
usuarios de la sesión. Validado por QA.
**Recursos clave:** 1 Dev backend, base de datos.

### 🏷️ Función: Lógica de Concurrencia y Reservas (1.1.3)

**Prioridad general de la función:** 🔴 Crítica — el núcleo del proyecto · **Sprint:** 2 (S3–S4) · **RF:** RF-05, RF-06, RF-07, RF-08

#### 1.1.3.1 — Algoritmo de prioridad de reserva
**Prioridad:** 🔴 Crítica
**Descripción:** Módulo backend que determina cuál de dos usuarios
concurrentes llega primero al intento de reserva, asignando prioridad de
forma determinista según el orden de llegada al servidor.
**Criterio de aceptación:** En pruebas de estrés con clicks simultáneos, el
sistema siempre asigna un único ganador sin errores ni estados
inconsistentes. Validado por QA (ver 1.4.3.1).
**Recursos clave:** 1 Dev backend senior.

#### 1.1.3.2 — Servicio de notificaciones de intento de reserva simultánea
**Prioridad:** 🔴 Crítica
**Descripción:** Servicio que detecta cuando dos usuarios intentan reservar
el mismo ítem al mismo tiempo y envía el mensaje de advertencia al usuario
con menor prioridad.
**Criterio de aceptación:** El usuario no-prioritario recibe el aviso en
tiempo real (menos de 1 segundo). El mensaje indica correctamente quién
tiene la reserva. Validado por QA con dos sesiones abiertas simultáneas.
**Recursos clave:** 1 Dev backend, WebSockets / servicio de tiempo real
(Socket.IO).

#### 1.1.3.3 — Lógica de liberación y compromiso de ítems
**Prioridad:** 🔴 Crítica
**Descripción:** Módulo que gestiona la reserva firme (si el usuario
confirma) y la liberación del ítem (si rechaza o cancela su reserva),
notificando al siguiente usuario en cola.
**Criterio de aceptación:** Un ítem liberado queda disponible para otro
usuario inmediatamente. Un ítem confirmado no puede ser tomado por otro.
Aprobado por QA y PM.
**Recursos clave:** 1 Dev backend.

### 🏷️ Función: Interfaz de Gestión de la Lista (1.2.2)

**Prioridad general de la función:** 🔴 Crítica · **Sprint:** 2 (S3–S4) · **RF:** RF-05..RF-10

#### 1.2.2.1 — Diseño de la lista dinámica de ítems (pendiente/comprado)
**Prioridad:** 🔴 Crítica
**Descripción:** Componente visual que muestra la lista de compras de la
sesión activa, con indicación clara del estado de cada ítem (pendiente o
comprado) y actualización en tiempo real.
**Criterio de aceptación:** Los cambios de estado se reflejan
instantáneamente para todos los usuarios conectados. El diseño es legible
en mobile. Validado por QA y criterio de usabilidad (1.4.3.2).
**Recursos clave:** 1 Dev frontend.

#### 1.2.2.2 — Controles de reserva y liberación de productos
**Prioridad:** 🔴 Crítica
**Descripción:** Botones e interacciones que permiten al usuario reservar
un ítem disponible o liberar uno que ya reservó, con feedback visual
inmediato del estado de la acción.
**Criterio de aceptación:** El flujo de reserva y liberación funciona
correctamente en mobile. El usuario entiende en todo momento qué ítems
reservó y cuáles están tomados por otros. Validado por QA.
**Recursos clave:** 1 Dev frontend.

#### 1.2.2.3 — Sección de observaciones por ítem
**Prioridad:** 🟠 Alta
**Descripción:** Renglón o campo visible debajo de cada ítem que muestra
las observaciones cargadas (ej. "Reservado por Pedro") y permite
editarlas.
**Criterio de aceptación:** La observación se muestra y edita correctamente
en la pantalla del ítem. Visible para todos los usuarios en tiempo real.
Validado por QA.
**Recursos clave:** 1 Dev frontend.

#### 1.2.2.4 — Ventanas de aviso para intentos de reserva simultáneos
**Prioridad:** 🔴 Crítica
**Descripción:** Modal o mensaje que aparece cuando el backend detecta un
conflicto de reserva, informando al usuario no-prioritario quién tiene la
reserva y preguntando si desea confirmar o ceder.
**Criterio de aceptación:** El mensaje aparece en menos de 1 segundo, es
claro y legible en mobile. El usuario puede confirmar o ceder sin
confusión. Validado por QA con prueba de dos usuarios simultáneos.
**Recursos clave:** 1 Dev frontend.

---

## 🟠 Sprint 3 — Compras, Precios y Tickets

### 🏷️ Función: Gestión de Archivos y Tickets (1.1.5)

**Prioridad general de la función:** 🟠 Alta · **Sprint:** 3 (S5–S6) · **RF:** RF-12

#### 1.1.5.1 — Servicio de subida y almacenamiento de fotos de tickets
**Prioridad:** 🟠 Alta
**Descripción:** Endpoint que recibe una imagen (foto de ticket) desde el
cliente, la almacena en el servicio de archivos configurado (ver 1.3.1.5)
y devuelve la URL de acceso.
**Criterio de aceptación:** La imagen se sube correctamente y es accesible
por URL. Se validan formatos aceptados (JPG, PNG) y tamaño máximo.
Validado por QA desde dispositivo móvil.
**Recursos clave:** 1 Dev backend, almacenamiento de archivos (ver 1.3.1.5).

#### 1.1.5.2 — Vinculación de imagen con ítem comprado
**Prioridad:** 🟠 Alta
**Descripción:** Lógica que asocia la URL de la imagen del ticket al ítem
correspondiente dentro de la sesión de compra, permitiendo su consulta
posterior.
**Criterio de aceptación:** Al abrir un ítem comprado con ticket cargado,
la imagen se muestra correctamente. La vinculación persiste entre
sesiones. Validado por QA.
**Recursos clave:** 1 Dev backend, base de datos.

### 🏷️ Función: Módulo de Registro y Carga de Fotos de Ticket (1.2.4)

**Prioridad general de la función:** 🟠 Alta · **Sprint:** 3 (S5–S6) · **RF:** RF-11, RF-12

#### 1.2.4.1 — Interfaz de escaneo y carga de fotos de ticket
**Prioridad:** 🟠 Alta
**Descripción:** Componente que permite al usuario tomar una foto del
ticket con la cámara del celular o seleccionarla de la galería y subirla a
la sesión activa.
**Criterio de aceptación:** La foto se sube correctamente desde mobile
(iOS y Android). El flujo es intuitivo y no requiere más de 3 pasos.
Validado por QA en dispositivos reales.
**Recursos clave:** 1 Dev frontend.
*Nota de adaptación:* implementado con `expo-camera` / `expo-image-picker`,
acceso nativo a la cámara del dispositivo.

#### 1.2.4.2 — Formulario de ingreso de precios pagados por ítem
**Prioridad:** 🟠 Alta
**Descripción:** Campo numérico que aparece al marcar un ítem como
"comprado", donde el usuario ingresa el precio que pagó, con validación
visual de formato.
**Criterio de aceptación:** Solo se aceptan números positivos. El precio
queda registrado y visible en la lista. El campo es cómodo de usar en
mobile con teclado numérico. Validado por QA.
**Recursos clave:** 1 Dev frontend.

#### 1.1.4.1 — Módulo de ingreso y validación de precios pagados *(backend)*
**Prioridad:** 🟠 Alta
**Descripción:** Endpoint que recibe el precio ingresado por el usuario al
marcar un ítem como comprado, lo valida (valor numérico positivo) y lo
persiste vinculado al ítem.
**Criterio de aceptación:** Solo se aceptan valores numéricos positivos. El
precio queda asociado al ítem y al usuario que lo cargó. Validado por QA
con casos de valores inválidos.
**Recursos clave:** 1 Dev backend, base de datos.

---

## 🟠 Sprint 4 — Presupuesto y Resultado (HITO 2)

### 🏷️ Función: Motor de Cálculo de Gastos y Balances (1.1.4)

**Prioridad general de la función:** 🟠 Alta · **Sprint:** 4 (S6–S7) · **RF:** RF-13, RF-14, RF-16

#### 1.1.4.2 — Algoritmo de balance y división de gastos en tiempo real
**Prioridad:** 🟠 Alta
**Descripción:** Lógica que calcula en tiempo real cuánto gastó cada
usuario, el total general, y cómo se distribuye la diferencia entre
quienes aportaron más y menos, considerando los datos de la sección
Presupuesto.
**Criterio de aceptación:** Los cálculos son correctos con distintas
combinaciones de aportes y gastos. El resultado se actualiza al instante
ante cualquier cambio. Validado por QA con casos de prueba definidos en
1.4.3.3.
**Recursos clave:** 1 Dev backend.

#### 1.1.4.3 — API para compartir pantalla de resultado
**Prioridad:** 🟡 Media
**Descripción:** Endpoint que genera una URL o payload compartible con el
estado actual del balance, accesible por cualquier usuario de la sesión
sin necesidad de login adicional.
**Criterio de aceptación:** El link generado muestra el balance correcto al
momento de compartirlo. Funciona en mobile. Validado por QA y PM.
**Recursos clave:** 1 Dev backend.
*Nota de adaptación:* en mobile se resuelve con el *Share sheet* nativo del
sistema operativo en lugar de un link web dedicado.

### 🏷️ Función: Sección de Presupuesto y Resultados (1.2.3)

**Prioridad general de la función:** 🟠 Alta · **Sprint:** 4 (S6–S7) · **RF:** RF-13, RF-14, RF-16

#### 1.2.3.1 — Interfaz para ingreso de dinero disponible y aportantes
**Prioridad:** 🟡 Media
**Descripción:** Sección optativa dentro de la sesión donde cada usuario
puede registrar cuánto dinero aportó al gasto común, con campo de monto y
nombre del aportante.
**Criterio de aceptación:** Los datos ingresados se envían al backend y son
usados por el algoritmo de balance (1.1.4.2). La sección puede omitirse
sin afectar el resto de la app. Aprobado por PM.
**Recursos clave:** 1 Dev frontend.

#### 1.2.3.2 — Pantalla de Balance y División de gastos
**Prioridad:** 🟠 Alta
**Descripción:** Sección "Resultado" que muestra de forma clara y visual
quién gastó cuánto, el total general y cómo quedan los saldos entre los
participantes, actualizada en tiempo real.
**Criterio de aceptación:** Los valores mostrados coinciden con los
calculados por el backend (1.1.4.2). La pantalla es comprensible para un
usuario no técnico. Aprobado por PM. Validado por QA (1.4.3.3).
**Recursos clave:** 1 Dev frontend, diseñador UX/UI.

#### 1.2.3.3 — Botón y funcionalidad de Compartir pantalla de resultados
**Prioridad:** 🟡 Media
**Descripción:** Botón visible en la pantalla de Resultado que permite
compartir el balance actual a través de WhatsApp u otro medio, usando la
API del backend (1.1.4.3).
**Criterio de aceptación:** Al pulsar el botón, se genera un link o imagen
compartible con el balance. Funciona en mobile desde WhatsApp. Validado
por QA.
**Recursos clave:** 1 Dev frontend.

---

## 🟡 Sprint 5 — Entorno, Integraciones y Despliegue

### 🏷️ Función: Entorno Web y Configuración de Acceso (1.3.2)

**Prioridad general de la función:** 🟡 Media · **Sprint:** 5 (S7–S8)

#### 1.3.2.1 — Configuración de dominio y certificados SSL
**Prioridad:** 🟡 Media
**Descripción:** Dominio apuntando a los servidores de producción con
certificado SSL activo, forzando HTTPS/WSS en todas las rutas del backend.
**Criterio de aceptación:** El backend es accesible por HTTPS sin
advertencias de seguridad. El certificado tiene vigencia mínima de 1 año o
renovación automática. Validado por Tech Lead.
**Recursos clave:** 1 DevOps.

#### 1.3.2.2 — Optimización de carga para dispositivos móviles
**Prioridad:** 🟡 Media
**Descripción:** Configuración de compresión, caché y lazy loading que
asegura que la app cargue en menos de 3 segundos en una conexión 4G
estándar.
**Criterio de aceptación:** Prueba de carga desde mobile en red 4G muestra
tiempo de primera carga menor a 3 segundos. Aprobado por Tech Lead.
**Recursos clave:** 1 Dev frontend, 1 DevOps.
*Nota de adaptación:* aplica al tiempo de arranque de la app nativa
(bundle de Expo) y a la latencia de las primeras respuestas del backend.

#### 1.3.2.3 — Configuración de servidor web (reverse proxy)
**Prioridad:** 🟡 Media
**Descripción:** Servidor web (Nginx) configurado como reverse proxy frente
a la aplicación backend, con reglas de ruteo, cabeceras de seguridad y
soporte a WebSockets.
**Criterio de aceptación:** El tráfico llega correctamente a la app. Los
WebSockets (Socket.IO) funcionan sin caídas. Las cabeceras de seguridad
están presentes. Validado por Tech Lead.
**Recursos clave:** 1 DevOps.

### 🏷️ Función: Integración de Servicios Externos (1.3.3)

**Prioridad general de la función:** 🟡 Media · **Sprint:** 5 (S7–S8) · **RF:** RF-01

#### 1.3.3.1 — Configuración y vinculación de API de WhatsApp
**Prioridad:** 🟢 Baja
**Descripción:** Integración con el canal de distribución de links de
sesión hacia WhatsApp.
**Criterio de aceptación:** Un link generado desde la app llega
correctamente al destinatario y abre la sesión. Validado por QA con
prueba real de envío.
**Recursos clave:** 1 Dev backend, cuenta de WhatsApp Business API.
*Nota de adaptación:* al usar deep link + Share sheet nativo (ver 1.1.1.1),
este ticket se reduce a validar que `wa.me` y el selector nativo de
Android/iOS abren WhatsApp correctamente — no requiere cuenta de WhatsApp
Business API.

#### 1.3.3.2 — Validación de Webhooks para notificaciones en tiempo real
**Prioridad:** 🟢 Baja
**Descripción:** Webhooks configurados y validados para recibir eventos
externos y procesarlos correctamente.
**Criterio de aceptación:** Los eventos de webhook llegan al servidor y son
procesados sin errores. Los logs muestran recepción correcta.
**Recursos clave:** 1 Dev backend.
*Nota de adaptación:* no aplica en el alcance actual (no se usa WhatsApp
Business API); se puede descartar o reconvertir en "validar reconexión de
sockets tras pérdida de red", ver `useOfflineSync`.

### 🏷️ Función: Scripts de Despliegue y Monitoreo (1.3.4)

**Prioridad general de la función:** 🟡 Media · **Sprint:** 5 (S7–S8)

#### 1.3.4.1 — Automatización del despliegue (Scripts de deploy / CI)
**Prioridad:** 🟡 Media
**Descripción:** Pipeline de CI/CD o scripts de deploy que permiten
desplegar una nueva versión del backend en producción con un único
comando o trigger, sin pasos manuales; y generar builds de la app móvil
vía EAS Build.
**Criterio de aceptación:** Un deploy completo se ejecuta en menos de 10
minutos sin intervención manual. El proceso es repetible y documentado.
Aprobado por Tech Lead.
**Recursos clave:** 1 DevOps.

#### 1.3.4.2 — Configuración de logs y alertas de errores en tiempo real
**Prioridad:** 🟡 Media
**Descripción:** Sistema de logging activo que registra errores de la app
y envía alertas al equipo ante fallos críticos.
**Criterio de aceptación:** Un error crítico simulado genera una alerta en
menos de 2 minutos. Los logs son consultables y contienen información
suficiente para diagnosticar el problema.
**Recursos clave:** 1 DevOps.

#### 1.3.4.3 — Configuración de backups automáticos en la base de datos
**Prioridad:** 🟡 Media
**Descripción:** Tarea programada que genera backups completos del archivo
SQLite del servidor con frecuencia definida (ej. diaria) y los almacena en
ubicación separada del servidor principal.
**Criterio de aceptación:** El backup se ejecuta automáticamente en el
horario configurado. Una restauración de prueba desde el backup es
exitosa.
**Recursos clave:** 1 DevOps, DBA.

---

## 🟢 Sprint 6 — Documentación

### 🏷️ Función: Manuales y Guías de Operación (1.4.1)

**Prioridad general de la función:** 🟢 Baja · **Sprint:** 6 (S8–S9)

#### 1.4.1.1 — Guía de configuración de sesiones para el anfitrión
**Prioridad:** 🟢 Baja
**Descripción:** Documento o sección de ayuda dentro de la app que explica
paso a paso cómo crear una sesión, cargar la lista de compras y compartir
el link con los participantes.
**Criterio de aceptación:** Un usuario nuevo puede configurar su primera
sesión leyendo solo la guía, sin asistencia externa. Aprobado por PM tras
prueba con usuario real.
**Recursos clave:** 1 Redactor técnico / PM.

#### 1.4.1.2 — Manual de usuarios para participantes
**Prioridad:** 🟢 Baja
**Descripción:** Guía breve orientada al participante (no anfitrión) que
explica cómo ingresar por el link, reservar ítems, marcarlos como
comprados e ingresar precios.
**Criterio de aceptación:** Un participante nuevo comprende el flujo
completo leyendo el manual. El lenguaje es claro y no técnico. Aprobado
por PM.
**Recursos clave:** 1 Redactor técnico / PM.

#### 1.4.1.3 — Documentación de compartición de resultados y balance final
**Prioridad:** 🟢 Baja
**Descripción:** Guía que explica cómo usar la sección Resultado, cómo
interpretar el balance y cómo compartir la pantalla con los demás
participantes.
**Criterio de aceptación:** El documento es comprensible para un usuario
sin conocimientos técnicos. Cubre todos los casos posibles (con y sin
sección Presupuesto). Aprobado por PM.
**Recursos clave:** 1 Redactor técnico / PM.

### 🏷️ Función: Documentación Técnica y de Arquitectura (1.4.2)

**Prioridad general de la función:** 🟡 Media · **Sprint:** 6 (S8–S9)

#### 1.4.2.1 — Documentación de lógica de concurrencia y colisiones
**Prioridad:** 🟡 Media
**Descripción:** Documento técnico que describe el algoritmo de prioridad
de reserva, los casos de conflicto posibles y cómo el sistema los
resuelve, con diagramas de flujo.
**Criterio de aceptación:** El documento permite a un nuevo desarrollador
entender e intervenir la lógica sin asistencia. Aprobado por Tech Lead.
**Recursos clave:** 1 Dev backend senior, Tech Lead.

#### 1.4.2.2 — Diccionario de datos y esquema de la base de datos
**Prioridad:** 🟡 Media
**Descripción:** Documento que describe todas las tablas, campos, tipos de
datos y relaciones de la base de datos del sistema, con diagrama
entidad-relación (DER).
**Criterio de aceptación:** El esquema refleja fielmente la base de datos
en producción. Un nuevo desarrollador puede orientarse en la BD usando
solo este documento. Aprobado por Tech Lead.
**Recursos clave:** 1 Dev backend, DBA.

#### 1.4.2.3 — Documentación de integración con la API de WhatsApp
**Prioridad:** 🟢 Baja
**Descripción:** Documento técnico que describe el flujo de generación de
links/deep links, y su apertura vía WhatsApp o el *Share sheet* nativo.
**Criterio de aceptación:** La documentación permite reconfigurar la
integración ante un cambio de proveedor sin pérdida de funcionalidad.
Aprobado por Tech Lead.
**Recursos clave:** 1 Dev backend.

---

## 🔴 Sprint 7 — QA y Cierre (HITO F)

### 🏷️ Función: Plan de Pruebas y Aseguramiento de Calidad (1.4.3)

**Prioridad general de la función:** 🔴 Crítica · **Sprint:** 7 (S9–S10)

#### 1.4.3.1 — Reporte de pruebas de estrés para clicks instantáneos
**Prioridad:** 🔴 Crítica
**Descripción:** Informe con resultados de pruebas de concurrencia que
simulan múltiples usuarios intentando reservar el mismo ítem en el mismo
instante, documentando comportamiento y resultados.
**Criterio de aceptación:** Las pruebas cubren al menos 10 usuarios
simultáneos. El sistema no produce estados inconsistentes en ningún caso.
El reporte es aprobado por Tech Lead y PM.
**Recursos clave:** 1 QA, 1 Dev backend.

#### 1.4.3.2 — Validación de criterios Mobile First y usabilidad intuitiva
**Prioridad:** 🟠 Alta
**Descripción:** Informe de pruebas de usabilidad sobre dispositivos
móviles reales, verificando legibilidad, flujo intuitivo, tamaño de
botones y claridad de mensajes.
**Criterio de aceptación:** Al menos 3 usuarios reales completan el flujo
principal sin asistencia. Los textos son legibles sin zoom. El informe es
aprobado por PM.
**Recursos clave:** 1 QA, diseñador UX/UI.

#### 1.4.3.3 — Pruebas de integración de la sección Presupuesto y Resultado
**Prioridad:** 🟠 Alta
**Descripción:** Suite de casos de prueba que verifica que los montos
ingresados en Presupuesto se reflejan correctamente en el cálculo de la
sección Resultado, incluyendo casos con y sin presupuesto cargado.
**Criterio de aceptación:** Todos los casos de prueba pasan sin errores.
Los resultados coinciden con cálculos manuales de referencia. Aprobado por
QA y PM.
**Recursos clave:** 1 QA.

### 🏷️ Función: Cierre y Lecciones Aprendidas (1.4.4)

**Prioridad general de la función:** 🟢 Baja · **Sprint:** 7 (S10)

#### 1.4.4.1 — Acta de aceptación final por parte de los stakeholders
**Prioridad:** 🟢 Baja
**Descripción:** Documento firmado por los stakeholders (PM, cliente,
anfitrión representativo) que certifica que el sistema cumple con todos
los requisitos funcionales y no funcionales acordados.
**Criterio de aceptación:** El acta está firmada por todos los stakeholders
requeridos. No quedan ítems críticos pendientes. Archivada en el
repositorio del proyecto.
**Recursos clave:** PM, stakeholders.

#### 1.4.4.2 — Informe de lecciones aprendidas
**Prioridad:** 🟢 Baja
**Descripción:** Documento que registra qué funcionó bien, qué falló y qué
se haría diferente en un próximo proyecto similar, elaborado con input del
equipo completo.
**Criterio de aceptación:** El informe cubre al menos las 4 áreas del EDT.
Fue revisado y validado por el PM. Queda archivado como referencia para
futuros proyectos.
**Recursos clave:** PM, Tech Lead, QA, Dev team.

---

## Resumen: 49 tarjetas para "Backlog - Pendientes", 17 funciones (etiquetas), 8 sprints

| Prioridad | Cantidad de tickets |
|---|---|
| 🔴 Crítica | 16 |
| 🟠 Alta | 11 |
| 🟡 Media | 14 |
| 🟢 Baja | 8 |

Fuentes: `EDT.docx`, `Tabla_yDiccionario.xlsx` (hoja *Diccionario*),
`Cronograma_Oficial.xlsx`.
