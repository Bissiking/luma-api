import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/db';
import User from './User';
import TicketCategory from './TicketCategory';

class Ticket extends Model {
  public id!: number;
  public title!: string;
  public description!: string;
  public status!: 'open' | 'in_progress' | 'resolved' | 'closed' | 'escalated';
  public priority!: 'low' | 'medium' | 'high' | 'urgent';
  public category_id!: number;
  public created_by!: number;
  public assigned_to!: number | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly closed_at!: Date | null;
}

Ticket.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('open', 'in_progress', 'resolved', 'closed', 'escalated'),
      allowNull: false,
      defaultValue: 'open',
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      allowNull: false,
      defaultValue: 'medium',
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    assigned_to: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    closed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    }
  },
  {
    sequelize,
    tableName: 'luma_tickets',
    timestamps: true,
    underscored: true,
  }
);

// Relations
Ticket.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Ticket.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignee' });
Ticket.belongsTo(TicketCategory, { foreignKey: 'category_id', as: 'category' });

export default Ticket; 