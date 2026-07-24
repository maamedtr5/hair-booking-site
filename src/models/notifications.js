import { prisma } from '../lib/prisma.js';


// Fetch notifications with pagination, filtering, and sorting
export async function getUserNotifications(userId, { skip = 0, take = 10, type, status, date }) {
  const filters = {
    where: {
      userId,
      ...(type && { type }),
      ...(status && { status }),
      ...(date && { createdAt: { gte: new Date(date) } }),
    },
    skip,
    take,
    orderBy: { createdAt: 'desc' },
  };
  return await prisma.notification.findMany(filters);
}

// Create notification
export async function createNotification(data) {
  return await prisma.notification.create({ data });
}

// Bulk update notifications (e.g., mark as read)
export async function markNotificationsAsRead(notificationIds) {
  return await prisma.notification.updateMany({
    where: { id: { in: notificationIds } },
    data: { status: 'read', read: true },
  });
}

// Mark all notifications as read for a user
export async function markAllAsRead(userId) {
  return await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { status: 'read', read: true },
  });
}