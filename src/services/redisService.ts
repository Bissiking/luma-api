import { createClient } from 'redis';
import { logger } from '../config/logger';
import { CONFIG } from '../config/api.config';

// Log explicite au démarrage
if (CONFIG.redis.enabled) {
  logger.info('[REDIS] Redis est ACTIVÉ dans la configuration.');
} else {
  logger.info('[REDIS] Redis est DÉSACTIVÉ dans la configuration.');
}

class RedisService {
  private static client: ReturnType<typeof createClient>;
  private static isConnected = false;
  private static isBroken = false;

  static async connect() {
    if (!CONFIG.redis.enabled) return null;
    if (this.isBroken) return null;
    try {
      if (!this.client) {
        this.client = createClient({
          url: process.env.REDIS_URL || 'redis://localhost:6379'
        });

        this.client.on('error', (err) => {
          logger.warn('[REDIS] Erreur de connexion, Redis sera ignoré :', err);
          this.isConnected = false;
          this.isBroken = true;
        });

        this.client.on('connect', () => {
          logger.info('Connecté à Redis');
          this.isConnected = true;
          this.isBroken = false;
        });

        await this.client.connect();
      }
      return this.client;
    } catch (error) {
      logger.warn('[REDIS] Impossible de se connecter à Redis, il sera ignoré :', error);
      this.isBroken = true;
      return null;
    }
  }

  static async isTokenBlacklisted(jti: string): Promise<boolean> {
    if (!CONFIG.redis.enabled || this.isBroken) return false;
    try {
      if (!this.isConnected) await this.connect();
      if (this.isBroken) return false;
      const exists = await this.client.exists(`blacklist:${jti}`);
      return exists === 1;
    } catch (error) {
      logger.warn('[REDIS] Erreur lors de la vérification de la blacklist, Redis ignoré :', error);
      this.isBroken = true;
      return false;
    }
  }

  static async blacklistToken(jti: string, expiresIn: number): Promise<void> {
    if (!CONFIG.redis.enabled || this.isBroken) return;
    try {
      if (!this.isConnected) await this.connect();
      if (this.isBroken) return;
      await this.client.setEx(`blacklist:${jti}`, expiresIn, '1');
      logger.debug(`Token ${jti} ajouté à la blacklist pour ${expiresIn} secondes`);
    } catch (error) {
      logger.warn('[REDIS] Erreur lors de l\'ajout à la blacklist, Redis ignoré :', error);
      this.isBroken = true;
    }
  }

  static async disconnect(): Promise<void> {
    if (!CONFIG.redis.enabled || this.isBroken) return;
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
    }
  }
}

export default RedisService; 