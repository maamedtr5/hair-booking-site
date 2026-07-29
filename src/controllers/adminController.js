// src/controllers/adminController.js
import { prisma } from '../lib/prisma.js';
import { sendSuccess, sendError } from '../utils/response.js';

//   Create admin
export const createAdminHandler = async (req, res) => {
  try {
    const admin = await prisma.admin.create({ data: req.body });
    return sendSuccess(res, admin, 201); //   201 Created for new resource
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

//   Get single admin by ID
export const getAdminHandler = async (req, res) => {
  try {
    const admin = await prisma.admin.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { user: true }
    });
    if (!admin) return sendError(res, 'Admin not found', 404);
    return sendSuccess(res, admin);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

//   Get all admins (with skip/take pagination)
export const getAdminsHandler = async (req, res) => {
  try {
    const skip = parseInt(req.query.skip) || 0;
    const take = parseInt(req.query.take) || 500;

    const admins = await prisma.admin.findMany({
      skip,
      take,
      include: { user: true },
      orderBy: { createdAt: 'desc' }, //   consistent ordering
    });

    return sendSuccess(res, admins);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

//   Update admin
export const updateAdminHandler = async (req, res) => {
  try {
    const admin = await prisma.admin.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    return sendSuccess(res, admin);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

//   Delete admin
export const deleteAdminHandler = async (req, res) => {
  try {
    await prisma.admin.delete({ where: { id: parseInt(req.params.id) } });
    return sendSuccess(res, null, 200, 'Admin deleted successfully');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};
