import { logger } from '../config/logger';
import User from '../models/User';
import Group from '../models/Group';
import Permission from '../models/Permission';
import UserGroup from '../models/UserGroup';

// Interface pour les objets de type Group avec la relation users
interface GroupWithUsers extends Group {
  users?: Array<User & { UserGroup?: UserGroup }>;
}

// Interface pour les objets de type User avec la relation groups
interface UserWithGroups extends User {
  groups?: Array<GroupWithPermissions>;
}

// Interface pour les objets de type Group avec la relation permissions
interface GroupWithPermissions extends Group {
  permissions?: Array<Permission>;
}

/**
 * Service de gestion des autorisations utilisateur
 */
class AuthorizationService {
  /**
   * Récupère les groupes d'un utilisateur
   */
  public async getUserGroups(userId: number): Promise<any[]> {
    try {
      const groups = await Group.findAll({
        include: [
          {
            model: User,
            as: 'users',
            where: { id: userId },
            attributes: [],
            through: { attributes: ['role'] }
          }
        ]
      }) as unknown as GroupWithUsers[];

      return groups.map(group => ({
        id: group.id,
        name: group.name,
        description: group.description,
        color: group.color,
        role: group.users?.[0]?.UserGroup?.role || 'member'
      }));
    } catch (error) {
      logger.error('Erreur lors de la récupération des groupes utilisateur', error);
      return [];
    }
  }

  /**
   * Récupère les permissions d'un utilisateur via ses groupes
   */
  public async getUserPermissions(userId: number): Promise<any[]> {
    try {
      const user = await User.findByPk(userId, {
        include: [
          {
            model: Group,
            as: 'groups',
            include: [
              {
                model: Permission,
                as: 'permissions'
              }
            ]
          }
        ]
      }) as unknown as UserWithGroups;

      if (!user) {
        return [];
      }

      const permissions = new Map<number, any>();
      
      // Parcourir tous les groupes de l'utilisateur
      user.groups?.forEach(group => {
        // Parcourir toutes les permissions du groupe
        group.permissions?.forEach((permission: Permission) => {
          // Utiliser Map pour éviter les doublons par ID
          permissions.set(permission.id, {
            id: permission.id,
            name: permission.name,
            description: permission.description,
            module: permission.module
          });
        });
      });

      // Convertir la Map en tableau
      return Array.from(permissions.values());
    } catch (error) {
      logger.error('Erreur lors de la récupération des permissions utilisateur', error);
      return [];
    }
  }

  /**
   * Récupère toutes les informations d'autorisation d'un utilisateur (groupes et permissions)
   */
  public async getUserAuthorizations(userId: number): Promise<{
    groups: any[];
    permissions: any[];
  }> {
    const [groups, permissions] = await Promise.all([
      this.getUserGroups(userId),
      this.getUserPermissions(userId)
    ]);

    return { groups, permissions };
  }
}

export default new AuthorizationService(); 