import rateLimit from 'express-rate-limit';
import { logger } from './logger';

// Configuration de base pour la limite de taux
export const baseRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Maximum 100 requêtes par IP dans la fenêtre
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Limite de taux dépassée', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get('user-agent')
    });
    res.status(429).json({
      success: false,
      message: 'Trop de requêtes, veuillez réessayer plus tard'
    });
  }
});

// Configuration spécifique pour l'API de monitoring
export const monitoringRateLimit = {
  // Pour les check-ins des agents (plus permissif)
  checkin: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 check-ins par minute par IP
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Utiliser l'UUID de l'agent comme clé si disponible
      return req.body.uuid || req.ip;
    },
    handler: (req, res) => {
      logger.warn('Limite de check-in dépassée pour l\'agent', {
        uuid: req.body.uuid,
        ip: req.ip
      });
      res.status(429).json({
        success: false,
        message: 'Trop de check-ins, veuillez respecter l\'intervalle configuré',
        retry_after: Math.floor(60 - (Date.now() % 60000) / 1000) // Secondes restantes dans la minute
      });
    }
  }),

  // Pour les mises à jour de métriques
  metrics: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 30, // 30 mises à jour par 5 minutes
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Utiliser l'UUID de l'agent comme clé si disponible
      return req.body.uuid || req.ip;
    },
    handler: (req, res) => {
      logger.warn('Limite de mise à jour de métriques dépassée pour l\'agent', {
        uuid: req.body.uuid,
        ip: req.ip
      });
      res.status(429).json({
        success: false,
        message: 'Trop de mises à jour de métriques, veuillez respecter l\'intervalle configuré',
        retry_after: Math.floor(300 - (Date.now() % 300000) / 1000) // Secondes restantes dans les 5 minutes
      });
    }
  }),

  // Pour la création d'alertes
  alerts: rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 50, // 50 alertes par 10 minutes
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Utiliser l'UUID de l'agent comme clé si disponible
      return req.body.uuid || req.ip;
    },
    skip: (req) => {
      // Ne pas limiter les alertes critiques
      return req.body.level === 'critical';
    },
    handler: (req, res) => {
      logger.warn('Limite de création d\'alertes dépassée pour l\'agent', {
        uuid: req.body.uuid,
        ip: req.ip
      });
      res.status(429).json({
        success: false,
        message: 'Trop d\'alertes créées, veuillez regrouper les alertes ou attendre',
        retry_after: Math.floor(600 - (Date.now() % 600000) / 1000) // Secondes restantes dans les 10 minutes
      });
    }
  })
}; 