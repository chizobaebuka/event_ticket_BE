import { Router } from "express";
import { initializeEvent } from "../controllers/event.controller";

const eventRouter = Router();

eventRouter.post("/initialize", initializeEvent);

export default eventRouter;