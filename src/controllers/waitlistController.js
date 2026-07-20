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
    const { password: _password, ...safeClient } = safeWaitlist.client;
    safeWaitlist.client = safeClient;
  }

  return safeWaitlist;
}

export async function addToWaitlistHandler(req, res) {
  try {
    const waitlist = await addToWaitlist(req.body);

    res.status(201).json(sanitizeWaitlist(waitlist));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function getWaitlistEntryHandler(req, res) {
  try {
    const id = parseInt(req.params.id, 10);

    const waitlist = await getWaitlistById(id);

    if (!waitlist) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    res.json(sanitizeWaitlist(waitlist));
  } catch (err) {
    res.status(400).json({ error: err.message });
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

    res.json(waitlists.map(sanitizeWaitlist));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function updateWaitlistEntryHandler(req, res) {
  try {
    const id = parseInt(req.params.id, 10);

    const waitlist = await updateWaitlist(id, req.body);

    res.json(sanitizeWaitlist(waitlist));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function deleteWaitlistEntryHandler(req, res) {
  try {
    const id = parseInt(req.params.id, 10);

    await deleteWaitlistEntry(id);

    res.json({ message: 'Entry deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}