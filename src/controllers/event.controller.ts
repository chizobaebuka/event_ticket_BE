import { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { UnauthorizedError } from '../errors/AppError';
import * as eventService from '../services/event.service';

const requireUserId = (req: AuthenticatedRequest): string => {
    if (!req.user?.id) {
        throw new UnauthorizedError();
    }
    return req.user.id;
};

export const initializeEvent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const event = await eventService.initializeEvent(req.body);
    res.status(201).json({ status: 'success', message: 'Event created successfully', event });
});

export const bookTicket = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = requireUserId(req);
    const { eventId } = req.params;
    const { numberOfTickets } = req.body;

    const result = await eventService.bookTickets(eventId, userId, numberOfTickets);

    res.status(200).json({
        status: 'success',
        message: result.booked
            ? 'Tickets booked successfully'
            : 'Not enough tickets available, added to waiting list',
        availableTickets: result.availableTickets,
        waitingListCount: result.waitingListCount,
    });
});

export const cancelTicket = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = requireUserId(req);
    const { eventId } = req.params;
    const { numberOfTickets } = req.body;

    const result = await eventService.cancelTickets(eventId, userId, numberOfTickets);

    res.status(200).json({
        status: 'success',
        message: 'Tickets canceled successfully',
        availableTickets: result.availableTickets,
        waitingListCount: result.waitingListCount,
    });
});

export const getEventByStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { eventId } = req.params;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;

    const event = await eventService.getEventByStatus(eventId, status);

    res.status(200).json({ status: 'success', message: 'Event found', data: event });
});
