// models/service.js
import { prisma } from '../lib/prisma.js';

async function createService(data) {
  const { categoryId, name, description, duration, price, isActive, displayOrder } = data;
  return prisma.service.create({
    data: {
      categoryId,
      name,
      description: description ?? null,
      duration,
      price,
      isActive: isActive ?? true,
      displayOrder: displayOrder ?? 0,
    },
    include: { category: true },
  });
}

async function getServiceById(id) {
  return prisma.service.findUnique({
    where: { id },
    include: { appointments: true, reviews: true, category: true }
  });
}

async function getAllServices() {
  return prisma.service.findMany({ include: { appointments: true, reviews: true, category: true } });
}

async function updateService(id, data) {
  const { categoryId, name, description, duration, price, isActive, displayOrder } = data;
  return prisma.service.update({
    where: { id },
    data: {
      ...(categoryId !== undefined ? { categoryId } : {}),
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(duration !== undefined ? { duration } : {}),
      ...(price !== undefined ? { price } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(displayOrder !== undefined ? { displayOrder } : {}),
    },
    include: { category: true },
  });
}

async function deleteService(id) {
  return prisma.service.delete({ where: { id } });
}

  export default {
  createService,
  getServiceById,
  getAllServices,
  updateService,
  deleteService
};
