import bookingModel from '../models/booking.js';

// Utility to strip password if client/user is included
function sanitizeBooking(booking) {
  if (!booking) return null;
  const safeBooking = { ...booking };

  if (safeBooking.client && safeBooking.client.password) {
    const { password, ...safeClient } = safeBooking.client;
    safeBooking.client = safeClient;
  }
  if (safeBooking.user && safeBooking.user.password) {
    const { password, ...safeUser } = safeBooking.user;
    safeBooking.user = safeUser;
  }

  return safeBooking;
}

export const createBooking = async (req, res) => {
  try {
    const booking = await bookingModel.createBooking(req.body);
    res.json(sanitizeBooking(booking));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getBooking = async (req, res) => {
  try {
    const booking = await bookingModel.getBookingById(parseInt(req.params.id));
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    res.json(sanitizeBooking(booking));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getBookings = async (req, res) => {
  try {
    const bookings = await bookingModel.getAllBookings();
    res.json(bookings.map(sanitizeBooking));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const updateBooking = async (req, res) => {
  try {
    const booking = await bookingModel.updateBooking(parseInt(req.params.id), req.body);
    res.json(sanitizeBooking(booking));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const deleteBooking = async (req, res) => {
  try {
    await bookingModel.deleteBooking(parseInt(req.params.id));
    res.json({ message: "Booking deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
