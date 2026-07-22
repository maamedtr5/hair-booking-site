// models/form.js
import { prisma } from '../lib/prisma.js';



async function createForm(data) {
  return prisma.form.create({ data });
}

async function getFormById(id) {
  return prisma.form.findUnique({
    where: { id },
    include: { client: true, booking: true }
  });
}

async function getAllForms() {
  return prisma.form.findMany({
    include: { client: true, booking: true }
  });
}

async function updateForm(id, data) {
  return prisma.form.update({
    where: { id },
    data
  });
}

async function deleteForm(id) {
  return prisma.form.delete({ where: { id } });
}

  export default {
  createForm,
  getFormById,
  getAllForms,
  updateForm,
  deleteForm
};