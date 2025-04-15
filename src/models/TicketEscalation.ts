import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/db';
import User from './User';
import Ticket from './Ticket';

class TicketEscalation extends Model {
  public id!: number;
  public ticket_id!: number;
  public escalated_to!: number | null;
  public escalation_reason!: string | null;
  public escalated_at!: Date;
}

TicketEscalation.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    ticket_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'luma_tickets',
        key: 'id'
      }
    },
    escalated_to: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'luma_users',
        key: 'id'
      }
    },
    escalation_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    escalated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    }
  },
  {
    sequelize,
    tableName: 'ticket_escalation',
    timestamps: false,
    indexes: [
      {
        name: 'idx_ticket_id',
        fields: ['ticket_id']
      },
      {
        name: 'idx_escalated_to',
        fields: ['escalated_to']
      },
      {
        name: 'idx_escalated_at',
        fields: ['escalated_at']
      }
    ]
  }
);

// Relations simplifiées
TicketEscalation.belongsTo(Ticket, { 
  foreignKey: 'ticket_id', 
  as: 'ticket'
});

TicketEscalation.belongsTo(User, { 
  foreignKey: 'escalated_to', 
  as: 'assignedTo'
});

export default TicketEscalation; 