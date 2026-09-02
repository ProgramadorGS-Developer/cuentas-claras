import { Router } from "express";
import { itemsController } from "../controllers/items.controller";

export const itemsRouter = Router();

// Arbitraje de reserva por REST: HTTP garantiza una respuesta por intento (200/409),
// lo que hace el flujo determinista y testeable. El socket solo difunde el nuevo estado
// (item:updated). Ver docs/12-diseno-concurrencia-de-reserva.md.
itemsRouter.post("/items/:itemId/reserve", itemsController.reserve);
itemsRouter.post("/items/:itemId/release", itemsController.release);
itemsRouter.post("/items/:itemId/purchase", itemsController.markPurchased);
itemsRouter.post("/items/:itemId/ticket", itemsController.attachTicket);
