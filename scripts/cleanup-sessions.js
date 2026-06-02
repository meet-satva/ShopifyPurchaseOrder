// scripts/cleanup-sessions.js
// Clean up old browser sessions (older than specified days)

import { storageManager } from '../api/po-seeder/storage-manager.js';

const DAYS_OLD = process.env.CLEANUP_DAYS_OLD || 30;

console.log('╔════════════════════════════════════════╗');
console.log('║   Session Cleanup Utility             ║');
console.log('╚════════════════════════════════════════╝\n');

async function cleanup() {
  try {
    console.log(`Checking for sessions older than ${DAYS_OLD} days...\n`);

    const sessions = await storageManager.listSessions();

    if (sessions.length === 0) {
      console.log('✅ No sessions found. Nothing to clean up.');
      return;
    }

    console.log(`Found ${sessions.length} total sessions:\n`);

    const now = new Date();
    let oldCount = 0;

    sessions.forEach((session) => {
      const ageInDays = (now - session.modified) / (1000 * 60 * 60 * 24);
      const isOld = ageInDays > DAYS_OLD;
      const status = isOld ? '🗑️  OLD' : '✅ ACTIVE';

      console.log(`${status} | ${session.shopDomain}`);
      console.log(`     Created: ${session.created.toLocaleDateString()}`);
      console.log(`     Age: ${ageInDays.toFixed(0)} days`);
      console.log('');

      if (isOld) oldCount++;
    });

    console.log(`\n---\n`);
    console.log(`Sessions to be deleted: ${oldCount}`);

    if (oldCount > 0) {
      const deleted = await storageManager.clearOldSessions(DAYS_OLD);
      console.log(`✅ Deleted ${deleted} old sessions`);
    }

    console.log('\n✅ Cleanup complete!\n');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

cleanup();
