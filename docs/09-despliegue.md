# 9. Despliegue

Adaptación del paquete de trabajo **1.3 "Operaciones y Despliegue"** del
EDT original (pensado para un servidor web tradicional) al par
app-móvil + backend-API de esta versión React Native.

## 9.1 Backend (`server/`)

El backend es un servicio Node.js estándar; cualquier proveedor que permita
procesos long-running con un disco persistente (para el archivo `.db` de
SQLite y la carpeta `uploads/`) sirve. Opciones recomendadas para un
proyecto académico, de menor a mayor complejidad de configuración:

| Proveedor | Por qué | A tener en cuenta |
|---|---|---|
| **Railway** o **Render** | Deploy directo desde el repo Git, HTTPS automático, disco persistente incluido. | Plan gratuito con límites de horas/RAM, suficiente para demo. |
| **Fly.io** | Buen soporte para apps con estado y volúmenes. | Requiere `fly.toml` y un poco más de configuración manual. |
| VPS propio (ej. DigitalOcean) | Control total, equivalente al EDT original (1.3.1.1, 1.3.2.3: Nginx/Apache como reverse proxy). | Hay que administrar SO, SSL (Let's Encrypt) y backups a mano. |

Pasos generales:

1. `npm run build` genera `server/dist/`.
2. Variables de entorno en el proveedor: `PORT`, `DB_FILE` (apuntando al
   volumen persistente, ej. `/data/cuentasclaras.db`), `UPLOADS_DIR`,
   `CORS_ORIGIN` (dominio de la app o `*` en desarrollo).
2. `npm run migrate` (o simplemente iniciar el server: `schema.sql` se
   aplica automáticamente al conectar, ver `db/connection.ts`).
3. Configurar backups automáticos del archivo SQLite (EDT 1.3.4.3): un
   cron simple que copie `DB_FILE` a un bucket externo (S3, Backblaze) es
   suficiente para este volumen de datos.
4. Logs y alertas (EDT 1.3.4.2): en Railway/Render vienen integrados; en
   VPS propio, considerar `pm2` + un servicio como Sentry o un webhook a
   Slack/Discord ante errores 500 repetidos.

> **Nota sobre escalar más allá de SQLite**: si el proyecto pasa de
> "prueba académica" a producción con mucho tráfico concurrente,
> `node:sqlite` puede reemplazarse por PostgreSQL sin rediseñar el
> modelo (mismo esquema relacional). El único código que cambiaría es
> `server/src/db/connection.ts` y las queries de `controllers/`/`services/`
> (de SQL de SQLite a SQL estándar, prácticamente idéntico en este
> esquema).

## 9.2 App móvil (`mobile/`)

Se recomienda **Expo Application Services (EAS)**, que evita instalar
Android Studio/Xcode localmente:

```bash
cd mobile
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview   # genera un .apk instalable directo
eas build --platform ios --profile preview        # requiere cuenta Apple Developer
```

Para la entrega académica, un `.apk` de `preview` alcanza (se instala
directo en cualquier Android sin pasar por la Play Store). Para una
publicación real:

1. Generar un build de producción (`--profile production`).
2. Completar ficha de la app en Google Play Console / App Store Connect.
3. Configurar `app.json → extra.apiUrl` apuntando al backend desplegado
   (nunca a `localhost`).

## 9.3 Deep link de WhatsApp en producción

El esquema `cuentasclaras://` (configurado en `app.json`) solo funciona si
la app ya está instalada. Para que el link funcione también como fallback
(ej. la persona todavía no instaló la app), se recomienda:

1. Registrar un dominio propio con **Universal Links (iOS)** / **App
   Links (Android)**, ej. `https://cuentasclaras.app/join?token=...`.
2. Ese dominio redirige a la tienda de apps si la app no está instalada, o
   abre la app directamente si sí lo está (configuración estándar de
   Expo con `expo-linking` + `associatedDomains`).

Para el alcance de un proyecto de Tecnicatura, el deep link simple
(`cuentasclaras://`) es suficiente y está ya implementado en el scaffold.

## 9.4 CI/CD sugerido (EDT 1.3.4.1)

`GitHub Actions` con dos workflows:

- **`server-ci.yml`**: en cada push a `main`, correr `npm test` y
  `npm run build` en `server/`; si pasa, disparar el deploy del proveedor
  elegido (Railway/Render soportan deploy automático desde GitHub sin
  configuración adicional).
- **`mobile-ci.yml`**: correr `npm run lint` y `npm test` en `mobile/` en
  cada push; disparar `eas build` solo en tags de versión (ej. `v1.0.0`)
  para no consumir cuota de build en cada commit.
