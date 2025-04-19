import { Router } from 'express';
import { authenticateAgent } from '../middleware/agentMiddleware';
import { checkIn, updateMetrics, updateGlobalMetrics } from '../controllers/agentController';
import { monitoringRateLimit } from '../config/rateLimit';

const router = Router();

// Routes pour les agents
router.post('/:uuid/checkin', monitoringRateLimit.checkin, authenticateAgent, checkIn);
router.post('/:uuid/metrics', monitoringRateLimit.metrics, authenticateAgent, updateMetrics);
router.post('/:uuid/metrics/global', monitoringRateLimit.metrics, authenticateAgent, updateGlobalMetrics);

export default router;