// api/po-seeder/storage-manager.js
import fs from 'fs/promises';
import path from 'path';
import { getConfig } from '../../advanced-config.js';

const config = getConfig();
const sessionsDirectory = path.resolve(process.cwd(), config.sessions.directory || './sessions');

function normalizeShopDomain(shopDomain) {
  return shopDomain.trim().toLowerCase().replace(/[^a-z0-9.-]/g, '_');
}

export async function ensureSessionsDir() {
  await fs.mkdir(sessionsDirectory, { recursive: true });
  return sessionsDirectory;
}

export async function getSessionPath(shopDomain) {
  if (!shopDomain) {
    throw new Error('shopDomain is required');
  }

  await ensureSessionsDir();
  const filename = `${normalizeShopDomain(shopDomain)}.json`;
  return path.join(sessionsDirectory, filename);
}

export async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function deleteFile(filePath) {
  try {
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function listSessions() {
  await ensureSessionsDir();

  const files = await fs.readdir(sessionsDirectory);
  const sessions = [];

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const filePath = path.join(sessionsDirectory, file);
    const stats = await fs.stat(filePath);
    sessions.push({
      filename: file,
      shopDomain: file.replace(/\.json$/, ''),
      created: stats.birthtime,
      modified: stats.mtime,
      size: stats.size,
      path: filePath,
    });
  }

  return sessions;
}

export async function clearOldSessions(daysOld = 30) {
  const sessions = await listSessions();
  const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000;
  let deletedCount = 0;

  for (const session of sessions) {
    if (session.modified.getTime() < cutoff) {
      await deleteFile(session.path);
      deletedCount += 1;
    }
  }

  return deletedCount;
}

export const storageManager = {
  ensureSessionsDir,
  getSessionPath,
  fileExists,
  deleteFile,
  listSessions,
  clearOldSessions,
};
