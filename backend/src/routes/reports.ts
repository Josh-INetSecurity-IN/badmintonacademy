import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as reportCtrl from '../controllers/report.controller';

const router = Router();

router.use(authenticate);

router.get('/revenue', reportCtrl.getRevenueReport);
router.get('/expenses', reportCtrl.getExpenseReport);
router.get('/net-income', reportCtrl.getNetIncome);
router.get('/outstanding', reportCtrl.getOutstandingReport);
router.get('/operational', reportCtrl.getOperationalReport);
router.get('/collected-vs-pending', reportCtrl.getCollectedVsPending);
router.get('/revenue/export', reportCtrl.exportRevenueReport);
router.get('/expenses/export', reportCtrl.exportExpenseReport);
router.get('/outstanding/export', reportCtrl.exportOutstandingReport);

export default router;