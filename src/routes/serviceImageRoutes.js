// src/routes/serviceImageRoutes.js
import express from 'express';
import { getServiceImage } from '../controllers/serviceImageController.js';
import { validateImageIdParam } from '../validators/serviceImageValidator.js';

const router = express.Router();

// Public: service/category photos are marketing content shown to guests.
router.get('/:id', validateImageIdParam, getServiceImage);

export default router;
