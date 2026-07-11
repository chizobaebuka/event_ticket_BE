import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
    };
}

/** Verifies the Bearer JWT on the request and attaches the decoded user to req.user. */
export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        res.status(401).json({ status: 'error', message: 'Token is required' });
        return;
    }

    jwt.verify(token, env.JWT_SECRET_KEY, (err, decoded) => {
        if (err) {
            res.status(403).json({ status: 'error', message: 'Forbidden' });
            return;
        }

        req.user = decoded as { id: string; email: string };
        next();
    });
};
