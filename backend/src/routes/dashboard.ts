import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as dashCtrl from '../controllers/dashboard.controller';

const router = Router();

router.use(authenticate);

router.get('/summary', dashCtrl.getSummary);
router.get('/charts', dashCtrl.getCharts);

export default router;
