import express from 'express';
import {
  aiMentorSearch,
  aiResumeAnalyse,
  aiChatbot,
} from '../controllers/ai.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Mentor search (works for both logged in and guests)
router.post('/mentor-search', optionalAuth, aiMentorSearch);

// Resume analysis (requires auth to access user's profile)
router.post('/resume-analyse', optionalAuth, aiResumeAnalyse);

// Chatbot (public)
router.post('/chatbot', aiChatbot);

export default router;