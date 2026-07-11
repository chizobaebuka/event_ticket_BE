import { Router } from 'express';
import sequelize from '../db/sequelize';

const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
    try {
        await sequelize.authenticate();
        res.status(200).json({ status: 'ok', database: 'connected', uptime: process.uptime() });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(503).json({ status: 'error', database: 'disconnected' });
    }
});

export default healthRouter;
