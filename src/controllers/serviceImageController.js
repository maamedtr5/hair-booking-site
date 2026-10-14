// src/controllers/serviceImageController.js
import serviceImageModel from '../models/serviceImage.js';
import { processServiceImage, ImageValidationError } from '../utils/imageProcessing.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { safeErrorMessage } from '../utils/errorMessages.js';

const LABELS = { service: 'Service', category: 'Category' };

// Admin only (route-level): POST /<services|service-categories>/:id/image
// multipart field "image". Replaces any existing photo.
export const makeUploadImageHandler = (kind) => async (req, res) => {
  try {
    const ownerId = parseInt(req.params.id, 10);
    const processed = await processServiceImage(req.file?.buffer);

    const imageId = await serviceImageModel.setImage(kind, ownerId, processed);
    if (imageId === null) return sendError(res, `${LABELS[kind]} not found`, 404);

    return sendSuccess(res, { imageId }, 201);
  } catch (error) {
    if (error instanceof ImageValidationError) {
      return sendError(res, error.message, 400);
    }
    console.error(`Error uploading ${kind} image:`, error);
    return sendError(res, safeErrorMessage(error), 400);
  }
};

// Admin only (route-level): DELETE /<services|service-categories>/:id/image
export const makeDeleteImageHandler = (kind) => async (req, res) => {
  try {
    const ownerId = parseInt(req.params.id, 10);
    const found = await serviceImageModel.clearImage(kind, ownerId);
    if (!found) return sendError(res, `${LABELS[kind]} not found`, 404);
    return sendSuccess(res, { imageId: null }, 200, 'Photo removed');
  } catch (error) {
    console.error(`Error removing ${kind} image:`, error);
    return sendError(res, safeErrorMessage(error), 400);
  }
};

// Public: GET /service-images/:id — the photo bytes, for <img src>.
// Ids are immutable (a replacement photo gets a new id), so the response
// is cacheable forever by browsers and any CDN in front of the API.
export const getServiceImage = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const image = await serviceImageModel.getImageForServing(id);
    if (!image) return sendError(res, 'Image not found', 404);

    res.set({
      'Content-Type': image.mimeType,
      'Content-Length': String(image.data.length),
      'Content-Disposition': 'inline',
      'Cache-Control': 'public, max-age=31536000, immutable',
      // helmet defaults this to same-origin, which would stop the Vercel
      // frontend from displaying images served by the Render API.
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'X-Content-Type-Options': 'nosniff',
      // Belt and braces: if anyone ever navigates straight to the image URL,
      // nothing in it can execute.
      'Content-Security-Policy': "default-src 'none'; sandbox",
    });
    return res.status(200).end(image.data);
  } catch (error) {
    // A DB failure is not "not found": report it as a server error so it
    // shows up in monitoring and isn't cached as a missing image.
    console.error('Error serving service image:', error);
    return sendError(res, 'Could not load image', 500);
  }
};
