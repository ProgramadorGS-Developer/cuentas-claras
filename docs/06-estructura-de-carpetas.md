# 6. Estructura de carpetas del proyecto

El repositorio se organiza en tres partes independientes: la documentación,
la app móvil y el backend. Cada una es un proyecto Node instalable por
separado (`npm install` en cada carpeta).

```
cuentas-claras/
├── README.md                      Punto de entrada: cómo correr todo el proyecto
├── .gitignore
├── docs/                          Toda la documentación (este conjunto de archivos)
│   ├── 01-vision-y-alcance.md
│   ├── 02-actores-y-requisitos.md
│   ├── 03-casos-de-uso.md
│   ├── 04-arquitectura.md
│   ├── 05-modelo-de-datos.md
│   ├── 06-estructura-de-carpetas.md
│   ├── 07-guia-de-implementacion.md
│   ├── 08-plan-de-pruebas.md
│   ├── 09-despliegue.md
│   ├── 10-manuales-de-usuario.md
│   ├── 11-cambios-para-despliegue.md
│   └── 12-diseno-concurrencia-de-reserva.md
│
├── mobile/                        App React Native (Expo + TypeScript)
│   ├── App.tsx                    Punto de entrada de la app
│   ├── app.json                   Config de Expo (nombre, ícono, deep link, permisos)
│   ├── package.json
│   ├── tsconfig.json / babel.config.js / .eslintrc.js / .prettierrc
│   ├── assets/                    Imágenes, íconos, fuentes
│   └── src/
│       ├── navigation/            React Navigation: stacks, tabs, tipado de rutas
│       ├── screens/                Una carpeta por flujo funcional (access, home,
│       │                          session, budget, result, meeting, history)
│       ├── components/            UI reutilizable, agrupada por dominio
│       │   ├── common/            Botón, input, texto, loading — el "UI kit" propio
│       │   ├── list/              Componentes de la lista de compras
│       │   ├── budget/            Componentes de la sección Presupuesto
│       │   └── result/            Componentes de la sección Resultado
│       ├── database/               Capa de acceso a SQLite LOCAL (cache offline-first)
│       │   ├── schema.ts          DDL de las tablas locales
│       │   ├── index.ts           Apertura/inicialización de la conexión
│       │   ├── migrations/        Cambios incrementales de esquema
│       │   └── repositories/      Un repositorio por entidad (session, item, user, budget)
│       ├── services/
│       │   ├── api/               Cliente REST contra el backend
│       │   ├── realtime/          Cliente Socket.IO + eventos de estado y ofrecimientos
│       │   ├── sync/              Motor de sincronización offline-first
│       │   ├── whatsapp/          Deep link / Share sheet
│       │   └── media/             Cámara y subida de tickets
│       ├── store/                 Estado global (Zustand): sesión activa, usuario, conectividad
│       ├── hooks/                 Lógica de pantalla reutilizable (useShoppingList, useReservation, useItemOffers...)
│       ├── domain/                Modelos de dominio + reglas de negocio puras (balanceCalculator)
│       ├── utils/                 Validadores, formateadores, generador de IDs
│       └── theme/                 Colores, tipografía y espaciado centralizados (RNF-04)
│
└── server/                        Backend (Node.js + Express + Socket.IO + SQLite)
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts               Arranque del servidor HTTP + Socket.IO
        ├── app.ts                 Configuración de Express (middlewares, rutas)
        ├── config/                Variables de entorno
        ├── db/                    Conexión SQLite (better-sqlite3) + schema.sql + migraciones
        ├── routes/                Definición de endpoints REST, agrupados por recurso
        ├── controllers/           Lógica de cada endpoint (una función por acción)
        ├── services/              Reglas de negocio reutilizables:
        │                            - reservation.service.ts      → RF-08 (reserva atómica)
        │                            - itemOffer.service.ts        → RF-08a/CU-02a
        │                            - balance.service.ts          → RF-14/CU-04a
        │                            - whatsappLink.service.ts     → RF-01
        ├── sockets/               Eventos en tiempo real (Socket.IO)
        ├── middleware/            Manejo de errores y validación de payloads
        └── uploads/               Fotos de tickets subidas (RF-12)
```

## 6.1 Por qué esta organización (buenas prácticas React Native)

- **`screens/` vs `components/`**: las pantallas orquestan (navegación,
  hooks, llamadas a servicios); los componentes son de presentación pura y
  reutilizable. Facilita testear componentes de forma aislada.
- **`services/` separado de `database/`**: la capa de red (API/sockets) no
  sabe nada de SQL, y la capa de datos no sabe nada de HTTP. Se pueden
  cambiar independientemente (ej. migrar de REST a GraphQL sin tocar los
  repositorios).
- **`domain/` sin dependencias de React Native**: `balanceCalculator.ts` es
  TypeScript puro, testeable con Jest sin necesidad de renderizar nada
  (ver `08-plan-de-pruebas.md`).
- **`store/` mínimo**: Zustand se usa solo para estado realmente global
  (sesión activa, usuario). El resto vive en el estado local de cada
  pantalla o en SQLite — evita el anti-patrón de "guardar todo en Redux".
  Alias `@/` (configurado en `tsconfig.json` y `babel.config.js`) para
  imports absolutos y evitar cadenas de `../../../..`.
- **Backend en capas** (`routes` → `controllers` → `services` → `db`):
  separa "qué URL responde qué" de "cómo se resuelve el problema",
  facilitando testear `services/` sin levantar un servidor HTTP.

## 6.2 Cómo instalar y correr el proyecto

```bash
# 1) Backend
cd server
cp .env.example .env
npm install
npm run dev            # http://localhost:3000

# 2) App móvil (en otra terminal)
cd mobile
cp .env.example .env   # editar API_URL/SOCKET_URL con la IP de tu backend
npm install
npx expo start         # escanear el QR con Expo Go, o correr en un emulador
```

Ver el detalle paso a paso, en orden de dependencias, en
[`07-guia-de-implementacion.md`](./07-guia-de-implementacion.md).
