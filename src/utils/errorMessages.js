// src/utils/errorMessages.js
//
// Central place to turn a caught error into something safe to show a
// client — never a raw Prisma/driver message, never a native JS runtime
// error, never anything that names a table, column, file path, or host.


const PRISMA_CODE_MESSAGES = {
  P2002: 'That record already exists.',
  P2003: "This action can't be completed because related information is missing.",
  P2025: "The record you're looking for could not be found.",
  P2028: 'That took too long to process. Please try again.',
};

function isPrismaError(err) {
  return (
    (typeof err?.code === 'string' && /^P\d{4}$/.test(err.code)) ||
    (typeof err?.name === 'string' && err.name.startsWith('Prisma'))
  );
}

function isDeliberateAppError(err) {
  // App code always throws the base Error class with a hand-written,
  // readable message — never a Prisma error, never a native runtime error
  // subclass (TypeError, RangeError, etc., which are bugs, not messages
  // meant for a client to read).
  return err instanceof Error && err.constructor === Error && !isPrismaError(err);
}

export { isPrismaError, isDeliberateAppError };

/**
 * Returns a message safe to send to the client for a caught error. Always
 * logs the original error server-side first, regardless of what's
 * returned — nothing is silently lost for debugging, only what reaches
 * the client is filtered.
 */
export function safeErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  console.error(err);

  if (isPrismaError(err)) {
    return PRISMA_CODE_MESSAGES[err.code] || 'Something went wrong processing your request. Please try again.';
  }

  if (isDeliberateAppError(err)) {
    return err.message || fallback;
  }

  return fallback;
}
