// src/utils/salonLocationCore.js
//
// Deliberately does NOT ship a default address or coordinates — Madina
// Estates is a real place and a wrong pin sends a real client to the
// wrong doorstep. Admin fills this in from Settings; until they do, the
// public endpoint returns nulls/empty strings and the frontend shows a
// "location coming soon" state instead of guessing.

export const DEFAULT_SALON_LOCATION = {
  address: '',
  // Optional — if set, used for a precise map pin and for building a
  // "directions from here" link. If left null, the frontend falls back
  // to a text-address search, which still works but is less precise.
  latitude: null,
  longitude: null,
  // Freeform, admin-authored guidance on getting here by trotro — which
  // routes/stations to use, which to avoid. Deliberately not pre-filled
  // with any specific route/fare/station names: that's hyper-local,
  // frequently-changing knowledge that has to come from someone who
  // actually rides it, not guessed at.
  gettingHereNotes: '',
};

export function validateSalonLocationShape(location) {
  if (!location || typeof location !== 'object') return 'Location must be an object';
  if (typeof location.address !== 'string') return 'address must be a string';
  if (location.address.length > 300) return 'address is too long';

  for (const field of ['latitude', 'longitude']) {
    const v = location[field];
    if (v !== null && v !== undefined && typeof v !== 'number') {
      return `${field} must be a number or null`;
    }
  }
  if (typeof location.latitude === 'number' && (location.latitude < -90 || location.latitude > 90)) {
    return 'latitude must be between -90 and 90';
  }
  if (typeof location.longitude === 'number' && (location.longitude < -180 || location.longitude > 180)) {
    return 'longitude must be between -180 and 180';
  }
  // Coordinates only mean something as a pair — half a pin isn't useful
  // and is more likely a typo (one field filled, one forgotten) than an
  // intentional partial value.
  const hasLat = typeof location.latitude === 'number';
  const hasLng = typeof location.longitude === 'number';
  if (hasLat !== hasLng) return 'latitude and longitude must both be set, or both left blank';

  if (typeof location.gettingHereNotes !== 'string') return 'gettingHereNotes must be a string';
  if (location.gettingHereNotes.length > 2000) return 'gettingHereNotes is too long (2000 characters max)';

  return null; // valid
}
