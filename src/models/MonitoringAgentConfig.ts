import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/db';
import MonitoringAgent from './MonitoringAgent';

class MonitoringAgentConfig extends Model {
  public id!: number;
  public agent_id!: number;
  public interval!: number;
  public log_level!: string;
  public cpu_collector_enabled!: boolean;
  public cpu_warning_threshold!: number;
  public cpu_critical_threshold!: number;
  public memory_collector_enabled!: boolean;
  public memory_warning_threshold!: number;
  public memory_critical_threshold!: number;
  public disk_collector_enabled!: boolean;
  public disk_warning_threshold!: number;
  public disk_critical_threshold!: number;
  public network_collector_enabled!: boolean;
  public network_warning_threshold!: number;
  public network_critical_threshold!: number;
  public docker_collector_enabled!: boolean;
  public docker_warning_threshold!: number;
  public docker_critical_threshold!: number;
  public web_service_collector_enabled!: boolean;
  public web_service_warning_threshold!: number;
  public web_service_critical_threshold!: number;
  public windows_services!: any;
  public linux_services!: any;
  public docker_containers!: any;
  public alerts_enabled!: boolean;
  public notification_email!: string | null;
  public notification_discord_webhook!: string | null;
  public notification_slack_webhook!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

MonitoringAgentConfig.init(
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
    interval: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 60,
    },
    log_level: {
      type: DataTypes.ENUM('DEBUG', 'INFO', 'WARNING', 'ERROR'),
      allowNull: false,
      defaultValue: 'INFO',
    },
    cpu_collector_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    cpu_warning_threshold: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 80,
    },
    cpu_critical_threshold: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 90,
    },
    memory_collector_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    memory_warning_threshold: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 80,
    },
    memory_critical_threshold: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 90,
    },
    disk_collector_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    disk_warning_threshold: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 80,
    },
    disk_critical_threshold: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 90,
    },
    network_collector_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    network_warning_threshold: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 80,
    },
    network_critical_threshold: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 90,
    },
    docker_collector_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    docker_warning_threshold: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 80,
    },
    docker_critical_threshold: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 90,
    },
    web_service_collector_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    web_service_warning_threshold: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 80,
    },
    web_service_critical_threshold: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 90,
    },
    windows_services: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    linux_services: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    docker_containers: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    alerts_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    notification_email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    notification_discord_webhook: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    notification_slack_webhook: {
      type: DataTypes.STRING(255),
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
    tableName: 'monitoring_agent_configs',
    timestamps: true,
    underscored: true,
  }
);

export default MonitoringAgentConfig; 