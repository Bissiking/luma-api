import Sequelize from 'sequelize';
import bcrypt from 'bcrypt';
import sequelize from '../config/db';
import { dbLogger as logger } from '../config/logger';

// Interface pour les attributs d'utilisateur
export interface UserAttributes {
  id?: number;
  username: string;
  password: string;
  email: string;
  name: string;
  role?: string;
  account_administrator?: boolean;
  account_active?: boolean;
  last_login?: Date | null;
  created_at?: Date;
  updated_at?: Date | null;
}

// Définition du modèle User
const User = sequelize.define('User', {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  username: {
    type: Sequelize.STRING(50),
    allowNull: false,
    unique: true
  },
  password: {
    type: Sequelize.STRING(255),
    allowNull: false,
    validate: {
      len: [8, 100]
    }
  },
  email: {
    type: Sequelize.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  name: {
    type: Sequelize.STRING(100),
    allowNull: false,
    defaultValue: 'Utilisateur' // Valeur par défaut
  },
  role: {
    type: Sequelize.STRING(20),
    defaultValue: 'user',
    allowNull: false
  },
  account_administrator: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  account_active: {
    type: Sequelize.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  last_login: {
    type: Sequelize.DATE,
    allowNull: true
  },
  created_at: {
    type: Sequelize.DATE,
    allowNull: false,
    defaultValue: Sequelize.NOW
  },
  updated_at: {
    type: Sequelize.DATE,
    allowNull: true
  }
}, {
  tableName: 'luma_users',
  timestamps: false, // Nous gérons manuellement les timestamps
  hooks: {
    beforeCreate: async (user: any) => {
      try {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
        user.created_at = new Date();
      } catch (error: any) {
        logger.error(`Erreur lors du hachage du mot de passe: ${error.message}`);
        throw new Error(error);
      }
    },
    beforeUpdate: async (user: any) => {
      if (user.changed('password')) {
        try {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        } catch (error: any) {
          logger.error(`Erreur lors du hachage du mot de passe: ${error.message}`);
          throw new Error(error);
        }
      }
      user.updated_at = new Date();
    }
  },
  indexes: [
    { name: 'idx_username', fields: ['username'] },
    { name: 'idx_email', fields: ['email'] },
    { name: 'idx_role', fields: ['role'] }
  ]
});

// Ajout des méthodes d'instance
const UserModel = User as any;

// Méthode pour comparer les mots de passe
UserModel.prototype.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error: any) {
    logger.error(`Erreur lors de la comparaison des mots de passe: ${error.message}`);
    return false;
  }
};

export default UserModel; 