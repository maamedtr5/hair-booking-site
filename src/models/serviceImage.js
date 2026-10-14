// src/models/serviceImage.js
import { prisma } from '../lib/prisma.js';

// Each target locks its own row (SELECT ... FOR UPDATE) for the duration of
// the swap, so two admins replacing the same photo at once serialize instead
// of both reading the same "old" image and leaving one new image orphaned.
// Table names are fixed literals here (never user input).
const TARGETS = {
  service: {
    delegate: 'service',
    lock: (tx, id) => tx.$queryRaw`SELECT id FROM "Service" WHERE id = ${id} FOR UPDATE`,
  },
  category: {
    delegate: 'serviceCategory',
    lock: (tx, id) => tx.$queryRaw`SELECT id FROM "ServiceCategory" WHERE id = ${id} FOR UPDATE`,
  },
};

// Prisma's defaults (2s wait / 5s run) are tight for a BYTEA insert over a
// pooled Neon connection that may be waking from idle.
const TX_OPTIONS = { maxWait: 5000, timeout: 15000 };

// Stores a freshly processed image and points the owner at it, removing the
// previous image in the same transaction. Returns the new imageId, or null if
// the owner doesn't exist (nothing is written in that case).
async function setImage(kind, ownerId, processed) {
  const target = TARGETS[kind];
  return prisma.$transaction(async (tx) => {
    const locked = await target.lock(tx, ownerId);
    if (locked.length === 0) return null;

    const owner = await tx[target.delegate].findUnique({
      where: { id: ownerId },
      select: { imageId: true },
    });

    const image = await tx.serviceImage.create({
      data: processed,
      select: { id: true },
    });
    await tx[target.delegate].update({ where: { id: ownerId }, data: { imageId: image.id } });

    if (owner?.imageId) {
      await tx.serviceImage.deleteMany({ where: { id: owner.imageId } });
    }
    return image.id;
  }, TX_OPTIONS);
}

// Detaches and deletes the owner's image. Returns false if the owner doesn't
// exist. Idempotent: removing a photo that isn't there succeeds.
async function clearImage(kind, ownerId) {
  const target = TARGETS[kind];
  return prisma.$transaction(async (tx) => {
    const locked = await target.lock(tx, ownerId);
    if (locked.length === 0) return false;

    const owner = await tx[target.delegate].findUnique({
      where: { id: ownerId },
      select: { imageId: true },
    });
    if (owner?.imageId) {
      await tx[target.delegate].update({ where: { id: ownerId }, data: { imageId: null } });
      await tx.serviceImage.deleteMany({ where: { id: owner.imageId } });
    }
    return true;
  }, TX_OPTIONS);
}

// Deletes an image row only if nothing references it any more. Used after a
// service/category is deleted so its photo doesn't linger as an orphan.
async function deleteIfUnreferenced(imageId) {
  if (!imageId) return;
  await prisma.serviceImage.deleteMany({
    where: { id: imageId, services: { none: {} }, categories: { none: {} } },
  });
}

async function getImageForServing(id) {
  return prisma.serviceImage.findUnique({
    where: { id },
    select: { data: true, mimeType: true },
  });
}

export default { setImage, clearImage, deleteIfUnreferenced, getImageForServing };
