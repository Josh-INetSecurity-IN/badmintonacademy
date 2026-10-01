import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as coachCtrl from '../controllers/coach.controller';

const router = Router();

router.use(authenticate);
router.get('/', coachCtrl.getCoaches);
router.post('/', authorize('super_admin', 'admin'), coachCtrl.createCoach);
router.put('/:id', authorize('super_admin', 'admin'), coachCtrl.updateCoach);
router.delete('/:id', authorize('super_admin', 'admin'), coachCtrl.deleteCoach);

export default router;