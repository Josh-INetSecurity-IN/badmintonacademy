import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as guestCtrl from '../controllers/guestBooking.controller';

const router = Router();

router.use(authenticate);

router.get('/', guestCtrl.getBookings);
router.get('/daily', guestCtrl.getDailyBookings);
router.get('/revenue', guestCtrl.getRevenue);
router.post('/', guestCtrl.createBooking);
router.post('/:id/cancel', guestCtrl.cancelBooking);
router.post('/:id/complete', guestCtrl.completeBooking);
router.post('/:id/convert-regular', authorize('super_admin', 'admin'), guestCtrl.convertToRegular);
router.get('/:id', guestCtrl.getBooking);
router.put('/:id', guestCtrl.updateBooking);
router.delete('/:id', authorize('super_admin', 'admin'), guestCtrl.deleteBooking);

export default router;
