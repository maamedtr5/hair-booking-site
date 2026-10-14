// src/routes/notificationRoutes.js
import express from 'express';
import { authenticate } from '../auth/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import {
  getNotificationsHandler,
  createNotificationHandler,
  bulkMarkAsReadHandler,
  markAllAsReadHandler,
  getAllNotificationsHandler,
  getNotificationByIdHandler,
  updateNotificationHandler,
  deleteNotificationHandler,
} from '../controllers/notificationController.js';
import { validateNotificationCreate, validateNotificationUpdate } from '../validators/notificationValidator.js';

const router = express.Router();

// Notifications are inherently personal — everything here stays auth-gated.
router.get('/user/:userId', authenticate, getNotificationsHandler);
// Staff/admin only. The app creates its own notifications server-side, and
// nothing in the frontend calls this route — but it used to accept ANY
// logged-in user, so a client could push an arbitrary message into any other
// user's notification bell (phishing / impersonating the salon).
router.post('/', authenticate, requireRole('ADMIN', 'STAFF'), validateNotificationCreate, createNotificationHandler);
router.put('/bulk-mark-read', authenticate, bulkMarkAsReadHandler);
router.put('/user/:userId/mark-all-read', authenticate, markAllAsReadHandler);
router.get('/', authenticate, getAllNotificationsHandler);
router.get('/:id', authenticate, getNotificationByIdHandler);
router.put('/:id', authenticate, validateNotificationUpdate, updateNotificationHandler);
router.delete('/:id', authenticate, deleteNotificationHandler);

export default router;