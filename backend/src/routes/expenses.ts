import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { upload } from '../middleware/upload';
import * as expenseCtrl from '../controllers/expense.controller';

const router = Router();

router.use(authenticate);

router.get('/', expenseCtrl.getExpenses);
router.get('/categories', expenseCtrl.getExpenseCategories);
router.get('/summary', expenseCtrl.getExpenseSummary);
router.get('/export', expenseCtrl.exportExpenses);
router.post('/', authorize('super_admin', 'admin', 'staff'), expenseCtrl.createExpense);
router.post('/:id/receipt', upload.single('receipt'), authorize('super_admin', 'admin'), expenseCtrl.uploadReceipt);
router.put('/:id', authorize('super_admin', 'admin'), expenseCtrl.updateExpense);
router.delete('/:id', authorize('super_admin', 'admin'), expenseCtrl.deleteExpense);

export default router;