import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

/**
 * Liste des origines autorisées
 * Vous pouvez ajouter d'autres domaines selon les besoins
 */
const allowedOrigins = [
  'https://dev.mhemery.fr',
  'https://mhemery.fr',
  'http://localhost:3000',
  'http://localhost:8080'
];

/**
 * Middleware CORS personnalisé pour gérer les requêtes avec credentials
 */
export const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  
  // Permet les requêtes sans origine (ex: Postman)
  if (!origin) {
    return next();
  }

  // Si l'origine est dans la liste des origines autorisées
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // Log des requêtes CORS (échantillonnage pour éviter trop de logs)
    if (Math.random() < 0.01) {
      logger.debug('Requête CORS autorisée', { 
        origin,
        path: req.path,
        method: req.method
      });
    }
  } else {
    // Si l'origine n'est pas autorisée, log et bloque
    logger.warn('Tentative d\'accès CORS depuis une origine non autorisée', {
      origin,
      path: req.path,
      method: req.method,
      ip: req.ip
    });
  }

  // Gestion des requêtes preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
}; 