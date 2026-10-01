import { Router } from 'express';
import * as publicCtrl from '../controllers/public.controller';

const router = Router();

router.get('/academy', publicCtrl.getAcademyInfo);
router.get('/batches', publicCtrl.getPublicBatches);
router.get('/tournaments', publicCtrl.getPublicTournaments);
router.get('/gallery', publicCtrl.getPublicGallery);
router.post('/enquiries', publicCtrl.submitEnquiry);

export default router;