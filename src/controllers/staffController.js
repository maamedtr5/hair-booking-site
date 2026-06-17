// src/controllers/staffController.js
import { prisma } from '../lib/prisma.js';
import {
  createStaff,
  getStaffById,
  updateStaff,
  deleteStaff
} from '../models/staff.js';

//   Create new staff
export const createStaffHandler = async (req, res) => {
  try {
    const staff = await createStaff(req.body);
    res.status(201).json(staff); 
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

//   Get single staff by ID
export const getStaffHandler = async (req, res) => {
  try {
    const staffId = parseInt(req.params.id);
    const staff = await getStaffById(staffId);

    if (!staff) {
      return res.status(404).json({ error: "Staff not found" });
    }

    res.status(200).json(staff);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

//   Get all staff (with skip/take pagination)
export const getStaffsHandler = async (req, res) => {
  try {
    const skip = parseInt(req.query.skip) || 0;
    const take = parseInt(req.query.take) || 10;

    const staff = await prisma.staff.findMany({
      skip,
      take,
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(staff);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

//   Update staff by ID
export const updateStaffHandler = async (req, res) => {
  try {
    const staffId = parseInt(req.params.id);
    const updated = await updateStaff(staffId, req.body);
    res.status(200).json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

//   Delete staff by ID
export const deleteStaffHandler = async (req, res) => {
  try {
    const staffId = parseInt(req.params.id);
    await deleteStaff(staffId);
    res.status(200).json({ message: "Staff deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
