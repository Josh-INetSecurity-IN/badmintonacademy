import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as subCtrl from '../controllers/subscription.controller';

const router = Router();

router.use(authenticate);

router.get('/', subCtrl.getSubscriptions);
router.get('/stats', subCtrl.getSubscriptionStats);
router.get('/student/:studentId', subCtrl.getStudentSubscriptions);
router.get('/regular/:playerId', subCtrl.getRegularSubscriptions);
router.post('/', authorize('super_admin', 'admin'), subCtrl.createSubscription);
router.post('/:id/renew', authorize('super_admin', 'admin'), subCtrl.renewSubscription);
router.post('/:id/pause', authorize('super_admin', 'admin'), subCtrl.pauseSubscription);
router.post('/:id/resume', authorize('super_admin', 'admin'), subCtrl.resumeSubscription);
router.post('/:id/cancel', authorize('super_admin', 'admin'), subCtrl.cancelSubscription);

export default router;