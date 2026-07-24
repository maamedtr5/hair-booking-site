// models/appointment.js
import { prisma } from '../lib/prisma.js';



async function createAppointment(data) {
  return prisma.appointment.create({ data });
}

async function getAppointmentById(id) {
  return prisma.appointment.findUnique({
    where: { id },
    include: { client: true, service: true, staff: true }
  });
}

async function getAllAppointments() {
  return prisma.appointment.findMany({
    include: { client: true, service: true, staff: true }
  });
}

async function updateAppointment(id, data) {
  return prisma.appointment.update({
    where: { id },
    data
  });
}

async function deleteAppointment(id) {
  return prisma.appointment.delete({ where: { id } });
}

  export default {
  createAppointment,
  getAppointmentById,
  getAllAppointments,
  updateAppointment,
  deleteAppointment
};
