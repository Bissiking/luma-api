import { logger } from '../config/logger';
import JwtService from '../services/jwtService';

/**
 * Utilitaire de nettoyage des tokens expirés
 * Cette fonction est appelée périodiquement pour supprimer les tokens expirés
 * de la base de données, économisant de l'espace et améliorant les performances.
 */
export const cleanupExpiredTokens = async (): Promise<void> => {
  try {
    const deletedCount = await JwtService.cleanupExpiredTokens();
    logger.info(`Nettoyage des tokens expirés: ${deletedCount} tokens supprimés`);
  } catch (error: any) {
    logger.error(`Erreur lors du nettoyage des tokens expirés: ${error.message}`, {
      error: error.message,
      stack: error.stack
    });
  }
};

/**
 * Démarrer une tâche périodique pour nettoyer les tokens
 * @param intervalHours Intervalle en heures entre les nettoyages
 */
export const startTokenCleanupTask = (intervalHours = 24): NodeJS.Timeout => {
  // Exécuter immédiatement un premier nettoyage
  cleanupExpiredTokens().catch(error => {
    logger.error(`Erreur lors du nettoyage initial des tokens: ${error.message}`);
  });

  // Programmer les nettoyages périodiques
  const intervalMs = intervalHours * 60 * 60 * 1000;
  logger.info(`Programmation du nettoyage des tokens toutes les ${intervalHours} heures`);
  
  return setInterval(() => {
    cleanupExpiredTokens().catch(error => {
      logger.error(`Erreur lors du nettoyage périodique des tokens: ${error.message}`);
    });
  }, intervalMs);
};

export default {
  cleanupExpiredTokens,
  startTokenCleanupTask
}; 