import express from 'express';
import { authenticate } from '../auth/jwtAuth.js';
import { verifyUserPermissions } from '../auth/auth.js';
import {
  getNotificationsHandler,
  createNotificationHandler,
  bulkMarkAsReadHandler,
  markAllAsReadHandler,
  getAllNotificationsHandler,
  getNotificationByIdHandler,
  updateNotificationHandler,
  deleteNotificationHandler
} from '../controllers/notificationController.js';
import {
  validateNotificationCreate,
  validateNotificationUpdate,
  validateMarkAsRead
} from '../validators/notificationValidator.js';

const router = express.Router();

// Get notifications for a user
router.get('/user/:userId', authenticate, verifyUserPermissions, getNotificationsHandler);

// Create notification
router.post('/', authenticate, validateNotificationCreate, createNotificationHandler);

// Bulk mark as read
router.put('/bulk-mark-read', authenticate, verifyUserPermissions, bulkMarkAsReadHandler);

// Mark all as read for a user
router.put('/user/:userId/mark-all-read', authenticate, verifyUserPermissions, markAllAsReadHandler);

// Get all notifications
router.get('/', authenticate, verifyUserPermissions, getAllNotificationsHandler);

// Get single notification
router.get('/:id', authenticate, verifyUserPermissions, validateMarkAsRead, getNotificationByIdHandler);

// Update notification
router.put('/:id', authenticate, verifyUserPermissions, validateNotificationUpdate, updateNotificationHandler);

// Delete notification
router.delete('/:id', authenticate, verifyUserPermissions, validateNotificationUpdate, deleteNotificationHandler);

export default router;
