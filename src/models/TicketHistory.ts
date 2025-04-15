import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/db';
import User from './User';
import Ticket from './Ticket';

class TicketHistory extends Model {
  public id!: number;
  public ticket_id!: number;
  public performed_by!: number;
  public action!: string;
  public details!: string | null;
  public old_value!: string | null;
  public new_value!: string | null;
  public readonly performed_at!: Date;
}

TicketHistory.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    ticket_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    performed_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    old_value: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    new_value: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    performed_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'ticket_history',
    timestamps: false,
  }
);

// Relations
TicketHistory.belongsTo(Ticket, { foreignKey: 'ticket_id', as: 'ticket' });
TicketHistory.belongsTo(User, { foreignKey: 'performed_by', as: 'performer' });

export default TicketHistory; 