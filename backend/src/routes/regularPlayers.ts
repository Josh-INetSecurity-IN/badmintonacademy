import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { upload } from '../middleware/upload';
import * as regularPlayerCtrl from '../controllers/regularPlayer.controller';

const router = Router();

router.use(authenticate);

router.get('/', regularPlayerCtrl.getPlayers);
router.get('/expired', regularPlayerCtrl.getExpired);
router.get('/export', regularPlayerCtrl.exportPlayers);
router.get('/upcoming-sessions/:id', regularPlayerCtrl.getUpcomingSessions);
router.post('/', authorize('super_admin', 'admin', 'staff'), regularPlayerCtrl.createPlayer);
router.post('/:id/photo', upload.single('photo'), authorize('super_admin', 'admin', 'staff'), regularPlayerCtrl.updatePhoto);
router.post('/:id/assign-batch', authorize('super_admin', 'admin'), regularPlayerCtrl.assignBatch);
router.post('/:id/remove-batch', authorize('super_admin', 'admin'), regularPlayerCtrl.removeFromBatch);
router.post('/:id/pause', authorize('super_admin', 'admin'), regularPlayerCtrl.pauseMembership);
router.post('/:id/resume', authorize('super_admin', 'admin'), regularPlayerCtrl.resumeMembership);
router.post('/:id/renew', authorize('super_admin', 'admin'), regularPlayerCtrl.renewSubscription);
router.get('/:id', regularPlayerCtrl.getPlayer);
router.put('/:id', authorize('super_admin', 'admin', 'staff'), regularPlayerCtrl.updatePlayer);
router.delete('/:id', authorize('super_admin', 'admin'), regularPlayerCtrl.deletePlayer);

export default router;