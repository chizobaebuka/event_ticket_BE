import { DataTypes, Model } from 'sequelize';
import sequelize from '../sequelize';
import { EventStatusEnum } from '../../interfaces/event.interface';

class EventModel extends Model {
    public id!: string;
    public name!: string;
    public totalTickets!: number;
    public availableTickets!: number;
    public waitingListCount!: number;
    public status!: EventStatusEnum;
    public createdAt!: Date;
    public updatedAt!: Date;
}

EventModel.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        totalTickets: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: { min: 1 },
        },
        availableTickets: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: { min: 0 },
        },
        waitingListCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            validate: { min: 0 },
        },
        status: {
            type: DataTypes.ENUM(...Object.values(EventStatusEnum)),
            allowNull: false,
            defaultValue: EventStatusEnum.AVAILABLE_TICKET,
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
        },
    },
    {
        sequelize,
        modelName: 'EventModel',
        tableName: 'events',
    }
);

export default EventModel;
