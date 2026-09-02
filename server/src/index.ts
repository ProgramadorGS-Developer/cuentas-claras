import { createServer } from "node:http";
import { app } from "./app";
import { createSocketServer } from "./sockets";
import { config } from "./config/env";
import "./db/connection"; // aplica schema.sql al arrancar

const httpServer = createServer(app);
const io = createSocketServer(httpServer);
app.set("io", io); // los controllers REST lo usan para emitir item:updated tras cada cambio

httpServer.listen(config.port, () => {
  console.log(`CuentasClaras backend escuchando en http://localhost:${config.port}`);
});
