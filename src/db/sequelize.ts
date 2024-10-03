import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
    String(process.env.DB_NAME),
    String(process.env.DB_USER),
    String(process.env.DB_PASSWORD),
    {
        host: process.env.DB_HOST,
        dialect: 'postgres',
        port: Number(process.env.DB_PORT),
    }
);

export default sequelize;
