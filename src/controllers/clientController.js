// src/controllers/clientController.js
import { prisma } from '../lib/prisma.js';
import clientModel from '../models/client.js';
import { sendSuccess, sendError } from '../utils/response.js';

const isStaffOrAdmin = (role) => ['ADMIN', 'STAFF'].includes(role);

export const getClient = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const client = await clientModel.getClientById(id);
    if (!client) return sendError(res, 'Client not found', 404);

    if (client.userId !== req.user.id && !isStaffOrAdmin(req.user.role)) {
      return sendError(res, 'Forbidden', 403);
    }
    return sendSuccess(res, client);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

// ADMIN/STAFF only (route-level).
export const getClients = async (req, res) => {
  try {
    const skip = parseInt(req.query.skip, 10) || 0;
    const take = parseInt(req.query.take, 10) || 1000;
    const clients = await prisma.client.findMany({
      skip,
      take,
      include: { user: true, bookings: true },
    });
    return sendSuccess(res, clients);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

export const updateClient = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await clientModel.getClientById(id);
    if (!existing) return sendError(res, 'Client not found', 404);
    if (existing.userId !== req.user.id && !isStaffOrAdmin(req.user.role)) {
      return sendError(res, 'Forbidden', 403);
    }

    const { phone, address } = req.body;
    const data = {};
    if (phone !== undefined) data.phone = phone;
    if (address !== undefined) data.address = address;

    const client = await clientModel.updateClient(id, data);
    return sendSuccess(res, client);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

// ADMIN only (route-level).
export const deleteClient = async (req, res) => {
  try {
    await clientModel.deleteClient(parseInt(req.params.id, 10));
    return sendSuccess(res, null, 200, 'Client deleted successfully');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};