import { Server as SocketServer } from "socket.io";
import { Server as HttpServer } from "node:http";

// El socket solo se usa para avisos del servidor a la sala de cada sesión (ver sockets/broadcast.ts).
// Reservar, liberar y comprar van siempre por REST, que es donde se validan titular y estado (#60).
export function createSocketServer(httpServer: HttpServer) {
  const io = new SocketServer(httpServer, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    socket.on("session:join", ({ sessionId }: { sessionId: string }) => {
      socket.join(`session:${sessionId}`);
    });
  });

  return io;
}
