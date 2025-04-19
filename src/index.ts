import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/db';
import { syncModels } from './models';
import { logger } from './config/logger';
import { corsMiddleware } from './middleware/corsMiddleware';
import authRoutes from './routes/authRoutes';
import ticketRoutes from './routes/ticketRoutes';
import activityRoutes from './routes/activityRoutes';
import userRoutes from './routes/userRoutes';
import monitoringRoutes from './routes/monitoringRoutes';
import monitoringAlertRoutes from './routes/monitoringAlertRoutes';
import agentRoutes from './routes/agentRoutes';
import { API_VERSION, API_INFO, API_FEATURES, API_ROUTES, CONFIG } from './config/api.config';
import { baseRateLimit } from './config/rateLimit';
import { setupAssociations } from './models/associations';

// Charger les variables d'environnement
dotenv.config();

// Initialiser l'application Express
const app = express();

// Configurer le trust proxy pour Express
app.set('trust proxy', 1);

const PORT = CONFIG.port;

// Middleware de sécurité
app.use(helmet());

// Middleware CORS personnalisé
app.use(corsMiddleware);

// Parser le corps des requêtes
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Logger les requêtes HTTP
if (API_FEATURES.logging.enabled) {
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => logger.http(message.trim())
    }
  }));
}

// Limiter le nombre de requêtes
if (API_FEATURES.rateLimit.enabled) {
  const limiter = rateLimit({
    windowMs: API_FEATURES.rateLimit.windowMs,
    max: API_FEATURES.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Trop de requêtes, veuillez réessayer plus tard'
  });
  app.use(limiter);
}

// Limiter le taux de requêtes global pour éviter les surcharges
app.use(baseRateLimit);

// Routes
app.use(`${API_INFO.baseUrl}${API_ROUTES.auth.base}`, authRoutes);
app.use(`${API_INFO.baseUrl}/tickets`, ticketRoutes);
app.use(`${API_INFO.baseUrl}/activities`, activityRoutes);
app.use(`${API_INFO.baseUrl}/users`, userRoutes);
app.use(`${API_INFO.baseUrl}/monitoring`, monitoringRoutes);
app.use(`${API_INFO.baseUrl}/monitoring/alerts`, monitoringAlertRoutes);
app.use(`${API_INFO.baseUrl}/agents`, agentRoutes);

// Route de base
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: `Bienvenue sur ${API_INFO.name}`,
    version: API_VERSION.name,
    status: 'online',
    description: API_INFO.description
  });
});

// Route 404
app.use((req: Request, res: Response) => {
  logger.warn(`Route non trouvée: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    message: 'Route non trouvée',
    status: 404
  });
});

// Middleware de gestion des erreurs
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Erreur interne: ${err.message}`);
  res.status(500).json({
    message: 'Erreur serveur interne',
    error: CONFIG.isDev ? err.message : 'Une erreur est survenue'
  });
});

// Démarrer le serveur
const startServer = async () => {
  try {
    // Connecter à la base de données
    await connectDB();
    
    // Synchroniser les modèles
    await syncModels(false);
    
    // Après l'initialisation de la base de données
    setupAssociations();
    
    // Démarrer le serveur
    app.listen(PORT, () => {
      logger.info(`Serveur démarré sur le port ${PORT}`);
      logger.info(`Version de l'API: ${API_VERSION.name}`);
      logger.info(`Environnement: ${CONFIG.nodeEnv}`);
    });
  } catch (error: any) {
    logger.error(`Erreur lors du démarrage du serveur: ${error.message}`);
    process.exit(1);
  }
};

// Lancer le serveur
startServer(); 