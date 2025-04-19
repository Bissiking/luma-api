import { Request, Response } from 'express';
import { MonitoringAgent, MonitoringAgentConfig, MonitoringMetric } from '../models';
import { logger } from '../config/logger';
import { CONFIG } from '../config/api.config';
import { monitoringRateLimit } from '../config/rateLimit';
import MetricsService from '../services/MetricsService';

export const checkIn = async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { uuid } = req.params;
    const { version, ip_address } = req.body;

    logger.info(`Check-in de l'agent: ${uuid}`, { 
      version,
      ip_address 
    });

    const agent = await MonitoringAgent.findOne({
      where: { uuid }
    });

    if (!agent) {
      logger.warn('Agent non trouvé lors du check-in', { uuid });
      return res.status(404).json({
        success: false,
        message: 'Agent non trouvé'
      });
    }

    // Mettre à jour les informations de l'agent
    await agent.update({
      last_check_in: new Date(),
      status: 'active',
      ip_address: ip_address || req.ip,
      version
    });

    // Récupérer la configuration
    const config = await MonitoringAgentConfig.findOne({
      where: { agent_id: agent.id }
    });

    // Log uniquement 5% des check-ins réussis
    if (Math.random() < 0.05) {
      const responseTime = Date.now() - startTime;
      logger.debug('Check-in réussi', { 
        agentId: agent.id, 
        uuid, 
        responseTime 
      });
    }

    res.json({
      success: true,
      data: {
        config,
        next_check_in: config?.interval || 60
      }
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Erreur inconnue';
    const responseTime = Date.now() - startTime;
    logger.error('Erreur lors du check-in:', {
      error: errMsg,
      uuid: req.params.uuid,
      responseTime
    });
    res.status(500).json({
      success: false,
      message: 'Erreur lors du check-in'
    });
  }
};

export const updateMetrics = async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { uuid } = req.params;
    const { metrics } = req.body;

    logger.info(`Mise à jour des métriques pour l'agent: ${uuid}`, {
      metricsCount: Object.keys(metrics).length
    });

    const agent = await MonitoringAgent.findOne({
      where: { uuid }
    });

    if (!agent) {
      logger.warn('Agent non trouvé lors de la mise à jour des métriques', { uuid });
      return res.status(404).json({
        success: false,
        message: 'Agent non trouvé'
      });
    }

    // Timestamp commun pour toutes les métriques
    const timestamp = new Date();

    // Traiter et stocker chaque métrique
    const storedMetrics = [];
    for (const metricType in metrics) {
      const metricData = metrics[metricType];
      const metric = await MonitoringMetric.create({
        agent_id: agent.id,
        name: `${metricType}_usage`,
        value: metricData.usage,
        unit: '%',
        details: metricData,
        timestamp
      });
      storedMetrics.push(metric);
    }

    // Mettre à jour le dernier check-in
    await agent.update({
      last_check_in: new Date(),
      status: 'active'
    });

    // Log uniquement 2% des mises à jour réussies
    if (Math.random() < 0.02) {
      const responseTime = Date.now() - startTime;
      logger.info('Métriques mises à jour avec succès', {
        agentId: agent.id,
        uuid,
        metricsCount: storedMetrics.length,
        responseTime
      });
    }

    res.json({
      success: true,
      message: 'Métriques mises à jour avec succès',
      data: {
        metrics_count: storedMetrics.length
      }
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Erreur inconnue';
    const responseTime = Date.now() - startTime;
    logger.error('Erreur lors de la mise à jour des métriques:', {
      error: errMsg,
      uuid: req.params.uuid,
      responseTime
    });
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour des métriques'
    });
  }
};

export const updateGlobalMetrics = async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { uuid } = req.params;
    const metricsData = req.body;

    // Validation rapide des données
    if (!metricsData || typeof metricsData !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Format de métriques invalide'
      });
    }

    // Récupérer l'agent (avec cache si possible)
    const agent = await MonitoringAgent.findOne({
      where: { uuid },
      attributes: ['id', 'uuid', 'status']
    });

    if (!agent) {
      logger.warn('Agent non trouvé', { uuid });
      return res.status(404).json({
        success: false,
        message: 'Agent non trouvé'
      });
    }

    // Créer une seule entrée avec toutes les métriques
    const metric = await MonitoringMetric.create({
      agent_id: agent.id,
      agent_uuid: agent.uuid,
      metrics: metricsData,
      timestamp: new Date()
    });

    // Mise à jour du statut de l'agent
    await agent.update({
      last_check_in: new Date(),
      status: 'active'
    });

    const responseTime = Date.now() - startTime;
    logger.info('Métriques traitées avec succès', {
      uuid,
      responseTime,
      categories: Object.keys(metricsData)
    });

    // Réponse rapide
    res.json({
      success: true,
      data: {
        processed: Object.keys(metricsData).length,
        categories: Object.keys(metricsData),
        response_time: responseTime
      }
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('Erreur lors du traitement des métriques', {
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      uuid: req.params.uuid,
      responseTime,
      stack: error instanceof Error ? error.stack : undefined
    });

    res.status(500).json({
      success: false,
      message: 'Erreur lors du traitement des métriques',
      error: CONFIG.isDev ? (error instanceof Error ? error.message : 'Erreur inconnue') : undefined
    });
  }
}; 