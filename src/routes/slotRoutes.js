// src/routes/slotRoutes.js
import express from 'express';
import {
  createSlot,
  getSlots,
  getSlotById,
  updateSlot,
  deleteSlot,
  getAvailableSlots,
  getMonthAvailability,
} from '../controllers/slotController.js';
import { validateSlotCreate, validateSlotUpdate } from '../validators/slotValidator.js';
import { authenticate } from '../auth/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Public: clients need to see availability before/while booking. This is
// the only slot endpoint that's safe to be public — it returns computed
// open times, not real records with client data attached.
router.get('/available', getAvailableSlots);
router.get('/month-availability', getMonthAvailability);

// A Slot row always represents a real appointment's time block, which
// (once the include bug is fixed) carries the client's name/email/phone
// through appointment→booking→client→user — same PII exposure as the
// appointments list, so this is staff/admin only, not public.
router.get('/', authenticate, requireRole('ADMIN', 'STAFF'), getSlots);
router.get('/:id', authenticate, requireRole('ADMIN', 'STAFF'), getSlotById);

// Sensitive: only staff/admin manage the slot calendar.
router.post('/', authenticate, requireRole('ADMIN', 'STAFF'), validateSlotCreate, createSlot);
router.put('/:id', authenticate, requireRole('ADMIN', 'STAFF'), validateSlotUpdate, updateSlot);
router.delete('/:id', authenticate, requireRole('ADMIN', 'STAFF'), deleteSlot);

export default router;