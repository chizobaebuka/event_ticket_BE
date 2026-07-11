import { NextFunction, Request, Response } from 'express';

type AsyncRouteHandler<Req extends Request = Request> = (
    req: Req,
    res: Response,
    next: NextFunction
) => Promise<unknown>;

/**
 * Wraps an async Express handler so rejected promises are forwarded to next(),
 * removing the need for a try/catch block in every controller.
 */
export const asyncHandler = <Req extends Request = Request>(handler: AsyncRouteHandler<Req>) => {
    return (req: Req, res: Response, next: NextFunction): void => {
        handler(req, res, next).catch(next);
    };
};
