import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import AuthValidator from '../utils/authValidator';

/**
 * Middleware pour valider les données d'inscription
 */
export const validateRegister = (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = AuthValidator.validateRegistration(req.body);
    
    if (errors) {
      return res.status(400).json({
        success: false,
        message: 'Données d\'inscription invalides',
        errors
      });
    }
    
    next();
  } catch (error: any) {
    logger.error(`Erreur lors de la validation d'inscription: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la validation des données',
      error: error.message
    });
  }
};

/**
 * Middleware pour valider les données de connexion
 */
export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = AuthValidator.validateLogin(req.body);
    
    if (errors) {
      return res.status(400).json({
        success: false,
        message: 'Données de connexion invalides',
        errors
      });
    }
    
    next();
  } catch (error: any) {
    logger.error(`Erreur lors de la validation de connexion: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la validation des données',
      error: error.message
    });
  }
};

// Exporter les autres middlewares de validation si nécessaire 