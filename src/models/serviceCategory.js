// models/serviceCategory.js
import { prisma } from '../lib/prisma.js';

const PUBLIC_SERVICE_WHERE = { isActive: true };

function slugify(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const FORM_TEMPLATE_WITH_FIELDS = {
  include: { fields: { orderBy: { order: 'asc' } } },
};

async function createCategory(data) {
  const { name, description, displayOrder, isActive, formTemplateId } = data;
  return prisma.serviceCategory.create({
    data: {
      name,
      slug: slugify(name),
      description: description ?? null,
      displayOrder: displayOrder ?? 0,
      isActive: isActive ?? true,
      formTemplateId: formTemplateId ?? null,
    },
  });
}

async function getCategoryById(id, { includeServices = false } = {}) {
  return prisma.serviceCategory.findUnique({
    where: { id },
    include: {
      formTemplate: FORM_TEMPLATE_WITH_FIELDS,
      ...(includeServices ? { services: { orderBy: { displayOrder: 'asc' } } } : {}),
    },
  });
}

// Public-facing listing used by the booking flow: only active categories,
// each with only its active services, ordered for display. Includes the
// full form template (with ordered fields) when one is assigned so the
// client can render the consultation form immediately after picking a
// service in that category, with no extra round trip.
async function getAllCategories({ includeServices = true, activeOnly = false } = {}) {
  return prisma.serviceCategory.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: { displayOrder: 'asc' },
    include: {
      formTemplate: FORM_TEMPLATE_WITH_FIELDS,
      ...(includeServices
        ? {
            services: {
              where: activeOnly ? PUBLIC_SERVICE_WHERE : undefined,
              orderBy: { displayOrder: 'asc' },
            },
          }
        : {}),
    },
  });
}

async function updateCategory(id, data) {
  const { name, description, displayOrder, isActive, formTemplateId } = data;
  return prisma.serviceCategory.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name, slug: slugify(name) } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(displayOrder !== undefined ? { displayOrder } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      // Explicit null clears the required-form assignment.
      ...(formTemplateId !== undefined ? { formTemplateId } : {}),
    },
  });
}

async function deleteCategory(id) {
  return prisma.serviceCategory.delete({ where: { id } });
}

async function countServicesInCategory(id) {
  return prisma.service.count({ where: { categoryId: id } });
}

export default {
  createCategory,
  getCategoryById,
  getAllCategories,
  updateCategory,
  deleteCategory,
  countServicesInCategory,
  slugify,
};
