import { Transaction } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../db/sequelize';
import EventModel from '../db/models/eventmodel';
import TicketOrderModel from '../db/models/ticketordermodel';
import { ConflictError, NotFoundError } from '../errors/AppError';
import { CreateEventDTO, EventStatusEnum, TicketStatus } from '../interfaces/event.interface';
import * as waitingListService from './waitingList.service';

/** Locks the event row for the lifetime of the transaction (SELECT ... FOR UPDATE). */
const lockEventRow = (eventId: string, transaction: Transaction) =>
    EventModel.findByPk(eventId, { transaction, lock: transaction.LOCK.UPDATE });

const computeStatus = (event: EventModel): EventStatusEnum => {
    if (event.availableTickets === 0) return EventStatusEnum.SOLD_OUT;
    if (event.waitingListCount > 0) return EventStatusEnum.WAITING_LIST;
    return EventStatusEnum.AVAILABLE_TICKET;
};

export const initializeEvent = async ({ name, totalTickets }: CreateEventDTO): Promise<EventModel> => {
    return sequelize.transaction(async (transaction) => {
        const existingEvent = await EventModel.findOne({ where: { name }, transaction });
        if (existingEvent) {
            throw new ConflictError('Event with this name already exists.');
        }

        return EventModel.create(
            { name, totalTickets, availableTickets: totalTickets, waitingListCount: 0 },
            { transaction }
        );
    });
};

export interface BookingOutcome {
    booked: boolean;
    availableTickets: number;
    waitingListCount: number;
}

/**
 * Books `numberOfTickets` for the user, or (if insufficient inventory) adds the whole
 * request to the waiting list. The event row is locked for the duration of the
 * transaction so concurrent booking requests cannot both read the same available
 * count and oversell the event (a classic TOCTOU race condition).
 */
export const bookTickets = async (
    eventId: string,
    userId: string,
    numberOfTickets: number
): Promise<BookingOutcome> => {
    return sequelize.transaction(async (transaction) => {
        const event = await lockEventRow(eventId, transaction);
        if (!event) {
            throw new NotFoundError('Event not found');
        }

        if (event.availableTickets >= numberOfTickets) {
            const ticketOrders = Array.from({ length: numberOfTickets }, () => ({
                id: uuidv4(),
                userId,
                eventId,
                ticketStatus: TicketStatus.booked,
            }));
            await TicketOrderModel.bulkCreate(ticketOrders, { transaction });

            event.availableTickets -= numberOfTickets;
            event.status = computeStatus(event);
            await event.save({ transaction });

            return {
                booked: true,
                availableTickets: event.availableTickets,
                waitingListCount: event.waitingListCount,
            };
        }

        // Not enough inventory: the whole request joins the waiting list (no partial booking).
        for (let i = 0; i < numberOfTickets; i += 1) {
            await waitingListService.enqueue(eventId, userId, transaction);
        }

        event.waitingListCount += numberOfTickets;
        event.status = computeStatus(event);
        await event.save({ transaction });

        return {
            booked: false,
            availableTickets: event.availableTickets,
            waitingListCount: event.waitingListCount,
        };
    });
};

export interface CancellationOutcome {
    availableTickets: number;
    waitingListCount: number;
}

/**
 * Cancels `numberOfTickets` booked by the user and reassigns each freed ticket to
 * the next person in the waiting list (FIFO), all within a single transaction.
 */
export const cancelTickets = async (
    eventId: string,
    userId: string,
    numberOfTickets: number
): Promise<CancellationOutcome> => {
    return sequelize.transaction(async (transaction) => {
        const event = await lockEventRow(eventId, transaction);
        if (!event) {
            throw new NotFoundError('Event not found');
        }

        const ticketsToCancel = await TicketOrderModel.findAll({
            where: { userId, eventId, ticketStatus: TicketStatus.booked },
            limit: numberOfTickets,
            transaction,
            lock: transaction.LOCK.UPDATE,
        });

        if (ticketsToCancel.length < numberOfTickets) {
            throw new ConflictError('You cannot cancel more tickets than you have booked');
        }

        await TicketOrderModel.destroy({
            where: { id: ticketsToCancel.map((ticket) => ticket.id) },
            transaction,
        });

        event.availableTickets += numberOfTickets;

        let freedSeats = numberOfTickets;
        while (freedSeats > 0 && event.waitingListCount > 0) {
            const nextInLine = await waitingListService.dequeueNextInLine(eventId, transaction);
            if (!nextInLine) break;

            await TicketOrderModel.create(
                { id: uuidv4(), userId: nextInLine.user.id, eventId, ticketStatus: TicketStatus.booked },
                { transaction }
            );
            await nextInLine.waitingListEntry.destroy({ transaction });

            event.availableTickets -= 1;
            event.waitingListCount -= 1;
            freedSeats -= 1;
        }

        event.status = computeStatus(event);
        await event.save({ transaction });

        return { availableTickets: event.availableTickets, waitingListCount: event.waitingListCount };
    });
};

export const getEventByStatus = async (eventId: string, status?: string): Promise<EventModel> => {
    const event = await EventModel.findByPk(eventId);
    if (!event) {
        throw new NotFoundError('Event not found');
    }

    if (status && event.status !== status) {
        throw new NotFoundError(`Event status is not '${status}' (current status: '${event.status}')`);
    }

    return event;
};
