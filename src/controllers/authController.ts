import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import User from '../models/User';
import UserToken from '../models/UserToken';
import { logger } from '../config/logger';
import { logLoginActivity, logLogoutActivity } from '../utils/activityLogger';
import { CONFIG } from '../config/api.config';
import JwtService from '../services/jwtService';
import AuthValidator from '../utils/authValidator';
import AuthorizationService from '../services/authorizationService';

// Durée de validité du token JWT en secondes (24 heures)
const TOKEN_EXPIRATION = 60 * 60 * 24;

/**
 * Inscription d'un nouvel utilisateur
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password, name } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await AuthValidator.validateUserExists(username) || 
                         await AuthValidator.validateUserExists(email);

    if (existingUser) {
      logger.warn(`Tentative d'inscription avec un nom d'utilisateur ou email déjà utilisé: ${username}, ${email}`);
      res.status(409).json({ 
        success: false,
        message: 'Nom d\'utilisateur ou email déjà utilisé' 
      });
      return;
    }

    // Créer le nouvel utilisateur
    const user = await User.create({
      username,
      email,
      password,
      name: name || 'Utilisateur',
      role: 'user',
      account_administrator: false,
      account_active: true
    } as any);

    logger.info(`Nouvel utilisateur créé: ${username}`);

    // Ajouter les informations du client
    user.device_info = req.headers['user-agent'];
    user.ip_address = req.ip;

    // Générer les tokens JWT
    const { accessToken, refreshToken, accessExpiresAt, refreshExpiresAt } = 
      await JwtService.generateTokenPair(user, false, 'register');

    // Journaliser l'activité de connexion
    const decodedToken = jwt.decode(accessToken) as any;
    await logLoginActivity(user.id, true, req, decodedToken?.jti, 'register');

    // Définir les cookies si configuré
    if (CONFIG.jwt.cookieHttpOnly) {
      res.cookie('refresh_token', refreshToken, {
        httpOnly: CONFIG.jwt.cookieHttpOnly,
        secure: CONFIG.jwt.cookieSecure,
        sameSite: CONFIG.jwt.cookieSameSite as 'strict' | 'lax' | 'none' | boolean,
        maxAge: CONFIG.jwt.refreshExpiresIn * 1000
      });
    }

    // Répondre avec les informations de l'utilisateur
    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role
      },
      token: accessToken,
      refresh_token: refreshToken,
      expires_at: accessExpiresAt.toISOString(),
      refresh_expires_at: refreshExpiresAt.toISOString()
    });
  } catch (error: any) {
    logger.error(`Erreur lors de l'inscription: ${error.message}`);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de l\'inscription', 
      error: error.message 
    });
  }
};

/**
 * Connexion d'un utilisateur
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password, remember_me, source = 'LUMA' } = req.body;

    // Trouver l'utilisateur
    const user = await AuthValidator.validateUserExists(username);

    if (!user) {
      logger.warn(`Tentative de connexion avec un utilisateur inexistant: ${username}`, {
        source,
        username
      });
      await logLoginActivity(0, false, req, undefined, source);
      res.status(401).json({ 
        success: false,
        message: 'Identifiants invalides' 
      });
      return;
    }

    // Vérifier si le compte est actif
    if (!AuthValidator.isUserActive(user)) {
      logger.warn(`Tentative de connexion sur un compte désactivé: ${username}`, {
        source,
        userId: user.id
      });
      await logLoginActivity(user.id, false, req, undefined, source);
      res.status(403).json({ 
        success: false,
        message: 'Compte désactivé' 
      });
      return;
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      logger.warn(`Tentative de connexion avec un mot de passe invalide pour: ${username}`, {
        source,
        userId: user.id
      });
      await logLoginActivity(user.id, false, req, undefined, source);
      res.status(401).json({ 
        success: false,
        message: 'Identifiants invalides' 
      });
      return;
    }

    // Ajouter les informations du client
    user.device_info = req.headers['user-agent'];
    user.ip_address = req.ip;

    // Générer les tokens JWT
    const { accessToken, refreshToken, accessExpiresAt, refreshExpiresAt, accessJti } = 
      await JwtService.generateTokenPair(user, remember_me === true, source);

    // Mettre à jour la date de dernière connexion
    await user.update({
      last_login: new Date()
    });

    // Récupérer les autorisations de l'utilisateur
    const authorizations = await AuthorizationService.getUserAuthorizations(user.id);

    // Journaliser la connexion réussie
    await logLoginActivity(user.id, true, req, accessJti, source);

    logger.info(`Connexion réussie pour l'utilisateur: ${username}`, {
      source,
      userId: user.id
    });

    // Définir les cookies si configuré
    if (CONFIG.jwt.cookieHttpOnly) {
      // Refresh token dans un cookie httpOnly
      res.cookie('refresh_token', refreshToken, {
        httpOnly: CONFIG.jwt.cookieHttpOnly,
        secure: CONFIG.jwt.cookieSecure,
        sameSite: CONFIG.jwt.cookieSameSite as 'strict' | 'lax' | 'none' | boolean,
        maxAge: (remember_me === true ? CONFIG.jwt.rememberMeRefreshExpiresIn : CONFIG.jwt.refreshExpiresIn) * 1000
      });
    }

    res.json({
      success: true,
      message: 'Connexion réussie',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        name: user.name
      },
      authorizations: {
        groups: authorizations.groups,
        permissions: authorizations.permissions
      },
      token: accessToken,
      refresh_token: refreshToken,
      expires_at: accessExpiresAt.toISOString(),
      refresh_expires_at: refreshExpiresAt.toISOString(),
      redirectTo: '/dashboard',
      storage: 'sessionStorage'
    });
  } catch (error: any) {
    logger.error(`Erreur lors de la connexion: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la connexion',
      error: error.message
    });
  }
};

/**
 * Déconnexion d'un utilisateur
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.token) {
      // Révoquer le token d'accès actuel
      await JwtService.revokeToken(req.token.jti, req.user.id);
      
      // Chercher et révoquer tous les refresh tokens de l'utilisateur
      // Option 1: Révoquer uniquement le refresh token associé à cette session
      const refreshToken = AuthValidator.extractRefreshTokenFromRequest(req);
      if (refreshToken) {
        try {
          const decodedRefresh = jwt.verify(refreshToken, CONFIG.jwt.refreshSecret) as any;
          await JwtService.revokeToken(decodedRefresh.jti, req.user.id);
        } catch (error) {
          // Ignorer les erreurs de vérification de refresh token
          logger.debug('Impossible de révoquer le refresh token fourni.');
        }
      }
      
      // Option 2 (optionnelle): Révoquer tous les tokens de l'utilisateur (déconnexion de tous les appareils)
      // Si le paramètre all_devices est fourni
      if (req.body.all_devices === true || req.query.all_devices === 'true') {
        await JwtService.revokeAllUserTokens(req.user.id, req.user.id);
        logger.info(`Tous les tokens de l'utilisateur ${req.user.username} ont été révoqués`);
      }

      // Journaliser la déconnexion
      await logLogoutActivity(req.user.id, req, req.token.jti);

      logger.info(`Déconnexion réussie pour l'utilisateur: ${req.user.username}`);
    }
    
    // Effacer le cookie de refresh token s'il existe
    if (CONFIG.jwt.cookieHttpOnly) {
      res.clearCookie('refresh_token');
    }

    res.json({
      success: true,
      message: 'Déconnexion réussie'
    });
  } catch (error: any) {
    logger.error(`Erreur lors de la déconnexion: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la déconnexion',
      error: error.message
    });
  }
};

/**
 * Vérifier la validité du token
 */
export const verifyToken = async (req: Request, res: Response): Promise<void> => {
  try {
    // Si on arrive ici, c'est que le middleware d'authentification a déjà validé le token
    res.json({
      success: true,
      message: 'Token valide',
      data: {
        user: {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email,
          role: req.user.role,
          name: req.user.name
        },
        token: {
          expires_at: req.token.expires_at
        }
      }
    });
  } catch (error: any) {
    logger.error(`Erreur lors de la vérification du token: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification',
      error: error.message
    });
  }
};

/**
 * Vérifier la validité du token avec des informations d'identification (pour CORS)
 */
export const verifyTokenWithCredentials = async (req: Request, res: Response): Promise<any> => {
  // Si on atteint cette méthode, c'est que le token a déjà été vérifié par le middleware
    return res.json({
      success: true,
      message: 'Token valide',
      data: {
        user: {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email,
          role: req.user.role,
          name: req.user.name
        }
      }
    });
};

/**
 * Récupère le profil de l'utilisateur connecté
 */
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;

    // Récupérer l'utilisateur depuis la base de données pour avoir les données à jour
    const user = await User.findByPk(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
      return;
    }

    // Récupérer les autorisations de l'utilisateur
    const authorizations = await AuthorizationService.getUserAuthorizations(userId);

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        account_active: user.account_active,
        account_administrator: user.account_administrator,
        last_login: user.last_login
      },
      authorizations: {
        groups: authorizations.groups,
        permissions: authorizations.permissions
      }
    });
  } catch (error: any) {
    logger.error(`Erreur lors de la récupération du profil: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du profil',
      error: error.message
    });
  }
};

/**
 * Rafraîchir le token JWT
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    // Récupérer le refresh token depuis les cookies ou le corps de la requête
    const refreshToken = AuthValidator.extractRefreshTokenFromRequest(req);
    
    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: 'Refresh token non fourni'
      });
      return;
    }

    // Extraire la source et le remember_me (si fournis)
    const { source = 'LUMA', remember_me = false } = req.body;
    
    // Utiliser le service JWT pour rafraîchir le token
    const { accessToken, refreshToken: newRefreshToken, accessExpiresAt, refreshExpiresAt } = 
      await JwtService.refreshAccessToken(refreshToken, remember_me, source);

    // Journaliser l'activité (optionnel pour le refresh)
    const decodedToken = jwt.decode(accessToken) as any;
    if (decodedToken && decodedToken.id) {
      await logLoginActivity(decodedToken.id, true, req, decodedToken?.jti, 'token_refresh');
    }

    // Définir les cookies si configuré
    if (CONFIG.jwt.cookieHttpOnly) {
      res.cookie('refresh_token', newRefreshToken, {
        httpOnly: CONFIG.jwt.cookieHttpOnly,
        secure: CONFIG.jwt.cookieSecure,
        sameSite: CONFIG.jwt.cookieSameSite as 'strict' | 'lax' | 'none' | boolean,
        maxAge: (remember_me ? CONFIG.jwt.rememberMeRefreshExpiresIn : CONFIG.jwt.refreshExpiresIn) * 1000
      });
    }
    
    res.json({
      success: true,
      message: 'Token rafraîchi avec succès',
      token: accessToken,
      refresh_token: newRefreshToken,
      expires_at: accessExpiresAt.toISOString(),
      refresh_expires_at: refreshExpiresAt.toISOString()
    });
  } catch (error: any) {
    logger.error(`Erreur lors du rafraîchissement du token: ${error.message}`);
    
    // Effacer le cookie si le refresh token est invalide
    if (CONFIG.jwt.cookieHttpOnly) {
      res.clearCookie('refresh_token');
    }
    
    res.status(401).json({
      success: false,
      message: 'Erreur lors du rafraîchissement du token',
      error: error.message
    });
  }
}; 