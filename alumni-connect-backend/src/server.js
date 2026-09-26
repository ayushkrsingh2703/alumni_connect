import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import http from 'http';
import dotenv from 'dotenv';

import { testConnection } from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import profileRoutes from './routes/profile.routes.js';
import connectionsRoutes from './routes/connections.routes.js';
import mentorshipsRoutes from './routes/mentorships.routes.js';
import chatRoutes from './routes/chat.routes.js';
import aiRoutes from './routes/ai.routes.js';
import adminRoutes from './routes/admin.routes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// Initialize Express
// ============================================================
const app = express();
const server = http.createServer(app);

const PORT = Number(process.env.PORT) || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// ============================================================
// Middleware
// ============================================================
app.use(
  cors({
    origin: [CLIENT_URL, 'http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
  })
);

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Request logger (dev only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - start;
      const color =
        res.statusCode >= 500
          ? '\x1b[31m'
          : res.statusCode >= 400
          ? '\x1b[33m'
          : '\x1b[32m';
      console.log(
        `${color}${req.method}\x1b[0m ${req.originalUrl} \x1b[90m${res.statusCode} ${ms}ms\x1b[0m`
      );
    });
    next();
  });
}

// ============================================================
// Static Files
// ============================================================
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// ============================================================
// Health Check
// ============================================================
app.get('/api/health', async (req, res) => {
  const dbOk = await testConnection();
  res.json({
    status: dbOk ? 'ok' : 'degraded',
    message: 'LINKORA API running',
    database: dbOk ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ============================================================
// Mount Routes
// ============================================================
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/connections', connectionsRoutes);
app.use('/api/mentorships', mentorshipsRoutes);
app.use('/api/messages', chatRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);

// ============================================================
// 404 Handler
// ============================================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
  });
});

// ============================================================
// Global Error Handler
// ============================================================
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ============================================================
// Start Server
// ============================================================
const startServer = async () => {
  console.log('\n🚀 Starting LINKORA API server...\n');

  const dbOk = await testConnection();
  if (!dbOk) {
    console.error('\n⚠️  Server starting without database connection.\n');
  }

  server.listen(PORT, () => {
    console.log(`\n✅ Server running on http://localhost:${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/api/health`);
    console.log(`   Environment: ${process.env.NODE_ENV}`);
    console.log(`   CORS origin: ${CLIENT_URL}`);
    console.log(`\n   Press Ctrl+C to stop\n`);
  });
};

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled rejection:', err.message);
});

startServer();