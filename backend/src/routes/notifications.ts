import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as notifCtrl from '../controllers/notification.controller';

const router = Router();

router.use(authenticate);

router.get('/', notifCtrl.getNotifications);
router.get('/unread-count', notifCtrl.getUnreadCount);
router.get('/dashboard', notifCtrl.getDashboardNotifications);
router.post('/remainder-template', notifCtrl.getReminderTemplate);
router.put('/:id/read', notifCtrl.markRead);
router.put('/read-all', notifCtrl.markAllRead);

export default router;