import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { upload } from '../middleware/upload';
import * as studentCtrl from '../controllers/student.controller';

const router = Router();

router.use(authenticate);

router.get('/', studentCtrl.getStudents);
router.get('/export', studentCtrl.exportStudents);
router.get('/by-batch/:batchId', studentCtrl.getStudentsByBatch);
router.post('/', authorize('super_admin', 'admin', 'staff'), studentCtrl.createStudent);
router.post('/:id/photo', upload.single('photo'), authorize('super_admin', 'admin', 'staff'), studentCtrl.updateProfilePhoto);
router.post('/:id/assign-batch', authorize('super_admin', 'admin'), studentCtrl.assignBatch);
router.post('/:id/transfer-batch', authorize('super_admin', 'admin'), studentCtrl.transferBatch);
router.post('/:id/remove-batch', authorize('super_admin', 'admin'), studentCtrl.removeFromBatch);
router.post('/:id/archive', authorize('super_admin', 'admin'), studentCtrl.archiveStudent);
router.get('/:id', studentCtrl.getStudent);
router.put('/:id', authorize('super_admin', 'admin', 'staff'), studentCtrl.updateStudent);

export default router;