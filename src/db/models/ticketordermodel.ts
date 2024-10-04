import { DataTypes, Model } from "sequelize";
import sequelize from "../sequelize";
import EventModel from "./eventmodel";
import UserModel from "./usermodel";
import { TicketStatus } from "../../interfaces/event.interface";

class TicketOrderModel extends Model {
  public id!: string;
  public firstName!: string;
  public lastName!: string;
  public country!: string;
  public email!: string;
  public password!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
}

TicketOrderModel.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
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
  ticketStatus: {
    type: DataTypes.ENUM,
    values: [TicketStatus.booked, TicketStatus.cancelled],
    defaultValue: TicketStatus.booked,
  },
}, {
  sequelize,
  modelName: 'TicketOrderModel',
  tableName: 'tickets',
});

export default TicketOrderModel;

