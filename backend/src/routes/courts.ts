import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as courtCtrl from '../controllers/court.controller';

const router = Router();

router.use(authenticate);

router.get('/', courtCtrl.getCourts);
router.get('/weekly-timetable', courtCtrl.getWeeklyTimetable);
router.get('/schedule', courtCtrl.getCourtSchedule);
router.get('/:id', courtCtrl.getCourt);
router.post('/', authorize('super_admin', 'admin'), courtCtrl.createCourt);
router.put('/:id', authorize('super_admin', 'admin'), courtCtrl.updateCourt);
router.delete('/:id', authorize('super_admin', 'admin'), courtCtrl.deleteCourt);

export default router;
