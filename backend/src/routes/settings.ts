import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as settingCtrl from '../controllers/setting.controller';

const router = Router();

router.use(authenticate, authorize('super_admin', 'admin'));

router.get('/', settingCtrl.getSettings);
router.get('/group/:group', settingCtrl.getSettingsGroup);
router.put('/', settingCtrl.updateSettings);

export default router;