// controllers/serviceController.js
import { prisma } from '../lib/prisma.js';
import serviceModel from '../models/service.js';

// Create a new service
export const createService = async (req, res) => {
  try {
    const service = await serviceModel.createService(req.body);
    return res.status(201).json(service);
  } catch (error) {
    console.error('❌ Error creating service:', error);
    return res.status(400).json({ error: error.message });
  }
};

// Get a single service by ID
export const getService = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const service = await serviceModel.getServiceById(id);

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    return res.json(service);
  } catch (error) {
    console.error('❌ Error fetching service:', error);
    return res.status(400).json({ error: error.message });
  }
};

// Get all services (with skip/take pagination)
export const getServices = async (req, res) => {
  try {
    const skip = parseInt(req.query.skip) || 0;
    const take = parseInt(req.query.take) || 10;

    console.log(`  Fetching services with skip=${skip}, take=${take}`);

    const services = await prisma.service.findMany({
      skip,
      take,
      include: { appointments: true },
      orderBy: { createdAt: 'desc' },
    });

    console.log('  Services fetched:', services.length);

    return res.json(services);
  } catch (error) {
    console.error('❌ Error fetching services:', error);
    return res.status(400).json({ error: error.message });
  }
};

// Update a service
export const updateService = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const service = await serviceModel.updateService(id, req.body);

    return res.json(service);
  } catch (error) {
    console.error('❌ Error updating service:', error);
    return res.status(400).json({ error: error.message });
  }
};

// Delete a service
export const deleteService = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await serviceModel.deleteService(id);

    return res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting service:', error);
    return res.status(400).json({ error: error.message });
  }
};
