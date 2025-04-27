import { Router } from 'express';
import { register, login, getProfile, logout, verifyToken, verifyTokenWithCredentials, refreshToken } from '../controllers/authController';
import { protect, restrictTo } from '../middleware/authMiddleware';
import { validateRegister, validateLogin } from '../middleware/validationMiddleware';

const router = Router();

/**
 * Routes d'authentification publiques
 */
// Inscription d'un nouvel utilisateur
router.post('/register', validateRegister, register);

// Connexion d'un utilisateur
router.post('/login', validateLogin, login);

// Rafraîchissement du token
router.post('/refresh', refreshToken);

// Vérification du token avec support CORS pour les applications externes
router.options('/verify-credentials', verifyTokenWithCredentials); // Pour gérer le preflight
router.get('/verify-credentials', protect, verifyTokenWithCredentials);

/**
 * Routes d'authentification protégées
 */
// Vérification du token (authentifié)
router.get('/verify', protect, verifyToken);

// Récupération du profil
router.get('/profile', protect, getProfile);

// Déconnexion
router.post('/logout', protect, logout);

// Route pour la déconnexion de tous les appareils
router.post('/logout-all', protect, (req, res, next) => {
  req.body.all_devices = true;
  next();
}, logout);

/**
 * Routes d'administration (réservées aux admins)
 */
// Récupération de la liste des tokens actifs pour un utilisateur (admin uniquement)
router.get('/tokens/:userId', protect, restrictTo('admin'), (req, res) => {
  res.status(501).json({ 
    success: false,
    message: 'Fonctionnalité non implémentée' 
  });
});

// Révocation d'un token spécifique (admin uniquement)
router.delete('/tokens/:tokenId', protect, restrictTo('admin'), (req, res) => {
  res.status(501).json({ 
    success: false,
    message: 'Fonctionnalité non implémentée' 
  });
});

export default router; 