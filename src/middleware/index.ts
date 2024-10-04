import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
    };
}

// Middleware to authenticate JWT and set req.user
export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        res.status(401).json({ error: 'Token is required' });
        return;
    }

    jwt.verify(token, process.env.JWT_SECRET_KEY as string, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        req.user = user as { id: string; email: string }; // Ensure the user object is typed correctly
        next();
    });
};
