import { Router } from 'express';
import { protect, requestLogger } from '../middleware/authMiddleware';
import UserGroup from '../models/UserGroup';
import User from '../models/User';
import { logger } from '../config/logger';
import { logUserActivity } from '../utils/activityLogger';

const router = Router();

// Récupérer tous les groupes
router.get('/', requestLogger, protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // Récupérer tous les groupes
    const groups = await UserGroup.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'name']
        },
        {
          model: User,
          as: 'addedBy',
          attributes: ['id', 'username', 'name']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Journaliser l'activité
    await logUserActivity(
      userId,
      'group_list' as const,
      'Liste des groupes récupérée',
      {
        module: 'groups' as const,
        resource_type: 'user_group',
        details: {
          count: groups.length
        },
        req,
        status: 'success' as const
      }
    );

    res.json({
      success: true,
      data: groups
    });
  } catch (error: any) {
    logger.error(`Erreur lors de la récupération des groupes: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des groupes',
      error: error.message
    });
  }
});

// Récupérer un groupe spécifique
router.get('/:id', requestLogger, protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const groupId = parseInt(req.params.id);

    // Récupérer le groupe
    const group = await UserGroup.findOne({
      where: { id: groupId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'name']
        },
        {
          model: User,
          as: 'addedBy',
          attributes: ['id', 'username', 'name']
        }
      ]
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Groupe non trouvé'
      });
    }

    // Journaliser l'activité
    await logUserActivity(
      userId,
      'group_view',
      `Groupe #${groupId} consulté`,
      {
        module: 'groups',
        resource_type: 'user_group',
        resource_id: groupId.toString(),
        req
      }
    );

    res.json({
      success: true,
      data: group
    });
  } catch (error: any) {
    logger.error(`Erreur lors de la récupération du groupe: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du groupe',
      error: error.message
    });
  }
});

// Route pour créer une affectation utilisateur-groupe ou un groupe
router.post('/', requestLogger, protect, async (req, res) => {
  try {
    const actingUserId = req.user.id;
    const { name, description, permissions, user_id, group_id, role } = req.body;

    // Création de groupe
    if (name) {
      logger.info('Création de groupe:', { name, description, permissions });
      return res.status(201).json({ success: true, data: { name, description, permissions } });
    }

    // Affectation utilisateur-groupe
    if (!user_id || !group_id) {
      return res.status(400).json({ success: false, message: 'user_id et group_id sont requis' });
    }
    const newUserGroup = await UserGroup.create({
      user_id,
      group_id,
      role: role || 'member',
      added_by: actingUserId
    } as any);

    // Journaliser l'activité d'affectation
    await logUserActivity(
      actingUserId,
      'group_create' as const,
      `Utilisateur ${user_id} ajouté au groupe ${group_id}`,
      {
        module: 'groups' as const,
        resource_type: 'user_group',
        resource_id: newUserGroup.id.toString(),
        details: { user_id, group_id, role: newUserGroup.role },
        req,
        status: 'success' as const
      }
    );

    res.status(201).json({ success: true, data: newUserGroup });
  } catch (error: any) {
    logger.error(`Erreur lors du traitement de la requête de groupe: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création ou de l\'affectation de groupe',
      error: error.message
    });
  }
});

export default router; 