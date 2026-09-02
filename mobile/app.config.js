const appJson = require("./app.json");

// app.json traía "extra.apiUrl/socketUrl" hardcodeados en "http://localhost:3000",
// por lo que editar mobile/.env no tenía ningún efecto real (Constants.expoConfig.extra
// siempre devolvía el valor fijo del JSON). Este config dinámico sí lee las variables
// de mobile/.env (Expo las carga automáticamente en process.env al levantar el CLI),
// para que cambiar la IP del backend ahí funcione de verdad.
module.exports = ({ config }) => ({
  ...appJson.expo,
  extra: {
    ...appJson.expo.extra,
    apiUrl: process.env.API_URL ?? appJson.expo.extra.apiUrl,
    socketUrl: process.env.SOCKET_URL ?? appJson.expo.extra.socketUrl,
  },
});
