import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';

/** Test helper: mints a JWT shaped like a real login token, for exercising authenticateToken. */
export const generateValidToken = (): string => {
    const userPayload = { id: uuidv4(), email: 'user@example.com' };
    return jwt.sign(userPayload, env.JWT_SECRET_KEY, { expiresIn: '1h' });
};
