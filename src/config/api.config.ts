import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

/**
 * Configuration générale de l'API LUMA
 */

// Version de l'API
export const API_VERSION = {
  name: 'LUMA.A01-Phoenix',
  major: 1,
  minor: 0,
  patch: 0,
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
  redis: {
    enabled: process.env.REDIS_ENABLED === 'true',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0', 10)
  },
  jwt: {
    secret: process.env.JWT_ACCESS_SECRET || 'luma_jwt_secret_key_change_in_production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'luma_jwt_refresh_secret_key_change_in_production',
    accessExpiresIn: (process.env.NODE_ENV || 'development') === 'development'
      ? parseInt(process.env.JWT_ACCESS_EXPIRES_IN || '86400', 10) // 24 heures en dev
      : parseInt(process.env.JWT_ACCESS_EXPIRES_IN || '3600', 10), // 1 heure en prod
    refreshExpiresIn: (process.env.NODE_ENV || 'development') === 'development'
      ? parseInt(process.env.JWT_REFRESH_EXPIRES_IN || '2592000', 10)
      : parseInt(process.env.JWT_REFRESH_EXPIRES_IN || '604800', 10),
    rememberMeAccessExpiresIn: parseInt(process.env.JWT_REMEMBER_ME_ACCESS_EXPIRES_IN || '604800', 10), // 7 jours
    rememberMeRefreshExpiresIn: parseInt(process.env.JWT_REMEMBER_ME_REFRESH_EXPIRES_IN || '2592000', 10), // 30 jours
    issuer: 'luma-api',
    audience: 'luma-client',
    jwtid: true,
    clockTolerance: 30,
    algorithm: process.env.JWT_ALGORITHM || 'HS256',
    cookieSecure: process.env.NODE_ENV === 'production', // Cookies sécurisés en production uniquement
    cookieHttpOnly: true,
    cookieSameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'none', // Plus permissif en dev
    cookieDomain: process.env.NODE_ENV === 'production' ? '.mhemery.fr' : undefined,
    blacklistEnabled: true,
    blacklistTolerance: 60 * 60 * 24 * 7
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
    profile: '/profile',
    refresh: '/refresh'
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