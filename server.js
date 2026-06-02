// Complete Express server setup for Shopify PO Seeder app

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import poSeederRoutes from './api/po-seeder/routes.js';
import { storageManager } from './api/po-seeder/storage-manager.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const APP_URL = process.env.SHOPIFY_APP_URL || `http://localhost:${PORT}`;

// Middleware - Restrict CORS in production for better security
const corsOptions = {
  origin: NODE_ENV === 'production' 
    ? [APP_URL, /\.myshopify\.com$/] // Allows your app domain and any shopify admin store
    : '*', // Allows everything in local development
  credentials: true
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Trust proxy for proper IP handling (Crucial for Render's load balancers)
app.set('trust proxy', true);

// Initialize storage
storageManager.ensureSessionsDir().catch(console.error);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// PO Seeder API routes
app.use('/api/po-seeder', poSeederRoutes);

// Serve static files (React build)
app.use(express.static(path.join(__dirname, 'public')));

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Shopify PO Seeder API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      checkSession: 'POST /api/po-seeder/check-session',
      createSession: 'POST /api/po-seeder/create-session',
      generatePOs: 'POST /api/po-seeder/generate-pos',
      deleteSession: 'POST /api/po-seeder/delete-session',
    },
  });
});

// Serve React app for all other routes (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
    if (err) {
      res.status(404).json({ error: 'Not found' });
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║    🛒 Shopify PO Seeder Server Started     ║
╚════════════════════════════════════════════╝

Environment: ${NODE_ENV}
Port: ${PORT}
URL: ${APP_URL}
API: ${APP_URL}/api

Endpoints:
  - POST /api/po-seeder/check-session
  - POST /api/po-seeder/create-session
  - POST /api/po-seeder/generate-pos
  - POST /api/po-seeder/delete-session

Admin Dashboard: ${APP_URL}
  `);

  // Cleanup old sessions on startup
  if (NODE_ENV === 'production') {
    storageManager.clearOldSessions(30).catch(console.error);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

export default app;