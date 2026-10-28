// app.json traía "extra.apiUrl/socketUrl" hardcodeados en "http://localhost:3000",
// por lo que editar mobile/.env no tenía ningún efecto real (Constants.expoConfig.extra
// siempre devolvía el valor fijo del JSON). Este config dinámico sí lee las variables
// de mobile/.env (Expo las carga automáticamente en process.env al levantar el CLI),
// para que cambiar la IP del backend ahí funcione de verdad.
// Usa el "config" inyectado por Expo (ya resuelto desde app.json) en vez de volver a
// leer app.json manualmente, que es lo que "expo doctor" espera para no marcar
// error de "app.config.js no usa los valores de app.json".
// EAS_OWNER / EAS_PROJECT_ID permiten buildear con una cuenta Expo personal (ej. el dev
// client para los tests de Maestro) sin tocar app.json, que queda con la cuenta del equipo.
//
// EXPO_SKIP_EAS=1: levanta el servidor de desarrollo SIN el projectId de EAS. Con projectId,
// Expo CLI necesita una sesión de Expo iniciada para firmar el manifiesto que le pide Expo Go
// (utils/codesigning.js de @expo/cli, sin projectId no firma y no pide nada). Para probar la
// app en Expo Go no hace falta firmar, así que quien no tenga cuenta/token de Expo puede usar
// esta variable. Sin ella (builds de EAS, CI) todo queda exactamente igual que antes.
const skipEas = process.env.EXPO_SKIP_EAS === "1";

module.exports = ({ config }) => ({
  ...config,
  owner: process.env.EAS_OWNER ?? config.owner,
  extra: {
    ...config.extra,
    apiUrl: process.env.API_URL ?? config.extra.apiUrl,
    socketUrl: process.env.SOCKET_URL ?? config.extra.socketUrl,
    eas: skipEas
      ? undefined
      : {
          ...config.extra.eas,
          projectId: process.env.EAS_PROJECT_ID ?? config.extra.eas.projectId,
        },
  },
});
