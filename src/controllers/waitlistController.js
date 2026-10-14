import {
  addToWaitlist,
  getWaitlistById,
  getAllWaitlists,
  updateWaitlist,
  deleteWaitlistEntry
} from '../models/waitlist.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { prisma } from '../lib/prisma.js';
import { assertServiceBookable } from '../utils/serviceAvailability.js';

import { safeErrorMessage } from '../utils/errorMessages.js';
// Utility: sanitize nested client data
function sanitizeWaitlist(waitlist) {
  if (!waitlist) return null;

  const safeWaitlist = { ...waitlist };

  if (safeWaitlist.client?.password) {
    const { password, ...safeClient } = safeWaitlist.client;
    safeWaitlist.client = safeClient;
  }

  return safeWaitlist;
}

export async function addToWaitlistHandler(req, res) {
  try {
    // The waitlist entry always belongs to the CALLER. clientId used to be
    // taken from the request body, so any client could waitlist (and spam
    // notifications to) any other client; and the whole body was passed to
    // Prisma, letting a caller set fields like `status` directly.
    const client = await prisma.client.findUnique({ where: { userId: req.user.id } });
    if (!client) return sendError(res, 'No client profile found for this account.', 403);

    const { serviceId, preferredDate } = req.body;
    const data = { clientId: client.id };

    if (serviceId) {
      const id = parseInt(serviceId, 10);
      const service = await prisma.service.findUnique({
        where: { id },
        include: { category: { select: { isActive: true } } },
      });
      assertServiceBookable(service); // can't queue for something unbookable
      data.serviceId = id;
    }
    if (preferredDate) data.preferredDate = new Date(preferredDate);

    const waitlist = await addToWaitlist(data);
    return sendSuccess(res, sanitizeWaitlist(waitlist), 201);
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 400);
  }
}

export async function getWaitlistEntryHandler(req, res) {
  try {
    const id = parseInt(req.params.id, 10);

    const waitlist = await getWaitlistById(id);

    if (!waitlist) {
      return sendError(res, 'Entry not found', 404);
    }

    return sendSuccess(res, sanitizeWaitlist(waitlist));
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 400);
  }
}

// Get all waitlist entries with pagination
export async function getWaitlistEntriesHandler(req, res) {
  try {
    const skip = parseInt(req.query.skip, 10) || 0;
    const take = parseInt(req.query.take, 10) || 500;

    const waitlists = await getAllWaitlists({
      skip,
      take,
    });

    return sendSuccess(res, waitlists.map(sanitizeWaitlist));
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 400);
  }
}

export async function updateWaitlistEntryHandler(req, res) {
  try {
    const id = parseInt(req.params.id, 10);

    const waitlist = await updateWaitlist(id, req.body);

    return sendSuccess(res, sanitizeWaitlist(waitlist));
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 400);
  }
}

export async function deleteWaitlistEntryHandler(req, res) {
  try {
    const id = parseInt(req.params.id, 10);

    await deleteWaitlistEntry(id);

    return sendSuccess(res, null, 200, 'Entry deleted successfully');
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 400);
  }
}
