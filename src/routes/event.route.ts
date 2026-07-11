import { Router } from 'express';
import { bookTicket, cancelTicket, getEventByStatus, initializeEvent } from '../controllers/event.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateBody, validateQuery } from '../middleware/validate.middleware';
import { createEventSchema, eventStatusQuerySchema, ticketQuantitySchema } from '../utils/validator';

const eventRouter = Router();

eventRouter.post('/initialize', authenticateToken, validateBody(createEventSchema), initializeEvent);
eventRouter.post('/book/:eventId', authenticateToken, validateBody(ticketQuantitySchema), bookTicket);
eventRouter.post('/cancel/:eventId', authenticateToken, validateBody(ticketQuantitySchema), cancelTicket);
eventRouter.get(
    '/status/:eventId',
    authenticateToken,
    validateQuery(eventStatusQuerySchema),
    getEventByStatus
);

export default eventRouter;
