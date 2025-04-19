import db from '../config/db';
import { QueryTypes } from 'sequelize';
import MonitoringMetric from '../models/MonitoringMetric';
import MonitoringAgent from '../models/MonitoringAgent';
import { logger } from '../config/logger';

/**
 * Script pour corriger les métriques manquantes et ajouter l'UUID de l'agent
 * aux métriques existantes.
 * 
 * Exécuter avec: npx ts-node src/scripts/fix-monitoring-metrics.ts
 */
async function fixMonitoringMetrics() {
  try {
    logger.info('Démarrage de la correction des métriques...');

    // 1. Vérifier si la colonne agent_uuid existe dans la table des métriques
    logger.info('Vérification de la structure de la table monitoring_metrics...');
    try {
      const tableInfo = await db.query(
        "SHOW COLUMNS FROM monitoring_metrics LIKE 'agent_uuid'",
        { type: QueryTypes.SELECT }
      );

      if (tableInfo.length === 0) {
        logger.info('La colonne agent_uuid n\'existe pas, ajout en cours...');
        await db.query(
          "ALTER TABLE monitoring_metrics ADD COLUMN agent_uuid VARCHAR(255) AFTER agent_id",
          { type: QueryTypes.RAW }
        );
        logger.info('Colonne agent_uuid ajoutée avec succès');
        
        // Ajouter les index nécessaires
        await db.query(
          "ALTER TABLE monitoring_metrics ADD INDEX idx_agent_uuid (agent_uuid)",
          { type: QueryTypes.RAW }
        );
        logger.info('Index sur agent_uuid ajouté avec succès');
      } else {
        logger.info('La colonne agent_uuid existe déjà');
      }
    } catch (error) {
      logger.error('Erreur lors de la vérification/modification de la structure:', { 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      });
      return;
    }

    // 2. Mettre à jour les métriques existantes avec l'UUID de l'agent correspondant
    logger.info('Mise à jour des métriques existantes avec l\'UUID de l\'agent...');
    
    // Récupérer tous les agents avec leur UUID
    const agents = await MonitoringAgent.findAll({
      attributes: ['id', 'uuid']
    });
    
    if (agents.length === 0) {
      logger.warn('Aucun agent trouvé dans la base de données');
      return;
    }
    
    for (const agent of agents) {
      logger.info(`Traitement des métriques pour l'agent ${agent.id} (UUID: ${agent.uuid})...`);
      
      // Mettre à jour toutes les métriques de cet agent
      try {
        const [updated] = await db.query(
          `UPDATE monitoring_metrics 
           SET agent_uuid = :uuid 
           WHERE agent_id = :agentId AND (agent_uuid IS NULL OR agent_uuid = '')`,
          { 
            replacements: { uuid: agent.uuid, agentId: agent.id },
            type: QueryTypes.UPDATE 
          }
        );
        
        logger.info(`${updated} métriques mises à jour pour l'agent ${agent.id}`);
      } catch (error) {
        logger.error(`Erreur lors de la mise à jour des métriques pour l'agent ${agent.id}:`, { 
          error: error instanceof Error ? error.message : 'Erreur inconnue' 
        });
      }
    }
    
    // 3. Vérifier les métriques sans UUID après la mise à jour
    const metricsWithoutUuid = await db.query(
      `SELECT COUNT(*) as count FROM monitoring_metrics WHERE agent_uuid IS NULL OR agent_uuid = ''`,
      { type: QueryTypes.SELECT }
    ) as { count: number }[];
    
    if (metricsWithoutUuid.length > 0 && metricsWithoutUuid[0].count > 0) {
      logger.warn(`${metricsWithoutUuid[0].count} métriques n'ont pas pu être associées à un UUID d'agent`);
    } else {
      logger.info('Toutes les métriques ont été correctement associées à un UUID d\'agent');
    }
    
    logger.info('Correction des métriques terminée avec succès');
  } catch (error) {
    logger.error('Erreur lors de l\'exécution du script de correction:', { 
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      stack: error instanceof Error ? error.stack : undefined 
    });
  } finally {
    process.exit(0);
  }
}

// Exécuter le script
fixMonitoringMetrics(); 