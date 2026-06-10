// src/routes/slotRoutes.js
import express from 'express';
import {
  createSlot,
  getSlots,
  getSlotById,
  updateSlot,
  deleteSlot
} from '../controllers/slotController.js';
import {
  validateSlotCreate,
  validateSlotUpdate
} from '../validators/slotValidator.js';
import { authenticate } from '../auth/authMiddleware.js';

const router = express.Router();

//     Create slot
router.post(
  '/',
  authenticate,
  validateSlotCreate,
  createSlot
);

//     Get all slots
router.get(
  '/',
  authenticate,
  getSlots
);

//     Get slot by ID
router.get(
  '/:id',
  authenticate,
  getSlotById
);

//     Update slot
router.put(
  '/:id',
  authenticate,
  validateSlotUpdate,
  updateSlot
);

//     Delete slot
router.delete(
  '/:id',
  authenticate,
  deleteSlot
);

export default router;
