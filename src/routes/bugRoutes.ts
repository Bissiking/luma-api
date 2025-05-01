import express from 'express';
import { bugController } from '../controllers/bugController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

/**
 * @route   GET /api/bugs
 * @desc    Récupérer tous les bugs
 * @access  Private
 */
router.get('/', protect, bugController.getAllBugs);

/**
 * @route   GET /api/bugs/:id
 * @desc    Récupérer un bug par son ID
 * @access  Private
 */
router.get('/:id', protect, bugController.getBugById);

/**
 * @route   POST /api/bugs
 * @desc    Créer un nouveau bug
 * @access  Private
 */
router.post('/', protect, bugController.createBug);

export default router; 