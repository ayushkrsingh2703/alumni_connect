import express from 'express';
import {
  sendMentorshipRequest,
  listMentorships,
  incomingMentorships,
  acceptMentorship,
  declineMentorship,
  sendFeedback,
  getMentorship,
} from '../controllers/mentorships.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Create
router.post('/', authenticate, sendMentorshipRequest);

// List
router.get('/', authenticate, listMentorships);
router.get('/incoming', authenticate, incomingMentorships);

// Actions
router.patch('/:id/accept', authenticate, acceptMentorship);
router.patch('/:id/decline', authenticate, declineMentorship);
router.patch('/:id/feedback', authenticate, sendFeedback);

// Single
router.get('/:id', authenticate, getMentorship);

export default router;