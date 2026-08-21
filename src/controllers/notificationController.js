// src/controllers/notificationController.js
import { prisma } from '../lib/prisma.js';
import { sendSuccess, sendError } from '../utils/response.js';

import { safeErrorMessage } from '../utils/errorMessages.js';
const isStaffOrAdmin = (role) => ['ADMIN', 'STAFF'].includes(role);

export const createNotificationHandler = async (req, res) => {
  try {
    const { userId, message, type } = req.body;
    const notification = await prisma.notification.create({
      data: { userId: parseInt(userId, 10), message, type },
    });
    return sendSuccess(res, notification, 201);
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 400);
  }
};

export const getNotificationsHandler = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (req.user.id !== userId && !isStaffOrAdmin(req.user.role)) {
      return sendError(res, 'Forbidden', 403);
    }
    const skip = parseInt(req.query.skip, 10) || 0;
    const take = parseInt(req.query.take, 10) || 200;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
    return sendSuccess(res, notifications);
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 500);
  }
};

// Body: { ids: number[] }
export const bulkMarkAsReadHandler = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return sendError(res, 'ids must be a non-empty array', 400);
    }
    if (!isStaffOrAdmin(req.user.role)) {
      const notOwned = await prisma.notification.count({
        where: { id: { in: ids }, userId: { not: req.user.id } },
      });
      if (notOwned > 0) return sendError(res, 'You can only mark your own notifications as read', 403);
    }
    await prisma.notification.updateMany({ where: { id: { in: ids } }, data: { read: true } });
    return sendSuccess(res, { count: ids.length }, 200, 'Notifications marked as read');
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 400);
  }
};

export const markAllAsReadHandler = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (req.user.id !== userId && !isStaffOrAdmin(req.user.role)) {
      return sendError(res, 'Forbidden', 403);
    }
    await prisma.notification.updateMany({ where: { userId }, data: { read: true } });
    return sendSuccess(res, null, 200, 'All notifications marked as read');
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 400);
  }
};

// ADMIN/STAFF only.
export const getAllNotificationsHandler = async (req, res) => {
  try {
    if (!isStaffOrAdmin(req.user.role)) return sendError(res, 'Forbidden', 403);
    const skip = parseInt(req.query.skip, 10) || 0;
    const take = parseInt(req.query.take, 10) || 200;
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
    return sendSuccess(res, notifications);
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 500);
  }
};

export const getNotificationByIdHandler = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) return sendError(res, 'Not found', 404);
    if (notification.userId !== req.user.id && !isStaffOrAdmin(req.user.role)) {
      return sendError(res, 'Forbidden', 403);
    }
    return sendSuccess(res, notification);
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 400);
  }
};

// Body: { read: boolean } — the field is `read` on the schema, not `isRead`.
export const updateNotificationHandler = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing) return sendError(res, 'Not found', 404);
    if (existing.userId !== req.user.id && !isStaffOrAdmin(req.user.role)) {
      return sendError(res, 'Forbidden', 403);
    }
    const updated = await prisma.notification.update({
      where: { id },
      data: { read: req.body.read },
    });
    return sendSuccess(res, updated);
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 400);
  }
};

export const deleteNotificationHandler = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing) return sendError(res, 'Not found', 404);
    if (existing.userId !== req.user.id && !isStaffOrAdmin(req.user.role)) {
      return sendError(res, 'Forbidden', 403);
    }
    await prisma.notification.delete({ where: { id } });
    return sendSuccess(res, null, 200, 'Notification deleted');
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 400);
  }
};