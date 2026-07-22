import { prisma } from '../lib/prisma.js';



export async function createStaff(data) { return prisma.staff.create({ data }); }
export async function getStaffById(id) { return prisma.staff.findUnique({ where: { id }, include: { user: true, appointments: true, reviews: true } }); }
export async function getAllStaff() { return prisma.staff.findMany({ include: { user: true } }); }
export async function updateStaff(id, data) { return prisma.staff.update({ where: { id }, data }); }
export async function deleteStaff(id) { return prisma.staff.delete({ where: { id } }); }