import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import NinoInstance from '../models/NinoInstance';

export const protectNino = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'];
    const instanceId = req.headers['x-instance-id'];

    if (!apiKey || !instanceId) {
      logger.warn('Tentative d\'accès sans API key ou Instance ID', {
        ip: req.ip,
        path: req.path
      });
      res.status(401).json({
        success: false,
        message: 'API key et Instance ID requis'
      });
      return;
    }

    // Vérifier l'instance
    const instance = await NinoInstance.findOne({
      where: {
        id: instanceId,
        api_key: apiKey,
        status: 'active'
      }
    });

    if (!instance) {
      logger.warn('Instance Nino non trouvée ou inactive', {
        instanceId,
        ip: req.ip
      });
      res.status(401).json({
        success: false,
        message: 'Instance non trouvée ou inactive'
      });
      return;
    }

    // Ajouter l'instance à la requête
    req.ninoInstance = instance;
    next();
  } catch (error) {
    logger.error('Erreur dans le middleware d\'authentification Nino:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
}; 