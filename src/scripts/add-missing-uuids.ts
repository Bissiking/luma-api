import sequelize from '../config/db';
import { logger } from '../config/logger';

interface CountResult {
  count: number;
}

interface Agent {
  id: number;
  uuid: string;
}

interface UpdateResult {
  affectedRows?: number;
}

async function addMissingUuids() {
  try {
    logger.info('Recherche des métriques sans UUID...');
    
    // 1. Compter le nombre de métriques sans UUID
    const [nullUuids] = await sequelize.query<CountResult>(
      "SELECT COUNT(*) as count FROM monitoring_metrics WHERE agent_uuid IS NULL"
    );
    
    const nullCount = nullUuids?.[0]?.count || 0;
    logger.info(`Nombre de métriques sans UUID: ${nullCount}`);
    
    if (nullCount === 0) {
      logger.info('Aucune métrique sans UUID trouvée. Rien à faire.');
      return;
    }
    
    // 2. Récupérer tous les agents avec leurs UUIDs
    const [agents] = await sequelize.query<Agent>(
      "SELECT id, uuid FROM monitoring_agents"
    );
    
    logger.info(`Nombre d'agents trouvés: ${agents?.length || 0}`);
    
    if (!agents || agents.length === 0) {
      logger.warn('Aucun agent trouvé dans la base de données.');
      return;
    }
    
    // 3. Pour chaque agent, mettre à jour ses métriques sans UUID
    for (const agent of agents) {
      logger.info(`Traitement des métriques pour l'agent ${agent.id} (UUID: ${agent.uuid})...`);
      
      const [result] = await sequelize.query<UpdateResult>(
        `UPDATE monitoring_metrics SET agent_uuid = ? WHERE agent_id = ? AND agent_uuid IS NULL`,
        { 
          replacements: [agent.uuid, agent.id] 
        }
      );
      
      logger.info(`${result?.affectedRows || 0} métriques mises à jour pour l'agent ${agent.id}`);
    }
    
    // 4. Vérifier s'il reste des métriques sans UUID
    const [remainingNullUuids] = await sequelize.query<CountResult>(
      "SELECT COUNT(*) as count FROM monitoring_metrics WHERE agent_uuid IS NULL"
    );
    
    const remainingCount = remainingNullUuids?.[0]?.count || 0;
    if (remainingCount > 0) {
      logger.warn(`Il reste ${remainingCount} métriques sans UUID.`);
    } else {
      logger.info('Toutes les métriques ont maintenant un UUID.');
      
      // 5. Rendre à nouveau la colonne NON NULL après la mise à jour réussie
      logger.info('Modification de la colonne agent_uuid pour la rendre NOT NULL...');
      await sequelize.query('ALTER TABLE monitoring_metrics MODIFY COLUMN agent_uuid VARCHAR(255) NOT NULL');
      logger.info('Colonne agent_uuid modifiée avec succès en NOT NULL');
    }
    
    logger.info('Traitement terminé.');
  } catch (error) {
    logger.error('Erreur lors de l\'ajout des UUIDs manquants:', { 
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      stack: error instanceof Error ? error.stack : undefined
    });
  } finally {
    process.exit(0);
  }
}

// Exécuter la fonction principale
addMissingUuids(); 