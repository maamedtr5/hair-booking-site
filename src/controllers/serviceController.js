// controllers/serviceController.js
import { prisma } from '../lib/prisma.js';
import serviceModel from '../models/service.js';
import { sendSuccess, sendError } from '../utils/response.js';

// Create a new service
export const createService = async (req, res) => {
  try {
    const service = await serviceModel.createService(req.body);
    return sendSuccess(res, service, 201);
  } catch (error) {
    console.error('Error creating service:', error);
    return sendError(res, error.message, 400);
  }
};

// Get a single service by ID
export const getService = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const service = await serviceModel.getServiceById(id);

    if (!service) {
      return sendError(res, 'Service not found', 404);
    }

    return sendSuccess(res, service);
  } catch (error) {
    console.error('Error fetching service:', error);
    return sendError(res, error.message, 400);
  }
};

// Get all services (with skip/take pagination)
export const getServices = async (req, res) => {
  try {
    const skip = parseInt(req.query.skip) || 0;
    const take = parseInt(req.query.take) || 10;

    const services = await prisma.service.findMany({
      skip,
      take,
      include: { appointments: true },
      orderBy: { createdAt: 'desc' },
    });

    return sendSuccess(res, services);
  } catch (error) {
    console.error('Error fetching services:', error);
    return sendError(res, error.message, 400);
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
    return sendError(res, error.message, 400);
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
    return sendError(res, error.message, 400);
  }
};
