import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/db';
import User from './User';

class UserToken extends Model {
  public id!: number;
  public user_id!: number;
  public token!: string;
  public jti!: string;
  public issued_at!: Date;
  public expires_at!: Date;
  public revoked!: number;
  public revoked_by!: number | null;
  public revoked_at!: Date | null;
  public device_info!: string | null;
  public ip_address!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

UserToken.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    token: {
      type: DataTypes.STRING(1024),
      allowNull: false
    },
    jti: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true
    },
    issued_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    revoked: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0
    },
    revoked_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null
    },
    revoked_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null
    },
    device_info: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
      defaultValue: null
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: 'luma_tokens',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: 'idx_user_tokens_user_id',
        fields: ['user_id']
      },
      {
        name: 'idx_user_tokens_jti',
        unique: true,
        fields: ['jti']
      }
    ]
  }
);

// Relations
UserToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

export default UserToken; 