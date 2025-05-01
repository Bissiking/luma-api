import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/db';
import Group from './Group';
import Permission from './Permission';

// Interface pour les attributs de liaison groupe-permission
export interface GroupPermissionAttributes {
  group_id: number;
  permission_id: number;
}

// Définition du modèle GroupPermission
class GroupPermission extends Model<GroupPermissionAttributes> {
  public group_id!: number;
  public permission_id!: number;
}

GroupPermission.init(
  {
    group_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'luma_groups',
        key: 'id'
      }
    },
    permission_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'luma_permissions',
        key: 'id'
      }
    }
  },
  {
    sequelize,
    tableName: 'group_permissions',
    timestamps: false
  }
);

// Définir les associations
Group.belongsToMany(Permission, { 
  through: GroupPermission,
  foreignKey: 'group_id',
  otherKey: 'permission_id',
  as: 'permissions'
});

Permission.belongsToMany(Group, { 
  through: GroupPermission,
  foreignKey: 'permission_id',
  otherKey: 'group_id',
  as: 'groups'
});

export default GroupPermission; 