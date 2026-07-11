import { z } from 'zod';
import { EventStatusEnum } from '../interfaces/event.interface';

export const signUpUserSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    country: z.string().min(1, 'Country is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters long'),
});
export type SignUpUserInput = z.infer<typeof signUpUserSchema>;

export const loginUserSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});
export type LoginUserInput = z.infer<typeof loginUserSchema>;

export const createEventSchema = z.object({
    name: z.string().min(1, 'Event name is required'),
    totalTickets: z.number().int().positive('totalTickets must be a positive integer'),
});
export type CreateEventInput = z.infer<typeof createEventSchema>;

export const ticketQuantitySchema = z.object({
    numberOfTickets: z.number().int().positive('numberOfTickets must be a positive integer'),
});
export type TicketQuantityInput = z.infer<typeof ticketQuantitySchema>;

export const eventStatusQuerySchema = z.object({
    status: z.nativeEnum(EventStatusEnum).optional(),
});
export type EventStatusQueryInput = z.infer<typeof eventStatusQuerySchema>;
