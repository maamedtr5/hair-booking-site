// models/service.js
import { prisma } from '../lib/prisma.js';

 
async function createService(data) {
  return prisma.service.create({ data });
}

async function getServiceById(id) {
  return prisma.service.findUnique({
    where: { id },
    include: { appointments: true, reviews: true }
  });
}

async function getAllServices() {
  return prisma.service.findMany({ include: { appointments: true, reviews: true } });
}

async function updateService(id, data) {
  return prisma.service.update({
    where: { id },
    data
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