import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { upload } from '../middleware/upload';
import * as productCtrl from '../controllers/product.controller';

const router = Router();

router.use(authenticate);

router.get('/', productCtrl.getProducts);
router.get('/low-stock', productCtrl.getLowStock);
router.get('/categories', productCtrl.getCategories);
router.get('/:id', productCtrl.getProduct);
router.post('/', authorize('super_admin', 'admin', 'staff'), productCtrl.createProduct);
router.post('/:id/photo', upload.single('photo'), authorize('super_admin', 'admin'), productCtrl.updatePhoto);
router.post('/:id/stock-in', authorize('super_admin', 'admin'), productCtrl.stockIn);
router.post('/:id/stock-adjust', authorize('super_admin', 'admin'), productCtrl.stockAdjust);
router.put('/:id', authorize('super_admin', 'admin', 'staff'), productCtrl.updateProduct);
router.delete('/:id', authorize('super_admin', 'admin'), productCtrl.deleteProduct);

export default router;
