import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { upload } from '../middleware/upload';
import * as tournCtrl from '../controllers/tournament.controller';

const router = Router();

router.use(authenticate);

router.get('/', tournCtrl.getTournaments);
router.get('/revenue', tournCtrl.getTournamentRevenue);
router.get('/:id/participants', tournCtrl.exportParticipants);
router.get('/:id', tournCtrl.getTournament);
router.post('/', authorize('super_admin', 'admin'), tournCtrl.createTournament);
router.post('/:id/poster', upload.single('poster'), authorize('super_admin', 'admin'), tournCtrl.uploadPoster);
router.post('/:id/publish', authorize('super_admin', 'admin'), tournCtrl.publishTournament);
router.post('/:id/registrations', authorize('super_admin', 'admin', 'staff'), tournCtrl.registerPlayer);
router.put('/:id', authorize('super_admin', 'admin'), tournCtrl.updateTournament);
router.put('/:id/registrations/:regId', authorize('super_admin', 'admin'), tournCtrl.updateRegistration);
router.delete('/:id', authorize('super_admin', 'admin'), tournCtrl.deleteTournament);

export default router;