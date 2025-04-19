import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/db';
import User from './User';
import MonitoringAgentConfig from './MonitoringAgentConfig';
import MonitoringMetric from './MonitoringMetric';

class MonitoringAgent extends Model {
  public id!: number;
  public user_id!: number;
  public name!: string;
  public description?: string;
  public type!: string;
  public uuid!: string;
  public token!: string;
  public status!: string;
  public is_public!: boolean;
  public last_check_in?: Date;
  public ip_address?: string;
  public version?: string;
  public config?: MonitoringAgentConfig;
  public metrics?: MonitoringMetric[];
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

MonitoringAgent.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'system',
    },
    uuid: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'error'),
      allowNull: false,
      defaultValue: 'inactive',
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    last_check_in: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    ip_address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    version: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'monitoring_agents',
    timestamps: true,
    underscored: true,
  }
);

export default MonitoringAgent; 