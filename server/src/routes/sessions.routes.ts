import { Router } from "express";
import { sessionsController } from "../controllers/sessions.controller";
import { itemsController } from "../controllers/items.controller";
import { budgetController } from "../controllers/budget.controller";

export const sessionsRouter = Router();

sessionsRouter.post("/sessions", sessionsController.create);
sessionsRouter.get("/sessions", sessionsController.list);
sessionsRouter.get("/sessions/by-token/:token", sessionsController.getByToken);
sessionsRouter.get("/join/:token", sessionsController.joinRedirect);
sessionsRouter.get("/sessions/:sessionId/items", itemsController.listBySession);
sessionsRouter.post("/sessions/:sessionId/budget", budgetController.contribute);
sessionsRouter.get("/sessions/:sessionId/result", budgetController.getResult);
