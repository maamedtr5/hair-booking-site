// src/controllers/staffController.js
import { prisma } from '../lib/prisma.js';
import {
  createStaff,
  getStaffById,
  updateStaff,
  deleteStaff
} from '../models/staff.js';
import { sendSuccess, sendError } from '../utils/response.js';

//   Create new staff
export const createStaffHandler = async (req, res) => {
  try {
    const staff = await createStaff(req.body);
    return sendSuccess(res, staff, 201);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

//   Get single staff by ID
export const getStaffHandler = async (req, res) => {
  try {
    const staffId = parseInt(req.params.id);
    const staff = await getStaffById(staffId);

    if (!staff) {
      return sendError(res, 'Staff not found', 404);
    }

    return sendSuccess(res, staff);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

//   Get all staff (with skip/take pagination)
export const getStaffsHandler = async (req, res) => {
  try {
    const skip = parseInt(req.query.skip) || 0;
    const take = parseInt(req.query.take) || 500;

    const staff = await prisma.staff.findMany({
      skip,
      take,
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });

    return sendSuccess(res, staff);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

//   Update staff by ID
export const updateStaffHandler = async (req, res) => {
  try {
    const staffId = parseInt(req.params.id);
    const updated = await updateStaff(staffId, req.body);
    return sendSuccess(res, updated);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

//   Delete staff by ID
export const deleteStaffHandler = async (req, res) => {
  try {
    const staffId = parseInt(req.params.id);
    await deleteStaff(staffId);
    return sendSuccess(res, null, 200, 'Staff deleted successfully');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};
