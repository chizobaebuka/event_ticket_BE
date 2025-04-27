import { Request, Response } from 'express';
import { addToWaitingList, bookTicket, RequestExt } from '../controllers/event.controller';
import EventModel from '../db/models/eventmodel';
import TicketOrderModel from '../db/models/ticketordermodel';
import { v4 as uuidv4 } from 'uuid';

jest.mock('../db/models/eventmodel'); // Mock the models
jest.mock('../db/models/ticketordermodel', () => ({
    bulkCreate: jest.fn(),
}));

describe('bookTicket', () => {
    let mockRequest: Partial<RequestExt>;
    let mockResponse: Partial<Response>;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    const mockUserId = uuidv4(); // Mock UUID for userId
    const mockEventId = uuidv4(); // Mock UUID for eventId

    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        mockResponse = {
            status: statusMock,
            json: jsonMock,
        };
        mockRequest = {
            params: { eventId: mockEventId }, // Use the generated eventId
            user: { id: mockUserId, email: 'user@example.com' }, // Use the generated userId
            body: { numberOfTickets: 2 },
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return 401 if user is not authenticated', async () => {
        mockRequest.user = undefined;

        await bookTicket(mockRequest as any, mockResponse as Response);

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({ message: 'Unauthorized' });
    });

    it('should return 400 if number of tickets is invalid', async () => {
        mockRequest.body.numberOfTickets = 0;

        await bookTicket(mockRequest as any, mockResponse as Response);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({ message: 'Invalid number of tickets' });
    });

    it('should return 404 if event is not found', async () => {
        (EventModel.findByPk as jest.Mock).mockResolvedValue(null);

        await bookTicket(mockRequest as any, mockResponse as Response);

        expect(statusMock).toHaveBeenCalledWith(404);
        expect(jsonMock).toHaveBeenCalledWith({ message: 'Event not found' });
    });

    it('should book tickets if enough tickets are available', async () => {
        const mockEvent = {
            id: mockEventId,
            availableTickets: 5,
            save: jest.fn(),
        };

        (EventModel.findByPk as jest.Mock).mockResolvedValue(mockEvent);
        (TicketOrderModel.bulkCreate as jest.Mock).mockResolvedValue(undefined);

        await bookTicket(mockRequest as any, mockResponse as Response);

        expect(TicketOrderModel.bulkCreate).toHaveBeenCalledWith([
            { userId: mockUserId, eventId: mockEventId },
            { userId: mockUserId, eventId: mockEventId },
        ]);
        expect(mockEvent.save).toHaveBeenCalled();
        expect(statusMock).toHaveBeenCalledWith(200);
        expect(jsonMock).toHaveBeenCalledWith({
            message: 'Tickets booked successfully',
            availableTickets: 3,
        });
    });

    it('should add to waiting list if not enough tickets are available', async () => {
        const mockEvent = {
            id: mockEventId,
            availableTickets: 1,
            waitingListCount: 0,
            save: jest.fn(),
        };

        (EventModel.findByPk as jest.Mock).mockResolvedValue(mockEvent);
        (addToWaitingList as jest.Mock).mockResolvedValue(undefined);

        await bookTicket(mockRequest as any, mockResponse as Response);

        expect(mockEvent.waitingListCount).toBe(2);
        expect(mockEvent.save).toHaveBeenCalled();
        expect(addToWaitingList).toHaveBeenCalledWith(mockRequest, mockResponse);
        expect(statusMock).toHaveBeenCalledWith(200);
        expect(jsonMock).toHaveBeenCalledWith({
            message: 'Not enough tickets available, added to waiting list',
            waitingListCount: 2,
        });
    });

    it('should handle internal server errors', async () => {
        (EventModel.findByPk as jest.Mock).mockRejectedValue(new Error('Database Error'));

        await bookTicket(mockRequest as any, mockResponse as Response);

        expect(statusMock).toHaveBeenCalledWith(500);
        expect(jsonMock).toHaveBeenCalledWith({ message: 'Internal Server Error' });
    });
});
