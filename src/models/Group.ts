import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/db';
import User from './User';

// Interface pour les attributs de groupe
export interface GroupAttributes {
  id?: number;
  name: string;
  description?: string;
  color?: string;
  protected?: boolean;
  created_by?: number;
  created_at?: Date;
  updated_at?: Date | null;
}

// Définition du modèle Group
class Group extends Model<GroupAttributes> {
  public id!: number;
  public name!: string;
  public description!: string;
  public color!: string;
  public protected!: boolean;
  public created_by!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date | null;
}

Group.init(
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
    color: {
      type: DataTypes.STRING(7),
      allowNull: true,
      defaultValue: '#e74c3c'
    },
    protected: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'luma_users',
        key: 'id'
      }
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'luma_groups',
    timestamps: false, // Nous gérons manuellement les timestamps
  }
);

// Définir les associations
Group.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

export default Group; 