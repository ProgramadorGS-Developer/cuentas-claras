# 20. Tutorial de inicio rápido

Para alguien que se suma al equipo hoy (o para el profesor revisor) y
quiere levantar el proyecto y probarlo de punta a punta, sin tener que
leer los otros 19 documentos primero. Pasos verificados el 2026-09-29
contra el estado real del repositorio.

## 20.1 Requisitos previos

- Node.js LTS (probado con Node 22/24).
- Un teléfono con la app **Expo Go** instalada (Android o iOS), o un
  emulador — más simple que instalar Android Studio/Xcode completos.
- Git.

## 20.2 Levantar el backend en tu máquina

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

Debería quedar escuchando en `http://localhost:3000`. Confirmar:

```bash
curl http://localhost:3000/health
# {"ok":true}
```

Corré los tests para confirmar que el estado del código es sano antes de
seguir:

```bash
npm test        # esperado: 57/57 en verde (5 suites)
```

## 20.3 Levantar la app móvil

```bash
cd mobile
cp .env.example .env
# Editar .env: API_URL y SOCKET_URL deben apuntar a la IP de tu máquina en
# tu red local (no "localhost" — el teléfono es otro dispositivo), ej.
# API_URL=http://192.168.0.10:3000
npm install
npx expo start
```

Escaneá el QR con Expo Go (Android) o la cámara (iOS). Verificá tipos y
lint antes de tocar nada:

```bash
npx tsc --noEmit   # esperado: sin errores
npm run lint       # esperado: sin errores
```

## 20.4 Probar el flujo completo (a mano, checklist)

Con el backend y la app corriendo, en dos pestañas/dispositivos si
podés (para probar la concurrencia con dos "usuarios" reales):

1. **Crear sesión**: Home → Nueva sesión → nombre + lista de ítems
   sugeridos → tu nombre como anfitrión.
2. **Copiar el link e "invitarte" a vos mismo**: en otro dispositivo/
   pestaña, abrir el link (o pegar el `shareToken` manualmente si no
   tenés forma de abrir el deep link) → ingresar un nombre distinto →
   deberías ver la misma lista de ítems.
3. **Reservar el mismo ítem casi al mismo tiempo desde los dos
   dispositivos**: uno debería ganar (200) y el otro ver el aviso no
   bloqueante ("Fulano lo reservó justo antes que vos") — esto es RF-08,
   el requisito central del proyecto (`docs/12`).
4. **Marcar como comprado con un precio** → el ítem cambia de estado, el
   otro dispositivo lo ve reflejado por Socket.IO sin refrescar.
5. **Cargar un aporte en Presupuesto** (opcional, RF-13) desde uno de los
   dos dispositivos.
6. **Ver Resultado**: el balance debe reflejar lo aportado/gastado por
   cada uno; si nadie cargó presupuesto, debe avisar que se repartió en
   partes iguales.
7. **Compartir resultado**: el texto que se genera debe tener nombres
   reales (no IDs) y un link.
8. **Cerrar la sesión** (como anfitrión, desde Ajustes) → el otro
   dispositivo debería enterarse por `session:closed`.

Si algún paso falla, primero revisar `docs/19-problemas-conocidos-y-soluciones.md`
— es muy probable que ya lo hayamos pisado antes.

## 20.5 Generar un `.apk` para probar en un dispositivo real

### Opción recomendada: EAS (build en la nube de Expo)

```bash
cd mobile
npx eas-cli login       # cuenta Expo con acceso a la organización "cuentasclaras"
npx eas-cli build --platform android --profile preview
```

Antes de correr esto, confirmar en `docs/17-runbook-despliegue.md` §17.2
que el fix real de `expo-sqlite` (script `postinstall` + `patch-package`,
no `eas-build-post-install`) ya está en la rama desde la que estás
compilando (en `master` lo está desde el 2026-10-20) — si no, el build va a fallar en
`:expo-sqlite:downloadSQLite`.

Al terminar, EAS te da un link/QR para instalar el `.apk` directo en un
Android, sin pasar por la Play Store.

### Alternativa: build de debug 100% local (sin depender de EAS)

Útil si no tenés acceso a la organización Expo todavía, o para iterar más
rápido en un problema nativo específico.

```bash
cd mobile
npx expo prebuild --platform android
node scripts/prepare-sqlite.js   # vendoriza el SQLite manualmente (ver docs/17 §17.2)
cd android
./gradlew.bat assembleDebug      # Windows — en Mac/Linux: ./gradlew assembleDebug
```

El `.apk` queda en `android/app/build/outputs/apk/debug/app-debug.apk`
(pesa 150-200MB, es un build de debug sin optimizar — no sirve para
repartir por chat, instalar directo por cable/ADB o transferencia local).

**Si falla con `ninja: error: manifest 'build.ninja' still dirty after
100 tries`**: casi seguro es un espacio en la ruta del proyecto (ver
`docs/19` §19.2) — mové el proyecto a una ruta sin espacios (ej.
`C:\dev\cuentas-claras`) y reintentá desde ahí.

## 20.6 Dónde seguir leyendo

- **¿Qué hace cada endpoint?** → `docs/16-referencia-api.md`
- **¿Cómo se despliega el backend real?** → `docs/17-runbook-despliegue.md`
- **¿Este requisito está terminado?** → `docs/18-trazabilidad-requisitos.md`
- **Me trabé con algo raro** → `docs/19-problemas-conocidos-y-soluciones.md`
- **¿Por qué se diseñó así la reserva simultánea?** → `docs/12-diseno-concurrencia-de-reserva.md`
