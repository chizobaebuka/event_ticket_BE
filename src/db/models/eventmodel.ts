import { DataTypes, Model } from "sequelize";
import sequelize from "../sequelize";

class EventModel extends Model {
  public id!: string;
  public name!: string;
  public totalTickets!: number;
  public availableTickets!: number;
  public waitingListCount!: number;
  public status!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
}

EventModel.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  totalTickets: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  availableTickets: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  waitingListCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('available ticket', 'sold out', 'waiting list'), // Enum type for status
    allowNull: false,
    defaultValue: 'available ticket', 
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  sequelize,
  modelName: 'EventModel',
  tableName: 'events',
});

export default EventModel;

