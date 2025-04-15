import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import UserActivity from '../models/UserActivity';
import User from '../models/User';
import { logger } from '../config/logger';

const router = Router();

// Route pour obtenir les activités récentes d'un utilisateur spécifique
router.get('/user/:userId', protect, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const limit = parseInt(req.query.limit as string) || 5;
    const offset = parseInt(req.query.offset as string) || 0;

    logger.info(`Tentative de récupération des activités pour l'utilisateur ID: ${userId}`);

    // Vérifier si l'utilisateur existe
    const user = await User.findByPk(userId);
    if (!user) {
      logger.warn(`Tentative d'accès aux activités d'un utilisateur inexistant: ${userId}`);
      res.status(404).json({ 
        message: 'Utilisateur non trouvé',
        details: `Aucun utilisateur trouvé avec l'ID: ${userId}`
      });
      return;
    }

    logger.info(`Utilisateur trouvé: ${user.username} (ID: ${user.id})`);

    const activities = await UserActivity.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit,
      offset,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'name']
      }]
    });

    logger.info(`Nombre d'activités trouvées pour l'utilisateur ${user.username}: ${activities.length}`);

    res.json({
      success: true,
      message: 'Activités récentes de l\'utilisateur récupérées avec succès',
      user: {
        id: user.id,
        username: user.username
      },
      activities
    });
  } catch (error: any) {
    logger.error(`Erreur lors de la récupération des activités de l'utilisateur: ${error.message}`);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la récupération des activités', 
      error: error.message,
      details: 'Veuillez vérifier que l\'ID de l\'utilisateur est correct'
    });
  }
});

// Route pour obtenir les activités récentes
router.get('/recent', protect, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    const offset = parseInt(req.query.offset as string) || 0;

    const activities = await UserActivity.findAll({
      order: [['created_at', 'DESC']],
      limit,
      offset,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'name']
      }]
    });

    res.json({
      success: true,
      message: 'Activités récentes récupérées avec succès',
      activities
    });
  } catch (error: any) {
    logger.error(`Erreur lors de la récupération des activités récentes: ${error.message}`);
    res.status(500).json({ message: 'Erreur lors de la récupération des activités récentes', error: error.message });
  }
});

export default router; 