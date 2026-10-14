// src/utils/serviceAvailability.js
//
// Single definition of "can a customer book this service right now?".
// A service is only bookable if the service itself AND its category are
// active. Hiding a category in the admin dashboard hides its services from
// the public list (see serviceController), so the booking write paths must
// enforce the same rule — otherwise anyone who already knows a service id
// can still book it by calling the API directly.
//
// The thrown errors use the plain Error class on purpose: the validators'
// withSafeValidation() and safeErrorMessage() only pass through messages
// from deliberate, plain `Error`s, never from Prisma/runtime errors.

export function isServiceBookable(service) {
  return Boolean(service && service.isActive && service.category && service.category.isActive);
}

/** Throws (with .status) unless the service exists and is bookable. */
export function assertServiceBookable(service) {
  if (!service) {
    const err = new Error('Service not found');
    err.status = 404;
    throw err;
  }
  if (!isServiceBookable(service)) {
    const err = new Error('Service is not available');
    err.status = 400;
    err.code = 'SERVICE_UNAVAILABLE';
    throw err;
  }
}
