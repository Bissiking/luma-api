import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import MonitoringAgent from '../models/MonitoringAgent';
import MonitoringAlert from '../models/MonitoringAlert';
import { logger } from '../config/logger';
import { monitoringRateLimit } from '../config/rateLimit';

const router = Router();

// Route pour créer une alerte (avec limite de taux)
router.post('/create', monitoringRateLimit.alerts, async (req, res) => {
  const startTime = Date.now();
  try {
    const { uuid, alert_type, message, value, threshold, unit, metadata, tags } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.debug('Création d\'alerte échouée: Token manquant', { 
        uuid, 
        alert_type
      });
      return res.status(401).json({
        success: false,
        message: 'Token d\'authentification manquant',
      });
    }

    const token = authHeader.split(' ')[1];
    const agent = await MonitoringAgent.findOne({
      where: { uuid, token },
    });

    if (!agent) {
      logger.warn('Création d\'alerte échouée: Agent non trouvé ou token invalide', { 
        uuid, 
        ip: req.ip 
      });
      return res.status(401).json({
        success: false,
        message: 'Agent non trouvé ou token invalide',
      });
    }

    // Créer l'alerte
    const alert = await MonitoringAlert.create({
      agent_id: agent.id,
      alert_type,
      message,
      value,
      threshold,
      unit,
      metadata,
      tags,
      status: 'active',
      acknowledged: false
    });

    // TODO: Implémenter les notifications (email, Discord, Slack)

    // Log avec niveau adapté selon la sévérité de l'alerte
    const logLevel = alert_type === 'critical' ? 'error' : 'warn';
    logger[logLevel](`Nouvelle alerte ${alert_type} créée`, {
      alertId: alert.id,
      agentId: agent.id,
      uuid,
      alert_type,
      responseTime: Date.now() - startTime
    });

    res.status(201).json({
      success: true,
      message: 'Alerte créée avec succès',
      data: alert,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Erreur inconnue';
    const responseTime = Date.now() - startTime;
    logger.error('Erreur lors de la création de l\'alerte:', { 
      error: errMsg, 
      uuid: req.body?.uuid,
      alert_type: req.body?.alert_type,
      responseTime,
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'alerte',
    });
  }
});

// Route pour marquer une alerte comme résolue
router.put('/:id/resolve', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const alert = await MonitoringAlert.findByPk(id);
    
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alerte non trouvée',
      });
    }

    // Vérifier que l'utilisateur a accès à cette alerte
    const agent = await MonitoringAgent.findByPk(alert.agent_id);
    if (!agent || (req.user.role !== 'admin' && agent.user_id !== req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à cette alerte',
      });
    }

    await alert.update({
      status: 'resolved',
      resolved_at: new Date(),
      resolved_by: req.user.id
    });

    res.json({
      success: true,
      message: 'Alerte marquée comme résolue',
      data: alert,
    });
  } catch (error) {
    logger.error('Erreur lors de la résolution de l\'alerte:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la résolution de l\'alerte',
    });
  }
});

// Route pour récupérer les statistiques d'alertes
router.get('/stats', protect, async (req, res) => {
  try {
    // Requête pour obtenir le compte des alertes par niveau et statut
    const stats = {
      total: await MonitoringAlert.count(),
      critical: await MonitoringAlert.count({
        where: { alert_type: 'critical' },
      }),
      warning: await MonitoringAlert.count({
        where: { alert_type: 'warning' },
      }),
      active: await MonitoringAlert.count({
        where: { status: 'active' },
      }),
      acknowledged: await MonitoringAlert.count({
        where: { status: 'acknowledged' },
      }),
      resolved: await MonitoringAlert.count({
        where: { status: 'resolved' },
      }),
      escalated: await MonitoringAlert.count({
        where: { status: 'escalated' },
      })
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
    });
  }
});

export default router; 