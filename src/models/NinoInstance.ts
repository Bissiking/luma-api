import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/db';

class NinoInstance extends Model {
  public id!: number;
  public name!: string;
  public description?: string;
  public api_key!: string;
  public status!: 'active' | 'inactive' | 'maintenance';
  public config?: any;
  public disk_space?: number;
  public memory_usage?: number;
  public last_sync?: Date;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

NinoInstance.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    api_key: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'maintenance'),
      allowNull: false,
      defaultValue: 'inactive',
    },
    config: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    disk_space: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    memory_usage: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    last_sync: {
      type: DataTypes.DATE,
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
    tableName: 'nino_instances',
    timestamps: true,
    underscored: true,
  }
);

export default NinoInstance; 