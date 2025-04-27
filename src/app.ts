import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { CONFIG, API_FEATURES, API_VERSION } from './config/api.config';

// Import des routes
import ninoRoutes from './routes/ninoRoutes';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import ticketRoutes from './routes/ticketRoutes';
import monitoringRoutes from './routes/monitoringRoutes';
import groupRoutes from './routes/groupRoutes';
import { logger } from './config/logger';

const app = express();

// Configuration CORS avancée pour supporter les cookies entre domaines si nécessaire
const corsOptions = {
  origin: CONFIG.isDev ? ['https://dev.mhemery.fr', 'http://localhost:3000'] : API_FEATURES.cors.origin,
  methods: API_FEATURES.cors.methods,
  credentials: true, // Nécessaire pour les cookies
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400 // 24 heures
};

// Middlewares
app.use(cors(corsOptions));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Pour parser les cookies

// Servir les fichiers statiques (robots.txt, favicon, etc.)
app.use(express.static('public'));

// Routes
app.use('/api/v1/nino', ninoRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/tickets', ticketRoutes);
app.use('/api/v1/monitoring', monitoringRoutes);
app.use('/api/v1/groups', groupRoutes);

// Route de base pour vérifier l'API
app.get('/api/v1', (req, res) => {
  res.json({
    success: true,
    message: 'LUMA API est en ligne',
    version: `${API_VERSION.major}.${API_VERSION.minor}.${API_VERSION.patch}`,
    environment: CONFIG.nodeEnv
  });
});

// Gestion des erreurs 404
app.use((req, res) => {
  logger.warn(`Route non trouvée: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    success: false,
    message: 'Route non trouvée' 
  });
});

// Gestion globale des erreurs
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(`Erreur interne: ${err.message}`, { 
    stack: err.stack,
    route: `${req.method} ${req.originalUrl}`
  });
  res.status(500).json({ 
    success: false,
    message: 'Erreur serveur interne' 
  });
});

export default app; 