import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import EventModel from '../db/models/eventmodel';
import { createEventSchema } from '../utils/validator';
import WaitingListModel from '../db/models/waitinglists';
import UserModel from '../db/models/usermodel';
import TicketOrderModel from '../db/models/ticketordermodel';

interface RequestExt extends Request {
    user?: {
        id: string;
        email: string;
    };
}

export const initializeEvent = async (req: Request, res: Response): Promise<void> => {
    try {
        // Validate the request body
        const { name, totalTickets } = createEventSchema.parse(req.body);

        // Check if an event with the same name already exists
        const existingEvent = await EventModel.findOne({ where: { name } });
        if (existingEvent) {
            res.status(400).json({ message: 'Event with this name already exists.' });
            return;
        }

        // Create a new event
        const newEvent = await EventModel.create({
            name,
            totalTickets,
            availableTickets: totalTickets,
            waitingListCount: 0,
            createdAt: new Date(),
        });

        // Send success response
        res.status(201).json({ message: 'Event created successfully', event: newEvent });
    } catch (error) {
        console.error('Error initializing event:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const bookTicket = async (req: RequestExt, res: Response): Promise<void> => {
    try {
        const { eventId } = req.params;
        const userId = req.user?.id;
        const { numberOfTickets } = req.body; // Expect numberOfTickets in the request body

        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        // Validate number of tickets
        if (!numberOfTickets || numberOfTickets <= 0) {
            res.status(400).json({ message: 'Invalid number of tickets' });
            return;
        }

        // Fetch the event with its availableTickets
        const event = await EventModel.findByPk(eventId);
        if (!event) {
            res.status(404).json({ message: 'Event not found' });
            return;
        }

        // Check if enough tickets are available
        if (event.availableTickets >= numberOfTickets) {
            // Create the ticket orders
            const ticketOrders = Array.from({ length: numberOfTickets }).map(() => ({ userId, eventId }));
            await TicketOrderModel.bulkCreate(ticketOrders); // Book multiple tickets

            // Reduce the available tickets in the event model
            event.availableTickets -= numberOfTickets; // Decrease the available tickets
            if (event.availableTickets === 0) {
                event.status = 'sold out'; // Update status to sold out
            }
            await event.save(); // Save the updated event

            // Respond to the user
            res.status(200).json({ 
                message: 'Tickets booked successfully', 
                availableTickets: event.availableTickets 
            });
        } else {
            // If not enough tickets are available, increase waiting list count
            event.waitingListCount += numberOfTickets; // Adjust waiting list count accordingly
            await event.save(); // Save the updated event

            await addToWaitingList(req, res); // Add to waiting list
            res.status(200).json({ 
                message: 'Not enough tickets available, added to waiting list', 
                waitingListCount: event.waitingListCount 
            });
        }
    } catch (error) {
        console.error('Error in bookTicket:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const cancelTicket = async (req: RequestExt, res: Response): Promise<void> => {
    try {
        const { eventId } = req.params;
        const userId = req.user?.id;
        const { numberOfTickets } = req.body; // Expect numberOfTickets in the request body

        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        // Validate number of tickets
        if (!numberOfTickets || numberOfTickets <= 0) {
            res.status(400).json({ message: 'Invalid number of tickets' });
            return;
        }

        // Fetch the event with its availableTickets
        const event = await EventModel.findByPk(eventId);
        if (!event) {
            res.status(404).json({ message: 'Event not found' });
            return;
        }

        // Find the ticket orders for this user and event
        const userTickets = await TicketOrderModel.findAll({
            where: { userId, eventId },
        });

        // Calculate the number of tickets booked by the user
        const bookedTicketsCount = userTickets.length;

        // Check if the user is canceling more tickets than they booked
        if (bookedTicketsCount < numberOfTickets) {
            res.status(400).json({ message: 'You cannot cancel more tickets than you have booked' });
            return;
        }

        // Delete the specified number of ticket orders
        await TicketOrderModel.destroy({
            where: { userId, eventId },
            limit: numberOfTickets, // Limit to the number of tickets being canceled
        });

        // Increase the available tickets in the event model
        event.availableTickets += numberOfTickets; // Increase available tickets
        if (event.waitingListCount > 0) {
            // Logic to handle the waiting list (e.g., notify users, etc.)
            event.waitingListCount -= 1; // Reduce waiting list count as one ticket becomes available
        }
        await event.save(); // Save the updated event

        // Respond to the user
        res.status(200).json({
            message: 'Tickets canceled successfully',
            availableTickets: event.availableTickets,
        });
    } catch (error) {
        console.error('Error in cancelTicket:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const getEventByStatus = async (req: RequestExt, res: Response): Promise<void> => {
    try {
        const { eventId } = req.params; // Get eventId from URL parameters
        const { status } = req.body; // Get the status from query parameters

        // Validate status
        const validStatuses = ['available ticket', 'sold out', 'waiting list'];
        if (status && !validStatuses.includes(status as string)) {
            res.status(400).json({ message: 'Invalid status provided' });
            return;
        }

        // Fetch the event by eventId
        const event = await EventModel.findByPk(eventId);
        if (!event) {
            res.status(404).json({ message: 'Event not found' });
            return;
        }

        // Check if the event status matches the requested status
        if (status && event.status !== status) {
            res.status(404).json({ message: `Event status is not '${status}'`, currentStatus: event.status });
            return;
        }

        // Send the event details if status is matched or no status provided
        res.status(200).json({
            status: 'success',
            message: 'Event found',
            data: event,
        });
    } catch (error) {
        console.error('Error in filterEventByStatus:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const getNextWaitingListUser = async (eventId: string) => {
    try {
        const nextEntry = await WaitingListModel.findOne({
            where: { eventId },
            order: [['position', 'ASC']],
        });

        if (!nextEntry) return { user: null, waitingListEntry: null };

        const user = await UserModel.findByPk(nextEntry.userId); 
        return { user, waitingListEntry: nextEntry };
    } catch (error) {
        console.error('Error getting next waiting list user:', error);
        return null; // Return null in case of error
    }
};

export const addToWaitingList = async (req: RequestExt, res: Response) => {
    try {
        const { eventId } = req.params;
        const userId = req.user?.id;

        // Check if user is authenticated
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Find the event by ID
        const event = await EventModel.findByPk(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const nextPosition = await getNextWaitingListUser(eventId);
        const newPosition = nextPosition?.waitingListEntry?.position ? nextPosition.waitingListEntry.position + 1 : 1;

        // Add user to the waiting list
        await WaitingListModel.create({
            id: uuidv4(),
            userId,
            eventId,
            position: newPosition,
        });
    
        // Update waiting list count on the event
        event.waitingListCount += 1;
        await event.save();

        res.status(200).json({ message: 'Added to waiting list successfully' });
    } catch (error) {
        console.error('Error adding to waiting list:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
