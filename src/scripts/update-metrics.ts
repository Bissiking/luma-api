import { QueryTypes } from 'sequelize';
import sequelize from '../config/db';
import { logger } from '../config/logger';

/**
 * Script pour mettre à jour les métriques sans UUID.
 * Exécuter avec: npx ts-node src/scripts/update-metrics.ts
 */
async function updateMetrics() {
  try {
    logger.info('Mise à jour des métriques sans UUID...');
    
    // Récupérer tous les agents avec leur UUID
    const agents = await sequelize.query(
      "SELECT id, uuid FROM monitoring_agents",
      { type: QueryTypes.SELECT }
    );
    
    logger.info(`Nombre d'agents trouvés: ${agents.length}`);
    
    if (agents.length === 0) {
      logger.warn('Aucun agent trouvé dans la base de données.');
      return;
    }
    
    // Mettre à jour les métriques pour chaque agent
    let totalUpdated = 0;
    
    for (const agent of agents) {
      // Utiliser une assertion de type pour accéder aux propriétés
      const agentObj = agent as { id: number; uuid: string };
      const agentId = agentObj.id;
      const agentUuid = agentObj.uuid;
      
      logger.info(`Traitement des métriques pour l'agent ${agentId} (UUID: ${agentUuid})...`);
      
      const [updateResult] = await sequelize.query(
        `UPDATE monitoring_metrics SET agent_uuid = ? WHERE agent_id = ? AND (agent_uuid IS NULL OR agent_uuid = '')`,
        { 
          replacements: [agentUuid, agentId],
          type: QueryTypes.UPDATE
        }
      );
      
      // Gérer le cas où updateResult pourrait être undefined
      const result = updateResult ? (updateResult as { affectedRows?: number }) : { affectedRows: 0 };
      const updated = result.affectedRows || 0;
      totalUpdated += updated;
      logger.info(`${updated} métriques mises à jour pour l'agent ${agentId}`);
    }
    
    logger.info(`Total de ${totalUpdated} métriques mises à jour.`);
    logger.info('Mise à jour terminée avec succès.');
  } catch (error) {
    logger.error('Erreur lors de la mise à jour des métriques:', { 
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      stack: error instanceof Error ? error.stack : undefined
    });
  } finally {
    process.exit(0);
  }
}

// Exécuter la fonction principale
updateMetrics(); 