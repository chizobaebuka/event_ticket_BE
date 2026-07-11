import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError';

/** Catches unmatched routes and forwards a consistent 404 to the error handler. */
export const notFoundHandler = (req: Request, res: Response): void => {
    res.status(404).json({ status: 'error', message: `Route ${req.method} ${req.originalUrl} not found` });
};

/**
 * Centralized error handler. Must be registered last, after all routes.
 * Normalizes AppError, Zod validation errors, and unexpected errors into one response shape.
 * Express identifies error-handling middleware by its 4-argument arity, so `next`
 * must stay in the signature even though it's unused.
 */
export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
    if (err instanceof ZodError) {
        res.status(400).json({
            status: 'error',
            message: 'Validation failed',
            errors: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
        });
        return;
    }

    if (err instanceof AppError) {
        res.status(err.statusCode).json({ status: 'error', message: err.message });
        return;
    }

    console.error('Unexpected error:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
};
