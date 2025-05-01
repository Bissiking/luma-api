import Redis from 'ioredis';
import { CONFIG } from '../config/api.config';
import { logger } from '../config/logger';
import dotenv from 'dotenv';
dotenv.config();

// Interface pour les sessions Redis
export interface SessionData {
  userId: number;
  username: string;
  role: string;
  lastActivity: number;
  deviceInfo: string;
  ipAddress: string;
}

class RedisService {
  private static instance: RedisService;
  private client!: Redis;

  private constructor() {
    if (!CONFIG.redis.enabled) {
      logger.warn('Redis est désactivé dans la configuration');
      return;
    }

    try {
      const redisHost = process.env.REDIS_URL; // IP fixe de Redis
      const redisPort = 6379;

      logger.info(`Tentative de connexion à Redis sur ${redisHost}:${redisPort}`);

      this.client = new Redis({
        host: redisHost,
        port: redisPort,
        password: process.env.REDIS_PASSWORD || CONFIG.redis.password || undefined,
        db: parseInt(process.env.REDIS_DB || CONFIG.redis.db.toString(), 10),
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableOfflineQueue: true,
        connectTimeout: 10000,
        commandTimeout: 10000,
        lazyConnect: true
      });

      this.client.on('error', (error) => {
        logger.error('Erreur Redis fatale', {
          error: error.message,
          host: redisHost,
          port: redisPort
        });
        logger.error('Veuillez vérifier que Redis est accessible sur cette adresse');
        process.exit(1);
      });

      this.client.on('connect', () => {
        logger.info(`Connecté à Redis sur ${redisHost}:${redisPort}`);
      });

      // Vérification de la connexion au démarrage
      this.checkConnection();
    } catch (error) {
      logger.error('Erreur lors de l\'initialisation de Redis', error);
      logger.error('Veuillez vérifier que Redis est accessible sur cette adresse');
      process.exit(1);
    }
  }

  private async checkConnection(): Promise<void> {
    try {
      await this.client.connect(); // Connexion explicite
      const result = await this.client.ping();
      if (result !== 'PONG') {
        throw new Error('Réponse Redis invalide');
      }
      logger.info('Test de connexion Redis réussi');
    } catch (error) {
      logger.error('Impossible de se connecter à Redis', {
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        host: this.client.options.host,
        port: this.client.options.port
      });
      logger.error('Veuillez vérifier que Redis est accessible sur cette adresse');
      process.exit(1);
    }
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  /**
   * Récupère une session depuis Redis
   */
  public async getSession(sessionKey: string): Promise<SessionData | null> {
    try {
      const data = await this.client.get(sessionKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Erreur lors de la récupération de la session', error);
      return null;
    }
  }

  /**
   * Crée ou met à jour une session dans Redis
   */
  public async setSession(sessionKey: string, data: SessionData, ttl: number): Promise<void> {
    try {
      await this.client.setex(sessionKey, ttl, JSON.stringify(data));
    } catch (error) {
      logger.error('Erreur lors de la sauvegarde de la session', error);
    }
  }

  /**
   * Met à jour une session existante
   */
  public async updateSession(sessionKey: string, data: SessionData): Promise<void> {
    try {
      const ttl = await this.client.ttl(sessionKey);
      if (ttl > 0) {
        await this.client.setex(sessionKey, ttl, JSON.stringify(data));
      }
    } catch (error) {
      logger.error('Erreur lors de la mise à jour de la session', error);
    }
  }

  /**
   * Vérifie si un token est révoqué
   */
  public async isTokenRevoked(tokenId: string): Promise<boolean> {
    try {
      const exists = await this.client.exists(`revoked:${tokenId}`);
      return exists === 1;
    } catch (error) {
      logger.error('Erreur lors de la vérification du token révoqué', error);
      return false;
    }
  }

  /**
   * Révoque un token
   */
  public async revokeToken(tokenId: string, ttl: number): Promise<void> {
    try {
      await this.client.setex(`revoked:${tokenId}`, ttl, '1');
    } catch (error) {
      logger.error('Erreur lors de la révocation du token', error);
    }
  }

  /**
   * Supprime une session
   */
  public async deleteSession(sessionKey: string): Promise<void> {
    try {
      await this.client.del(sessionKey);
    } catch (error) {
      logger.error('Erreur lors de la suppression de la session', error);
    }
  }

  /**
   * Récupère toutes les sessions actives d'un utilisateur
   */
  public async getUserSessions(userId: number): Promise<SessionData[]> {
    try {
      const keys = await this.client.keys(`session:*`);
      const sessions: SessionData[] = [];

      for (const key of keys) {
        const data = await this.client.get(key);
        if (data) {
          const session = JSON.parse(data);
          if (session.userId === userId) {
            sessions.push(session);
          }
        }
      }

      return sessions;
    } catch (error) {
      logger.error('Erreur lors de la récupération des sessions utilisateur', error);
      return [];
    }
  }

  /**
   * Ajoute un token à la liste noire
   */
  public async blacklistToken(tokenId: string, ttl: number): Promise<void> {
    try {
      await this.client.setex(`blacklist:${tokenId}`, ttl, '1');
    } catch (error) {
      logger.error('Erreur lors de l\'ajout du token à la liste noire', error);
    }
  }

  /**
   * Vérifie si un token est dans la liste noire
   */
  public async isTokenBlacklisted(tokenId: string): Promise<boolean> {
    try {
      const exists = await this.client.exists(`blacklist:${tokenId}`);
      return exists === 1;
    } catch (error) {
      logger.error('Erreur lors de la vérification du token dans la liste noire', error);
      return false;
    }
  }
}

export default RedisService.getInstance(); 