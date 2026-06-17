// src/controllers/adminController.js
import { prisma } from '../lib/prisma.js';

//   Create admin
export const createAdminHandler = async (req, res) => {
  try {
    const admin = await prisma.admin.create({ data: req.body });
    res.status(201).json(admin); // ✅ 201 Created for new resource
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

//   Get single admin by ID
export const getAdminHandler = async (req, res) => {
  try {
    const admin = await prisma.admin.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { user: true }
    });
    if (!admin) return res.status(404).json({ error: "Admin not found" });
    res.status(200).json(admin);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

//   Get all admins (with skip/take pagination)
export const getAdminsHandler = async (req, res) => {
  try {
    const skip = parseInt(req.query.skip) || 0;
    const take = parseInt(req.query.take) || 10;

    const admins = await prisma.admin.findMany({
      skip,
      take,
      include: { user: true },
      orderBy: { createdAt: 'desc' }, // ✅ consistent ordering
    });

    res.status(200).json(admins);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

//   Update admin
export const updateAdminHandler = async (req, res) => {
  try {
    const admin = await prisma.admin.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    res.status(200).json(admin);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

//   Delete admin
export const deleteAdminHandler = async (req, res) => {
  try {
    await prisma.admin.delete({ where: { id: parseInt(req.params.id) } });
    res.status(200).json({ message: "Admin deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
