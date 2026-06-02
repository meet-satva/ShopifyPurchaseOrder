// api/po-seeder/routes.js
import express from 'express';
import { createPlaywrightSession, generatePOsWithPlaywright } from './playwright-po-generator.js';
import { storageManager } from './storage-manager.js';

const router = express.Router();
let activeGeneration = null;

// Check if session exists for a shop
router.post('/check-session', async (req, res) => {
  try {
    const { shopDomain } = req.body;

    if (!shopDomain) {
      return res.json({ sessionExists: false });
    }

    const sessionFile = await storageManager.getSessionPath(shopDomain);
    const sessionExists = await storageManager.fileExists(sessionFile);

    res.json({
      sessionExists,
      shopDomain: sessionExists ? shopDomain : null,
    });
  } catch (error) {
    console.error('Session check error:', error);
    res.status(500).json({ error: 'Failed to check session' });
  }
});

// Create a new Playwright session
router.post('/create-session', async (req, res) => {
  try {
    const { shopDomain } = req.body;

    if (!shopDomain || !shopDomain.includes('myshopify.com')) {
      return res.status(400).json({
        error: 'Invalid shop domain. Format: yourstore.myshopify.com',
      });
    }

    console.log(`Creating Playwright session for ${shopDomain}`);

    const sessionPath = await storageManager.getSessionPath(shopDomain);
    const success = await createPlaywrightSession(shopDomain, sessionPath);

    if (success) {
      res.json({
        success: true,
        message: 'Session created successfully',
      });
    } else {
      res.status(400).json({
        error: 'Failed to create session. Check if store is accessible.',
      });
    }
  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({
      error: `Session creation failed: ${error.message}`,
    });
  }
});

// Generate POs with streaming progress
router.post('/generate-pos', async (req, res) => {
  try {
    const { shopDomain, poCount } = req.body;

    if (!shopDomain || !poCount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (poCount < 1 || poCount > 5000) {
      return res.status(400).json({ error: 'PO count must be between 1 and 5000' });
    }

    const sessionFile = await storageManager.getSessionPath(shopDomain);
    const sessionExists = await storageManager.fileExists(sessionFile);

    if (!sessionExists) {
      return res.status(400).json({
        error: 'No session found. Create a session first.',
      });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const sendEvent = (type, data) => {
      res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
    };

    const generation = { stopped: false };
    activeGeneration = generation;

    req.on('close', () => {
      generation.stopped = true;
    });

    try {
      const progressCallback = (completed, total) => {
        sendEvent('progress', { completed, total });
      };
      const errorCallback = (details) => {
        sendEvent('error', details);
      };

      const result = await generatePOsWithPlaywright(
        shopDomain,
        sessionFile,
        poCount,
        progressCallback,
        errorCallback,
        () => generation.stopped
      );

      if (result.success) {
        sendEvent('complete', { completed: result.completed });
      } else if (generation.stopped) {
        sendEvent('stopped', { completed: result.completed || 0 });
      } else {
        sendEvent('error', { error: result.error });
      }
    } catch (error) {
      console.error('PO generation error:', error);
      if (error?.code === 'GENERATION_ABORTED' || generation.stopped) {
        sendEvent('stopped', { message: 'Generation stopped by user' });
      } else {
        sendEvent('error', { error: `Generation failed: ${error.message}` });
      }
    } finally {
      if (activeGeneration === generation) {
        activeGeneration = null;
      }
      res.end();
    }
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/stop-generation', async (_req, res) => {
  if (activeGeneration) {
    activeGeneration.stopped = true;
    return res.json({ success: true, message: 'Stop requested' });
  }

  return res.status(404).json({ success: false, error: 'No active generation to stop' });
});

// Delete session
router.post('/delete-session', async (req, res) => {
  try {
    const { shopDomain } = req.body;

    if (!shopDomain) {
      return res.status(400).json({ error: 'Missing shop domain' });
    }

    const sessionFile = await storageManager.getSessionPath(shopDomain);
    await storageManager.deleteFile(sessionFile);

    res.json({ success: true, message: 'Session deleted' });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

export default router;
