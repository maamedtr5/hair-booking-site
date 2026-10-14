// controllers/serviceController.js
import { prisma } from '../lib/prisma.js';
import serviceModel from '../models/service.js';
import { sendSuccess, sendError } from '../utils/response.js';

import { safeErrorMessage } from '../utils/errorMessages.js';

// Routes use optionalAuth, so req.user only exists for a valid session.
// Guests (the public booking page) must only ever see services that are
// bookable: the service itself AND its category must be active. Admins see
// everything so the dashboard can manage hidden items.
const isAdmin = (req) => req.user?.role?.toUpperCase() === 'ADMIN';

// Create a new service
export const createService = async (req, res) => {
  try {
    const service = await serviceModel.createService(req.body);
    return sendSuccess(res, service, 201);
  } catch (error) {
    console.error('Error creating service:', error);
    return sendError(res, safeErrorMessage(error), 400);
  }
};

// Get a single service by ID
export const getService = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const service = await serviceModel.getServiceById(id);

    // Same 404 for "missing" and "hidden" so guests can't probe for
    // inactive services by ID.
    if (!service || (!isAdmin(req) && !(service.isActive && service.category?.isActive))) {
      return sendError(res, 'Service not found', 404);
    }

    return sendSuccess(res, service);
  } catch (error) {
    console.error('Error fetching service:', error);
    return sendError(res, safeErrorMessage(error), 400);
  }
};

// Get all services (with skip/take pagination). Optional ?categoryId=
// filter for pages that only need one category's sub-options.
export const getServices = async (req, res) => {
  try {
    const skip = parseInt(req.query.skip) || 0;
    const take = parseInt(req.query.take) || 500;
    const categoryId = req.query.categoryId ? parseInt(req.query.categoryId, 10) : undefined;

    // NOTE: appointments are deliberately NOT included. This endpoint is
    // public, and appointment rows carry private data (notes, calendar
    // event ids, client/booking linkage). Nothing on the client reads them
    // from here.
    const services = await prisma.service.findMany({
      where: {
        ...(categoryId ? { categoryId } : {}),
        ...(isAdmin(req) ? {} : { isActive: true, category: { isActive: true } }),
      },
      skip,
      take,
      include: { category: true },
      orderBy: [{ categoryId: 'asc' }, { displayOrder: 'asc' }],
    });

    return sendSuccess(res, services);
  } catch (error) {
    console.error('Error fetching services:', error);
    return sendError(res, safeErrorMessage(error), 400);
  }
};

// Update a service
export const updateService = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const service = await serviceModel.updateService(id, req.body);

    return sendSuccess(res, service);
  } catch (error) {
    console.error('Error updating service:', error);
    return sendError(res, safeErrorMessage(error), 400);
  }
};

// Delete a service
export const deleteService = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await serviceModel.deleteService(id);

    return sendSuccess(res, null, 200, 'Service deleted successfully');
  } catch (error) {
    console.error('Error deleting service:', error);
    return sendError(res, safeErrorMessage(error), 400);
  }
};
