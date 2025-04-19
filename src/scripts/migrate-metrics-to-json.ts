import { QueryTypes } from 'sequelize';
import sequelize from '../config/db';
import { logger } from '../config/logger';

/**
 * Script pour migrer la table monitoring_metrics vers une structure avec champ JSON
 * Exécuter avec: npx ts-node src/scripts/migrate-metrics-to-json.ts
 */
async function migrateMetricsToJson() {
  try {
    logger.info('Début de la migration des métriques vers un format JSON...');
    
    // 1. Vérifier si la table temporaire existe et la supprimer si c'est le cas
    logger.info('Vérification de la table temporaire...');
    await sequelize.query('DROP TABLE IF EXISTS monitoring_metrics_temp');
    logger.info('Table temporaire supprimée ou inexistante');
    
    // 2. Créer une nouvelle table temporaire avec la structure souhaitée
    logger.info('Création de la nouvelle table temporaire...');
    await sequelize.query(`
      CREATE TABLE monitoring_metrics_temp (
        id INT AUTO_INCREMENT PRIMARY KEY,
        agent_id INT(11) NOT NULL,
        agent_uuid VARCHAR(255) NOT NULL,
        metrics JSON NOT NULL COMMENT 'Ensemble des métriques au format JSON',
        timestamp DATETIME NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_agent_id (agent_id),
        INDEX idx_agent_uuid (agent_uuid),
        INDEX idx_timestamp (timestamp),
        CONSTRAINT fk_monitoring_metrics_temp_agent FOREIGN KEY (agent_id) REFERENCES monitoring_agents (id) ON DELETE CASCADE
      )
    `);
    logger.info('Table temporaire créée avec succès');
    
    // 3. Compter les métriques actuelles pour suivi
    const [countResult] = await sequelize.query(
      "SELECT COUNT(*) as count FROM monitoring_metrics",
      { type: QueryTypes.SELECT }
    );
    const totalCount = (countResult as any).count || 0;
    logger.info(`Nombre total de métriques à migrer: ${totalCount}`);
    
    if (totalCount === 0) {
      logger.info('Aucune métrique à migrer. Création de la nouvelle table vide.');
    } else {
      // 4. Obtenir les métriques distinctes par agent et timestamp
      logger.info('Récupération des identifiants d\'agent et timestamps uniques...');
      const distinctResults = await sequelize.query(`
        SELECT DISTINCT agent_id, agent_uuid, DATE_FORMAT(timestamp, '%Y-%m-%d %H:%i:%s') as ts
        FROM monitoring_metrics
        ORDER BY agent_id, timestamp
      `, { type: QueryTypes.SELECT });
      
      logger.info(`Nombre de combinaisons agent/timestamp uniques: ${distinctResults.length}`);
      
      // 5. Pour chaque combinaison unique, créer une entrée dans la nouvelle table
      let processed = 0;
      const batchSize = 100;
      
      for (let i = 0; i < distinctResults.length; i += batchSize) {
        const batch = distinctResults.slice(i, i + batchSize);
        logger.info(`Traitement du lot ${i / batchSize + 1}/${Math.ceil(distinctResults.length / batchSize)}`);
        
        for (const item of batch) {
          const record = item as { agent_id: number, agent_uuid: string, ts: string };
          
          // Récupérer toutes les métriques pour cet agent à ce timestamp
          const metrics = await sequelize.query(`
            SELECT type, name, value, unit, details
            FROM monitoring_metrics
            WHERE agent_id = ? AND timestamp = ?
          `, { 
            replacements: [record.agent_id, record.ts],
            type: QueryTypes.SELECT 
          });
          
          // Transformer en objet JSON
          const metricsObj: Record<string, any> = {};
          for (const metric of metrics as any[]) {
            if (!metricsObj[metric.type]) {
              metricsObj[metric.type] = {};
            }
            metricsObj[metric.type][metric.name] = {
              value: metric.value,
              unit: metric.unit,
              ...(metric.details ? { details: metric.details } : {})
            };
          }
          
          // Insérer dans la nouvelle table
          await sequelize.query(`
            INSERT INTO monitoring_metrics_temp 
            (agent_id, agent_uuid, metrics, timestamp, created_at)
            VALUES (?, ?, ?, ?, NOW())
          `, {
            replacements: [
              record.agent_id,
              record.agent_uuid,
              JSON.stringify(metricsObj),
              record.ts
            ],
            type: QueryTypes.INSERT
          });
          
          processed++;
          if (processed % 100 === 0) {
            logger.info(`Progression: ${processed}/${distinctResults.length} (${(processed / distinctResults.length * 100).toFixed(2)}%)`);
          }
        }
      }
      
      logger.info(`Migration terminée: ${processed} entrées migrées`);
    }
    
    // 6. Renommer les tables pour finaliser la migration
    logger.info('Renommage des tables pour finaliser la migration...');
    await sequelize.query('RENAME TABLE monitoring_metrics TO monitoring_metrics_old, monitoring_metrics_temp TO monitoring_metrics');
    logger.info('Tables renommées avec succès');
    
    // 7. Optionnel: supprimer l'ancienne table si tout s'est bien passé
    logger.info('Conservation de l\'ancienne table pour vérification');
    logger.info('Pour supprimer l\'ancienne table après vérification, exécutez la commande SQL: DROP TABLE monitoring_metrics_old');
    
    logger.info('Migration terminée avec succès!');
  } catch (error) {
    logger.error('Erreur lors de la migration des métriques:', { 
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      stack: error instanceof Error ? error.stack : undefined
    });
  } finally {
    process.exit(0);
  }
}

// Exécuter la fonction principale
migrateMetricsToJson(); 