import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/db';
import User from './User';
import Ticket from './Ticket';

class TicketComment extends Model {
  public id!: number;
  public ticket_id!: number;
  public user_id!: number;
  public content!: string;
  public is_internal!: boolean;
  public readonly created_at!: Date;
}

TicketComment.init(
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
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    is_internal: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'ticket_comments',
    timestamps: false,
  }
);

// Relations
TicketComment.belongsTo(Ticket, { foreignKey: 'ticket_id', as: 'ticket' });
TicketComment.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

export default TicketComment; 