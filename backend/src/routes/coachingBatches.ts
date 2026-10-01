import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as batchCtrl from '../controllers/coachingBatch.controller';

const router = Router();

router.use(authenticate);

router.get('/', batchCtrl.getBatches);
router.get('/calendar', batchCtrl.getBatchCalendar);
router.get('/:id', batchCtrl.getBatch);
router.get('/:id/roster', batchCtrl.getBatchRoster);
router.post('/', authorize('super_admin', 'admin'), batchCtrl.createBatch);
router.post('/:id/students', authorize('super_admin', 'admin'), batchCtrl.assignStudents);
router.put('/:id', authorize('super_admin', 'admin'), batchCtrl.updateBatch);
router.delete('/:id/students/:studentId', authorize('super_admin', 'admin'), batchCtrl.removeStudent);
router.delete('/:id', authorize('super_admin', 'admin'), batchCtrl.deleteBatch);

export default router;