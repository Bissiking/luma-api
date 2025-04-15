import { DataTypes } from '@sequelize/core';
import sequelize from '../config/db';
import User from './User';

// Interface pour les attributs de groupe d'utilisateurs
export interface UserGroupAttributes {
  id?: number;
  user_id: number;
  group_id: number;
  role?: 'member' | 'admin';
  added_by: number;
  created_at?: Date;
  updated_at?: Date | null;
}

// Définition du modèle UserGroup
const UserGroup = sequelize.define('UserGroup', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'luma_users',
      key: 'id'
    }
  },
  group_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'luma_groups',
      key: 'id'
    }
  },
  role: {
    type: DataTypes.ENUM('member', 'admin'),
    allowNull: false,
    defaultValue: 'member'
  },
  added_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
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
}, {
  tableName: 'luma_user_groups',
  timestamps: false, // Nous gérons manuellement les timestamps
  indexes: [
    { name: 'idx_user_id', fields: ['user_id'] },
    { name: 'idx_group_id', fields: ['group_id'] },
    { name: 'idx_added_by', fields: ['added_by'] },
    { name: 'unique_user_group', unique: true, fields: ['user_id', 'group_id'] }
  ]
});

// Définir les associations
UserGroup.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
UserGroup.belongsTo(User, { foreignKey: 'added_by', as: 'addedBy' });

export default UserGroup; 