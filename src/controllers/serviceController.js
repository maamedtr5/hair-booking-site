// controllers/serviceController.js
import { prisma } from '../lib/prisma.js';
import serviceModel from '../models/service.js';

export const createService = async (req, res) => {
  try {
    const service = await serviceModel.createService(req.body);
    res.status(201).json(service);   
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getService = async (req, res) => {
  try {
    const service = await serviceModel.getServiceById(parseInt(req.params.id));
    if (!service) return res.status(404).json({ error: "Service not found" });
    res.json(service);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

//   Get all services (with skip/take pagination)
export const getServices = async (req, res) => {
  try {
    // Parse query params, default to skip=0, take=10
    const skip = parseInt(req.query.skip) || 0;
    const take = parseInt(req.query.take) || 10;

    const services = await prisma.service.findMany({
      skip,
      take,
      include: {
        appointments: true,   
      },
      orderBy: { createdAt: 'desc' }, 
    });

    res.json(services);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const updateService = async (req, res) => {
  try {
    const service = await serviceModel.updateService(parseInt(req.params.id), req.body);
    res.json(service);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const deleteService = async (req, res) => {
  try {
    await serviceModel.deleteService(parseInt(req.params.id));
    res.json({ message: "Service deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};