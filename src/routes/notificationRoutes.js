// src/routes/notificationRoutes.js
import express from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../auth/jwtAuth.js';
import { verifyUserPermissions } from '../auth/auth.js';
import {
  getNotificationsHandler,
  createNotificationHandler,
  bulkMarkAsReadHandler,
  markAllAsReadHandler
} from '../controllers/notificationController.js';
import {
  validateNotificationCreate,
  validateNotificationUpdate,
  validateMarkAsRead
} from '../validators/notificationValidator.js';

const router = express.Router();

//   Get notifications for a user
router.get(
  '/user/:userId',
  authenticate,
  verifyUserPermissions,
  getNotificationsHandler
);

//   Create notification
router.post(
  '/',
  authenticate,
  validateNotificationCreate,
  createNotificationHandler
);

//   Bulk mark as read
router.put(
  '/bulk-mark-read',
  authenticate,
  verifyUserPermissions,
  bulkMarkAsReadHandler
);

//   Mark all as read for a user
router.put(
  '/user/:userId/mark-all-read',
  authenticate,
  verifyUserPermissions,
  markAllAsReadHandler
);

//   Get all notifications
router.get(
  '/',
  authenticate,
  verifyUserPermissions,
  async (req, res) => {
    try {
      const notifications = await prisma.notification.findMany();
      res.json(notifications);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

//   Get single notification
router.get(
  '/:id',
  authenticate,
  verifyUserPermissions,
  validateMarkAsRead,   // lightweight check for ID + ownership
  async (req, res) => {
    try {
      const notification = await prisma.notification.findUnique({
        where: { id: parseInt(req.params.id, 10) }
      });
      if (!notification) return res.status(404).json({ error: 'Not found' });
      res.json(notification);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

//   Update notification
router.put(
  '/:id',
  authenticate,
  verifyUserPermissions,
  validateNotificationUpdate,
  async (req, res) => {
    try {
      const updated = await prisma.notification.update({
        where: { id: parseInt(req.params.id, 10) },
        data: req.body
      });
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

//   Delete notification
router.delete(
  '/:id',
  authenticate,
  verifyUserPermissions,
  validateNotificationUpdate,   // lightweight ID check
  async (req, res) => {
    try {
      await prisma.notification.delete({
        where: { id: parseInt(req.params.id, 10) }
      });
      res.json({ message: 'Notification deleted' });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

export default router;
