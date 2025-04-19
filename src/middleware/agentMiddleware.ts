import { Response, NextFunction } from 'express';
import { Request } from '../types/express';
import { MonitoringAgent } from '../models';
import { logger } from '../config/logger';

export const authenticateAgent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { uuid } = req.params;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Tentative d\'accès sans token', { uuid });
      return res.status(401).json({
        success: false,
        message: 'Token d\'authentification manquant'
      });
    }

    if (!uuid) {
      logger.warn('Tentative d\'accès sans UUID');
      return res.status(401).json({
        success: false,
        message: 'UUID de l\'agent manquant'
      });
    }

    const token = authHeader.split(' ')[1];

    // Vérifier que l'agent existe
    const agent = await MonitoringAgent.findOne({
      where: { uuid, token }
    });

    if (!agent) {
      logger.warn('Agent non trouvé ou token invalide', { uuid });
      return res.status(401).json({
        success: false,
        message: 'Agent non trouvé ou token invalide'
      });
    }

    // Vérifier si l'agent est actif uniquement pour la configuration
    if (req.path.includes('/config') && agent.status !== 'active') {
      logger.warn('Agent inactif - Accès à la configuration refusé', { uuid, status: agent.status });
      return res.status(403).json({
        success: false,
        message: 'Agent inactif - Accès à la configuration refusé'
      });
    }

    // Ajouter l'agent à la requête
    req.agent = agent;
    next();
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Erreur inconnue';
    logger.error('Erreur lors de l\'authentification de l\'agent:', {
      error: errMsg,
      uuid: req.params.uuid
    });
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'authentification'
    });
  }
}; 