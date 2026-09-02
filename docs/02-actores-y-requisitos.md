# 2. Actores y requisitos

## 2.1 Actores

| Actor | Tipo | Rol en el sistema |
|---|---|---|
| **Usuario** | Primario | Cualquier persona que participa de una sesión de compra: reserva ítems, los marca como comprados, sube tickets, consulta resultados, etc. |
| **Anfitrión** | Primario (especialización de Usuario) | Usuario que además puede crear una sesión de compra, invitar participantes y cargar la lista de compras sugerida. Hereda todas las acciones de un Usuario común. |
| **Sistema de WhatsApp** | Secundario (sistema externo) | Canal para que el anfitrión distribuya el link/deep link de acceso a la sesión entre los invitados. |

El **Anfitrión** se modela como una generalización (herencia) del actor
**Usuario**: tiene todos los permisos de un Usuario común más permisos extra
(crear sesión, cargar lista sugerida, invitar). Esto evita repetir en el
diagrama de casos de uso las acciones comunes a ambos.

## 2.2 Requisitos funcionales (RF)

| ID | Descripción |
|---|---|
| RF-01 | Los usuarios invitados por el anfitrión deben poder acceder al sistema a través de un link enviado por WhatsApp. |
| RF-02 | Al ingresar por el link, el sistema debe solicitar únicamente el nombre del usuario para identificarlo. |
| RF-03 | El anfitrión debe poder cargar una lista de compras sugeridas para el grupo. |
| RF-04 | La pantalla principal (home) debe ofrecer iniciar una nueva sesión de compra y acceder a sesiones anteriores para su consulta. |
| RF-05 | Cada usuario debe poder reservar uno o varios ítems de la lista, comprometiéndose a comprarlos. |
| RF-06 | Un usuario debe poder quitar una reserva propia, dejando el ítem disponible. |
| RF-07 | La reserva de un ítem es obligatoria antes de poder marcarlo como comprado. |
| RF-08 | Si dos o más usuarios intentan reservar el mismo ítem casi al mismo tiempo, el sistema otorga la reserva a quien llegó primero al servidor y notifica a los demás que el ítem ya está reservado (y por quién). Ver `12-diseno-concurrencia-de-reserva.md`. |
| RF-08a | Un usuario puede ofrecerse a comprar un ítem que ya está reservado por otro. El usuario que tiene la reserva recibe un aviso no bloqueante y decide si lo compra igual, cede la reserva al que se ofreció, o libera el ítem. Si no responde, conserva la reserva. |
| RF-09 | Cada ítem tiene un estado: pendiente o comprado, independientemente de si fue reservado. |
| RF-10 | Cada ítem cuenta con un campo de observaciones (ej: "reservado por Pedro"). |
| RF-11 | Al marcar un ítem como comprado, se debe poder ingresar el precio pagado. |
| RF-12 | Cada usuario debe poder escanear y subir el ticket de su compra. |
| RF-13 | Sección "Presupuesto" (opcional) para ingresar el dinero aportado y quién lo aportó. |
| RF-14 | Sección "Resultado" que muestra el balance de la división de gastos, considerando lo aportado en "Presupuesto". |
| RF-15 | Sección de "gastos en reunión" para calcular al instante el total de una cuenta y cuánto paga cada persona. |
| RF-16 | La pantalla de resultado debe poder compartirse entre los usuarios de la sesión. |

## 2.3 Requisitos no funcionales (RNF) — versión original y adaptación móvil

| ID | Categoría (ISO/IEC 25010) | Definición original | Adaptación para React Native |
|---|---|---|---|
| RNF-01 | Portabilidad | Aplicación web, accesible desde el navegador sin instalación. | **App nativa** distribuida como `.apk`/`.aab` (Android) e `.ipa` (iOS) vía Expo/EAS Build. Se sacrifica el "sin instalación" a cambio de acceso a cámara, notificaciones push y mejor rendimiento offline. |
| RNF-02 | Usabilidad | Mobile first, priorizando la experiencia en celulares. | Se cumple de forma directa: la app **es** nativa de celular. |
| RNF-03 | Compatibilidad / Integración | Integración con WhatsApp para gestionar el acceso de invitados. | Deep link `wa.me` / *Share sheet* nativo en lugar de la API de WhatsApp Business (ver `04-arquitectura.md`). |
| RNF-04 | Usabilidad | Interfaz extremadamente intuitiva, minimalista, letras grandes y bien visibles (uso en entornos de esparcimiento). | Se mantiene igual; se traduce en una escala tipográfica y paleta de alto contraste centralizada (`mobile/src/theme/`). |

### RNF adicionales propios de la adaptación móvil

| ID | Categoría | Descripción |
|---|---|---|
| RNF-05 | Disponibilidad / Resiliencia | La app debe seguir siendo utilizable (lectura de la lista, marcar intenciones) ante cortes de conectividad breves, sincronizando al recuperar señal (offline-first vía SQLite local). |
| RNF-06 | Rendimiento | Los cambios de estado de un ítem deben reflejarse en los demás dispositivos conectados en menos de 1 segundo (heredado del criterio de aceptación del EDT 1.1.3.2 / 1.2.2.4). |
| RNF-07 | Seguridad básica | Las fotos de tickets y los datos de la sesión solo son accesibles mediante el `shareToken` de esa sesión concreta, no hay listado público de sesiones ajenas. |

## 2.4 Aclaración sobre el alcance (no funcionalidades)

- El sistema no controla que los usuarios efectivamente realicen las compras
  que reservaron.
- El sistema no emite documentación oficial.
- El sistema no imprime informes en papel.
- El sistema no actúa como plataforma de pago ni garantiza legalmente el
  cumplimiento de las deudas entre usuarios.
