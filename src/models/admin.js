// models/admin.js
import { prisma } from '../lib/prisma.js';



export async function createAdmin(data) {
  return prisma.admin.create({ data });
}

export async function getAdminById(id) {
  return prisma.admin.findUnique({ where: { id }, include: { user: true } });
}

export async function getAllAdmins() {
  return prisma.admin.findMany({ include: { user: true } });
}

export async function updateAdmin(id, data) {
  return prisma.admin.update({ where: { id }, data });
}

export async function deleteAdmin(id) {
  return prisma.admin.delete({ where: { id } });
}
