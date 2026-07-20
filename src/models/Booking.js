// src/models/booking.js
import { prisma } from '../lib/prisma.js';

async function createBooking(data) {
  return prisma.booking.create({ data });
}

async function getBookingById(id) {
  return prisma.booking.findUnique({
    where: { id },
    include: { appointment: true, client: { include: { user: true } }, payment: true },
  });
}

async function getAllBookings() {
  return prisma.booking.findMany({
    include: { appointment: true, client: { include: { user: true } }, payment: true },
  });
}

async function updateBooking(id, data) {
  return prisma.booking.update({ where: { id }, data });
}

async function deleteBooking(id) {
  return prisma.booking.delete({ where: { id } });
}

export default { createBooking, getBookingById, getAllBookings, updateBooking, deleteBooking };