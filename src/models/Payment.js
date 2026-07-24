// models/payment.js
import { prisma } from '../lib/prisma.js';



async function createPayment(data) {
  return prisma.payment.create({ data });
}

async function getPaymentById(id) {
  return prisma.payment.findUnique({
    where: { id },
    include: { booking: true }
  });
}

async function getAllPayments() {
  return prisma.payment.findMany({ include: { booking: true } });
}

async function updatePayment(id, data) {
  return prisma.payment.update({
    where: { id },
    data
  });
}

async function deletePayment(id) {
  return prisma.payment.delete({ where: { id } });
}

  export default {
  createPayment,
  getPaymentById,
  getAllPayments,
  updatePayment,
  deletePayment
};
