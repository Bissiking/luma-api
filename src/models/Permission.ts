import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/db';

// Interface pour les attributs de permission
export interface PermissionAttributes {
  id?: number;
  name: string;
  description?: string;
  module: string;
  created_at?: Date;
}

// Définition du modèle Permission
class Permission extends Model<PermissionAttributes> {
  public id!: number;
  public name!: string;
  public description!: string;
  public module!: string;
  public readonly created_at!: Date;
}

Permission.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    module: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: 'luma_permissions',
    timestamps: false // Nous gérons manuellement les timestamps
  }
);

export default Permission; 