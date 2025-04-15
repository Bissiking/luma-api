import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../config/logger';
import User from '../models/User';
import UserToken from '../models/UserToken';
import { CONFIG } from '../config/api.config';

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
      logger.warn('Tentative d\'accès à une route protégée sans token');
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
          is_valid: true,
          revoked_at: null
        }
      });

      if (!userToken) {
        logger.warn(`Token invalide ou révoqué: ${decoded.jti}`);
        res.status(401).json({ message: 'Token invalide ou expiré' });
        return;
      }

      // Vérifier si le token n'a pas expiré
      if (new Date() > new Date(userToken.expires_at)) {
        await userToken.update({ is_valid: false, revoked_at: new Date() });
        logger.warn(`Token expiré: ${decoded.jti}`);
        res.status(401).json({ message: 'Token expiré' });
        return;
      }

      // Récupérer l'utilisateur
      const user = await User.findByPk(decoded.id);
      if (!user || !user.account_active) {
        logger.warn(`Utilisateur non trouvé ou inactif: ${decoded.id}`);
        res.status(401).json({ message: 'Utilisateur non trouvé ou inactif' });
        return;
      }

      // Ajouter l'utilisateur et le token à la requête
      req.user = user;
      req.token = userToken;
      next();
    } catch (error) {
      logger.error(`Erreur de vérification du token: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      res.status(401).json({ message: 'Token invalide' });
      return;
    }
  } catch (error) {
    logger.error(`Erreur dans le middleware d'authentification: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
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
      logger.warn(`Tentative d'accès à une route restreinte par l'utilisateur: ${req.user.username}`);
      res.status(403).json({ message: 'Vous n\'avez pas la permission d\'effectuer cette action' });
      return;
    }

    logger.info(`Accès autorisé à une route restreinte pour l'utilisateur: ${req.user.username}`);
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
    res.status(403).json({ message: 'Accès refusé. Droits d\'administrateur requis.' });
  }
}; 