import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../config/logger';
import User from '../models/User';
import UserToken from '../models/UserToken';
import { CONFIG } from '../config/api.config';

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
    }
  }
}

/**
 * Middleware pour protéger les routes nécessitant une authentification
 */
export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token;

    // Vérifier si le token est présent dans les en-têtes
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Vérifier si un token existe
    if (!token) {
      const route = `${req.method} ${req.originalUrl}`;
      rateLimit(`Tentative d'accès à une route protégée sans token: ${route}`, 'warn', {
        ip: req.ip,
        route,
        userAgent: req.headers['user-agent']
      });
      res.status(401).json({ message: 'Non autorisé, veuillez vous connecter' });
      return;
    }

    try {
      // Vérifier le token
      const decoded = jwt.verify(token, CONFIG.jwt.secret) as any;

      // Vérifier si le token existe dans la base de données et est valide
      const userToken = await UserToken.findOne({
        where: {
          jti: decoded.jti,
          revoked: 0,
          revoked_at: null,
          token_type: 'access'
        }
      });

      if (!userToken) {
        rateLimit(`Token invalide ou révoqué: ${decoded.jti}`, 'warn', {
          jti: decoded.jti,
          route: `${req.method} ${req.originalUrl}`
        });
        res.status(401).json({ message: 'Token invalide ou expiré' });
        return;
      }

      // Vérifier si le token n'a pas expiré
      if (new Date() > new Date(userToken.expires_at)) {
        await userToken.update({ revoked: 1, revoked_at: new Date() });
        rateLimit(`Token expiré: ${decoded.jti}`, 'warn', {
          jti: decoded.jti,
          userId: decoded.id,
          expiryDate: userToken.expires_at
        });
        res.status(401).json({ message: 'Token expiré' });
        return;
      }

      // Récupérer l'utilisateur
      const user = await User.findByPk(decoded.id);
      if (!user || !user.account_active) {
        rateLimit(`Utilisateur non trouvé ou inactif: ${decoded.id}`, 'warn', {
          userId: decoded.id,
          active: user ? user.account_active : false
        });
        res.status(401).json({ message: 'Utilisateur non trouvé ou inactif' });
        return;
      }

      // Log d'accès réussi (mais limité)
      if (Math.random() < 0.01) { // Seulement 1% des accès réussis sont loggés
        logger.info(`Accès authentifié: ${user.username}`, {
          userId: user.id,
          route: `${req.method} ${req.originalUrl}`
        });
      }

      // Ajouter l'utilisateur et le token à la requête
      req.user = user;
      req.token = userToken;
      next();
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Erreur inconnue';
      rateLimit(`Erreur de vérification du token: ${errMsg}`, 'error', {
        route: `${req.method} ${req.originalUrl}`,
        error: errMsg
      });
      res.status(401).json({ message: 'Token invalide' });
      return;
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Erreur inconnue';
    logger.error(`Erreur dans le middleware d'authentification: ${errMsg}`, {
      route: `${req.method} ${req.originalUrl}`,
      error: errMsg
    });
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Middleware pour restreindre l'accès en fonction du rôle
 */
export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Vérifier si l'utilisateur a le rôle requis
    if (!roles.includes(req.user.role)) {
      rateLimit(`Tentative d'accès à une route restreinte par l'utilisateur: ${req.user.username}`, 'warn', {
        userId: req.user.id,
        role: req.user.role,
        requiredRoles: roles,
        route: `${req.method} ${req.originalUrl}`
      });
      res.status(403).json({ message: 'Vous n\'avez pas la permission d\'effectuer cette action' });
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
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    rateLimit(`Tentative d'accès admin par un utilisateur non-admin: ${req.user ? req.user.username : 'anonyme'}`, 'warn', {
      userId: req.user ? req.user.id : null,
      role: req.user ? req.user.role : null,
      route: `${req.method} ${req.originalUrl}`
    });
    res.status(403).json({ message: 'Accès refusé. Droits d\'administrateur requis.' });
  }
}; 