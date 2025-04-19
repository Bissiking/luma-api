import { QueryTypes } from 'sequelize';
import sequelize from '../config/db';
import { logger } from '../config/logger';

/**
 * Script pour vérifier l'état des métriques.
 * Exécuter avec: npx ts-node src/scripts/check-metrics.ts
 */
async function checkMetrics() {
  try {
    logger.info('Vérification des métriques dans la base de données...');
    
    // Compter le nombre total de métriques
    const [totalResult] = await sequelize.query(
      "SELECT COUNT(*) as count FROM monitoring_metrics",
      { type: QueryTypes.SELECT }
    );
    
    const totalCount = (totalResult as any).count || 0;
    logger.info(`Nombre total de métriques: ${totalCount}`);
    
    if (totalCount === 0) {
      logger.warn('Aucune métrique trouvée dans la base de données.');
      return;
    }
    
    // Compter les métriques avec et sans UUID
    const [withUuidResult] = await sequelize.query(
      "SELECT COUNT(*) as count FROM monitoring_metrics WHERE agent_uuid IS NOT NULL",
      { type: QueryTypes.SELECT }
    );
    
    const [withoutUuidResult] = await sequelize.query(
      "SELECT COUNT(*) as count FROM monitoring_metrics WHERE agent_uuid IS NULL",
      { type: QueryTypes.SELECT }
    );
    
    const withUuidCount = (withUuidResult as any).count || 0;
    const withoutUuidCount = (withoutUuidResult as any).count || 0;
    
    logger.info(`Métriques avec UUID: ${withUuidCount} (${(withUuidCount / totalCount * 100).toFixed(2)}%)`);
    logger.info(`Métriques sans UUID: ${withoutUuidCount} (${(withoutUuidCount / totalCount * 100).toFixed(2)}%)`);
    
    if (withoutUuidCount === 0) {
      logger.info('Toutes les métriques ont un UUID. La base de données est en bon état.');
      
      // Si tout est bon et que la colonne est encore nullable, la rendre NOT NULL
      logger.info('Vérification si la colonne agent_uuid est nullable...');
      const [columnInfo] = await sequelize.query(
        "SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'monitoring_metrics' AND COLUMN_NAME = 'agent_uuid'",
        { type: QueryTypes.SELECT }
      );
      
      if (columnInfo && (columnInfo as any).IS_NULLABLE === 'YES') {
        logger.info('La colonne agent_uuid est actuellement nullable. Modification en NOT NULL...');
        await sequelize.query('ALTER TABLE monitoring_metrics MODIFY COLUMN agent_uuid VARCHAR(255) NOT NULL');
        logger.info('Colonne agent_uuid modifiée avec succès en NOT NULL');
      } else {
        logger.info('La colonne agent_uuid est déjà définie comme NOT NULL.');
      }
    } else {
      logger.warn(`Il reste ${withoutUuidCount} métriques sans UUID.`);
    }
    
    logger.info('Vérification terminée.');
  } catch (error) {
    logger.error('Erreur lors de la vérification des métriques:', { 
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      stack: error instanceof Error ? error.stack : undefined
    });
  } finally {
    process.exit(0);
  }
}

// Exécuter la fonction principale
checkMetrics(); 