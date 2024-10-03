import { Request, Response } from 'express';
import EventModel from '../db/models/eventmodel';
import { createEventSchema } from '../utils/validator';
// import { InitializeEventRequest } from '../interfaces/event.interface';


export const initializeEvent = async (req: Request, res: Response): Promise<void> => {
    try {
        // Validate the request body
        const parsedData = createEventSchema.parse(req.body);
        const { name, totalTickets } = parsedData;

        // Check if an event with the same name already exists
        const existingEvent = await EventModel.findOne({ where: { name } });
        if (existingEvent) {
            res.status(400).json({ message: 'Event with this name already exists.' });
            return;
        }

        // Create a new event with the provided name and ticket count
        const newEvent = await EventModel.create({
            name,
            totalTickets: totalTickets,
            availableTickets: totalTickets,
            waitingListCount: 0,
            createdAt: new Date(),
        });

        // Send success response with the event details
        res.status(201).json({ message: 'Event created successfully', event: newEvent });
    } catch (error) {
        console.error('Error initializing event:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
