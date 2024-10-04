import { Router } from "express";
import { bookTicket, cancelTicket, getEventByStatus, initializeEvent } from "../controllers/event.controller";
import { authenticateToken } from "../middleware";

const eventRouter = Router();

eventRouter.post("/initialize", initializeEvent);
eventRouter.post('/book/:eventId', authenticateToken, bookTicket);
eventRouter.post('/cancel/:eventId', authenticateToken, cancelTicket);
eventRouter.get('/status/:eventId', authenticateToken, getEventByStatus);


export default eventRouter;