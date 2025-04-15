import { Router } from 'express';
import { register, login, getProfile, logout, verifyToken } from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';
import { validateRegister, validateLogin } from '../middleware/validationMiddleware';

const router = Router();

// Routes publiques
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);

// Routes protégées
router.get('/profile', protect, getProfile);
router.post('/logout', protect, logout);
router.get('/verify', protect, verifyToken);

export default router; 