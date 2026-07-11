import { NextFunction, Request, Response } from 'express';
import { AnyZodObject } from 'zod';

/** Parses req.body against the given schema and forwards ZodError to the global error handler. */
export const validateBody = (schema: AnyZodObject) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        req.body = schema.parse(req.body);
        next();
    };
};

/** Parses req.query against the given schema and forwards ZodError to the global error handler. */
export const validateQuery = (schema: AnyZodObject) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        schema.parse(req.query);
        next();
    };
};
