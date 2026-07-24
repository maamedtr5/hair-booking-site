// validators/notificationValidator.js
import { body, param } from 'express-validator';
import { handleValidationErrors } from './validationHelpers.js';
import { prisma } from '../lib/prisma.js';


export const validateNotificationCreate = [
  body('userId')
    .notEmpty().withMessage('User ID is required')
    .isInt({ min: 1 }).withMessage('Invalid user ID')
    .custom(async (userId) => {
      const user = await prisma.user.findUnique({
        where: { id: parseInt(userId) },
      });
      if (!user) {
        throw new Error('User not found');
      }
      return true;
    }),

  body('message')
    .trim()
    .notEmpty().withMessage('Message is required')
    .isLength({ min: 1, max: 500 }).withMessage('Message must be between 1 and 500 characters')
    .matches(/^[^<>]*$/).withMessage('Message cannot contain HTML tags'),

  body('type')
    .optional()
    .isIn(['GENERAL', 'APPOINTMENT', 'PAYMENT', 'PROMOTION', 'SYSTEM']).withMessage('Invalid notification type'),

  body('status')
    .optional()
    .isIn(['QUEUED', 'SENT', 'DELIVERED', 'FAILED']).withMessage('Invalid notification status'),

  body('read')
    .optional()
    .isBoolean().withMessage('Read must be a boolean'),

  handleValidationErrors,
];

export const validateNotificationUpdate = [
  param('id')
    .isInt().withMessage('Invalid notification ID'),

  body('read')
    .optional()
    .isBoolean().withMessage('Read must be a boolean'),

  body('status')
    .optional()
    .isIn(['QUEUED', 'SENT', 'DELIVERED', 'FAILED']).withMessage('Invalid notification status'),

  handleValidationErrors,
];

export const validateMarkAsRead = [
  param('id')
    .isInt().withMessage('Invalid notification ID')
    .custom(async (id, { req }) => {
      const notification = await prisma.notification.findUnique({
        where: { id: parseInt(id) },
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      // Users can only mark their own notifications as read
      if (req.user && notification.userId !== req.user.id && req.user.role !== 'ADMIN') {
        throw new Error('You can only mark your own notifications as read');
      }

      return true;
    }),

  handleValidationErrors,
];