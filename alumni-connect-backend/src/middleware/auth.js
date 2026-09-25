import { verifyToken, extractToken } from '../utils/jwt.js';

// ============================================================
// authenticate — verify JWT and attach user to req
// ============================================================
export const authenticate = (req, res, next) => {
  const token = extractToken(req.headers.authorization);

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please provide a token.',
    });
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token. Please log in again.',
    });
  }

  // Attach user info to request
  req.user = {
    id: decoded.userId,
    role: decoded.role,
  };

  next();
};

// ============================================================
// optionalAuth — try to authenticate but don't fail if no token
// (useful for public routes that show more data when logged in)
// ============================================================
export const optionalAuth = (req, res, next) => {
  const token = extractToken(req.headers.authorization);

  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = {
        id: decoded.userId,
        role: decoded.role,
      };
    }
  }

  next();
};

// ============================================================
// requireRole — check if authenticated user has required role
// ============================================================
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
      });
    }

    next();
  };
};

// ============================================================
// Shortcuts for common role checks
// ============================================================
export const requireAdmin = requireRole('admin');
export const requireStudent = requireRole('student');
export const requireAlumni = requireRole('alumni');
export const requireTeacher = requireRole('teacher');