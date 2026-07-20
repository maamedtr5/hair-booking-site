// src/routes/clientRoutes.js
import express from 'express';
import * as clientController from '../controllers/clientController.js';
import { validateClientUpdate } from '../validators/clientValidator.js';
import { authenticate } from '../auth/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

 
router.get('/:id', authenticate, clientController.getClient); // ownership/staff check inside
router.get('/', authenticate, requireRole('ADMIN', 'STAFF'), clientController.getClients);
router.put('/:id', authenticate, validateClientUpdate, clientController.updateClient); // ownership check inside
router.delete('/:id', authenticate, requireRole('ADMIN'), clientController.deleteClient);

export default router;