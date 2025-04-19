import { QueryTypes } from 'sequelize';
import sequelize from '../config/db';
import { logger } from '../config/logger';

/**
 * Script pour nettoyer la structure de la table monitoring_alerts.
 * Exécuter avec: npx ts-node src/scripts/add-alert-status.ts
 */
async function cleanAlertTable() {
  try {
    logger.info('Vérification de la structure de monitoring_alerts...');
    
    // Vérifier si la colonne resolved existe
    const [columnInfo] = await sequelize.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'monitoring_alerts' AND COLUMN_NAME = 'resolved'",
      { type: QueryTypes.SELECT }
    );
    
    if (columnInfo) {
      logger.info('Mise à jour des statuts basés sur la colonne resolved...');
      
      // Mettre à jour les statuts avant de supprimer la colonne
      await sequelize.query(`
        UPDATE monitoring_alerts 
        SET status = CASE 
          WHEN resolved = 1 THEN 'resolved'
          WHEN status = 'active' THEN 'active'
          WHEN status = 'acknowledged' THEN 'acknowledged'
          WHEN status = 'escalated' THEN 'escalated'
          ELSE 'active'
        END
      `);
      
      logger.info('Suppression de la colonne resolved...');
      await sequelize.query(`
        ALTER TABLE monitoring_alerts 
        DROP COLUMN resolved
      `);
      
      logger.info('Colonne resolved supprimée avec succès.');
    } else {
      logger.info('La colonne resolved n\'existe pas, aucune action nécessaire.');
    }
    
    // Vérifier si l'index sur status existe
    const [indexInfo] = await sequelize.query(
      "SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_NAME = 'monitoring_alerts' AND INDEX_NAME = 'idx_status'",
      { type: QueryTypes.SELECT }
    );
    
    if (!indexInfo) {
      logger.info('Ajout de l\'index sur la colonne status...');
      await sequelize.query(`
        ALTER TABLE monitoring_alerts 
        ADD INDEX idx_status (status)
      `);
      logger.info('Index sur status ajouté avec succès.');
    }
    
    logger.info('Structure de la table monitoring_alerts vérifiée et mise à jour.');
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de la structure:', { 
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      stack: error instanceof Error ? error.stack : undefined
    });
  } finally {
    process.exit(0);
  }
}

// Exécuter la fonction principale
cleanAlertTable(); 