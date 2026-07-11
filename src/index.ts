import { createApp } from './app';
import { env } from './config/env';
import sequelize from './db/sequelize';

const app = createApp();

async function startApp() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        const server = app.listen(env.PORT, () => {
            console.log(`server is listening on http://localhost:${env.PORT}....`);
        });

        const shutdown = async (signal: string) => {
            console.log(`${signal} received: closing server gracefully.`);
            server.close(async () => {
                await sequelize.close();
                process.exit(0);
            });
        };

        process.on('SIGTERM', () => void shutdown('SIGTERM'));
        process.on('SIGINT', () => void shutdown('SIGINT'));
    } catch (error: any) {
        console.error(`Error starting server: ${error.message}`);
        process.exit(1);
    }
}

startApp();
