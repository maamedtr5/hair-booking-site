// src/utils/businessInfoCore.js

export const DEFAULT_BUSINESS_INFO = {
  name: 'Locs Allure',
  phone: '',
  email: '',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateBusinessInfoShape(info) {
  if (!info || typeof info !== 'object') return 'Business info must be an object';
  if (typeof info.name !== 'string' || !info.name.trim()) return 'Business name is required';
  if (info.name.length > 120) return 'Business name is too long';

  if (typeof info.phone !== 'string') return 'phone must be a string';
  if (info.phone.length > 30) return 'phone is too long';

  if (typeof info.email !== 'string') return 'email must be a string';
  if (info.email && !EMAIL_RE.test(info.email)) return 'email must be a valid email address';
  if (info.email.length > 254) return 'email is too long';

  return null; // valid
}
