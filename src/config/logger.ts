import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';

// Définir les niveaux de log et leurs couleurs
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'cyan',
};

// Ajouter les couleurs à winston
winston.addColors(colors);

// Définir le format de log
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Définir le dossier de logs
const logDir = process.env.LOG_DIR || 'logs';

// Créer les transports pour les différents niveaux de log
const errorFileTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxSize: '10m',
  maxFiles: '14d',
  format
});

const combinedFileTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logDir, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '10m',
  maxFiles: '14d',
  format
});

const httpFileTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logDir, 'http-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'http',
  maxSize: '10m',
  maxFiles: '7d',
  format
});

// Format pour la console
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}${info.stack ? `\n${info.stack}` : ''}`
  )
);

// Créer les loggers pour différentes parties de l'application
export const logger = winston.createLogger({
  levels,
  format,
  defaultMeta: { service: 'luma-api' },
  transports: [
    // Tous les logs
    combinedFileTransport,
    // Seulement les logs d'erreur
    errorFileTransport,
    // Seulement les logs HTTP
    httpFileTransport,
    // Console en environnement de développement
    new winston.transports.Console({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      format: consoleFormat,
    }),
  ],
  exitOnError: false,
});

// Logger spécifique pour la base de données
export const dbLogger = winston.createLogger({
  levels,
  format,
  defaultMeta: { service: 'luma-db' },
  transports: [
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, 'db-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '7d',
      format
    }),
    // Console en environnement de développement
    new winston.transports.Console({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      format: consoleFormat,
    }),
  ],
  exitOnError: false,
}); 