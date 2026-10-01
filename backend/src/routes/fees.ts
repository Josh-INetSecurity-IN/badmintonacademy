import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as feeCtrl from '../controllers/fee.controller';

const router = Router();

router.use(authenticate);

router.get('/', feeCtrl.getFees);
router.get('/overdue', feeCtrl.getOverdue);
router.get('/due-soon', feeCtrl.getDueSoon);
router.get('/outstanding', feeCtrl.getOutstanding);
router.get('/student/:studentId', feeCtrl.getStudentFees);
router.get('/regular/:playerId', feeCtrl.getRegularPlayerFees);
router.post('/generate', authorize('super_admin', 'admin'), feeCtrl.generateFees);

export default router;