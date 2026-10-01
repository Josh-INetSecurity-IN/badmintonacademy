import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as attendanceCtrl from '../controllers/attendance.controller';

const router = Router();

router.use(authenticate);

router.get('/', attendanceCtrl.getAttendance);
router.get('/overview', attendanceCtrl.getAttendanceOverview);
router.get('/batch/:batchId', attendanceCtrl.getTodayBatchAttendance);
router.get('/report', attendanceCtrl.getAttendanceReport);
router.get('/student/:studentId', attendanceCtrl.getStudentAttendance);
router.get('/player/:playerId', attendanceCtrl.getPlayerAttendance);
router.post('/', authorize('super_admin', 'admin', 'staff'), attendanceCtrl.markAttendance);
router.post('/bulk', authorize('super_admin', 'admin', 'staff'), attendanceCtrl.markBulkAttendance);

export default router;