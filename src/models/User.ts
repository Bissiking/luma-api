import { Model, DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs';
import sequelize from '../config/db';
import { logger } from '../config/logger';

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

class User extends Model {
  public id!: number;
  public username!: string;
  public email!: string;
  public password!: string;
  public name!: string;
  public role!: string;
  public account_active!: boolean;
  public account_administrator!: boolean;
  public last_login!: Date;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  
  // Propriétés virtuelles non persistantes
  public device_info?: string;
  public ip_address?: string;

  // Déclarer la méthode comparePassword
  public async comparePassword(candidatePassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(candidatePassword, this.password);
    } catch (error: any) {
      logger.error(`Erreur lors de la comparaison des mots de passe: ${error.message}`);
      return false;
    }
  }
}

User.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  role: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'user'
  },
  account_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  account_administrator: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'User',
  tableName: 'luma_users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['username'] },
    { fields: ['email'] },
    { fields: ['role'] }
  ],
  hooks: {
    beforeCreate: async (user: User) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user: User) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

export default User; 