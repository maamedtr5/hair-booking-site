import {
  addToWaitlist,
  getWaitlistById,
  getAllWaitlists,
  updateWaitlist,
  deleteWaitlistEntry
} from '../models/waitlist.js';
import { sendSuccess, sendError } from '../utils/response.js';

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
    const waitlist = await addToWaitlist(req.body);
    return sendSuccess(res, sanitizeWaitlist(waitlist), 201);
  } catch (err) {
    return sendError(res, err.message, 400);
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
    return sendError(res, err.message, 400);
  }
}

// Get all waitlist entries with pagination
export async function getWaitlistEntriesHandler(req, res) {
  try {
    const skip = parseInt(req.query.skip, 10) || 0;
    const take = parseInt(req.query.take, 10) || 10;

    const waitlists = await getAllWaitlists({
      skip,
      take,
    });

    return sendSuccess(res, waitlists.map(sanitizeWaitlist));
  } catch (err) {
    return sendError(res, err.message, 400);
  }
}

export async function updateWaitlistEntryHandler(req, res) {
  try {
    const id = parseInt(req.params.id, 10);

    const waitlist = await updateWaitlist(id, req.body);

    return sendSuccess(res, sanitizeWaitlist(waitlist));
  } catch (err) {
    return sendError(res, err.message, 400);
  }
}

export async function deleteWaitlistEntryHandler(req, res) {
  try {
    const id = parseInt(req.params.id, 10);

    await deleteWaitlistEntry(id);

    return sendSuccess(res, null, 200, 'Entry deleted successfully');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
}