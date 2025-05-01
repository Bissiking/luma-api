import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/db';
import User from './User';

class DebugReport extends Model {
  public id!: number;
  public title!: string;
  public description!: string;
  public content!: string;
  public priority!: 'critique' | 'elevee' | 'moyenne' | 'basse';
  public images!: string[];
  public reported_by!: number;
  public created_at!: Date;
  public updated_at!: Date;

  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

DebugReport.init(
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
    content: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    priority: {
      type: DataTypes.ENUM('critique', 'elevee', 'moyenne', 'basse'),
      allowNull: false,
      defaultValue: 'moyenne',
    },
    images: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    reported_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'DebugReport',
    tableName: 'luma_debug_reports',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['priority'] },
      { fields: ['reported_by'] },
    ],
  }
);

export default DebugReport; 