// src/models/waitlist.js
import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const prisma = new PrismaClient();

export async function addToWaitlist(data) {
  return prisma.waitlist.create({
    data,
    include: {
      client: true,
      service: true,
    },
  });
}

export async function getWaitlistById(id) {
  return prisma.waitlist.findUnique({
    where: { id },
    include: {
      client: true,
      service: true,
    },
  });
}

export async function getAllWaitlists({ skip = 0, take = 10 } = {}) {
  return prisma.waitlist.findMany({
    skip,
    take,
    include: {
      client: true,
      service: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function updateWaitlist(id, data) {
  return prisma.waitlist.update({
    where: { id },
    data,
    include: {
      client: true,
      service: true,
    },
  });
}

export async function deleteWaitlistEntry(id) {
  return prisma.waitlist.delete({
    where: { id },
  });
}