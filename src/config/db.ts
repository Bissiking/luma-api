import { Sequelize } from 'sequelize';
import { dbLogger as logger } from './logger';
import { API_VERSION, DB_CONFIG } from './api.config';

// Créer l'instance Sequelize
const sequelize = new Sequelize({
  database: DB_CONFIG.name,
  username: DB_CONFIG.user,
  password: DB_CONFIG.password,
  host: DB_CONFIG.host,
  port: DB_CONFIG.port,
  dialect: 'mariadb',
  logging: (msg: string) => logger.debug(msg),
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Fonction pour tester la connexion à la base de données
export const connectDB = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    logger.info(`Connexion à MariaDB établie avec succès sur ${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.name}`);
    
    // Enregistre le statut de l'API comme étant actif
    await logApiStatus('active');
    
    // Gestion des signaux de terminaison pour une fermeture propre
    process.on('SIGINT', async () => {
      await sequelize.close();
      logger.info('Connexion MariaDB fermée suite à l\'arrêt de l\'application');
      await logApiStatus('offline');
      process.exit(0);
    });
    
  } catch (error: any) {
    logger.error(`Échec de la connexion à MariaDB: ${error.message}`);
    await logApiStatus('error', error.message);
    process.exit(1);
  }
};

/**
 * Journalise le statut de l'API
 */
export const logApiStatus = async (status: 'active' | 'inactive' | 'error' | 'offline', message?: string): Promise<void> => {
  try {
    // Cette fonction sera implémentée différemment avec le modèle Sequelize ApiStatus
    logger.info(`Statut API: ${status}, Version: ${API_VERSION.name}, Message: ${message || 'N/A'}`);
    
  } catch (error: any) {
    logger.error(`Échec de l'enregistrement du statut de l'API: ${error.message}`);
  }
};

// Exporter l'instance Sequelize pour l'utiliser dans les modèles
export default sequelize; 