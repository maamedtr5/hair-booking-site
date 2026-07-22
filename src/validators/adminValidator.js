 // validators/adminValidator.js
import { body, param } from 'express-validator';
import { handleValidationErrors } from './validationHelpers.js';
import { prisma } from '../lib/prisma.js';


/**
 * Validate permissions JSON structure
 */
const validatePermissions = (permissions) => {
  if (!permissions) return true;
  
  // Permissions should be an object or array
  if (typeof permissions !== 'object') {
    throw new Error('Permissions must be a valid JSON object or array');
  }

  // If object, validate common permission structure
  const validPermissionKeys = [
    'canManageUsers',
    'canManageStaff',
    'canManageAppointments',
    'canManageServices',
    'canViewReports',
    'canManagePayments',
    'canManageSettings',
    'canManagePromocodes',
    'canManageReviews',
    'canDeleteData',
    'canExportData',
    'canAccessAnalytics',
  ];

  if (!Array.isArray(permissions)) {
    // Check if all keys are valid
    const invalidKeys = Object.keys(permissions).filter(
      key => !validPermissionKeys.includes(key)
    );
    
    if (invalidKeys.length > 0) {
      throw new Error(`Invalid permission keys: ${invalidKeys.join(', ')}`);
    }

    // All values should be boolean
    const nonBooleanValues = Object.entries(permissions).filter(
      ([_key, value]) => typeof value !== 'boolean'
    );
    
    if (nonBooleanValues.length > 0) {
      throw new Error('All permission values must be boolean');
    }
  }

  return true;
};

export const validateAdminCreate = [
  body('userId')
    .notEmpty().withMessage('User ID is required')
    .isInt({ min: 1 }).withMessage('Invalid user ID')
    .custom(async (userId) => {
      // Check if user exists
      const user = await prisma.user.findUnique({ 
        where: { id: parseInt(userId) } 
      });
      
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user has ADMIN role
      if (user.role !== 'ADMIN') {
        throw new Error('User must have ADMIN role');
      }

      // Check if admin record already exists for this user
      const existingAdmin = await prisma.admin.findUnique({
        where: { userId: parseInt(userId) },
      });

      if (existingAdmin) {
        throw new Error('Admin record already exists for this user');
      }

      return true;
    }),

  body('permissions')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined) return true;
      
      try {
        // If it's a string, try to parse it
        const permissions = typeof value === 'string' ? JSON.parse(value) : value;
        return validatePermissions(permissions);
      } catch (error) {
  throw new Error(
    'Permissions must be valid JSON: ' + error.message,
    { cause: error }
  );
}
    }),

  body('department')
    .optional({ nullable: true })
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Department must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s&-]+$/).withMessage('Department can only contain letters, spaces, hyphens, and ampersands'),

  handleValidationErrors,
];

export const validateAdminUpdate = [
  param('id')
    .isInt().withMessage('Invalid admin ID')
    .custom(async (id) => {
      const admin = await prisma.admin.findUnique({
        where: { id: parseInt(id) },
      });
      
      if (!admin) {
        throw new Error('Admin not found');
      }
      
      return true;
    }),

  body('permissions')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined) return true;
      
      try {
        const permissions = typeof value === 'string' ? JSON.parse(value) : value;
        return validatePermissions(permissions);
      } catch (error) {
  throw new Error(
    'Permissions must be valid JSON: ' + error.message,
    { cause: error }
  );
}
    }),

  body('department')
    .optional({ nullable: true })
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Department must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s&-]+$/).withMessage('Department can only contain letters, spaces, hyphens, and ampersands'),

  // Prevent updating userId
  body('userId')
    .optional()
    .custom(() => {
      throw new Error('User ID cannot be updated. Create a new admin record instead.');
    }),

  handleValidationErrors,
];

export const validateAdminPermissionUpdate = [
  param('id')
    .isInt().withMessage('Invalid admin ID'),

  body('permissions')
    .notEmpty().withMessage('Permissions are required')
    .custom((value) => {
      try {
        const permissions = typeof value === 'string' ? JSON.parse(value) : value;
        return validatePermissions(permissions);
      } catch (error) {
  throw new Error(
    'Permissions must be valid JSON: ' + error.message,
    { cause: error }
  );
}
    }),

  handleValidationErrors,
];

export const validateAdminDelete = [
  param('id')
    .isInt().withMessage('Invalid admin ID')
    .custom(async (id, { req }) => {
      const admin = await prisma.admin.findUnique({
        where: { id: parseInt(id) },
        include: { user: true },
      });

      if (!admin) {
        throw new Error('Admin not found');
      }

      // Prevent deleting your own admin record
      if (req.user && admin.userId === req.user.id) {
        throw new Error('You cannot delete your own admin record');
      }

      // Check if this is the last admin
      const adminCount = await prisma.admin.count();
      if (adminCount <= 1) {
        throw new Error('Cannot delete the last admin. At least one admin must exist.');
      }

      return true;
    }),

  handleValidationErrors,
];

/**
 * Validate checking admin permissions
 */
export const validateCheckPermission = [
  param('id')
    .isInt().withMessage('Invalid admin ID'),

  body('permission')
    .notEmpty().withMessage('Permission key is required')
    .isString().withMessage('Permission must be a string')
    .isIn([
      'canManageUsers',
      'canManageStaff',
      'canManageAppointments',
      'canManageServices',
      'canViewReports',
      'canManagePayments',
      'canManageSettings',
      'canManagePromocodes',
      'canManageReviews',
      'canDeleteData',
      'canExportData',
      'canAccessAnalytics',
    ]).withMessage('Invalid permission key'),

  handleValidationErrors,
];