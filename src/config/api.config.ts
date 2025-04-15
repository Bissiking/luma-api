import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

/**
 * Configuration générale de l'API LUMA
 */

// Version de l'API
export const API_VERSION = {
  name: 'LUMA.A0.0.1-Phoenix',
  major: 0,
  minor: 0,
  patch: 1,
  codeName: 'Phoenix',
  fullName: 'LUMA API',
  releaseDate: '2025-04-11'
};

// Informations de l'API
export const API_INFO = {
  name: 'LUMA API',
  description: 'API de gestion pour le projet LUMA',
  baseUrl: '/api/v1',
  maintainer: 'Équipe LUMA',
  contact: 'contact@luma-project.com'
};

// Configuration générale
export const CONFIG = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  isProd: process.env.NODE_ENV === 'production',
  jwt: {
    secret: process.env.JWT_SECRET || 'luma_jwt_secret_key_change_in_production',
    expiresIn: 60 * 60 * 24, // 24 heures en secondes
    rememberMeExpiresIn: 60 * 60 * 24 * 7 // 7 jours en secondes
  }
};

// Configuration des fonctionnalités
export const API_FEATURES = {
  rateLimit: {
    enabled: true,
    windowMs: CONFIG.isDev ? 5 * 60 * 1000 : 15 * 60 * 1000, // 5 minutes en DEV, 15 minutes en PROD
    max: CONFIG.isDev ? 1000 : 100, // 1000 requêtes en DEV, 100 en PROD
    message: CONFIG.isDev 
      ? "Trop de requêtes effectuées en développement. Réessayez dans 5 minutes."
      : "Trop de requêtes effectuées. Réessayez dans 15 minutes."
  },
  cors: {
    enabled: true,
    origin: '*', // À changer en production
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  },
  helmet: {
    enabled: true
  },
  logging: {
    enabled: true,
    level: process.env.LOG_LEVEL || 'info'
  }
};

// Constantes pour les routes
export const API_ROUTES = {
  auth: {
    base: '/auth',
    register: '/register',
    login: '/login',
    logout: '/logout',
    profile: '/profile'
  }
};

// Valeurs par défaut pour la base de données
export const DB_CONFIG = {
  // Valeurs par défaut si les variables d'environnement ne sont pas définies
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  name: process.env.DB_NAME || 'luma',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  dialect: process.env.DB_DIALECT || 'mariadb'
};

console.log(DB_CONFIG); 