import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/db';

class TicketCategory extends Model {
  public id!: number;
  public name!: string;
  public description!: string;
  public color!: string;
  public icon!: string | null;
  public is_active!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

TicketCategory.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    color: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: '#3b82f6',
    },
    icon: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: 'ticket_categories',
    timestamps: true,
    underscored: true,
  }
);

export default TicketCategory; 