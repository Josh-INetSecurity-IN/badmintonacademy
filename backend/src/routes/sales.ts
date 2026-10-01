import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as saleCtrl from '../controllers/sale.controller';

const router = Router();

router.use(authenticate);

router.get('/', saleCtrl.getSales);
router.get('/summary', saleCtrl.getSalesSummary);
router.get('/profit', saleCtrl.getProfit);
router.get('/export', saleCtrl.exportSales);
router.get('/:id', saleCtrl.getSale);
router.post('/', authorize('super_admin', 'admin', 'staff'), saleCtrl.createSale);
router.put('/:id', authorize('super_admin', 'admin'), saleCtrl.updateSale);
router.delete('/:id', authorize('super_admin', 'admin'), saleCtrl.deleteSale);

export default router;
