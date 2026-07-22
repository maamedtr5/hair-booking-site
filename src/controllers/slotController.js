// src/controllers/slotController.js
import { prisma } from '../lib/prisma.js';
import { sendSuccess, sendError } from '../utils/response.js';

// Utility: sanitize nested appointment/client data
function sanitizeSlot(slot) {
  if (!slot) return null;
  const safeSlot = { ...slot };

  if (safeSlot.appointment?.client?.password) {
    const { password, ...safeClient } = safeSlot.appointment.client;
    safeSlot.appointment.client = safeClient;
  }
  if (safeSlot.appointment?.user?.password) {
    const { password, ...safeUser } = safeSlot.appointment.user;
    safeSlot.appointment.user = safeUser;
  }

  return safeSlot;
}

// Create Slot
export const createSlot = async (req, res) => {
  try {
    const slot = await prisma.slot.create({ data: req.body });
    return sendSuccess(res, sanitizeSlot(slot), 201);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

//   Get all Slots (with skip/take pagination)
export const getSlots = async (req, res) => {
  try {
    // Parse query params, default to skip=0, take=10
    const skip = parseInt(req.query.skip) || 0;
    const take = parseInt(req.query.take) || 10;

    const slots = await prisma.slot.findMany({
      skip,
      take,
      include: {
        appointment: {
          include: { client: true, user: true }
        }
      },
      orderBy: { startTime: 'asc' } // optional: order by start time
    });

    return sendSuccess(res, slots.map(sanitizeSlot));
  } catch (err) {
    console.error('Error fetching slots:', err);
    return sendError(res, 'Failed to fetch slots. Please try again later.', 500);
  }
};

// Get Slot by ID
export const getSlotById = async (req, res) => {
  try {
    const slot = await prisma.slot.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { appointment: { include: { client: true, user: true } } }
    });
    if (!slot) {
      return sendError(res, 'Slot not found', 404);
    }
    return sendSuccess(res, sanitizeSlot(slot));
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

// Update Slot
export const updateSlot = async (req, res) => {
  try {
    const slot = await prisma.slot.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
      include: { appointment: { include: { client: true, user: true } } }
    });
    return sendSuccess(res, sanitizeSlot(slot));
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

// Delete Slot
export const deleteSlot = async (req, res) => {
  try {
    await prisma.slot.delete({ where: { id: parseInt(req.params.id) } });
    return sendSuccess(res, null, 200, 'Slot deleted');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};