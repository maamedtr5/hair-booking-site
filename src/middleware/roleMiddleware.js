// src/middleware/roleMiddleware.js
//
// Called two different ways across the routes in this codebase:
//   requireRole('ADMIN', 'STAFF')   — variadic strings
//   requireRole(['admin', 'stylist']) — a single array
// The previous single-parameter signature only worked for the array form —
// every variadic call site (the majority of them) passed a bare string into
// `roles.map(...)`, which throws (strings have no .map), turning every one
// of those routes into a 500 on every request. Rest params + .flat() make
// both calling conventions work correctly.
export const requireRole = (...roles) => {
  const allowedRoles = roles.flat();

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Normalize both user role and required roles to uppercase
    const userRole = req.user.role?.toUpperCase();
    const normalizedRoles = allowedRoles.map((r) => r.toUpperCase());

    if (!normalizedRoles.includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Forbidden: insufficient role' });
    }

    next();
  };
};
