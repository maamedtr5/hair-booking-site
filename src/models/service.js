// models/service.js
import { prisma } from '../lib/prisma.js';
import serviceImageModel from './serviceImage.js';

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
    // Public-facing: never include appointments (private booking data) here.
    include: { category: true }
  });
}

async function getAllServices() {
  return prisma.service.findMany({ include: { category: true } });
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
  const existing = await prisma.service.findUnique({ where: { id }, select: { imageId: true } });
  // Throws (as before) if the service doesn't exist or still has bookings.
  const deleted = await prisma.service.delete({ where: { id } });
  // The row is gone either way; a failed photo cleanup must not turn a
  // successful delete into an error response.
  try {
    await serviceImageModel.deleteIfUnreferenced(existing?.imageId);
  } catch (err) {
    console.error('Orphaned service image cleanup failed:', err.message);
  }
  return deleted;
}

  export default {
  createService,
  getServiceById,
  getAllServices,
  updateService,
  deleteService
};
