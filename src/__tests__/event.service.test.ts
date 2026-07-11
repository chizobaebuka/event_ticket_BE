import { v4 as uuidv4 } from 'uuid';
import EventModel from '../db/models/eventmodel';
import TicketOrderModel from '../db/models/ticketordermodel';
import sequelize from '../db/sequelize';
import * as waitingListService from '../services/waitingList.service';
import * as eventService from '../services/event.service';
import { AppError } from '../errors/AppError';
import { EventStatusEnum, TicketStatus } from '../interfaces/event.interface';

jest.mock('../db/models/eventmodel');
jest.mock('../db/models/ticketordermodel');
jest.mock('../services/waitingList.service');

describe('event.service', () => {
    const eventId = uuidv4();
    const userId = uuidv4();

    beforeEach(() => {
        jest.spyOn(sequelize, 'transaction').mockImplementation(((callback: (t: any) => Promise<unknown>) =>
            callback({ LOCK: { UPDATE: 'UPDATE' } })) as any);
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    describe('initializeEvent', () => {
        it('throws a conflict error when an event with the same name exists', async () => {
            (EventModel.findOne as jest.Mock).mockResolvedValue({ id: eventId });

            await expect(
                eventService.initializeEvent({ name: 'Concert', totalTickets: 10 })
            ).rejects.toMatchObject({
                statusCode: 409,
            });
            expect(EventModel.create).not.toHaveBeenCalled();
        });

        it('creates the event with availableTickets equal to totalTickets', async () => {
            (EventModel.findOne as jest.Mock).mockResolvedValue(null);
            (EventModel.create as jest.Mock).mockResolvedValue({
                id: eventId,
                name: 'Concert',
                totalTickets: 10,
            });

            const event = await eventService.initializeEvent({ name: 'Concert', totalTickets: 10 });

            expect(EventModel.create).toHaveBeenCalledWith(
                { name: 'Concert', totalTickets: 10, availableTickets: 10, waitingListCount: 0 },
                expect.anything()
            );
            expect(event).toEqual({ id: eventId, name: 'Concert', totalTickets: 10 });
        });
    });

    describe('bookTickets', () => {
        it('throws NotFoundError when the event does not exist', async () => {
            (EventModel.findByPk as jest.Mock).mockResolvedValue(null);

            await expect(eventService.bookTickets(eventId, userId, 2)).rejects.toMatchObject({
                statusCode: 404,
            });
        });

        it('books tickets and decrements availableTickets when enough inventory exists', async () => {
            const mockEvent: any = {
                availableTickets: 5,
                waitingListCount: 0,
                status: EventStatusEnum.AVAILABLE_TICKET,
                save: jest.fn(),
            };
            (EventModel.findByPk as jest.Mock).mockResolvedValue(mockEvent);
            (TicketOrderModel.bulkCreate as jest.Mock).mockResolvedValue(undefined);

            const result = await eventService.bookTickets(eventId, userId, 2);

            expect(TicketOrderModel.bulkCreate).toHaveBeenCalledWith(
                [
                    expect.objectContaining({ userId, eventId, ticketStatus: TicketStatus.booked }),
                    expect.objectContaining({ userId, eventId, ticketStatus: TicketStatus.booked }),
                ],
                expect.anything()
            );
            expect(mockEvent.availableTickets).toBe(3);
            expect(mockEvent.save).toHaveBeenCalled();
            expect(result).toEqual({ booked: true, availableTickets: 3, waitingListCount: 0 });
        });

        it('marks the event sold out once availableTickets reaches zero', async () => {
            const mockEvent: any = {
                availableTickets: 2,
                waitingListCount: 0,
                status: EventStatusEnum.AVAILABLE_TICKET,
                save: jest.fn(),
            };
            (EventModel.findByPk as jest.Mock).mockResolvedValue(mockEvent);
            (TicketOrderModel.bulkCreate as jest.Mock).mockResolvedValue(undefined);

            await eventService.bookTickets(eventId, userId, 2);

            expect(mockEvent.status).toBe(EventStatusEnum.SOLD_OUT);
        });

        it('adds the whole request to the waiting list when inventory is insufficient', async () => {
            const mockEvent: any = {
                availableTickets: 1,
                waitingListCount: 0,
                status: EventStatusEnum.AVAILABLE_TICKET,
                save: jest.fn(),
            };
            (EventModel.findByPk as jest.Mock).mockResolvedValue(mockEvent);
            (waitingListService.enqueue as jest.Mock).mockResolvedValue(undefined);

            const result = await eventService.bookTickets(eventId, userId, 3);

            expect(TicketOrderModel.bulkCreate).not.toHaveBeenCalled();
            expect(waitingListService.enqueue).toHaveBeenCalledTimes(3);
            expect(mockEvent.waitingListCount).toBe(3);
            expect(result).toEqual({ booked: false, availableTickets: 1, waitingListCount: 3 });
        });
    });

    describe('cancelTickets', () => {
        it('throws NotFoundError when the event does not exist', async () => {
            (EventModel.findByPk as jest.Mock).mockResolvedValue(null);

            await expect(eventService.cancelTickets(eventId, userId, 1)).rejects.toMatchObject({
                statusCode: 404,
            });
        });

        it('throws a conflict error when canceling more tickets than booked', async () => {
            (EventModel.findByPk as jest.Mock).mockResolvedValue({
                availableTickets: 0,
                waitingListCount: 0,
            });
            (TicketOrderModel.findAll as jest.Mock).mockResolvedValue([{ id: uuidv4() }]);

            await expect(eventService.cancelTickets(eventId, userId, 2)).rejects.toMatchObject({
                statusCode: 409,
            });
            expect(TicketOrderModel.destroy).not.toHaveBeenCalled();
        });

        it('frees up tickets and reassigns them to the next user in the waiting list', async () => {
            const mockEvent: any = {
                availableTickets: 0,
                waitingListCount: 1,
                status: EventStatusEnum.SOLD_OUT,
                save: jest.fn(),
            };
            const cancelledTickets = [{ id: uuidv4() }];
            const waitingUser = { id: uuidv4() };
            const waitingListEntry = { destroy: jest.fn() };

            (EventModel.findByPk as jest.Mock).mockResolvedValue(mockEvent);
            (TicketOrderModel.findAll as jest.Mock).mockResolvedValue(cancelledTickets);
            (TicketOrderModel.destroy as jest.Mock).mockResolvedValue(undefined);
            (TicketOrderModel.create as jest.Mock).mockResolvedValue(undefined);
            (waitingListService.dequeueNextInLine as jest.Mock).mockResolvedValueOnce({
                user: waitingUser,
                waitingListEntry,
            });

            const result = await eventService.cancelTickets(eventId, userId, 1);

            expect(TicketOrderModel.destroy).toHaveBeenCalledWith({
                where: { id: cancelledTickets.map((t) => t.id) },
                transaction: expect.anything(),
            });
            expect(TicketOrderModel.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: waitingUser.id,
                    eventId,
                    ticketStatus: TicketStatus.booked,
                }),
                expect.anything()
            );
            expect(waitingListEntry.destroy).toHaveBeenCalled();
            expect(mockEvent.waitingListCount).toBe(0);
            expect(mockEvent.availableTickets).toBe(0);
            expect(result).toEqual({ availableTickets: 0, waitingListCount: 0 });
        });

        it('leaves freed tickets available when there is nobody waiting', async () => {
            const mockEvent: any = {
                availableTickets: 0,
                waitingListCount: 0,
                status: EventStatusEnum.SOLD_OUT,
                save: jest.fn(),
            };
            (EventModel.findByPk as jest.Mock).mockResolvedValue(mockEvent);
            (TicketOrderModel.findAll as jest.Mock).mockResolvedValue([{ id: uuidv4() }]);
            (TicketOrderModel.destroy as jest.Mock).mockResolvedValue(undefined);

            const result = await eventService.cancelTickets(eventId, userId, 1);

            expect(waitingListService.dequeueNextInLine).not.toHaveBeenCalled();
            expect(mockEvent.status).toBe(EventStatusEnum.AVAILABLE_TICKET);
            expect(result).toEqual({ availableTickets: 1, waitingListCount: 0 });
        });
    });

    describe('getEventByStatus', () => {
        it('throws NotFoundError when the event does not exist', async () => {
            (EventModel.findByPk as jest.Mock).mockResolvedValue(null);

            await expect(eventService.getEventByStatus(eventId)).rejects.toBeInstanceOf(AppError);
        });

        it('throws NotFoundError when the current status does not match the requested one', async () => {
            (EventModel.findByPk as jest.Mock).mockResolvedValue({ status: EventStatusEnum.SOLD_OUT });

            await expect(
                eventService.getEventByStatus(eventId, EventStatusEnum.AVAILABLE_TICKET)
            ).rejects.toMatchObject({ statusCode: 404 });
        });

        it('returns the event when found and status matches', async () => {
            const mockEvent = { status: EventStatusEnum.AVAILABLE_TICKET };
            (EventModel.findByPk as jest.Mock).mockResolvedValue(mockEvent);

            const event = await eventService.getEventByStatus(eventId, EventStatusEnum.AVAILABLE_TICKET);

            expect(event).toBe(mockEvent);
        });
    });
});
