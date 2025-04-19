import { Router } from 'express';
import { protect, requireAdmin } from '../middleware/authMiddleware';
import MonitoringAgent from '../models/MonitoringAgent';
import MonitoringAgentConfig from '../models/MonitoringAgentConfig';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { CONFIG } from '../config/api.config';
import { logger } from '../config/logger';
import MonitoringMetric from '../models/MonitoringMetric';
import MonitoringAlert from '../models/MonitoringAlert';
import { monitoringRateLimit } from '../config/rateLimit';
import sequelize from '../config/db';
import { QueryTypes } from 'sequelize';
import { updateGlobalMetrics } from '../controllers/agentController';

interface MetricData {
  cpu?: {
    usage?: number;
    cores?: number;
    temperature?: number;
  };
  memory?: {
    total?: number;
    used?: number;
    free?: number;
    usage?: number;
  };
  [key: string]: any;
}

const router = Router();

// Route pour récupérer la liste des agents
router.get('/agents', protect, async (req, res) => {
  try {
    const agents = await MonitoringAgent.findAll({
      where: req.user.role === 'admin' ? {} : { user_id: req.user.id },
      include: [
        {
          model: MonitoringAgentConfig,
          as: 'config'
        },
        {
          model: MonitoringMetric,
          as: 'metrics',
          attributes: ['metrics', 'timestamp'],
          order: [['timestamp', 'DESC']],
          limit: 1,
          required: false
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Formater les données pour inclure les métriques CPU et RAM
    const formattedAgents = agents.map(agent => {
      const latestMetrics = agent.metrics?.[0]?.metrics as MetricData || {};
      const cpuMetrics = latestMetrics.cpu || {};
      const memoryMetrics = latestMetrics.memory || {};

      return {
        ...agent.toJSON(),
        latest_metrics: {
          cpu: {
            usage: cpuMetrics.usage,
            cores: cpuMetrics.cores,
            temperature: cpuMetrics.temperature,
            timestamp: agent.metrics?.[0]?.timestamp
          },
          memory: {
            total: memoryMetrics.total,
            used: memoryMetrics.used,
            free: memoryMetrics.free,
            usage: memoryMetrics.usage,
            timestamp: agent.metrics?.[0]?.timestamp
          }
        }
      };
    });

    res.json({
      success: true,
      data: formattedAgents
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des agents:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des agents'
    });
  }
});

// Route pour l'enregistrement d'un nouvel agent
router.post('/agents/register', protect, async (req, res) => {
  try {
    const { name, description, type } = req.body;
    logger.info('Tentative d\'enregistrement d\'un nouvel agent', { 
      userId: req.user.id, 
      agentName: name, 
      agentType: type 
    });

    const uuid = uuidv4();
    const token = jwt.sign({ agent_uuid: uuid }, CONFIG.jwt.secret, {
      expiresIn: '1y',
    });

    const agent = await MonitoringAgent.create({
      user_id: req.user.id,
      name,
      description,
      type,
      uuid,
      token,
      status: 'inactive',
    });

    // Créer la configuration par défaut
    await MonitoringAgentConfig.create({
      agent_id: agent.id,
    });

    logger.info('Nouvel agent enregistré avec succès', { 
      agentId: agent.id, 
      uuid: agent.uuid 
    });

    res.status(201).json({
      success: true,
      data: agent,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Erreur inconnue';
    logger.error('Erreur lors de l\'enregistrement de l\'agent:', { 
      error: errMsg,
      userId: req.user?.id,
      body: req.body 
    });
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'enregistrement de l\'agent',
    });
  }
});

// Route pour le check-in de l'agent (avec limite de taux)
router.post('/agents/checkin', monitoringRateLimit.checkin, async (req, res) => {
  const startTime = Date.now();
  try {
    const { uuid } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.debug('Check-in échoué: Token manquant', { uuid });
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
      logger.warn('Check-in échoué: Agent non trouvé ou token invalide', { 
        uuid, 
        ip: req.ip 
      });
      return res.status(401).json({
        success: false,
        message: 'Agent non trouvé ou token invalide',
      });
    }

    await agent.update({
      last_check_in: new Date(),
      status: 'active',
      ip_address: req.ip,
    });

    const config = await MonitoringAgentConfig.findOne({
      where: { agent_id: agent.id },
    });

    // Log uniquement 5% des check-ins réussis pour éviter la surcharge
    if (Math.random() < 0.05) {
      const responseTime = Date.now() - startTime;
      logger.debug('Agent check-in réussi', { 
        agentId: agent.id, 
        uuid, 
        responseTime 
      });
    }

    res.json({
      success: true,
      data: {
        config,
        next_check_in: config?.interval || 60,
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Erreur inconnue';
    const responseTime = Date.now() - startTime;
    logger.error('Erreur lors du check-in de l\'agent:', { 
      error: errMsg, 
      uuid: req.body?.uuid,
      responseTime,
      ip: req.ip
    });
    res.status(500).json({
      success: false,
      message: 'Erreur lors du check-in',
    });
  }
});

// Route pour la mise à jour des métriques (avec limite de taux)
router.post('/metrics/update', monitoringRateLimit.metrics, async (req, res) => {
  const startTime = Date.now();
  try {
    const { uuid, metrics } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.debug('Mise à jour des métriques échouée: Token manquant', { 
        uuid 
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
      logger.warn('Mise à jour des métriques échouée: Agent non trouvé ou token invalide', { 
        uuid, 
        ip: req.ip 
      });
      return res.status(401).json({
        success: false,
        message: 'Agent non trouvé ou token invalide',
      });
    }

    // Récupérer la configuration de l'agent
    const config = await MonitoringAgentConfig.findOne({
      where: { agent_id: agent.id },
    });

    if (!config) {
      logger.error('Configuration de l\'agent introuvable', { 
        agentId: agent.id, 
        uuid 
      });
      return res.status(500).json({
        success: false,
        message: 'Configuration de l\'agent introuvable',
      });
    }

    // Timestamp commun pour toutes les métriques de cette mise à jour
    const timestamp = new Date();

    try {
      // Nouvelle méthode utilisant un seul enregistrement JSON
      
      // Créer l'enregistrement avec le format JSON
      await MonitoringMetric.create({
        agent_id: agent.id,
        agent_uuid: agent.uuid,
        metrics: metrics, // Stocke directement l'objet JSON
        timestamp,
        created_at: timestamp
      });
      
      logger.debug(`Métriques insérées avec succès pour l'agent ${agent.uuid}`);
      
      // Mettre à jour le dernier check-in de l'agent
      await agent.update({
        last_check_in: new Date(),
        status: 'active',
      });
      
      res.json({
        success: true,
        message: 'Métriques mises à jour avec succès',
        data: {
          metrics_count: 1,
          alerts_count: 0,
          next_check_in: config.interval || 60,
        },
      });
    } catch (insertError) {
      logger.error('Erreur lors de l\'insertion des métriques:', {
        error: insertError instanceof Error ? insertError.message : 'Erreur inconnue',
        stack: insertError instanceof Error ? insertError.stack : undefined,
        sql: insertError instanceof Error && 'sql' in insertError ? insertError.sql : 'SQL non disponible'
      });
      
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour des métriques',
        error: CONFIG.isDev ? (insertError instanceof Error ? insertError.message : 'Erreur inconnue') : undefined
      });
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Erreur inconnue';
    const responseTime = Date.now() - startTime;
    logger.error('Erreur lors de la mise à jour des métriques:', { 
      error: errMsg,
      uuid: req.body?.uuid,
      responseTime,
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour des métriques',
    });
  }
});

// Route pour créer un nouvel agent
router.post('/agents', protect, async (req, res) => {
  try {
    const { 
      name, 
      description, 
      type,
      // Configuration de l'agent
      interval = 60,
      log_level = 'INFO',
      cpu_collector_enabled = true,
      memory_collector_enabled = true,
      disk_collector_enabled = true,
      network_collector_enabled = true,
      docker_collector_enabled = false,
      web_service_collector_enabled = false,
      alerts_enabled = true,
      notification_email,
      notification_discord_webhook,
      notification_slack_webhook,
      windows_services,
      linux_services,
      docker_containers
    } = req.body;

    // Validation des données requises
    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: 'Le nom et le type de l\'agent sont requis'
      });
    }

    // Création de l'agent
    const agent = await MonitoringAgent.create({
      user_id: req.user.id,
      name,
      description,
      type,
      uuid: uuidv4(),
      token: jwt.sign({ agent_uuid: uuidv4() }, CONFIG.jwt.secret, {
        expiresIn: '1y',
      }),
      status: 'inactive'
    });

    // Création de la configuration
    await MonitoringAgentConfig.create({
      agent_id: agent.id,
      interval,
      log_level,
      cpu_collector_enabled,
      memory_collector_enabled,
      disk_collector_enabled,
      network_collector_enabled,
      docker_collector_enabled,
      web_service_collector_enabled,
      alerts_enabled,
      notification_email,
      notification_discord_webhook,
      notification_slack_webhook,
      windows_services,
      linux_services,
      docker_containers
    });

    logger.info('Nouvel agent créé avec succès', {
      agentId: agent.id,
      userId: req.user.id
    });

    res.status(201).json({
      success: true,
      data: agent
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Erreur inconnue';
    logger.error('Erreur lors de la création de l\'agent:', {
      error: errMsg,
      userId: req.user?.id
    });
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'agent'
    });
  }
});

// Route pour mettre à jour la configuration d'un agent
router.put('/agents/:id/config', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const agent = await MonitoringAgent.findOne({
      where: {
        id,
        ...(req.user.role !== 'admin' ? { user_id: req.user.id } : {}),
      },
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent non trouvé',
      });
    }

    const config = await MonitoringAgentConfig.findOne({
      where: { agent_id: id },
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Configuration non trouvée',
      });
    }

    await config.update(req.body);

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de la configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la configuration',
    });
  }
});

// Route pour supprimer un agent
router.delete('/agents/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`Tentative de suppression de l'agent: ${id}`, { userId: req.user.id });
    
    // Vérifier si l'agent existe et appartient à l'utilisateur
    const agent = await MonitoringAgent.findOne({
      where: {
        id,
        ...(req.user.role !== 'admin' ? { user_id: req.user.id } : {}),
      },
    });

    if (!agent) {
      logger.warn(`Agent non trouvé pour la suppression: ${id}`, { userId: req.user.id });
      return res.status(404).json({
        success: false,
        message: 'Agent non trouvé',
      });
    }

    // Supprimer d'abord les configurations associées
    await MonitoringAgentConfig.destroy({
      where: { agent_id: id }
    });
    logger.info(`Configuration de l'agent ${id} supprimée`, { userId: req.user.id });

    // Supprimer les métriques associées
    try {
      await MonitoringMetric.destroy({
        where: { agent_id: id }
      });
      logger.info(`Métriques de l'agent ${id} supprimées`, { userId: req.user.id });
    } catch (metricError) {
      // Ne pas bloquer la suppression si les métriques ne peuvent pas être supprimées
      logger.warn(`Erreur lors de la suppression des métriques de l'agent ${id}`, { 
        error: metricError instanceof Error ? metricError.message : 'Erreur inconnue',
        userId: req.user.id 
      });
    }

    // Supprimer les alertes associées
    try {
      await MonitoringAlert.destroy({
        where: { agent_id: id }
      });
      logger.info(`Alertes de l'agent ${id} supprimées`, { userId: req.user.id });
    } catch (alertError) {
      // Ne pas bloquer la suppression si les alertes ne peuvent pas être supprimées
      logger.warn(`Erreur lors de la suppression des alertes de l'agent ${id}`, { 
        error: alertError instanceof Error ? alertError.message : 'Erreur inconnue',
        userId: req.user.id 
      });
    }

    // Supprimer l'agent
    await agent.destroy();
    logger.info(`Agent ${id} supprimé avec succès`, { userId: req.user.id });

    res.json({
      success: true,
      message: 'Agent supprimé avec succès',
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Erreur inconnue';
    logger.error('Erreur lors de la suppression de l\'agent:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de l\'agent',
      error: CONFIG.isDev ? errMsg : undefined
    });
  }
});

// Route pour récupérer un agent par son UUID
router.get('/agents/:uuid', protect, async (req, res) => {
  try {
    const { uuid } = req.params;
    logger.info(`uuid: ${uuid}`);
    logger.info(`Tentative de récupération de l'agent par UUID: ${uuid}`, { userId: req.user.id });

    const agent = await MonitoringAgent.findOne({
      where: {
        uuid,
        ...(req.user.role !== 'admin' ? { user_id: req.user.id } : {}),
      },
      include: [{
        model: MonitoringAgentConfig,
        as: 'config'
      }]
    });

    if (!agent) {
      logger.warn(`Agent non trouvé pour l'UUID: ${uuid}`, { userId: req.user.id });
      return res.status(404).json({
        success: false,
        message: 'Agent non trouvé'
      });
    }

    logger.info(`Agent trouvé pour l'UUID: ${uuid}`, { 
      agentId: agent.id,
      userId: req.user.id 
    });

    res.json({
      success: true,
      data: agent
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Erreur inconnue';
    logger.error('Erreur lors de la récupération de l\'agent par UUID:', {
      error: errMsg,
      uuid: req.params.uuid,
      userId: req.user?.id
    });
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'agent',
      error: CONFIG.isDev ? errMsg : undefined
    });
  }
});

// Route pour mettre à jour la configuration d'un agent par son UUID
router.put('/agents/:uuid/configuration', protect, async (req, res) => {
  try {
    const { uuid } = req.params;
    const {
      interval,
      log_level,
      alerts_enabled,
      cpu_collector_enabled,
      cpu_critical_threshold,
      cpu_warning_threshold,
      disk_collector_enabled,
      disk_critical_threshold,
      disk_warning_threshold,
      docker_collector_enabled,
      docker_critical_threshold,
      docker_warning_threshold,
      memory_collector_enabled,
      memory_critical_threshold,
      memory_warning_threshold,
      network_collector_enabled,
      network_critical_threshold,
      network_warning_threshold,
      notification_discord_webhook,
      notification_email,
      notification_slack_webhook
    } = req.body;

    logger.info(`Tentative de mise à jour de la configuration pour l'agent: ${uuid}`, { 
      userId: req.user.id,
      configuration: req.body 
    });

    // Récupérer l'agent
    const agent = await MonitoringAgent.findOne({
      where: {
        uuid,
        ...(req.user.role !== 'admin' ? { user_id: req.user.id } : {})
      }
    });

    if (!agent) {
      logger.warn(`Agent non trouvé pour l'UUID: ${uuid}`, { userId: req.user.id });
      return res.status(404).json({
        success: false,
        message: 'Agent non trouvé'
      });
    }

    // Récupérer la configuration existante
    const config = await MonitoringAgentConfig.findOne({
      where: { agent_id: agent.id }
    });

    if (!config) {
      logger.error(`Configuration non trouvée pour l'agent: ${uuid}`, { 
        agentId: agent.id,
        userId: req.user.id 
      });
      return res.status(500).json({
        success: false,
        message: 'Configuration non trouvée'
      });
    }

    // Mettre à jour la configuration
    await config.update({
      interval,
      log_level,
      alerts_enabled,
      cpu_collector_enabled,
      cpu_critical_threshold,
      cpu_warning_threshold,
      disk_collector_enabled,
      disk_critical_threshold,
      disk_warning_threshold,
      docker_collector_enabled,
      docker_critical_threshold,
      docker_warning_threshold,
      memory_collector_enabled,
      memory_critical_threshold,
      memory_warning_threshold,
      network_collector_enabled,
      network_critical_threshold,
      network_warning_threshold,
      notification_discord_webhook,
      notification_email,
      notification_slack_webhook
    });

    logger.info(`Configuration mise à jour avec succès pour l'agent: ${uuid}`, { 
      agentId: agent.id,
      userId: req.user.id 
    });

    res.json({
      success: true,
      message: 'Configuration mise à jour avec succès',
      data: config
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Erreur inconnue';
    logger.error('Erreur lors de la mise à jour de la configuration:', {
      error: errMsg,
      uuid: req.params.uuid,
      userId: req.user?.id
    });
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la configuration',
      error: CONFIG.isDev ? errMsg : undefined
    });
  }
});

// Route pour récupérer les métriques d'un agent par son UUID
router.get('/agents/:uuid/metrics', protect, async (req, res) => {
  try {
    const { uuid } = req.params;
    const { limit = 100, offset = 0 } = req.query;
    
    logger.info(`Tentative de récupération des métriques pour l'agent: ${uuid}`, { 
      userId: req.user.id,
      limit,
      offset
    });

    // Vérifier que l'agent existe et appartient à l'utilisateur
    const agent = await MonitoringAgent.findOne({
      where: { 
        uuid,
        ...(req.user.role !== 'admin' ? { user_id: req.user.id } : {})
      }
    });

    if (!agent) {
      logger.warn(`Agent non trouvé pour l'UUID: ${uuid}`, { userId: req.user.id });
      return res.status(404).json({
        success: false,
        message: 'Agent non trouvé'
      });
    }

    // Récupérer les métriques avec le nouveau format JSON
    const metrics = await MonitoringMetric.findAll({
      where: { agent_uuid: uuid },
      attributes: ['id', 'agent_id', 'agent_uuid', 'metrics', 'timestamp', 'created_at'],
      order: [['timestamp', 'DESC']],
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });

    // Récupérer le nombre total de métriques
    const total = await MonitoringMetric.count({ where: { agent_uuid: uuid } });

    logger.info(`Métriques récupérées avec succès pour l'agent: ${uuid}`, { 
      agentId: agent.id,
      count: metrics.length,
      total,
      userId: req.user.id 
    });

    res.json({
      success: true,
      data: metrics,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des métriques:', {
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      uuid: req.params.uuid,
      userId: req.user?.id,
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des métriques'
    });
  }
});

// Route pour les health checks des agents
router.post('/agents/:uuid/health', monitoringRateLimit.checkin, async (req, res) => {
  try {
    const { uuid } = req.params;
    const { status, version, metrics } = req.body;

    logger.info(`Health check de l'agent: ${uuid}`, { 
      status,
      version,
      metricsCount: metrics ? Object.keys(metrics).length : 0
    });

    const agent = await MonitoringAgent.findOne({
      where: { uuid }
    });

    if (!agent) {
      logger.warn('Agent non trouvé lors du health check', { uuid });
      return res.status(404).json({
        success: false,
        message: 'Agent non trouvé'
      });
    }

    // Mettre à jour le statut de l'agent
    await agent.update({
      last_check_in: new Date(),
      status: status || 'active',
      version: version || agent.version
    });

    res.json({
      success: true,
      message: 'Health check enregistré avec succès',
      data: {
        status: agent.status,
        next_check_in: 60 // intervalle par défaut
      }
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Erreur inconnue';
    logger.error('Erreur lors du health check:', {
      error: errMsg,
      uuid: req.params.uuid
    });
    res.status(500).json({
      success: false,
      message: 'Erreur lors du health check'
    });
  }
});

// Route pour récupérer la configuration d'un agent
router.get('/agents/:uuid/configuration', protect, async (req, res) => {
  try {
    const { uuid } = req.params;
    logger.info(`Récupération de la configuration de l'agent: ${uuid}`);

    const agent = await MonitoringAgent.findOne({
      where: {
        uuid,
        ...(req.user.role !== 'admin' ? { user_id: req.user.id } : {})
      },
      include: [{
        model: MonitoringAgentConfig,
        as: 'config',
        required: true
      }]
    });

    if (!agent) {
      logger.warn(`Agent non trouvé: ${uuid}`);
      return res.status(404).json({
        success: false,
        message: 'Agent non trouvé'
      });
    }

    res.json({
      success: true,
      data: agent.config
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération de la configuration:', {
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      uuid: req.params.uuid
    });
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la configuration'
    });
  }
});

// Route pour récupérer les services d'un agent
router.get('/agents/:uuid/services', protect, async (req, res) => {
  try {
    const { uuid } = req.params;
    logger.info(`Récupération des services de l'agent: ${uuid}`);

    const agent = await MonitoringAgent.findOne({
      where: {
        uuid,
        ...(req.user.role !== 'admin' ? { user_id: req.user.id } : {})
      }
    });

    if (!agent) {
      logger.warn(`Agent non trouvé: ${uuid}`);
      return res.status(404).json({
        success: false,
        message: 'Agent non trouvé'
      });
    }

    // Récupérer les services monitorés
    const services = await import('../models/MonitoringService').then(module => 
      module.default.findAll({
        where: { agent_id: agent.id },
        order: [['name', 'ASC']]
      })
    );

    res.json({
      success: true,
      data: services
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des services:', {
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      uuid: req.params.uuid
    });
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des services'
    });
  }
});

// Route pour récupérer les alertes d'un agent
router.get('/agents/:uuid/alerts', protect, async (req, res) => {
  try {
    const { uuid } = req.params;
    const { status, limit = 100, offset = 0 } = req.query;
    
    logger.info(`Récupération des alertes de l'agent: ${uuid}`, {
      status,
      limit,
      offset
    });

    const agent = await MonitoringAgent.findOne({
      where: {
        uuid,
        ...(req.user.role !== 'admin' ? { user_id: req.user.id } : {})
      }
    });

    if (!agent) {
      logger.warn(`Agent non trouvé: ${uuid}`);
      return res.status(404).json({
        success: false,
        message: 'Agent non trouvé'
      });
    }

    // Construire la condition where
    const where: any = { agent_id: agent.id };
    if (status) {
      where.status = status;
    }

    // Récupérer les alertes
    const [alerts, total] = await Promise.all([
      MonitoringAlert.findAll({
        where,
        order: [['created_at', 'DESC']],
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }),
      MonitoringAlert.count({ where })
    ]);

    res.json({
      success: true,
      data: alerts,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des alertes:', {
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      uuid: req.params.uuid
    });
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des alertes'
    });
  }
});

// Route pour marquer une alerte comme résolue
router.put('/agents/:uuid/alerts/:alertId/resolve', protect, async (req, res) => {
  try {
    const { uuid, alertId } = req.params;
    const { resolution_note } = req.body;

    logger.info(`Résolution de l'alerte ${alertId} pour l'agent: ${uuid}`);

    const agent = await MonitoringAgent.findOne({
      where: {
        uuid,
        ...(req.user.role !== 'admin' ? { user_id: req.user.id } : {})
      }
    });

    if (!agent) {
      logger.warn(`Agent non trouvé: ${uuid}`);
      return res.status(404).json({
        success: false,
        message: 'Agent non trouvé'
      });
    }

    const alert = await MonitoringAlert.findOne({
      where: {
        id: alertId,
        agent_id: agent.id,
        status: 'active'
      }
    });

    if (!alert) {
      logger.warn(`Alerte non trouvée ou déjà résolue: ${alertId}`);
      return res.status(404).json({
        success: false,
        message: 'Alerte non trouvée ou déjà résolue'
      });
    }

    // Marquer l'alerte comme résolue
    await alert.update({
      status: 'resolved',
      resolved_at: new Date(),
      resolved_by: req.user.id,
      resolution_note
    });

    res.json({
      success: true,
      message: 'Alerte marquée comme résolue',
      data: alert
    });
  } catch (error) {
    logger.error('Erreur lors de la résolution de l\'alerte:', {
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      uuid: req.params.uuid,
      alertId: req.params.alertId
    });
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la résolution de l\'alerte'
    });
  }
});

// Route temporaire pour contourner le problème d'agent_uuid
router.post('/metrics/:uuid/update', monitoringRateLimit.metrics, async (req, res) => {
  const startTime = Date.now();
  try {
    const { uuid } = req.params; // Récupérer l'UUID depuis l'URL
    const metrics = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.debug('Mise à jour des métriques échouée: Token manquant', { uuid });
      return res.status(401).json({
        success: false,
        message: 'Token d\'authentification manquant',
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Rechercher l'agent par UUID
    const agent = await MonitoringAgent.findOne({
      where: { uuid, token },
    });

    if (!agent) {
      logger.warn('Mise à jour des métriques échouée: Agent non trouvé ou token invalide', { 
        uuid, 
        ip: req.ip 
      });
      return res.status(401).json({
        success: false,
        message: 'Agent non trouvé ou token invalide',
      });
    }

    // Récupérer la configuration de l'agent
    const config = await MonitoringAgentConfig.findOne({
      where: { agent_id: agent.id },
    });

    if (!config) {
      logger.error('Configuration de l\'agent introuvable', { agentId: agent.id, uuid });
      return res.status(500).json({
        success: false,
        message: 'Configuration de l\'agent introuvable',
      });
    }

    // Timestamp commun pour toutes les métriques
    const timestamp = new Date();

    try {
      // Utiliser le modèle MonitoringMetric directement avec le nouveau format JSON
      await MonitoringMetric.create({
        agent_id: agent.id,
        agent_uuid: uuid,
        metrics: metrics,
        timestamp,
        created_at: timestamp
      });
      
      logger.info(`Métriques insérées avec succès pour l'agent ${uuid}`);
      
      // Mettre à jour le dernier check-in de l'agent
      await agent.update({
        last_check_in: new Date(),
        status: 'active',
      });
      
      res.json({
        success: true,
        message: 'Métriques mises à jour avec succès',
        data: {
          metrics_count: 1,
          next_check_in: config.interval,
        },
      });
    } catch (insertError) {
      logger.error('Erreur lors de l\'insertion des métriques:', {
        error: insertError instanceof Error ? insertError.message : 'Erreur inconnue',
        stack: insertError instanceof Error ? insertError.stack : undefined,
        sql: insertError instanceof Error && 'sql' in insertError ? insertError.sql : 'SQL non disponible'
      });
       
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour des métriques',
        error: CONFIG.isDev ? (insertError instanceof Error ? insertError.message : 'Erreur inconnue') : undefined
      });
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Erreur inconnue';
    logger.error('Erreur lors de la mise à jour des métriques:', { 
      error: errMsg,
      uuid: req.params.uuid,
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour des métriques',
    });
  }
});

// Route pour la mise à jour des métriques globales d'un agent
router.post('/agents/:uuid/metrics/global', monitoringRateLimit.metrics, updateGlobalMetrics);

export default router; 