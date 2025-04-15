import Sequelize from 'sequelize';
import sequelize from '../config/db';
import User from './User';

// Actions possibles pour l'activité utilisateur
export type UserActionType = 
  'login' | 'logout' | 'failed_login' | 'password_change' | 
  'profile_update' | 'ticket_create' | 'ticket_update' | 
  'token_revoked' | 'admin_action' | 'other';

// Modules concernés par l'activité
export type UserActionModule = 
  'auth' | 'profile' | 'tickets' | 'nino' | 
  'monitoring' | 'admin' | 'system';

// Statuts possibles pour une activité
export type UserActionStatus = 
  'success' | 'failure' | 'warning' | 'info';

// Interface pour les attributs d'activité utilisateur
export interface UserActivityAttributes {
  id?: number;
  user_id: number;
  action: UserActionType;
  description: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  module?: UserActionModule;
  resource_type?: string;
  resource_id?: string;
  status?: UserActionStatus;
  created_at?: Date;
  session_id?: string;
  token_jti?: string;
}

// Définition du modèle UserActivity
const UserActivity = sequelize.define('UserActivity', {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  user_id: {
    type: Sequelize.INTEGER,
    allowNull: false,
    references: {
      model: 'luma_users',
      key: 'id'
    }
  },
  action: {
    type: Sequelize.ENUM(
      'login', 'logout', 'failed_login', 'password_change', 
      'profile_update', 'ticket_create', 'ticket_update', 
      'token_revoked', 'admin_action', 'other'
    ),
    allowNull: false
  },
  description: {
    type: Sequelize.STRING(255),
    allowNull: false
  },
  details: {
    type: Sequelize.JSON,
    allowNull: true
  },
  ip_address: {
    type: Sequelize.STRING(45),
    allowNull: true
  },
  user_agent: {
    type: Sequelize.STRING(255),
    allowNull: true
  },
  module: {
    type: Sequelize.ENUM(
      'auth', 'profile', 'tickets', 'nino', 
      'monitoring', 'admin', 'system'
    ),
    allowNull: false,
    defaultValue: 'system'
  },
  resource_type: {
    type: Sequelize.STRING(50),
    allowNull: true
  },
  resource_id: {
    type: Sequelize.STRING(50),
    allowNull: true
  },
  status: {
    type: Sequelize.ENUM('success', 'failure', 'warning', 'info'),
    allowNull: false,
    defaultValue: 'success'
  },
  created_at: {
    type: Sequelize.DATE,
    allowNull: false,
    defaultValue: Sequelize.NOW
  },
  session_id: {
    type: Sequelize.STRING(64),
    allowNull: true
  },
  token_jti: {
    type: Sequelize.STRING(64),
    allowNull: true,
    references: {
      model: 'luma_tokens',
      key: 'jti'
    }
  }
}, {
  tableName: 'luma_user_activity',
  timestamps: false,
  indexes: [
    { name: 'user_idx', fields: ['user_id'] },
    { name: 'action_idx', fields: ['action'] },
    { name: 'timestamp_idx', fields: ['created_at'] },
    { name: 'module_idx', fields: ['module'] },
    { name: 'status_idx', fields: ['status'] },
    { name: 'resource_idx', fields: ['resource_type', 'resource_id'] },
    { name: 'token_idx', fields: ['token_jti'] }
  ]
});

// Définir les associations
UserActivity.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

export default UserActivity; 