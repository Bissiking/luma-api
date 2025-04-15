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

    // Générer le token
    const token = await generateToken(user, remember_me === true);

    logger.info(`Connexion réussie pour l'utilisateur: ${username}`);
    res.json({
      success: true,
      message: 'Connexion réussie',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          name: user.name
        },
        token
      }
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
        is_valid: false,
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
 * Générer un token JWT
 */
const generateToken = async (user: any, rememberMe: boolean = false): Promise<string> => {
  const jti = uuidv4(); // Identifiant unique pour le token
  const expiresIn = rememberMe ? CONFIG.jwt.rememberMeExpiresIn : CONFIG.jwt.expiresIn;
  
  const token = jwt.sign(
    { 
      id: user.id,
      username: user.username,
      role: user.role,
      jti 
    },
    CONFIG.jwt.secret,
    { expiresIn }
  );

  // Calculer la date d'expiration
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

  // Sauvegarder le token dans la base de données
  await UserToken.create({
    user_id: user.id,
    token,
    jti,
    expires_at: expiresAt,
    device_info: user.device_info || null,
    ip_address: user.ip_address || null
  });

  return token;
}; 