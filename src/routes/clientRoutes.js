// src/routes/clientRoutes.js
import express from 'express';
import * as clientController from '../controllers/clientController.js';
import {
  validateClientCreate,
  validateClientUpdate
} from '../validators/clientValidator.js';
import { authenticate } from '../auth/authMiddleware.js';

const router = express.Router();

// Create client → requireAuth
router.post('/', authenticate, validateClientCreate, clientController.createClient);

//   Get single client
router.get('/:id', clientController.getClient);

//   Get all clients
router.get('/', clientController.getClients);

//   Update client
router.put(
  '/:id',
  validateClientUpdate,
  clientController.updateClient
);

//   Delete client
router.delete('/:id', clientController.deleteClient);

export default router;
