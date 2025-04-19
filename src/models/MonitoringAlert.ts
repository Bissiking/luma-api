import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/db';
import MonitoringAgent from './MonitoringAgent';

class MonitoringAlert extends Model {
  public id!: number;
  public agent_id!: number;
  public service_id!: number | null;
  public alert_type!: 'critical' | 'warning' | 'ok';
  public message!: string;
  public value!: number | null;
  public threshold!: number | null;
  public unit!: string | null;
  public status!: 'active' | 'acknowledged' | 'resolved' | 'escalated';
  public acknowledged!: boolean;
  public acknowledged_at!: Date | null;
  public acknowledged_by!: number | null;
  public resolved!: boolean;
  public resolved_at!: Date | null;
  public created_at!: Date;
  public last_notification_at!: Date | null;
  public notification_interval!: number;
  public metadata!: object | null;
  public tags!: object | null;
}

MonitoringAlert.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    agent_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    service_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    alert_type: {
      type: DataTypes.ENUM('critical', 'warning', 'ok'),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    value: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    threshold: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    unit: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'acknowledged', 'resolved', 'escalated'),
      allowNull: false,
      defaultValue: 'active',
    },
    acknowledged: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    acknowledged_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    acknowledged_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    resolved: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    resolved_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    last_notification_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    notification_interval: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 900,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'monitoring_alerts',
    timestamps: false,
    underscored: true,
  }
);

// Relations
MonitoringAlert.belongsTo(MonitoringAgent, { foreignKey: 'agent_id', as: 'agent' });

export default MonitoringAlert; 