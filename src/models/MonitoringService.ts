import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';
import MonitoringAgent from './MonitoringAgent';

class MonitoringService extends Model {
  public id!: number;
  public agent_id!: number;
  public name!: string;
  public type!: string;
  public status!: string;
  public port?: number;
  public url?: string;
  public check_interval!: number;
  public timeout!: number;
  public retry_count!: number;
  public last_check?: Date;
  public last_status?: string;
  public details?: object;
  public created_at!: Date;
  public updated_at!: Date;
}

MonitoringService.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    agent_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'monitoring_agents',
        key: 'id',
      },
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('process', 'http', 'tcp', 'custom'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'error'),
      allowNull: false,
      defaultValue: 'active',
    },
    port: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    url: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    check_interval: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60,
    },
    timeout: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
    },
    retry_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
    },
    last_check: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    last_status: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    details: {
      type: DataTypes.JSON,
      allowNull: true,
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
    modelName: 'MonitoringService',
    tableName: 'monitoring_services',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

MonitoringService.belongsTo(MonitoringAgent, {
  foreignKey: 'agent_id',
  as: 'agent',
});

export default MonitoringService; 