import { DataTypes, Model } from "sequelize";
import sequelize from "../sequelize";
import UserModel from "./usermodel";
import EventModel from "./eventmodel";

class WaitingListModel extends Model {
  public id!: string;
  public userId!: string;
  public eventId!: string;
  public position!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

WaitingListModel.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: UserModel,  // Reference to User model
      key: 'id',
    },
  },
  eventId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: EventModel,  // Reference to Event model
      key: 'id',
    },
  },
  position: {
    type: DataTypes.INTEGER,
    allowNull: true,  // Optional: position in the waiting list
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  sequelize,
  modelName: 'WaitingListModel',
  tableName: 'waitinglist',
});

export default WaitingListModel;

