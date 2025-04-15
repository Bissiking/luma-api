import { Router } from 'express';
import { protect, requireAdmin } from '../middleware/authMiddleware';
import User from '../models/User';
import { logger } from '../config/logger';
import bcrypt from 'bcryptjs';

const router = Router();

// Récupérer tous les utilisateurs (accessible uniquement aux admins)
router.get('/', protect, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'role', 'name', 'account_active', 'created_at'],
      order: [['username', 'ASC']]
    });

    res.json({
      success: true,
      data: users
    });
  } catch (error: any) {
    logger.error(`Erreur lors de la récupération des utilisateurs: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des utilisateurs',
      error: error.message
    });
  }
});

// Récupérer un utilisateur spécifique
router.get('/:id', protect, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'email', 'role', 'name', 'account_active', 'created_at']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error: any) {
    logger.error(`Erreur lors de la récupération de l'utilisateur: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'utilisateur',
      error: error.message
    });
  }
});

// Mettre à jour un utilisateur
router.put('/:id', protect, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { name, email, username, current_password, new_password, confirm_password } = req.body;

    // Vérifier si l'utilisateur existe
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier que l'utilisateur modifie son propre profil ou est admin
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à modifier ce profil'
      });
    }

    // Préparer les données à mettre à jour
    const updateData: any = {};

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (username) updateData.username = username;

    // Si un nouveau mot de passe est fourni
    if (new_password) {
      // Vérifier que l'ancien mot de passe est correct
      if (!current_password) {
        return res.status(400).json({
          success: false,
          message: 'Le mot de passe actuel est requis pour changer de mot de passe'
        });
      }

      const isPasswordValid = await bcrypt.compare(current_password, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Le mot de passe actuel est incorrect'
        });
      }

      // Vérifier que le nouveau mot de passe et sa confirmation correspondent
      if (new_password !== confirm_password) {
        return res.status(400).json({
          success: false,
          message: 'Le nouveau mot de passe et sa confirmation ne correspondent pas'
        });
      }

      // Hasher le nouveau mot de passe
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(new_password, salt);
    }

    // Mettre à jour l'utilisateur
    await user.update(updateData);

    // Récupérer l'utilisateur mis à jour (sans le mot de passe)
    const updatedUser = await User.findByPk(userId, {
      attributes: ['id', 'username', 'email', 'name', 'role', 'account_active', 'created_at', 'updated_at']
    });

    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      data: updatedUser
    });
  } catch (error: any) {
    logger.error(`Erreur lors de la mise à jour du profil: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du profil',
      error: error.message
    });
  }
});

export default router; 