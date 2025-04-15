import sequelize from '../config/db';
import Sequelize from 'sequelize';

// Définition du modèle ApiStatus
const ApiStatus = sequelize.define('ApiStatus', {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  status: {
    type: Sequelize.STRING,
    allowNull: false,
    validate: {
      isIn: [['active', 'inactive', 'error', 'offline']]
    }
  },
  version: {
    type: Sequelize.STRING(50),
    allowNull: false
  },
  message: {
    type: Sequelize.TEXT,
    allowNull: true
  }
}, {
  tableName: 'api_status',
  timestamps: true,
  indexes: [
    {
      name: 'idx_api_status_created_at',
      fields: ['createdAt']
    }
  ]
});

export default ApiStatus; 