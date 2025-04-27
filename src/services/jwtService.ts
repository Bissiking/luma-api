import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import { CONFIG } from '../config/api.config';
import User from '../models/User';
import UserToken from '../models/UserToken';
import { logger } from '../config/logger';
import RedisService from './redisService';

/**
 * Service pour la gestion des JWT (JSON Web Tokens)
 */
export class JwtService {
  /**
   * Génère un access token JWT pour l'utilisateur spécifié
   * @param user L'utilisateur pour lequel générer le token
   * @param rememberMe Si l'utilisateur souhaite être connecté plus longtemps
   * @param source Source de la génération du token (ex: 'web', 'mobile')
   * @returns Un objet contenant le token et sa date d'expiration
   */
  static async generateAccessToken(user: any, rememberMe = false, source = 'LUMA'): Promise<{ token: string, expiresAt: Date, jti: string }> {
    try {
      // Déterminer la durée de validité du token
      const expiresIn = rememberMe 
        ? CONFIG.jwt.rememberMeAccessExpiresIn 
        : CONFIG.jwt.accessExpiresIn;
      
      // Calculer la date d'expiration
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);
      
      // Générer un identifiant unique pour le token
      const jti = uuidv4();
      
      // Créer le payload du token avec toutes les informations nécessaires
      const payload = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.account_active,
        source,
        jti
      };
      
      // Options de signature du token
      const options = {
        expiresIn,
        issuer: CONFIG.jwt.issuer,
        audience: CONFIG.jwt.audience,
        algorithm: CONFIG.jwt.algorithm as jwt.Algorithm
      };
      
      // Générer le token
      const token = jwt.sign(payload, CONFIG.jwt.secret, options);
      
      return { token, expiresAt, jti };
    } catch (error: any) {
      logger.error(`Erreur lors de la génération du access token: ${error.message}`);
      throw new Error(`Erreur lors de la génération du token: ${error.message}`);
    }
  }
  
  /**
   * Génère un refresh token JWT pour l'utilisateur spécifié
   * @param user L'utilisateur pour lequel générer le token
   * @param rememberMe Si l'utilisateur souhaite être connecté plus longtemps
   * @param source Source de la génération du token (ex: 'web', 'mobile')
   * @returns Un objet contenant le token et sa date d'expiration
   */
  static async generateRefreshToken(user: any, rememberMe = false, source = 'LUMA'): Promise<{ token: string, expiresAt: Date, jti: string }> {
    try {
      // Déterminer la durée de validité du token
      const expiresIn = rememberMe 
        ? CONFIG.jwt.rememberMeRefreshExpiresIn 
        : CONFIG.jwt.refreshExpiresIn;
      
      // Calculer la date d'expiration
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);
      
      // Générer un identifiant unique pour le token
      const jti = uuidv4();
      
      // Créer le payload du token (minimal pour les refresh tokens)
      const payload = {
        id: user.id,
        jti,
        source
      };
      
      // Options de signature du token
      const options = {
        expiresIn,
        issuer: CONFIG.jwt.issuer,
        audience: CONFIG.jwt.audience,
        algorithm: CONFIG.jwt.algorithm as jwt.Algorithm
      };
      
      // Générer le token avec le secret spécifique pour les refresh tokens
      const token = jwt.sign(payload, CONFIG.jwt.refreshSecret, options);
      
      return { token, expiresAt, jti };
    } catch (error: any) {
      logger.error(`Erreur lors de la génération du refresh token: ${error.message}`);
      throw new Error(`Erreur lors de la génération du refresh token: ${error.message}`);
    }
  }
  
  /**
   * Génère à la fois un access token et un refresh token
   * @param user L'utilisateur pour lequel générer les tokens
   * @param rememberMe Si l'utilisateur souhaite être connecté plus longtemps
   * @param source Source de la génération des tokens
   * @returns Un objet contenant les deux tokens et leurs dates d'expiration
   */
  static async generateTokenPair(user: any, rememberMe = false, source = 'LUMA'): Promise<{
    accessToken: string,
    refreshToken: string,
    accessExpiresAt: Date,
    refreshExpiresAt: Date,
    accessJti: string,
    refreshJti: string
  }> {
    try {
      // Générer les deux tokens en parallèle
      const [accessResult, refreshResult] = await Promise.all([
        this.generateAccessToken(user, rememberMe, source),
        this.generateRefreshToken(user, rememberMe, source)
      ]);
      
      return {
        accessToken: accessResult.token,
        refreshToken: refreshResult.token,
        accessExpiresAt: accessResult.expiresAt,
        refreshExpiresAt: refreshResult.expiresAt,
        accessJti: accessResult.jti,
        refreshJti: refreshResult.jti
      };
    } catch (error: any) {
      logger.error(`Erreur lors de la génération des tokens: ${error.message}`);
      throw new Error(`Erreur lors de la génération des tokens: ${error.message}`);
    }
  }
  
  /**
   * Vérifie la validité d'un refresh token et génère un nouveau access token
   * @param refreshToken Le refresh token à vérifier
   * @param rememberMe Si l'utilisateur souhaite être connecté plus longtemps
   * @param source Source de la génération du token
   * @returns Un objet contenant le nouveau access token, un nouveau refresh token (rotation) et leurs dates d'expiration
   */
  static async refreshAccessToken(refreshToken: string, rememberMe = false, source = 'LUMA'): Promise<{
    accessToken: string,
    refreshToken: string,
    accessExpiresAt: Date,
    refreshExpiresAt: Date
  }> {
    try {
      // Vérifier le refresh token
      const decoded = jwt.verify(refreshToken, CONFIG.jwt.refreshSecret) as any;
      
      // Vérifier si le token est dans la blacklist Redis
      const isRevoked = await this.isTokenRevoked(decoded.jti);
      if (isRevoked) {
        throw new Error('Refresh token révoqué');
      }
      
      // Récupérer l'utilisateur
      const user = await User.findByPk(decoded.id);
      if (!user || !user.account_active) {
        throw new Error('Utilisateur non trouvé ou inactif');
      }
      
      // Ajouter l'ancien token à la blacklist Redis
      const remainingTime = Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));
      if (remainingTime > 0) {
        await RedisService.blacklistToken(decoded.jti, remainingTime);
      }
      
      // Transférer les informations d'appareil et IP si présentes
      if (decoded.device_info) user.device_info = decoded.device_info;
      if (decoded.ip_address) user.ip_address = decoded.ip_address;
      
      // Générer de nouveaux tokens
      const tokens = await this.generateTokenPair(user, rememberMe, source);
      
      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessExpiresAt: tokens.accessExpiresAt,
        refreshExpiresAt: tokens.refreshExpiresAt
      };
    } catch (error: any) {
      logger.error(`Erreur lors du rafraîchissement du token: ${error.message}`);
      throw new Error(`Erreur lors du rafraîchissement du token: ${error.message}`);
    }
  }
  
  /**
   * Révoque tous les tokens d'un utilisateur
   * @param userId Identifiant de l'utilisateur
   * @param revokedBy Identifiant de l'utilisateur qui révoque les tokens (admin ou l'utilisateur lui-même)
   * @returns Le nombre de tokens révoqués
   */
  static async revokeAllUserTokens(userId: number, revokedBy: number): Promise<number> {
    try {
      const result = await UserToken.update(
        {
          revoked: 1,
          revoked_at: new Date(),
          revoked_by: revokedBy
        },
        {
          where: {
            user_id: userId,
            revoked: 0
          }
        }
      );
      
      return Array.isArray(result) ? result[0] : result;
    } catch (error: any) {
      logger.error(`Erreur lors de la révocation des tokens: ${error.message}`);
      throw new Error(`Erreur lors de la révocation des tokens: ${error.message}`);
    }
  }
  
  /**
   * Révoque un token
   * @param jti Identifiant unique du token
   * @param revokedBy Identifiant de l'utilisateur qui révoque le token (optionnel)
   * @param expiresIn Durée en secondes avant expiration (optionnel)
   */
  static async revokeToken(jti: string, revokedBy?: number, expiresIn?: number): Promise<void> {
    try {
      // Ajouter à la blacklist Redis
      if (expiresIn) {
        await RedisService.blacklistToken(jti, expiresIn);
      }

      // Si revokedBy est fourni, mettre à jour aussi dans la base de données
      if (revokedBy) {
        const token = await UserToken.findOne({
          where: {
            jti,
            revoked: 0
          }
        });
        
        if (token) {
          await token.update({
            revoked: 1,
            revoked_at: new Date(),
            revoked_by: revokedBy
          });
        }
      }
    } catch (error: any) {
      logger.error(`Erreur lors de la révocation du token: ${error.message}`);
      throw new Error(`Erreur lors de la révocation du token: ${error.message}`);
    }
  }
  
  /**
   * Nettoie les tokens expirés de la base de données
   * @returns Le nombre de tokens supprimés
   */
  static async cleanupExpiredTokens(): Promise<number> {
    try {
      // Supprimer les tokens expirés depuis plus de X jours
      const cutoffDate = new Date();
      cutoffDate.setSeconds(cutoffDate.getSeconds() - CONFIG.jwt.blacklistTolerance);
      
      const result = await UserToken.destroy({
        where: {
          expires_at: {
            [Op.lt]: cutoffDate
          }
        }
      });
      
      logger.info(`${result} tokens expirés ont été nettoyés`);
      return result;
    } catch (error: any) {
      logger.error(`Erreur lors du nettoyage des tokens expirés: ${error.message}`);
      throw new Error(`Erreur lors du nettoyage des tokens expirés: ${error.message}`);
    }
  }

  /**
   * Vérifie si un token est révoqué
   * @param jti Identifiant unique du token
   */
  static async isTokenRevoked(jti: string): Promise<boolean> {
    return RedisService.isTokenBlacklisted(jti);
  }
}

export default JwtService; 