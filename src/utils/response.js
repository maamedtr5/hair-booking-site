// src/utils/response.js
export function sendSuccess(res, data = null, status = 200, message) {
  const body = { success: true, data };
  if (message) body.message = message;
  return res.status(status).json(body);
}

export function sendError(res, message, status = 400, extra = {}) {
  return res.status(status).json({ success: false, message, ...extra });
}