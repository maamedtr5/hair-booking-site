// src/controllers/slotController.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Utility: sanitize nested appointment/client data
function sanitizeSlot(slot) {
  if (!slot) return null;
  const safeSlot = { ...slot };

  if (safeSlot.appointment?.client?.password) {
    const { _password, ...safeClient } = safeSlot.appointment.client;
    safeSlot.appointment.client = safeClient;
  }
  if (safeSlot.appointment?.user?.password) {
    const { _password, ...safeUser } = safeSlot.appointment.user;
    safeSlot.appointment.user = safeUser;
  }

  return safeSlot;
}

// Create Slot
export const createSlot = async (req, res) => {
  try {
    const slot = await prisma.slot.create({ data: req.body });
    res.status(201).json(sanitizeSlot(slot));   // 👈 corrected line
  } catch (err) {
    res.status(400).json({ error: err.message });
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

    res.json(slots.map(sanitizeSlot));
  } catch (err) {
    console.error('Error fetching slots:', err);
    res.status(500).json({ error: 'Failed to fetch slots. Please try again later.' });
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
      return res.status(404).json({ error: 'Slot not found' });
    }
    res.json(sanitizeSlot(slot));
  } catch (err) {
    res.status(400).json({ error: err.message });
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
    res.json(sanitizeSlot(slot));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete Slot
export const deleteSlot = async (req, res) => {
  try {
    await prisma.slot.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Slot deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
