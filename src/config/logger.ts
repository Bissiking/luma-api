import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Créer le répertoire de logs s'il n'existe pas
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Définir les formats de logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message }) => {
    return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  })
);

// Créer les transports
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    logFormat
  )
});

const fileTransport = new winston.transports.File({
  filename: path.join(logDir, 'api.log'),
  format: logFormat,
  maxsize: 5242880, // 5MB
  maxFiles: 5
});

const errorTransport = new winston.transports.File({
  filename: path.join(logDir, 'error.log'),
  format: logFormat,
  level: 'error',
  maxsize: 5242880, // 5MB
  maxFiles: 5
});

const dbTransport = new winston.transports.File({
  filename: path.join(logDir, 'db.log'),
  format: logFormat,
  maxsize: 5242880, // 5MB
  maxFiles: 5
});

// Créer le logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    consoleTransport,
    fileTransport,
    errorTransport
  ]
});

// Logger spécifique pour les opérations de base de données
const dbLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    consoleTransport,
    dbTransport
  ]
});

export { logger, dbLogger }; 