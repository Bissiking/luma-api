import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import User from '../models/User';
import UserToken from '../models/UserToken';
import { logger } from '../config/logger';
import { logLoginActivity, logLogoutActivity } from '../utils/activityLogger';
import { CONFIG } from '../config/api.config';

// Durée de validité du token JWT en secondes (24 heures)
const TOKEN_EXPIRATION = 60 * 60 * 24;

/**
 * Inscription d'un nouvel utilisateur
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email }]
      }
    });

    if (existingUser) {
      logger.warn(`Tentative d'inscription avec un nom d'utilisateur ou email déjà utilisé: ${username}, ${email}`);
      res.status(409).json({ message: 'Nom d\'utilisateur ou email déjà utilisé' });
      return;
    }

    // Créer le nouvel utilisateur
    const user = await User.create({
      username,
      email,
      password,
      role: 'user',
      account_administrator: false,
      account_active: true
    } as any);

    logger.info(`Nouvel utilisateur créé: ${username}`);

    // Générer un token JWT
    const token = await generateToken(user, false);

    // Journaliser l'activité de connexion
    const jti = jwt.decode(token) as any;
    await logLoginActivity(user.id, true, req, jti?.jti);

    // Répondre avec les informations de l'utilisateur
    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error: any) {
    logger.error(`Erreur lors de l'inscription: ${error.message}`);
    res.status(500).json({ message: 'Erreur lors de l\'inscription', error: error.message });
  }
};

/**
 * Connexion d'un utilisateur
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password, remember_me } = req.body;

    // Trouver l'utilisateur
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { username },
          { email: username }
        ]
      }
    });

    if (!user) {
      logger.warn(`Tentative de connexion avec un utilisateur inexistant: ${username}`);
      res.status(401).json({ message: 'Identifiants invalides' });
      return;
    }

    // Vérifier si le compte est actif
    if (!user.account_active) {
      logger.warn(`Tentative de connexion sur un compte désactivé: ${username}`);
      res.status(403).json({ message: 'Compte désactivé' });
      return;
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      logger.warn(`Tentative de connexion avec un mot de passe invalide pour: ${username}`);
      res.status(401).json({ message: 'Identifiants invalides' });
      return;
    }

    // Ajouter les informations du client
    user.device_info = req.headers['user-agent'];
    user.ip_address = req.ip;

    // Générer les tokens
    const { accessToken, refreshToken } = await generateTokens(user, remember_me === true);

    logger.info(`Connexion réussie pour l'utilisateur: ${username}`);
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
      token: accessToken,
      refresh_token: refreshToken
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
      // Révoquer le token
      await req.token.update({
        revoked: 1,
        revoked_at: new Date()
      });

      logger.info(`Déconnexion réussie pour l'utilisateur: ${req.user.username}`);
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
        }
      }
    });
  } catch (error: any) {
    logger.error(`Erreur lors de la vérification du token: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification du token',
      error: error.message
    });
  }
};

/**
 * Vérifier la validité du token avec des options CORS spécifiques
 * Cette méthode est spécialement conçue pour les requêtes de vérification frontend
 */
export const verifyTokenWithCredentials = async (req: Request, res: Response): Promise<any> => {
  try {
    // Assurez-vous que les en-têtes CORS sont correctement définis
    res.header('Access-Control-Allow-Origin', 'https://dev.mhemery.fr');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // Si c'est une requête OPTIONS (preflight), renvoyer 200 OK
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // La requête normale
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié'
      });
    }

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
  } catch (error: any) {
    logger.error(`Erreur lors de la vérification du token: ${error.message}`, {
      error: error.message,
      stack: error.stack,
      headers: req.headers
    });
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification du token',
      error: error.message
    });
  }
};

/**
 * Récupération du profil de l'utilisateur
 */
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    // L'utilisateur est attaché à la requête par le middleware d'authentification
    const userId = req.user.id;

    // Récupérer l'utilisateur depuis la base de données
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      logger.warn(`Tentative d'accès à un profil inexistant: ${userId}`);
      res.status(404).json({ message: 'Utilisateur non trouvé' });
      return;
    }

    logger.info(`Profil récupéré: ${user.username}`);

    // Répondre avec les informations de l'utilisateur
    res.status(200).json({
      user
    });
  } catch (error: any) {
    logger.error(`Erreur lors de la récupération du profil: ${error.message}`);
    res.status(500).json({ message: 'Erreur lors de la récupération du profil', error: error.message });
  }
};

/**
 * Générer un token JWT d'accès et de rafraîchissement
 */
const generateTokens = async (user: any, rememberMe: boolean = false): Promise<{ accessToken: string, refreshToken: string }> => {
  // Générer un token d'accès
  const accessJti = uuidv4();
  const expiresIn = rememberMe ? CONFIG.jwt.rememberMeExpiresIn : CONFIG.jwt.expiresIn;
  
  const accessToken = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      jti: accessJti
    },
    CONFIG.jwt.secret,
    { expiresIn }
  );

  // Calculer la date d'expiration du token d'accès
  const accessExpiresAt = new Date();
  accessExpiresAt.setSeconds(accessExpiresAt.getSeconds() + expiresIn);

  // Générer un token de rafraîchissement
  const refreshJti = uuidv4();
  const refreshToken = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      jti: refreshJti
    },
    CONFIG.jwt.refreshSecret,
    { expiresIn: CONFIG.jwt.refreshExpiresIn }
  );

  // Calculer la date d'expiration du token de rafraîchissement
  const refreshExpiresAt = new Date();
  refreshExpiresAt.setSeconds(refreshExpiresAt.getSeconds() + CONFIG.jwt.refreshExpiresIn);

  // Sauvegarder les tokens dans la base de données
  await UserToken.create({
    user_id: user.id,
    token: accessToken,
    jti: accessJti,
    token_type: 'access',
    expires_at: accessExpiresAt,
    device_info: user.device_info || null,
    ip_address: user.ip_address || null
  });

  await UserToken.create({
    user_id: user.id,
    token: refreshToken,
    jti: refreshJti,
    token_type: 'refresh',
    expires_at: refreshExpiresAt,
    device_info: user.device_info || null,
    ip_address: user.ip_address || null
  });

  return { accessToken, refreshToken };
};

// Conserver l'ancienne fonction pour la compatibilité
const generateToken = async (user: any, rememberMe: boolean = false): Promise<string> => {
  const { accessToken } = await generateTokens(user, rememberMe);
  return accessToken;
};

/**
 * Rafraîchir un token JWT
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    // Vérifier si un refresh token est fourni
    const { refresh_token } = req.body;
    
    if (!refresh_token) {
      logger.warn('Tentative de rafraîchissement sans refresh token');
      res.status(400).json({
        success: false,
        message: 'Refresh token requis'
      });
      return;
    }

    // Vérifier le refresh token
    let decoded;
    try {
      decoded = jwt.verify(refresh_token, CONFIG.jwt.refreshSecret) as any;
    } catch (error) {
      logger.warn('Refresh token invalide ou expiré');
      res.status(401).json({
        success: false,
        message: 'Refresh token invalide ou expiré'
      });
      return;
    }

    // Vérifier si le refresh token existe dans la base de données
    const userToken = await UserToken.findOne({
      where: {
        jti: decoded.jti,
        revoked: 0,
        revoked_at: null,
        token_type: 'refresh'
      }
    });

    if (!userToken) {
      logger.warn(`Refresh token non trouvé ou révoqué: ${decoded.jti}`);
      res.status(401).json({
        success: false,
        message: 'Refresh token non valide'
      });
      return;
    }

    // Vérifier si le refresh token n'a pas expiré
    if (new Date() > new Date(userToken.expires_at)) {
      await userToken.update({
        revoked: 1,
        revoked_at: new Date()
      });
      logger.warn(`Refresh token expiré: ${decoded.jti}`);
      res.status(401).json({
        success: false,
        message: 'Refresh token expiré'
      });
      return;
    }

    // Trouver l'utilisateur
    const user = await User.findByPk(decoded.id);
    if (!user || !user.account_active) {
      logger.warn(`Utilisateur non trouvé ou inactif: ${decoded.id}`);
      res.status(401).json({
        success: false,
        message: 'Utilisateur non trouvé ou inactif'
      });
      return;
    }

    // Révoquer l'ancien refresh token
    await userToken.update({
      revoked: 1,
      revoked_at: new Date()
    });

    // Générer de nouveaux tokens
    user.device_info = req.headers['user-agent'];
    user.ip_address = req.ip;
    const { accessToken, refreshToken: newRefreshToken } = await generateTokens(user, true);

    logger.info(`Token rafraîchi avec succès pour l'utilisateur: ${user.username}`);
    
    res.json({
      success: true,
      message: 'Token rafraîchi avec succès',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        name: user.name
      },
      token: accessToken,
      refresh_token: newRefreshToken
    });
  } catch (error: any) {
    logger.error(`Erreur lors du rafraîchissement du token: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du rafraîchissement du token',
      error: error.message
    });
  }
}; 