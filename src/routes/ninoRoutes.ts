import { Router } from 'express';
import { protectNino } from '../middleware/ninoAuthMiddleware';
import { logger } from '../config/logger';
import NinoInstance from '../models/NinoInstance';

const router = Router();

// Lister toutes les instances Nino
router.get('/instances', protectNino, async (req, res) => {
  try {
    const instances = await NinoInstance.findAll({
      attributes: ['id', 'name', 'status', 'disk_space', 'memory_usage', 'last_sync', 'created_at']
    });

    res.json({
      success: true,
      instances
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des instances:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des instances'
    });
  }
});

// Vérifier la connexion à LUMA
router.get('/check-connection', protectNino, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Connexion établie',
      instance: {
        id: req.ninoInstance.id,
        name: req.ninoInstance.name,
        status: req.ninoInstance.status
      }
    });
  } catch (error) {
    logger.error('Erreur lors de la vérification de connexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification de connexion'
    });
  }
});

// Récupérer la configuration de l'instance
router.get('/instances/:id/config', protectNino, async (req, res) => {
  try {
    const instance = await NinoInstance.findByPk(req.params.id);
    if (!instance) {
      return res.status(404).json({
        success: false,
        message: 'Instance non trouvée'
      });
    }

    res.json({
      success: true,
      config: instance.config
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération de la configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la configuration'
    });
  }
});

// Envoyer le statut de l'instance
router.post('/instances/:id/status', protectNino, async (req, res) => {
  try {
    const { disk_space, memory_usage } = req.body;
    const instance = await NinoInstance.findByPk(req.params.id);

    if (!instance) {
      return res.status(404).json({
        success: false,
        message: 'Instance non trouvée'
      });
    }

    await instance.update({
      disk_space,
      memory_usage,
      last_sync: new Date()
    });

    res.json({
      success: true,
      message: 'Statut mis à jour'
    });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour du statut:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du statut'
    });
  }
});

// Synchroniser les métadonnées vidéo
router.post('/instances/:id/sync-videos', protectNino, async (req, res) => {
  try {
    const { videos } = req.body;
    // TODO: Implémenter la synchronisation des métadonnées
    res.json({
      success: true,
      message: 'Synchronisation en cours',
      processed: videos.length
    });
  } catch (error) {
    logger.error('Erreur lors de la synchronisation des vidéos:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la synchronisation des vidéos'
    });
  }
});

// Vérifier l'accès à une vidéo
router.get('/videos/:videoId/access-check', protectNino, async (req, res) => {
  try {
    const { userId } = req.query;
    // TODO: Implémenter la vérification d'accès
    res.json({
      success: true,
      hasAccess: true // À implémenter selon la logique d'accès
    });
  } catch (error) {
    logger.error('Erreur lors de la vérification d\'accès:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification d\'accès'
    });
  }
});

// Notifier qu'une vidéo est prête
router.post('/videos/:videoId/ready', protectNino, async (req, res) => {
  try {
    const { videoId } = req.params;
    // TODO: Implémenter la notification de disponibilité
    res.json({
      success: true,
      message: 'Vidéo marquée comme prête'
    });
  } catch (error) {
    logger.error('Erreur lors de la notification de disponibilité:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la notification de disponibilité'
    });
  }
});

// Récupérer la liste des séries
router.get('/series', protectNino, async (req, res) => {
  try {
    // TODO: Implémenter la récupération des séries
    res.json({
      success: true,
      series: []
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des séries:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des séries'
    });
  }
});

// Récupérer les saisons d'une série
router.get('/series/:seriesId/seasons', protectNino, async (req, res) => {
  try {
    const { seriesId } = req.params;
    // TODO: Implémenter la récupération des saisons
    res.json({
      success: true,
      seasons: []
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des saisons:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des saisons'
    });
  }
});

// Récupérer les épisodes d'une saison
router.get('/series/:seriesId/seasons/:seasonNumber/episodes', protectNino, async (req, res) => {
  try {
    const { seriesId, seasonNumber } = req.params;
    // TODO: Implémenter la récupération des épisodes
    res.json({
      success: true,
      episodes: []
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des épisodes:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des épisodes'
    });
  }
});

// Synchroniser une vidéo (appel unitaire)
router.post('/videos/sync', protectNino, async (req, res) => {
  try {
    const videoData = req.body;
    // TODO: Implémenter la synchronisation unitaire
    res.json({
      success: true,
      message: 'Vidéo synchronisée'
    });
  } catch (error) {
    logger.error('Erreur lors de la synchronisation de la vidéo:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la synchronisation de la vidéo'
    });
  }
});

export default router; 