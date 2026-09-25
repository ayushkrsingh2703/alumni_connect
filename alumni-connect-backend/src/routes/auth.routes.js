import express from 'express';
import {
  register,
  login,
  verifyEmail,
  resendVerification,
  getMe,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);

// Protected route
router.get('/me', authenticate, getMe);

export default router;