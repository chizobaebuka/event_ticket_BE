import { ICore } from '.';

export enum EventStatusEnum {
    AVAILABLE_TICKET = 'available ticket',
    WAITING_LIST = 'waiting list',
    SOLD_OUT = 'sold out',
}

export enum TicketStatus {
    booked = 'booked',
    cancelled = 'cancelled',
}

export interface IEvent extends ICore {
    name: string;
    totalTickets: number;
    availableTickets: number;
    waitingListCount: number;
    status: EventStatusEnum;
}

export interface CreateEventDTO {
    name: string;
    totalTickets: number;
}

export interface BookingResult {
    booked: boolean;
    availableTickets: number;
    waitingListCount: number;
}
