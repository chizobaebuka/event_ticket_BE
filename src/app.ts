import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import userRouter from './routes/user.route';
import eventRouter from './routes/event.route';
import healthRouter from './routes/health.route';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

/** Builds the Express application. Kept separate from server bootstrap so it can be imported directly in tests. */
export const createApp = (): Application => {
    const app = express();

    app.use(helmet());
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    if (env.NODE_ENV !== 'test') {
        app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
    }

    app.use(
        rateLimit({
            windowMs: env.RATE_LIMIT_WINDOW_MS,
            limit: env.RATE_LIMIT_MAX,
            standardHeaders: true,
            legacyHeaders: false,
        })
    );

    app.get('/', (_req, res) => {
        res.json({ status: 'ok', message: 'Event Ticket Booking API' });
    });

    app.use('/health', healthRouter);
    app.use('/api/v1/user', userRouter);
    app.use('/api/v1/event', eventRouter);

    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
};
