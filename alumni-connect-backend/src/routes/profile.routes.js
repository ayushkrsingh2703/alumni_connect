import express from 'express';
import {
  getProfile,
  updateProfile,
  uploadAvatarCtrl,
  uploadResumeCtrl,
  deleteResumeCtrl,
  uploadMediaCtrl,
  deleteMediaCtrl,
} from '../controllers/profile.controller.js';
import { authenticate } from '../middleware/auth.js';
import { uploadAvatar, uploadResume, uploadMedia } from '../middleware/upload.js';

const router = express.Router();

// ============================================================
// Profile GET/PUT
// ============================================================
router.get('/:userId', getProfile);
router.put('/:userId', updateProfile);

// ============================================================
// Avatar
// ============================================================
router.post('/avatar', authenticate, uploadAvatar, uploadAvatarCtrl);

// ============================================================
// Resume
// ============================================================
router.post('/resume', authenticate, uploadResume, uploadResumeCtrl);
router.delete('/resume', authenticate, deleteResumeCtrl);

// ============================================================
// Media Gallery
// ============================================================
router.post('/media', authenticate, uploadMedia, uploadMediaCtrl);
router.delete('/media/:userId/:id', authenticate, deleteMediaCtrl);

export default router;