// models/formTemplate.js
import { prisma } from '../lib/prisma.js';

const WITH_FIELDS = { include: { fields: { orderBy: { order: 'asc' } } } };

async function createTemplate(data) {
  const { name, description, isActive } = data;
  return prisma.formTemplate.create({
    data: { name, description: description ?? null, isActive: isActive ?? true },
    ...WITH_FIELDS,
  });
}

async function getTemplateById(id) {
  return prisma.formTemplate.findUnique({ where: { id }, ...WITH_FIELDS });
}

async function getAllTemplates() {
  return prisma.formTemplate.findMany({ ...WITH_FIELDS, orderBy: { createdAt: 'desc' } });
}

async function updateTemplate(id, data) {
  const { name, description, isActive } = data;
  return prisma.formTemplate.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
    ...WITH_FIELDS,
  });
}

// Deleting a template detaches (rather than deletes) any ServiceCategory
// that required it and any Form submissions filed against it — both FKs
// are ON DELETE SET NULL, so historic consultation answers are preserved
// even after the template itself is removed.
async function deleteTemplate(id) {
  return prisma.formTemplate.delete({ where: { id } });
}

async function addField(formTemplateId, data) {
  const { section, label, helpText, fieldType, options, required, order } = data;

  // New fields default to the end of the list unless the admin specifies
  // an explicit position, so the builder can just "add" without having to
  // know the current count.
  let resolvedOrder = order;
  if (resolvedOrder === undefined || resolvedOrder === null) {
    const last = await prisma.formField.findFirst({
      where: { formTemplateId },
      orderBy: { order: 'desc' },
    });
    resolvedOrder = last ? last.order + 1 : 0;
  }

  return prisma.formField.create({
    data: {
      formTemplateId,
      section: section ?? null,
      label,
      helpText: helpText ?? null,
      fieldType,
      options: options ?? null,
      required: required ?? false,
      order: resolvedOrder,
    },
  });
}

async function updateField(id, data) {
  const { section, label, helpText, fieldType, options, required, order } = data;
  return prisma.formField.update({
    where: { id },
    data: {
      ...(section !== undefined ? { section } : {}),
      ...(label !== undefined ? { label } : {}),
      ...(helpText !== undefined ? { helpText } : {}),
      ...(fieldType !== undefined ? { fieldType } : {}),
      ...(options !== undefined ? { options } : {}),
      ...(required !== undefined ? { required } : {}),
      ...(order !== undefined ? { order } : {}),
    },
  });
}

async function deleteField(id) {
  return prisma.formField.delete({ where: { id } });
}

async function getFieldById(id) {
  return prisma.formField.findUnique({ where: { id } });
}

// Applies a full new ordering in one transaction — either every field
// listed lands on its requested position or none do, so a dropped network
// request mid-drag never leaves the form half-reordered.
async function reorderFields(formTemplateId, orderedFieldIds) {
  return prisma.$transaction(
    orderedFieldIds.map((fieldId, index) =>
      prisma.formField.update({
        where: { id: fieldId },
        data: { order: index },
      })
    )
  ).then(async () => prisma.formField.findMany({
    where: { formTemplateId },
    orderBy: { order: 'asc' },
  }));
}

export default {
  createTemplate,
  getTemplateById,
  getAllTemplates,
  updateTemplate,
  deleteTemplate,
  addField,
  updateField,
  deleteField,
  getFieldById,
  reorderFields,
};
