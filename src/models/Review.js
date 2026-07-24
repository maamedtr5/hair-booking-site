// models/review.js
import { prisma } from '../lib/prisma.js';



async function createReview(data) {
  return prisma.review.create({ data });
}

async function getReviewById(id) {
  return prisma.review.findUnique({
    where: { id },
    include: { client: true, service: true, staff: true }
  });
}

async function getAllReviews() {
  return prisma.review.findMany({
    include: { client: true, service: true, staff: true }
  });
}

async function updateReview(id, data) {
  return prisma.review.update({
    where: { id },
    data
  });
}

async function deleteReview(id) {
  return prisma.review.delete({ where: { id } });
}

  export default {
  createReview,
  getReviewById,
  getAllReviews,
  updateReview,
  deleteReview
};
