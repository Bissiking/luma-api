import { Router } from 'express';
import MonitoringMetric from '../models/MonitoringMetric';
import MonitoringAgent from '../models/MonitoringAgent';
import { logger } from '../config/logger';
import { protectAgent } from '../middleware/authMiddleware';
import { Op } from 'sequelize';
import { MonitoringMetric as MonitoringMetricType } from '../types/monitoring';
import { ARKOS_CONFIG } from '../config/arkos.config';
import { protect } from '../middleware/authMiddleware';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const router = Router();

/**
 * Route pour récupérer les credentials d'ARKOS
 * Nécessite une authentification admin
 */
router.get('/credentials', protect, (req, res) => {
  // Vérifier si l'utilisateur est admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Accès non autorisé. Droits d\'administrateur requis.'
    });
  }

  // Générer une API key et un token simples
  const apiKey = uuidv4();
  const token = crypto.randomBytes(32).toString('hex');

  return res.json({
    success: true,
    data: {
      api_key: apiKey,
      token
    }
  });
});

/**
 * Route optimisée pour récupérer les métriques des agents
 */
router.get('/metrics', protectAgent, async (req, res) => {
  try {
    // Vérifier si l'agent est bien ARKOS
    if (req.agent?.name !== 'ARKOS') {
      return res.status(403).json({ 
        error: 'Accès non autorisé. Cette route est réservée à ARKOS.' 
      });
    }

    // Récupérer les paramètres de pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(
      parseInt(req.query.limit as string) || ARKOS_CONFIG.pagination.defaultLimit,
      ARKOS_CONFIG.pagination.maxLimit
    );
    const offset = (page - 1) * limit;

    // Récupérer l'intervalle de temps
    const timeRange = parseInt(req.query.timeRange as string) || ARKOS_CONFIG.queries.defaultTimeRange;
    const startTime = new Date(Date.now() - timeRange);

    // Requête optimisée avec sous-requête
    const metrics = await MonitoringMetric.findAll({
      where: {
        created_at: {
          [Op.gte]: startTime
        }
      },
      attributes: [
        'id',
        'agent_id',
        'agent_uuid',
        'metrics',
        'timestamp',
        'created_at'
      ],
      include: [{
        model: MonitoringAgent,
        attributes: ['id', 'name', 'uuid'],
        required: true
      }],
      order: [['created_at', 'DESC']],
      limit,
      offset,
      subQuery: true // Optimisation avec sous-requête
    });

    // Formater les données
    const formattedMetrics = metrics.map((metric: MonitoringMetricType) => ({
      id: metric.id,
      agent: {
        id: metric.agent?.id,
        name: metric.agent?.name,
        uuid: metric.agent?.uuid
      },
      metrics: metric.metrics,
      timestamp: metric.timestamp,
      created_at: metric.created_at
    }));

    const response = {
      success: true,
      data: formattedMetrics,
      pagination: {
        page,
        limit,
        total: await MonitoringMetric.count({
          where: {
            created_at: {
              [Op.gte]: startTime
            }
          }
        })
      }
    };

    res.json(response);

  } catch (error) {
    logger.error('Erreur lors de la récupération des métriques pour ARKOS:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des métriques' 
    });
  }
});

export default router; 