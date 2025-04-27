import { Request } from 'express';
import jwt from 'jsonwebtoken';
import { CONFIG } from '../config/api.config';
import User from '../models/User';
import UserToken from '../models/UserToken';
import { logger } from '../config/logger';
import { Op } from 'sequelize';

/**
 * Classe utilitaire pour la validation des tokens JWT et des utilisateurs
 */
export class AuthValidator {
  /**
   * Vérifie si un utilisateur existe et est actif
   * @param username Nom d'utilisateur ou email
   * @returns L'utilisateur s'il existe, null sinon
   */
  static async validateUserExists(username: string): Promise<any> {
    try {
      const user = await User.findOne({
        where: {
          [Op.or]: [
            { username },
            { email: username }
          ]
        }
      });
      
      return user;
    } catch (error: any) {
      logger.error(`Erreur lors de la validation de l'utilisateur: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Vérifie si un utilisateur est actif
   * @param user Objet utilisateur
   * @returns true si l'utilisateur est actif, false sinon
   */
  static isUserActive(user: any): boolean {
    return user && user.account_active === true;
  }
  
  /**
   * Vérifie si un utilisateur a le rôle requis
   * @param user Objet utilisateur
   * @param requiredRoles Liste des rôles autorisés
   * @returns true si l'utilisateur a un des rôles requis, false sinon
   */
  static userHasRole(user: any, requiredRoles: string[]): boolean {
    return user && requiredRoles.includes(user.role);
  }
  
  /**
   * Extrait le token JWT de la requête (en-têtes, cookies, query params, body)
   * @param req Requête Express
   * @returns Le token JWT ou null si non trouvé
   */
  static extractTokenFromRequest(req: Request): string | null {
    // 1. Chercher dans l'en-tête Authorization
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      const token = req.headers.authorization.split(' ')[1];
      console.log(`[AUTH] Token trouvé dans l'en-tête Authorization: ${token ? token.substring(0, 10) + '...' : 'null'}`);
      return token;
    }
    
    // 2. Chercher dans les cookies
    if (req.cookies && req.cookies.token) {
      console.log(`[AUTH] Token trouvé dans les cookies: ${req.cookies.token ? req.cookies.token.substring(0, 10) + '...' : 'null'}`);
      return req.cookies.token;
    }
    
    // 3. Chercher dans les query params (moins sécurisé)
    if (req.query && req.query.token) {
      console.log(`[AUTH] Token trouvé dans la query: ${req.query.token ? (req.query.token as string).substring(0, 10) + '...' : 'null'}`);
      return req.query.token as string;
    }
    
    // 4. Chercher dans le body (moins sécurisé)
    if (req.body && req.body.token) {
      console.log(`[AUTH] Token trouvé dans le body: ${req.body.token ? req.body.token.substring(0, 10) + '...' : 'null'}`);
      return req.body.token;
    }
    
    console.log('[AUTH] Aucun token trouvé dans la requête');
    return null;
  }
  
  /**
   * Extrait le refresh token de la requête
   * @param req Requête Express
   * @returns Le refresh token ou null si non trouvé
   */
  static extractRefreshTokenFromRequest(req: Request): string | null {
    // 1. Chercher dans les cookies (méthode recommandée)
    if (req.cookies && req.cookies.refresh_token) {
      return req.cookies.refresh_token;
    }
    
    // 2. Chercher dans le body
    if (req.body && req.body.refresh_token) {
      return req.body.refresh_token;
    }
    
    return null;
  }
  
  /**
   * Vérifie un token JWT
   * @param token Token JWT à vérifier
   * @param type Type de token ('access' ou 'refresh')
   * @returns Les données décodées du token si valide, null sinon
   */
  static async verifyToken(token: string, type: 'access' | 'refresh' = 'access'): Promise<any> {
    try {
      const secret = type === 'access' ? CONFIG.jwt.secret : CONFIG.jwt.refreshSecret;
      
      // Log du token reçu (masqué pour la sécurité)
      const maskedToken = `${token.substring(0, 10)}...${token.substring(token.length - 10)}`;
      const validationInfo = {
        type,
        maskedToken,
        timestamp: new Date().toISOString()
      };
      logger.debug('Début de validation du token', validationInfo);

      const options = {
        algorithms: [CONFIG.jwt.algorithm] as jwt.Algorithm[],
        issuer: CONFIG.jwt.issuer,
        audience: CONFIG.jwt.audience,
        clockTolerance: CONFIG.jwt.clockTolerance
      };
      
      // Vérifier la signature du token
      const decoded = jwt.verify(token, secret, options) as any;
      const decodedInfo = {
        ...validationInfo,
        jti: decoded.jti,
        userId: decoded.id,
        exp: new Date(decoded.exp * 1000).toISOString(),
        iat: new Date(decoded.iat * 1000).toISOString()
      };
      logger.debug('Token décodé avec succès', decodedInfo);
      
      // Vérifier si le token existe dans la base de données et n'est pas révoqué
      const userToken = await UserToken.findOne({
        where: {
          jti: decoded.jti,
          revoked: 0,
          token_type: type
        }
      });
      
      if (!userToken) {
        const notFoundInfo = {
          ...decodedInfo,
          error: 'Token non trouvé en base ou révoqué'
        };
        logger.warn('Token non trouvé en base ou révoqué', notFoundInfo);
        return null;
      }
      
      // Vérifier si le token n'a pas expiré en base de données
      const now = new Date();
      const expiresAt = new Date(userToken.expires_at);
      if (now > expiresAt) {
        const expirationInfo = {
          ...decodedInfo,
          error: 'Token expiré en base',
          expiresAt: expiresAt.toISOString(),
          now: now.toISOString()
        };
        logger.warn('Token expiré en base', expirationInfo);
        await userToken.update({ revoked: 1, revoked_at: now });
        return null;
      }

      const successInfo = {
        ...decodedInfo,
        expiresAt: expiresAt.toISOString(),
        status: 'valid'
      };
      logger.debug('Token validé avec succès', successInfo);
      
      return {
        decoded,
        userToken
      };
    } catch (error) {
      const errorInfo = {
        type,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        name: error instanceof Error ? error.name : 'UnknownError'
      };

      if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Erreur de validation JWT', errorInfo);
      } else {
        logger.error('Erreur inattendue lors de la validation du token', errorInfo);
      }
      return null;
    }
  }
  
  /**
   * Vérifie si un utilisateur a les droits d'administrateur
   * @param user Objet utilisateur
   * @returns true si l'utilisateur est admin, false sinon
   */
  static isAdmin(user: any): boolean {
    return user && user.role === 'admin';
  }
  
  /**
   * Vérifie si un utilisateur est admin du compte
   * @param user Objet utilisateur
   * @returns true si l'utilisateur est admin du compte, false sinon
   */
  static isAccountAdmin(user: any): boolean {
    return user && user.account_administrator === true;
  }
  
  /**
   * Valide les paramètres d'inscription
   * @param userData Données d'inscription
   * @returns Un objet contenant les erreurs ou null si pas d'erreur
   */
  static validateRegistration(userData: any): { [field: string]: string } | null {
    const errors: { [field: string]: string } = {};
    
    // Validation du nom d'utilisateur
    if (!userData.username || userData.username.length < 3) {
      errors.username = "Le nom d'utilisateur doit contenir au moins 3 caractères";
    } else if (userData.username.length > 50) {
      errors.username = "Le nom d'utilisateur ne peut pas dépasser 50 caractères";
    }
    
    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!userData.email || !emailRegex.test(userData.email)) {
      errors.email = "L'adresse email n'est pas valide";
    }
    
    // Validation du mot de passe
    if (!userData.password || userData.password.length < 8) {
      errors.password = "Le mot de passe doit contenir au moins 8 caractères";
    } else if (userData.password.length > 100) {
      errors.password = "Le mot de passe ne peut pas dépasser 100 caractères";
    }
    
    return Object.keys(errors).length > 0 ? errors : null;
  }
  
  /**
   * Valide les paramètres de connexion
   * @param loginData Données de connexion
   * @returns Un objet contenant les erreurs ou null si pas d'erreur
   */
  static validateLogin(loginData: any): { [field: string]: string } | null {
    const errors: { [field: string]: string } = {};
    
    // Validation du nom d'utilisateur/email
    if (!loginData.username) {
      errors.username = "Le nom d'utilisateur ou l'email est requis";
    }
    
    // Validation du mot de passe
    if (!loginData.password) {
      errors.password = "Le mot de passe est requis";
    }
    
    return Object.keys(errors).length > 0 ? errors : null;
  }
}

export default AuthValidator; 