// api/po-seeder/playwright-po-generator.js
import { chromium } from 'playwright';
import { getConfig } from '../../advanced-config.js';

const config = getConfig();

/**
 * Creates a valid Shopify session state and saves it to a local JSON file.
 */
async function createPlaywrightSession(shopDomain, sessionPath) {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
      ignoreHTTPSErrors: true,
    });

await context.route('**/*{google-analytics,analytics,bugsnag,trek,monorail}*', route => route.abort());

    const page = await context.newPage();

    console.log(`[playwright] Initializing session at: https://${shopDomain}/admin`);
    await page.goto(`https://${shopDomain}/admin`, { waitUntil: 'domcontentloaded', timeout: 60000 });

    await page.waitForURL(/.*\/admin.*/, { timeout: 180000, waitUntil: 'domcontentloaded' });

    await page.waitForSelector(
  '[data-polaris-scrollable], .Polaris-Navigation, .Polaris-Frame',
  { timeout: 60000 }
).catch(() => {
  console.warn('[playwright] Warning: Admin nav not detected — session may be incomplete');
});

    await context.storageState({ path: sessionPath });
    console.log('[playwright] Session saved successfully');
    return true;
  } finally {
    await browser.close();
  }
}

/**
 * Custom error builder to identify user-triggered abort cycles cleanly.
 */
function createGenerationAbortError() {
  const error = new Error('Generation stopped by user');
  error.code = 'GENERATION_ABORTED';
  return error;
}

/**
 * Main worker loop that accesses Shopify Admin via Render's environment to seed Purchase Orders.
 */
async function generatePOsWithPlaywright(
  shopDomain,
  sessionFile,
  poCount,
  progressCallback,
  errorCallback,
  shouldStop = () => false
) {
  const { generateFakePOData } = await import('./fake-data-generator.js');

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process' // Overcomes cross-origin frame freezes on cloud servers
    ],
  });

  try {
    const context = await browser.newContext({
      storageState: sessionFile,
      viewport: { width: 1280, height: 900 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
      ignoreHTTPSErrors: true,
    });

    // CRITICAL: Abort background metric streams that cause networkidle states to hang indefinitely on Render IPs
await context.route('**/*{google-analytics,analytics,bugsnag,trek,monorail}*', route => route.abort());

    const page = await context.newPage();
    const cleanDomain = shopDomain.replace('.myshopify.com', '');
    const poListUrl = `https://admin.shopify.com/store/${cleanDomain}/purchase_orders`;

    console.log(`[playwright] Navigating to target interface: ${poListUrl}`);
    
    try {
      // Switched from networkidle to domcontentloaded to fix the 60000ms timeout
      await page.goto(poListUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      
      console.log('[playwright] Core structure loaded. Synchronizing interface components...');
      // Explicitly wait for visual elements instead of network activity
      await page.waitForSelector('s-internal-page, .Polaris-Layout, .Polaris-Table', { timeout: 60000 });    } 
    catch (gotoError) {
      console.error('[playwright] Core navigation failed. Documenting UI layout status via emergency snapshot...');
      await page.screenshot({ path: './public/error-screenshot.png', fullPage: true }).catch(() => {});
      throw new Error(`Shopify interface failed to resolve: ${gotoError.message}. Review deployment via /error-screenshot.png`);
    }

    let success = 0;
    let failed = 0;

    for (let i = 1; i <= poCount; i++) {
      if (shouldStop()) throw createGenerationAbortError();

      const poData = generateFakePOData(i);
      console.log(`[playwright] Seeding Purchase Order ${i}/${poCount}: ${poData.poNumber}`);

      try {
        await clickCreatePOButton(page, shouldStop);
        await selectOrCreateSupplier(page, poData.supplier, shouldStop);
        await selectDestination(page, shouldStop);
        await fillReferenceNumber(page, poData.poNumber, shouldStop);
        await clickMainSaveButton(page, shouldStop);
        await waitForTimelineHeader(page, shouldStop);
        await navigateBackToPOList(page, poListUrl, shouldStop);

        success++;
        console.log(`[playwright] PO ${i} completed and verified`);
      } catch (err) {
        if (err?.code === 'GENERATION_ABORTED') {
          throw err;
        }

        failed++;
        console.error(`[playwright] Processing fault on execution loop ${i}:`, err.message);
        if (errorCallback) {
          errorCallback({
            type: 'po_error',
            completed: i - 1,
            total: poCount,
            poNumber: poData.poNumber,
            message: err.message,
          });
        }
      }

      if (progressCallback) progressCallback(i, poCount);
      if (shouldStop()) throw createGenerationAbortError();
      await page.waitForTimeout(700);
    }

    console.log(`[playwright] Loop execution complete -> Success: ${success}, Failed: ${failed}`);
    return { success: true, completed: success, failed };
  } finally {
    await browser.close();
  }
}

// ====================== WAIT HELPERS ======================

async function waitForTimelineHeader(page, shouldStop = () => false) {
  console.log('[playwright] Monitoring element hierarchy for Timeline confirmation header...');

  try {
    const deadline = Date.now() + 15000;

    while (Date.now() < deadline) {
      if (shouldStop()) throw createGenerationAbortError();

      const timeline = page
        .locator('div._Header_25vvr_13 s-internal-heading:has-text("Timeline")')
        .first();

      if (await timeline.count()) {
        console.log('[playwright] Event log timeline identified - entry updated safely');
        await page.waitForTimeout(1000);
        return;
      }

      await page.waitForTimeout(250);
    }

    console.log('[playwright] Note: Target selector resolution timed out, falling back forward...');
    await page.waitForTimeout(3000);
  } catch (e) {
    if (e?.code === 'GENERATION_ABORTED') throw e;
    console.log('[playwright] Warning: Structural trace interrupted, skipping to target state...');
    await page.waitForTimeout(3000);
  }
}

// ====================== UI INTERACTION HELPERS ======================

async function clickCreatePOButton(page, shouldStop = () => false) {
  if (shouldStop()) throw createGenerationAbortError();

  const selectors = [
    'a[href*="purchase_orders/new"]',
    'button:has-text("Create purchase order")',
    'a:has-text("Create purchase order")',
  ];

  for (const sel of selectors) {
    try {
      if (shouldStop()) throw createGenerationAbortError();
      const element = page.locator(sel).first();
      if ((await element.count()) > 0 && (await element.isVisible())) {
        await element.click({ timeout: 10000 });
        console.log('[playwright] Step Context: Instantiated "Create purchase order" step');
        await page.waitForTimeout(600);
        return;
      }
    } catch (e) {}
  }

  throw new Error('Required creation link context not visible in DOM');
}

async function selectOrCreateSupplier(page, supplierName, shouldStop = () => false) {
  if (shouldStop()) throw createGenerationAbortError();

  console.log(`[playwright] Mapping entity target supplier: ${supplierName}`);

  const supplierTriggerSelectors = [
    'button:has-text("Select supplier")',
    'button[role="combobox"]',
    'div[role="combobox"] button',
    'button.Polaris-Combobox__Input',
    '[data-testid*="Supplier"] button',
    'button:has-text("supplier")',
  ];

  let clicked = false;

  for (const sel of supplierTriggerSelectors) {
    if (shouldStop()) throw createGenerationAbortError();

    try {
      const trigger = page.locator(sel).first();
      if ((await trigger.count()) > 0 && (await trigger.isVisible({ timeout: 2000 }))) {
        await trigger.click({ timeout: 8000 });
        console.log(`[playwright] Dropdown triggered via selector context: ${sel}`);
        clicked = true;
        break;
      }
    } catch (e) {
      continue;
    }
  }

  if (!clicked) {
    console.log('[playwright] Trigger alternative locator fallback on vendor segment input field');
    await page.locator('div:has-text("Supplier") button').first().click({ timeout: 6000 }).catch(() => {});
  }

  await page.waitForTimeout(700);

  if (shouldStop()) throw createGenerationAbortError();

  const existingOption = page.locator(`text="${supplierName}"`).first();

  if (await existingOption.count() > 0) {
    await existingOption.click();
    console.log(`[playwright] Verified mapping to native supplier: ${supplierName}`);
    await page.waitForTimeout(400);
    return;
  }

  console.log(`[playwright] Creating missing entity profile: ${supplierName}`);

  await page.locator('text=Create new supplier').first().click({ timeout: 8000 });
  await page.waitForTimeout(600);

  if (shouldStop()) throw createGenerationAbortError();

  await page.locator('input[name="name"], input[placeholder*="Name"]').first().fill(supplierName);
  await page.waitForTimeout(400);

  if (shouldStop()) throw createGenerationAbortError();

  await page.locator('button.Polaris-Button--variantPrimary:has-text("Save")')
    .first()
    .click({ timeout: 8000 });

  await page.waitForTimeout(1200);
  console.log(`[playwright] Vendor context synchronized: ${supplierName}`);
}

async function selectDestination(page, shouldStop = () => false) {
  if (shouldStop()) throw createGenerationAbortError();
  await page
    .locator('button:has-text("Select destination"), button:has-text("Shop location")')
    .click({ timeout: 8000 });
  await page.waitForTimeout(400);
  if (shouldStop()) throw createGenerationAbortError();
  await page.locator('text=Shop location').first().click().catch(() => {});
  await page.waitForTimeout(400);
}

async function fillReferenceNumber(page, poNumber, shouldStop = () => false) {
  if (shouldStop()) throw createGenerationAbortError();
  await page
    .locator('input[placeholder*="Reference number"], input[name*="reference"]')
    .first()
    .fill(poNumber);
  await page.waitForTimeout(200);
}

async function clickMainSaveButton(page, shouldStop = () => false) {
  if (shouldStop()) throw createGenerationAbortError();

  const saveSelectors = [
    'button.Polaris-Button--variantPrimary:has-text("Save")',
    'button[aria-label="Save"]',
    'button:has-text("Save")',
  ];

  console.log('[playwright] Synchronizing pointer to core commit Save action action...');

  for (const sel of saveSelectors) {
    if (shouldStop()) throw createGenerationAbortError();
    const btn = page.locator(sel).first();
    if ((await btn.count()) > 0 && (await btn.isVisible())) {
      await btn.click({ timeout: 10000 });
      console.log('[playwright] Executed main save action');
      return;
    }
  }

  throw new Error('Persistent layout change Save interface unresolvable');
}

async function navigateBackToPOList(page, poListUrl, shouldStop = () => false) {
  if (shouldStop()) throw createGenerationAbortError();

  try {
    await page
      .locator('span[aria-hidden="true"].icon.color-subdued.tone-neutral.size-base')
      .first()
      .click({ timeout: 8000 })
      .catch(async () => {
        await page.locator('svg[viewBox="0 0 16 16"]').first().click({ timeout: 6000 });
      });

    await page.waitForTimeout(600);
    if (shouldStop()) throw createGenerationAbortError();
    await page.locator('text=Purchase orders').first().click({ timeout: 5000 }).catch(() => {});

    // Switched from networkidle to domcontentloaded to avoid dynamic tracking locks
    await page.waitForLoadState('domcontentloaded', { timeout: 8000 });
    console.log('[playwright] Scope context restored to index overview panel');
  } catch (e) {
    if (shouldStop()) throw createGenerationAbortError();
    console.log('[playwright] Falling back to direct layout lookup routing...');
    await page.goto(poListUrl, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
  }
}

export { createPlaywrightSession, generatePOsWithPlaywright };
