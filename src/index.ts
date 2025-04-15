import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/db';
import { syncModels } from './models';
import { logger } from './config/logger';
import authRoutes from './routes/authRoutes';
import ticketRoutes from './routes/ticketRoutes';
import activityRoutes from './routes/activityRoutes';
import userRoutes from './routes/userRoutes';
import { API_VERSION, API_INFO, API_FEATURES, API_ROUTES, CONFIG } from './config/api.config';

// Charger les variables d'environnement
dotenv.config();

// Initialiser l'application Express
const app = express();

// Configurer le trust proxy pour Express
app.set('trust proxy', 1);

const PORT = CONFIG.port;

// Middleware de sécurité
if (API_FEATURES.helmet.enabled) {
  app.use(helmet());
}

// Middleware CORS
if (API_FEATURES.cors.enabled) {
  app.use(cors({
    origin: API_FEATURES.cors.origin,
    methods: API_FEATURES.cors.methods
  }));
}

// Parser le corps des requêtes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Routes
app.use(`${API_INFO.baseUrl}${API_ROUTES.auth.base}`, authRoutes);
app.use(`${API_INFO.baseUrl}/tickets`, ticketRoutes);
app.use(`${API_INFO.baseUrl}/activities`, activityRoutes);
app.use(`${API_INFO.baseUrl}/users`, userRoutes);

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