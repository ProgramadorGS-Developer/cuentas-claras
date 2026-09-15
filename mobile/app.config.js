// app.json traía "extra.apiUrl/socketUrl" hardcodeados en "http://localhost:3000",
// por lo que editar mobile/.env no tenía ningún efecto real (Constants.expoConfig.extra
// siempre devolvía el valor fijo del JSON). Este config dinámico sí lee las variables
// de mobile/.env (Expo las carga automáticamente en process.env al levantar el CLI),
// para que cambiar la IP del backend ahí funcione de verdad.
// Usa el "config" inyectado por Expo (ya resuelto desde app.json) en vez de volver a
// leer app.json manualmente, que es lo que "expo doctor" espera para no marcar
// error de "app.config.js no usa los valores de app.json".
module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    apiUrl: process.env.API_URL ?? config.extra.apiUrl,
    socketUrl: process.env.SOCKET_URL ?? config.extra.socketUrl,
  },
});
