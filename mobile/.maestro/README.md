# Tests E2E con Maestro

Corren contra un **dev client** (no la APK de producción, que apunta al backend
compartido) en un Android conectado por USB, con server y Metro locales.

## Requisitos

- `adb`, Java 17 y [Maestro CLI](https://maestro.mobile.dev).
- Dev client instalado en el celular:
  `eas build --platform android --profile development`, luego `adb install -r <apk>`
  (si había una APK de producción instalada, `adb uninstall com.cuentasclaras.app` antes).
- `mobile/.env` con `API_URL=http://localhost:3000` y `SOCKET_URL=http://localhost:3000`.

## Correr

```bash
adb reverse tcp:3000 tcp:3000     # server
adb reverse tcp:8081 tcp:8081     # Metro
(cd ../server && npm run dev)     # en otra terminal
npx expo start --dev-client --localhost   # en otra terminal, desde mobile/
npm run test:e2e                  # desde mobile/
npm run test:e2e:reporte          # PDF de la última corrida
```

## Notas

- La primera compilación de Metro en frío tarda ~90 s; los flows esperan hasta 3 min.
- Con `clearState` el dev client abre su menú de desarrollo encima de la app; cada
  flow lo cierra con `pressKey: Back` antes de interactuar.
- Lo común está en `subflows/` (`abrir-app.yaml`, `crear-sesion.yaml`).
- Escenarios con varios participantes: el celular es un participante y los demás
  se simulan contra la API del server local con `scripts/anfitrion.js`
  (`runScript` + `env: { ACCION: ... }`; ver `flows/07-invitado-reparte.yaml`).
  Cada `runScript` corre aislado: solo `output` se comparte entre scripts.
- La app no tiene `testID`: los selectores son por texto visible, así que un
  cambio de copy puede romper un flow.

## Reporte PDF

```bash
npm run test:e2e:reporte   # = python3 .maestro/scripts/reporte-pdf.py [dir_corrida]
```

Genera `reportes-e2e/reporte-e2e-<fecha>.pdf` en la raíz del repo. Necesita
Chromium o Chrome (lo usa para imprimir el HTML a PDF). Cada flow nuevo tiene
que llevar una línea `# Objetivo: ...` después del `---`: es lo que aparece en
la columna "Objetivo" del reporte.
