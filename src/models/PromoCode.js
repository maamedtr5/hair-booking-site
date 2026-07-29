// models/promocode.js
import { prisma } from '../lib/prisma.js';



async function createPromocode(data) {
  return prisma.promocode.create({ data });
}

async function getPromocodeById(id) {
  return prisma.promocode.findUnique({ where: { id } });
}

async function getPromocodeByCode(code) {
  return prisma.promocode.findUnique({ where: { code } });
}

async function getAllPromocodes() {
  return prisma.promocode.findMany();
}

async function updatePromocode(id, data) {
  return prisma.promocode.update({
    where: { id },
    data
  });
}

async function deletePromocode(id) {
  return prisma.promocode.delete({ where: { id } });
}

  export default {
  createPromocode,
  getPromocodeById,
  getPromocodeByCode,
  getAllPromocodes,
  updatePromocode,
  deletePromocode
};
