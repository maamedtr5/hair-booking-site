// routes/notificationRoutes.js
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

const router = express.Router();

// GET /notifications/user/:userId
router.get('/user/:userId', authenticate, verifyUserPermissions, getNotificationsHandler);

// POST /notifications
router.post('/', authenticate, createNotificationHandler);

// PUT /notifications/bulk-mark-read
router.put('/bulk-mark-read', authenticate, verifyUserPermissions, bulkMarkAsReadHandler);

// PUT /notifications/user/:userId/mark-all-read
router.put('/user/:userId/mark-all-read', authenticate, verifyUserPermissions, markAllAsReadHandler);

// GET /notifications (all)
router.get('/', authenticate, verifyUserPermissions, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany();
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /notifications/:id
router.get('/:id', authenticate, verifyUserPermissions, async (req, res) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: parseInt(req.params.id, 10) }
    });
    if (!notification) return res.status(404).json({ error: 'Not found' });
    res.json(notification);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /notifications/:id
router.put('/:id', verifyUserPermissions, async (req, res) => {
  try {
    const updated = await prisma.notification.update({
      where: { id: parseInt(req.params.id, 10) },
      data: req.body
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /notifications/:id
router.delete('/:id', verifyUserPermissions, async (req, res) => {
  try {
    await prisma.notification.delete({
      where: { id: parseInt(req.params.id, 10) }
    });
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
