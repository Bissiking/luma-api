import express from 'express';
import { debugController } from '../controllers/debugController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

/**
 * @route   GET /api/v1/debug/reports
 * @desc    Récupérer tous les rapports de debug
 * @access  Public (temporairement pour le test)
 */
router.get('/reports', debugController.getAllDebugReports);

/**
 * @route   GET /api/v1/debug/reports/:id
 * @desc    Récupérer un rapport de debug par son ID
 * @access  Public (temporairement pour le test)
 */
router.get('/reports/:id', debugController.getDebugReportById);

/**
 * @route   POST /api/v1/debug/reports
 * @desc    Créer un nouveau rapport de debug
 * @access  Public (temporairement pour le test)
 */
router.post('/reports', debugController.createDebugReport);

/**
 * @route   PATCH /api/v1/debug/reports/:id
 * @desc    Mettre à jour un rapport de debug
 * @access  Public (temporairement pour le test)
 */
router.patch('/reports/:id', debugController.updateDebugReport);

export default router; 