// controllers/serviceCategoryController.js
import serviceCategoryModel from '../models/serviceCategory.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { safeErrorMessage } from '../utils/errorMessages.js';

// Public: powers the category tabs/accordion on the booking page. Admin
// callers (authenticated ADMIN) see every category including inactive
// ones and inactive services, so the dashboard can manage what clients
// don't currently see.
export const getCategories = async (req, res) => {
  try {
    const isAdmin = req.user?.role === 'ADMIN';
    const activeOnly = !isAdmin || req.query.activeOnly === 'true';
    const includeServices = req.query.includeServices !== 'false';

    const categories = await serviceCategoryModel.getAllCategories({ includeServices, activeOnly });
    return sendSuccess(res, categories);
  } catch (error) {
    console.error('Error fetching service categories:', error);
    return sendError(res, safeErrorMessage(error), 400);
  }
};

export const getCategory = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const category = await serviceCategoryModel.getCategoryById(id, { includeServices: true });
    if (!category) return sendError(res, 'Category not found', 404);

    if (req.user?.role !== 'ADMIN' && !category.isActive) {
      return sendError(res, 'Category not found', 404);
    }

    return sendSuccess(res, category);
  } catch (error) {
    console.error('Error fetching service category:', error);
    return sendError(res, safeErrorMessage(error), 400);
  }
};

// Admin only (route-level).
export const createCategory = async (req, res) => {
  try {
    const category = await serviceCategoryModel.createCategory(req.body);
    return sendSuccess(res, category, 201);
  } catch (error) {
    console.error('Error creating service category:', error);
    return sendError(res, safeErrorMessage(error), 400);
  }
};

// Admin only (route-level).
export const updateCategory = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const category = await serviceCategoryModel.updateCategory(id, req.body);
    return sendSuccess(res, category);
  } catch (error) {
    console.error('Error updating service category:', error);
    return sendError(res, safeErrorMessage(error), 400);
  }
};

// Admin only (route-level). Refuses to delete a category that still has
// services in it — the client-side booking flow would otherwise have
// nowhere to attribute those services, and staff would lose the ability
// to see which category historic appointments were booked under.
export const deleteCategory = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const serviceCount = await serviceCategoryModel.countServicesInCategory(id);
    if (serviceCount > 0) {
      return sendError(
        res,
        `This category still has ${serviceCount} service${serviceCount === 1 ? '' : 's'} in it. Move or delete ${serviceCount === 1 ? 'it' : 'them'} first.`,
        409
      );
    }
    await serviceCategoryModel.deleteCategory(id);
    return sendSuccess(res, null, 200, 'Category deleted successfully');
  } catch (error) {
    console.error('Error deleting service category:', error);
    return sendError(res, safeErrorMessage(error), 400);
  }
};
