import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as regularBatchCtrl from '../controllers/regularBatch.controller';

const router = Router();

router.use(authenticate);

router.get('/', regularBatchCtrl.getBatches);
router.get('/weekly-schedule', regularBatchCtrl.getWeeklySchedule);
router.get('/:id', regularBatchCtrl.getBatch);
router.post('/', authorize('super_admin', 'admin'), regularBatchCtrl.createBatch);
router.post('/:id/players', authorize('super_admin', 'admin'), regularBatchCtrl.assignPlayers);
router.put('/:id', authorize('super_admin', 'admin'), regularBatchCtrl.updateBatch);
router.delete('/:id/players/:playerId', authorize('super_admin', 'admin'), regularBatchCtrl.removePlayer);
router.delete('/:id', authorize('super_admin', 'admin'), regularBatchCtrl.deleteBatch);

export default router;