import sequelize from '../config/db';
import { dbLogger as logger } from '../config/logger';

async function checkBugTable() {
  try {
    // Exécute une requête pour décrire la table luma_bugs
    const [results] = await sequelize.query('DESCRIBE luma_bugs');
    
    console.log('Structure de la table luma_bugs:');
    console.log(JSON.stringify(results, null, 2));
    
    // Vérifier les données
    const [bugs] = await sequelize.query('SELECT * FROM luma_bugs LIMIT 5');
    
    console.log('Exemples de bugs:');
    console.log(JSON.stringify(bugs, null, 2));
    
  } catch (error: any) {
    logger.error(`Erreur lors de la vérification de la table: ${error.message}`);
    console.error(error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

// Exécuter la fonction
checkBugTable(); 