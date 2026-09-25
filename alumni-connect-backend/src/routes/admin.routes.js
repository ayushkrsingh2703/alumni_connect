import express from 'express';
import {
  getAnalytics,
  getPendingAlumni,
  getPendingStudents,
  approveAlumni,
  rejectAlumni,
  requestMoreInfo,
  toggleUserSuspension,
  approveStudent,
  rejectStudent,
  getAllAlumni,
} from '../controllers/admin.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require auth + admin role
router.use(authenticate, requireAdmin);

// Analytics
router.get('/analytics', getAnalytics);

// Pending lists
router.get('/pending-alumni', getPendingAlumni);
router.get('/pending-students', getPendingStudents);
router.get('/all-alumni', getAllAlumni);

// Alumni actions
router.patch('/alumni/:id/approve', approveAlumni);
router.patch('/alumni/:id/reject', rejectAlumni);
router.patch('/alumni/:id/request-info', requestMoreInfo);

// User suspension
router.patch('/users/:id/suspend', toggleUserSuspension);

// Student approvals
router.patch('/students/:id/approve', approveStudent);
router.patch('/students/:id/reject', rejectStudent);

export default router;