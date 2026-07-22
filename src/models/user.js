 // src/models/user.js
import { prisma } from '../lib/prisma.js';


export async function createUser(data) {
  return prisma.user.create({ data });
}

export async function getUserById(id) {
  return prisma.user.findUnique({ where: { id } });
}

export async function getUserByEmail(email) {
  return prisma.user.findUnique({ where: { email } });
}

export async function getAllUsers() {
  return prisma.user.findMany();
}

export async function updateUser(id, data) {
  return prisma.user.update({ where: { id }, data });
}

export async function deleteUser(id) {
  return prisma.user.delete({ where: { id } });
}