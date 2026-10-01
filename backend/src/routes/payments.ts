import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as payCtrl from '../controllers/payment.controller';

const router = Router();

router.use(authenticate);

router.get('/', payCtrl.getPayments);
router.get('/summary', payCtrl.getPaymentSummary);
router.get('/export', payCtrl.exportPayments);
router.get('/:id/receipt', payCtrl.getReceipt);
router.get('/:id', payCtrl.getPayment);
router.post('/', authorize('super_admin', 'admin', 'staff'), payCtrl.createPayment);
router.put('/:id', authorize('super_admin', 'admin'), payCtrl.updatePayment);
router.post('/:id/cancel', authorize('super_admin', 'admin'), payCtrl.cancelPayment);

export default router;