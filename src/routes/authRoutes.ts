import { Router } from 'express';
import { register, login, getProfile, logout, verifyToken, verifyTokenWithCredentials, refreshToken } from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';
import { validateRegister, validateLogin } from '../middleware/validationMiddleware';

const router = Router();

// Routes publiques
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/refresh', refreshToken);

// Routes protégées
router.get('/profile', protect, getProfile);
router.post('/logout', protect, logout);
router.get('/verify', protect, verifyToken);

// Route spéciale pour la vérification du token avec CORS
router.options('/verify-credentials', verifyTokenWithCredentials); // Pour gérer le preflight
router.get('/verify-credentials', protect, verifyTokenWithCredentials);

export default router; 