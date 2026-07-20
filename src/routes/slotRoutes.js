// src/routes/slotRoutes.js
import express from 'express';
import {
  createSlot,
  getSlots,
  getSlotById,
  updateSlot,
  deleteSlot,
} from '../controllers/slotController.js';
import { validateSlotCreate, validateSlotUpdate } from '../validators/slotValidator.js';
import { authenticate } from '../auth/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Public: clients need to see availability before/while booking.
router.get('/', getSlots);
router.get('/:id', getSlotById);

// Sensitive: only staff/admin manage the slot calendar.
router.post('/', authenticate, requireRole('ADMIN', 'STAFF'), validateSlotCreate, createSlot);
router.put('/:id', authenticate, requireRole('ADMIN', 'STAFF'), validateSlotUpdate, updateSlot);
router.delete('/:id', authenticate, requireRole('ADMIN', 'STAFF'), deleteSlot);

export default router;