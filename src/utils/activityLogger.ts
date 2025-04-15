import UserActivity, { 
  UserActivityAttributes,
  UserActionType,
  UserActionModule,
  UserActionStatus
} from '../models/UserActivity';
import { logger } from '../config/logger';
import { Request } from 'express';

/**
 * Enregistre une activité utilisateur
 * @param userId - ID de l'utilisateur concerné
 * @param action - Type d'action effectuée
 * @param description - Description courte de l'activité
 * @param options - Options supplémentaires
 */
export const logUserActivity = async (
  userId: number,
  action: UserActionType,
  description: string,
  options?: {
    details?: any;
    module?: UserActionModule;
    resource_type?: string;
    resource_id?: string;
    status?: UserActionStatus;
    ip_address?: string;
    user_agent?: string;
    session_id?: string;
    token_jti?: string;
    req?: Request;
  }
): Promise<void> => {
  try {
    // Extraire les informations du client à partir de la requête si fournie
    if (options?.req) {
      if (!options.ip_address) {
        options.ip_address = options.req.ip || 
          options.req.headers['x-forwarded-for'] as string || 
          options.req.socket.remoteAddress || 
          'unknown';
      }
      
      if (!options.user_agent) {
        options.user_agent = options.req.headers['user-agent'] || 'unknown';
      }
      
      // Session non disponible par défaut dans Request d'Express
      // Nécessiterait d'installer express-session et de l'étendre
    }
    
    // Préparer les données d'activité
    const activityData: UserActivityAttributes = {
      user_id: userId,
      action,
      description,
      details: options?.details,
      module: options?.module || 'system',
      resource_type: options?.resource_type,
      resource_id: options?.resource_id,
      status: options?.status || 'success',
      ip_address: options?.ip_address,
      user_agent: options?.user_agent,
      session_id: options?.session_id,
      token_jti: options?.token_jti
    };
    
    // Enregistrer l'activité dans la base de données
    await UserActivity.create(activityData as any);
    
    // Journaliser également dans les logs de l'application
    const logMessage = `Activité utilisateur: [${userId}] ${action} - ${description} (${options?.module || 'system'}) [${options?.status || 'success'}]`;
    
    switch (options?.status) {
      case 'failure':
        logger.error(logMessage, { details: options?.details });
        break;
      case 'warning':
        logger.warn(logMessage, { details: options?.details });
        break;
      case 'info':
        logger.info(logMessage, { details: options?.details });
        break;
      default:
        logger.info(logMessage, { details: options?.details });
    }
    
  } catch (error: any) {
    logger.error(`Erreur lors de l'enregistrement de l'activité utilisateur: ${error.message}`, {
      error,
      userId,
      action,
      description
    });
  }
};

/**
 * Enregistre une activité de connexion d'utilisateur
 */
export const logLoginActivity = async (
  userId: number,
  isSuccess: boolean,
  req?: Request,
  tokenJti?: string
): Promise<void> => {
  if (isSuccess) {
    await logUserActivity(
      userId,
      'login',
      'Connexion réussie',
      {
        module: 'auth',
        status: 'success',
        req
      }
    );
  } else {
    await logUserActivity(
      userId,
      'failed_login',
      'Échec de la connexion',
      {
        module: 'auth',
        status: 'failure',
        req
      }
    );
  }
};

/**
 * Enregistre une activité de déconnexion d'utilisateur
 */
export const logLogoutActivity = async (
  userId: number,
  req?: Request,
  tokenJti?: string
): Promise<void> => {
  await logUserActivity(
    userId,
    'logout',
    'Déconnexion',
    {
      module: 'auth',
      status: 'success',
      req,
      token_jti: tokenJti
    }
  );
};

/**
 * Enregistre une activité d'administration
 */
export const logAdminActivity = async (
  userId: number,
  description: string,
  resource_type?: string,
  resource_id?: string,
  details?: any,
  req?: Request
): Promise<void> => {
  await logUserActivity(
    userId,
    'admin_action',
    description,
    {
      module: 'admin',
      status: 'success',
      resource_type,
      resource_id,
      details,
      req
    }
  );
}; 