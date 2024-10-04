// src/interfaces/EventDTO.ts
export interface CreateEventDTO {
    name: string;
    totalTickets: number;
}

export interface UpdateEventDTO {
    name?: string;
    totalTickets?: number;
    availableTickets?: number;
}

export interface EventStatusDTO {
    availableTickets: number;
    waitingListCount: number; // Assuming you will implement the waiting list feature
}

export enum EventStatusEnum {
    AVAILABLE_TICKET = 'available ticket',
    WAITING_LIST = 'waiting list',
    SOLD_OUT = 'sold out',
}

export enum TicketStatus {
    booked = 'booked',
    cancelled = 'cancelled',
}

export interface IEvent {
    id: string;
    name: string;
    totalTickets: number;
    availableTickets: number;
    waitingListCount: number;
    status: EventStatusEnum; // Use the EventStatusEnum here for type safety
    createdAt?: Date;
    updatedAt?: Date;
}
