import { prisma } from '../lib/prisma.js';
import {
  addToWaitlist,
  getWaitlistById,
  getAllWaitlists,
  updateWaitlist,
  deleteWaitlistEntry
} from '../models/waitlist.js';

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
    res.json(sanitizeWaitlist(waitlist));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function getWaitlistEntryHandler(req, res) {
  try {
    const waitlist = await getWaitlistById(parseInt(req.params.id));
    if (!waitlist) return res.status(404).json({ error: 'Entry not found' });
    res.json(sanitizeWaitlist(waitlist));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function getWaitlistEntriesHandler(req, res) {
  try {
    const waitlists = await getAllWaitlists();
    res.json(waitlists.map(sanitizeWaitlist));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function updateWaitlistEntryHandler(req, res) {
  try {
    const waitlist = await updateWaitlist(parseInt(req.params.id), req.body);
    res.json(sanitizeWaitlist(waitlist));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function deleteWaitlistEntryHandler(req, res) {
  try {
    await deleteWaitlistEntry(parseInt(req.params.id));
    res.json({ message: 'Entry deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
