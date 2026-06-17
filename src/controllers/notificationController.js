import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Create notification
export const createNotificationHandler = async (req, res) => {
  try {
    const { userId, message, type } = req.body;
    const notification = await prisma.notification.create({
      data: {
        userId: parseInt(userId, 10),
        message,
        type
      }
    });
    res.status(201).json(notification);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get notifications for a user (with pagination)
export const getNotificationsHandler = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const skip = parseInt(req.query.skip, 10) || 0;
    const take = parseInt(req.query.take, 10) || 10;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Bulk mark as read
export const bulkMarkAsReadHandler = async (req, res) => {
  try {
    const { ids } = req.body;
    await prisma.notification.updateMany({
      where: { id: { in: ids } },
      data: { read: true }
    });
    res.json({ message: 'Notifications marked as read' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Mark all as read for a user
export const markAllAsReadHandler = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    await prisma.notification.updateMany({
      where: { userId },
      data: { read: true }
    });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all notifications
export const getAllNotificationsHandler = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany();
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get single notification
export const getNotificationByIdHandler = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) return res.status(404).json({ error: 'Not found' });
    res.json(notification);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update notification
export const updateNotificationHandler = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const updated = await prisma.notification.update({
      where: { id },
      data: req.body
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete notification
export const deleteNotificationHandler = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.notification.delete({ where: { id } });
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
