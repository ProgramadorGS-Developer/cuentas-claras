import { Router } from "express";
import { sessionsController } from "../controllers/sessions.controller";
import { itemsController } from "../controllers/items.controller";
import { budgetController } from "../controllers/budget.controller";

export const sessionsRouter = Router();

sessionsRouter.post("/sessions", sessionsController.create);
sessionsRouter.get("/sessions", sessionsController.list);
sessionsRouter.get("/sessions/by-token/:token", sessionsController.getByToken);
sessionsRouter.get("/sessions/:sessionId", sessionsController.getById);
sessionsRouter.patch("/sessions/:sessionId", sessionsController.update);
sessionsRouter.post("/sessions/:sessionId/close", sessionsController.close);
// RF-16 / EDT 1.1.4.3: pantalla de resultado compartible por el share_token (sin login).
sessionsRouter.get("/sessions/shared/:shareToken/result", sessionsController.getSharedResult);
// EDT 1.1.1.1: destino http(s) del link que se comparte por WhatsApp, y descarga del APK que esa
// misma página ofrece cuando la app no está instalada.
sessionsRouter.get("/join/:token", sessionsController.joinRedirect);
sessionsRouter.get("/descargar", sessionsController.apkRedirect);
sessionsRouter.get("/sessions/:sessionId/items", itemsController.listBySession);
sessionsRouter.post("/sessions/:sessionId/budget", budgetController.contribute);
sessionsRouter.get("/sessions/:sessionId/result", budgetController.getResult);
