import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../config/logger';
import User from '../models/User';
import UserToken from '../models/UserToken';
import { CONFIG } from '../config/api.config';
import MonitoringAgent from '../models/MonitoringAgent';
import AuthValidator from '../utils/authValidator';
import JwtService from '../services/jwtService';
import { LRUCache } from 'lru-cache';

// Cache LRU pour les validations de token récentes
const tokenValidationCache = new LRUCache<string, any>({
  max: 500, // Maximum 500 entrées
  ttl: 1000 * 60 * 1, // 1 minute de TTL
  updateAgeOnGet: true // Mettre à jour l'âge lors de la lecture
});

// Cache pour limiter les logs répétés
const logCache = {
  lastMessage: '',
  count: 0,
  lastTime: 0
};

// Fonction de log avec limitation
const rateLimit = (message: string, level: 'warn' | 'error' | 'info', data?: any) => {
  const now = Date.now();
  const threshold = 5000; // 5 secondes entre les logs similaires
  
  if (message === logCache.lastMessage && now - logCache.lastTime < threshold) {
    logCache.count++;
    // Ne logger que tous les 10 messages identiques
    if (logCache.count % 10 === 0) {
      logger[level](`${message} (répété ${logCache.count} fois)`, data);
    }
  } else {
    // Si c'était un message répété, afficher le résumé
    if (logCache.count > 1) {
      logger[level](`${logCache.lastMessage} (répété ${logCache.count} fois au total)`);
    }
    // Nouveau message
    logger[level](message, data);
    logCache.lastMessage = message;
    logCache.count = 1;
    logCache.lastTime = now;
  }
};

// Étendre l'interface Request pour inclure l'utilisateur et le token
declare global {
  namespace Express {
    interface Request {
      user?: any;
      token?: any;
      agent?: any;
    }
  }
}

// Middleware de logging
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  logger.info('=== Informations de la requête ===');
  logger.info(`Méthode: ${req.method}`);
  logger.info(`URL: ${req.url}`);
  logger.info('Headers:', req.headers);
  logger.info('Query params:', req.query);
  logger.info('Body:', req.body);
  logger.info('================================');
  next();
};

/**
 * Middleware pour protéger les routes nécessitant une authentification
 */
export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const requestInfo = {
      method: req.method,
      path: req.originalUrl,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    };

    // Extraire le token
    const token = AuthValidator.extractTokenFromRequest(req);
    console.log(`[DEBUG] Token reçu pour ${req.originalUrl}:`, token ? `${token.substring(0, 10)}...` : 'aucun');
    
    if (!token) {
      rateLimit(`Tentative d'accès à une route protégée sans token`, 'warn', requestInfo);
      res.status(401).json({ 
        success: false,
        message: 'Non autorisé, veuillez vous connecter'
      });
      return;
    }

    try {
      // Vérifier le cache LRU
      const cacheKey = `token:${token}`;
      const cachedValidation = tokenValidationCache.get(cacheKey);
      
      if (cachedValidation) {
        console.log(`[DEBUG] Utilisation du cache pour ${req.originalUrl}`);
        req.user = cachedValidation;
        return next();
      }

      // Vérifier la signature du token
      let decoded;
      try {
        decoded = jwt.verify(token, CONFIG.jwt.secret, {
          algorithms: [CONFIG.jwt.algorithm as jwt.Algorithm],
          issuer: CONFIG.jwt.issuer,
          audience: CONFIG.jwt.audience,
          clockTolerance: 60 // Plus tolérant avec les problèmes d'horloge (60 secondes)
        }) as any;
      } catch (error: any) {
        console.log(`[DEBUG] Erreur JWT pour ${req.originalUrl}:`, error.message);
        throw error;
      }

      // Si Redis est désactivé, on saute la vérification de blacklist
      let isRevoked = false;
      if (CONFIG.redis.enabled) {
        try {
          isRevoked = await JwtService.isTokenRevoked(decoded.jti);
        } catch (error: any) {
          console.log(`[DEBUG] Erreur Redis pour ${req.originalUrl}:`, error.message);
          // On continue même si Redis est en erreur
          isRevoked = false;
        }
      }

      if (isRevoked) {
        rateLimit('Token révoqué', 'warn', { ...requestInfo, jti: decoded.jti });
        res.status(401).json({ 
          success: false,
          message: 'Token révoqué'
        });
        return;
      }

      // Vérifier si l'utilisateur est actif (info dans le token)
      if (!decoded.isActive) {
        rateLimit('Utilisateur inactif', 'warn', { ...requestInfo, userId: decoded.id });
        res.status(401).json({ 
          success: false,
          message: 'Compte désactivé'
        });
        return;
      }

      // Construire l'objet user à partir des données du token
      const userFromToken = {
        id: decoded.id,
        username: decoded.username,
        email: decoded.email,
        role: decoded.role,
        account_active: decoded.isActive
      };

      // Mettre en cache pour 1 minute
      tokenValidationCache.set(cacheKey, userFromToken);
      console.log(`[DEBUG] Token validé pour ${req.originalUrl} (user: ${decoded.username})`);

      // Ajouter à la requête
      req.user = userFromToken;
      next();
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Erreur inconnue';
      rateLimit('Erreur de vérification du token', 'error', { ...requestInfo, error: errMsg });
      res.status(401).json({ 
        success: false,
        message: 'Token invalide'
      });
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Erreur inconnue';
    logger.error('Erreur dans le middleware d\'authentification', { error: errMsg });
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur'
    });
  }
};

/**
 * Middleware pour restreindre l'accès en fonction du rôle
 */
export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Vérifier si l'utilisateur a le rôle requis en utilisant le validateur
    if (!AuthValidator.userHasRole(req.user, roles)) {
      rateLimit(`Tentative d'accès à une route restreinte par l'utilisateur: ${req.user.username}`, 'warn', {
        userId: req.user.id,
        role: req.user.role,
        requiredRoles: roles,
        route: `${req.method} ${req.originalUrl}`
      });
      res.status(403).json({ 
        success: false,
        message: 'Vous n\'avez pas la permission d\'effectuer cette action'
      });
      return;
    }

    if (Math.random() < 0.1) { // 10% des accès réussis sont loggés
      logger.info(`Accès autorisé à une route restreinte pour l'utilisateur: ${req.user.username}`, {
        userId: req.user.id,
        role: req.user.role,
        route: `${req.method} ${req.originalUrl}`
      });
    }
    next();
  };
};

/**
 * Middleware pour restreindre l'accès aux administrateurs
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (AuthValidator.isAdmin(req.user)) {
    next();
  } else {
    rateLimit(`Tentative d'accès admin par un utilisateur non-admin: ${req.user ? req.user.username : 'anonyme'}`, 'warn', {
      userId: req.user ? req.user.id : null,
      role: req.user ? req.user.role : null,
      route: `${req.method} ${req.originalUrl}`
    });
    res.status(403).json({ 
      success: false,
      message: 'Accès restreint aux administrateurs'
    });
  }
};

/**
 * Middleware spécifique pour l'authentification des agents de monitoring
 */
export const protectAgent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Token non fourni' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { 
      id: number; 
      uuid: string;
      type: string;
    };

    if (decoded.type !== 'agent') {
      return res.status(403).json({ 
        success: false, 
        error: 'Accès non autorisé' 
      });
    }

    const agent = await MonitoringAgent.findOne({
      where: { 
        uuid: decoded.uuid,
        token: token
      }
    });

    if (!agent) {
      return res.status(401).json({ 
        success: false, 
        error: 'Agent non trouvé ou token invalide' 
      });
    }

    req.agent = agent;
    next();
  } catch (error) {
    console.error('Erreur d\'authentification agent:', error);
    res.status(401).json({ 
      success: false, 
      error: 'Token invalide' 
    });
  }
}; 