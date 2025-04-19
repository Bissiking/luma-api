import sequelize from '../config/db';
import { logger } from '../config/logger';

async function fixAgentUuid() {
  try {
    logger.info('Modification de la colonne agent_uuid pour permettre NULL...');
    
    // Étape 1: Modifier la colonne pour permettre NULL
    await sequelize.query('ALTER TABLE monitoring_metrics MODIFY COLUMN agent_uuid VARCHAR(255) NULL');
    logger.info('Colonne agent_uuid modifiée avec succès pour permettre NULL');

    // Étape 2: Vérifier que la modification a bien été appliquée
    const result = await sequelize.query(
      "SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'monitoring_metrics' AND COLUMN_NAME = 'agent_uuid'"
    );
    logger.info(`Statut de la colonne agent_uuid: ${JSON.stringify(result)}`);

    logger.info('Modification terminée avec succès');
  } catch (error) {
    logger.error('Erreur lors de la modification de la colonne agent_uuid:', { 
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      stack: error instanceof Error ? error.stack : undefined
    });
  } finally {
    process.exit(0);
  }
}

// Exécuter la fonction principale
fixAgentUuid(); 