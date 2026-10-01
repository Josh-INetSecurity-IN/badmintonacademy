import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as userCtrl from '../controllers/user.controller';

const router = Router();

router.use(authenticate, authorize('super_admin'));

router.get('/', userCtrl.getUsers);
router.post('/', userCtrl.createUser);
router.put('/:id', userCtrl.updateUser);
router.delete('/:id', userCtrl.deleteUser);
router.post('/:id/reset-password', userCtrl.resetPassword);
router.get('/:id/audit-logs', userCtrl.getAuditLogs);

export default router;