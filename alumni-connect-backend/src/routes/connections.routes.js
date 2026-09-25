import express from 'express';
import {
  sendConnectionRequest,
  acceptConnection,
  rejectConnection,
  listConnections,
  incomingRequests,
} from '../controllers/connections.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Send request
router.post('/request', authenticate, sendConnectionRequest);

// Accept / Reject
router.post('/accept', authenticate, acceptConnection);
router.post('/reject', authenticate, rejectConnection);

// List
router.get('/', authenticate, listConnections);
router.get('/incoming', authenticate, incomingRequests);

export default router;