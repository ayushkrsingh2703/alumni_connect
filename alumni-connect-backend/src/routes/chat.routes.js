import express from 'express';
import {
  listConversations,
  getConversation,
  sendMessage,
  getChatSession,
  unlockChatSession,
  resetChatSession,
  tickChatSession,
} from '../controllers/chat.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/conversations', authenticate, listConversations);
router.get('/session/:partnerId', authenticate, getChatSession);
router.post('/unlock', authenticate, unlockChatSession);
router.post('/reset', authenticate, resetChatSession);
router.post('/tick', authenticate, tickChatSession);

router.get('/:userId', authenticate, getConversation);
router.post('/', authenticate, sendMessage);

export default router;