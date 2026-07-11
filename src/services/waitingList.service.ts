import { Transaction } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import WaitingListModel from '../db/models/waitinglists';
import UserModel from '../db/models/usermodel';

/**
 * Waiting list positions are assigned within the caller's transaction so the
 * MAX(position) read and the subsequent insert are isolated from concurrent enqueues.
 */
async function getNextQueuePosition(eventId: string, transaction: Transaction): Promise<number> {
    const maxPosition = await WaitingListModel.max<number, WaitingListModel>('position', {
        where: { eventId },
        transaction,
    });

    return (maxPosition ?? 0) + 1;
}

export const enqueue = async (eventId: string, userId: string, transaction: Transaction): Promise<void> => {
    const position = await getNextQueuePosition(eventId, transaction);
    await WaitingListModel.create({ id: uuidv4(), userId, eventId, position }, { transaction });
};

/** Locks and returns the earliest (FIFO) waiting-list entry for the event, if any. */
export const dequeueNextInLine = async (
    eventId: string,
    transaction: Transaction
): Promise<{ user: UserModel; waitingListEntry: WaitingListModel } | null> => {
    const nextEntry = await WaitingListModel.findOne({
        where: { eventId },
        order: [['position', 'ASC']],
        transaction,
        lock: transaction.LOCK.UPDATE,
    });

    if (!nextEntry) {
        return null;
    }

    const user = await UserModel.findByPk(nextEntry.userId, { transaction });
    if (!user) {
        return null;
    }

    return { user, waitingListEntry: nextEntry };
};
