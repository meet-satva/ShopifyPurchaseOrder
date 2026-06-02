// api/po-seeder/playwright-po-generator.js
import { chromium } from 'playwright';
import { getConfig } from '../../advanced-config.js';

const config = getConfig();

async function createPlaywrightSession(shopDomain, sessionPath) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
      ignoreHTTPSErrors: true,
    });

    const page = await context.newPage();
    await page.goto(`https://${shopDomain}/admin`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/.*\/admin.*/, { timeout: 180000 });

    await context.storageState({ path: sessionPath });
    console.log('[playwright] Session saved');
    return true;
  } finally {
    await browser.close();
  }
}

function createGenerationAbortError() {
  const error = new Error('Generation stopped by user');
  error.code = 'GENERATION_ABORTED';
  return error;
}

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
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  });

  try {
    const context = await browser.newContext({
      storageState: sessionFile,
      viewport: { width: 1280, height: 900 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
      ignoreHTTPSErrors: true,
    });

    const page = await context.newPage();
    const cleanDomain = shopDomain.replace('.myshopify.com', '');
    const poListUrl = `https://admin.shopify.com/store/${cleanDomain}/purchase_orders`;

    console.log(`[playwright] Navigating to: ${poListUrl}`);
    await page.goto(poListUrl, { waitUntil: 'networkidle', timeout: 60000 });

    let success = 0;
    let failed = 0;

    for (let i = 1; i <= poCount; i++) {
      if (shouldStop()) throw createGenerationAbortError();

      const poData = generateFakePOData(i);
      console.log(`[playwright] Creating PO ${i}/${poCount}: ${poData.poNumber}`);

      try {
        await clickCreatePOButton(page, shouldStop);
        await selectOrCreateSupplier(page, poData.supplier, shouldStop);
        await selectDestination(page, shouldStop);
        await fillReferenceNumber(page, poData.poNumber, shouldStop);
        await clickMainSaveButton(page, shouldStop);
        await waitForTimelineHeader(page, shouldStop);
        await navigateBackToPOList(page, poListUrl, shouldStop);

        success++;
        console.log(`[playwright] PO ${i} created successfully`);
      } catch (err) {
        if (err?.code === 'GENERATION_ABORTED') {
          throw err;
        }

        failed++;
        console.error(`[playwright] Failed PO ${i}:`, err.message);
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

    console.log(`[playwright] Finished -> Success: ${success}, Failed: ${failed}`);
    return { success: true, completed: success, failed };
  } finally {
    await browser.close();
  }
}

// ====================== WAIT HELPERS ======================

async function waitForTimelineHeader(page, shouldStop = () => false) {
  console.log('[playwright] Waiting for Timeline header to confirm save...');

  try {
    const deadline = Date.now() + 15000;

    while (Date.now() < deadline) {
      if (shouldStop()) throw createGenerationAbortError();

      const timeline = page
        .locator('div._Header_25vvr_13 s-internal-heading:has-text("Timeline")')
        .first();

      if (await timeline.count()) {
        console.log('[playwright] Timeline header detected - PO saved successfully');
        await page.waitForTimeout(1000);
        return;
      }

      await page.waitForTimeout(250);
    }

    console.log('[playwright] Warning: Timeline header not found, continuing anyway...');
    await page.waitForTimeout(3000);
  } catch (e) {
    if (e?.code === 'GENERATION_ABORTED') throw e;
    console.log('[playwright] Warning: Timeline wait failed, continuing anyway...');
    await page.waitForTimeout(3000);
  }
}

// ====================== HELPERS ======================

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
        console.log('[playwright] Clicked "Create purchase order"');
        await page.waitForTimeout(600);
        return;
      }
    } catch (e) {}
  }

  throw new Error('Could not find "Create purchase order" link');
}

async function selectOrCreateSupplier(page, supplierName, shouldStop = () => false) {
  if (shouldStop()) throw createGenerationAbortError();

  console.log(`[playwright] Selecting/creating supplier: ${supplierName}`);

  // Robust selectors to open the supplier dropdown (works whether empty or already filled)
  const supplierTriggerSelectors = [
    'button:has-text("Select supplier")',           // Initial state
    'button[role="combobox"]',                      // Polaris combobox
    'div[role="combobox"] button',                  
    'button.Polaris-Combobox__Input',               // Specific Polaris class
    '[data-testid*="Supplier"] button',             // Test ID based (future-proof)
    'button:has-text("supplier")',                  // Fallback - any button with "supplier"
  ];

  let clicked = false;

  for (const sel of supplierTriggerSelectors) {
    if (shouldStop()) throw createGenerationAbortError();

    try {
      const trigger = page.locator(sel).first();
      if ((await trigger.count()) > 0 && (await trigger.isVisible({ timeout: 2000 }))) {
        await trigger.click({ timeout: 8000 });
        console.log(`[playwright] Clicked supplier trigger using: ${sel}`);
        clicked = true;
        break;
      }
    } catch (e) {
      continue;
    }
  }

  if (!clicked) {
    console.log('[playwright] Using fallback click on supplier area');
    await page.locator('div:has-text("Supplier") button').first().click({ timeout: 6000 }).catch(() => {});
  }

  await page.waitForTimeout(700);

  if (shouldStop()) throw createGenerationAbortError();

  const existingOption = page.locator(`text="${supplierName}"`).first();

  if (await existingOption.count() > 0) {
    await existingOption.click();
    console.log(`[playwright] Selected existing supplier: ${supplierName}`);
    await page.waitForTimeout(400);
    return;
  }

  console.log(`[playwright] Creating new supplier: ${supplierName}`);

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
  console.log(`[playwright] Successfully created supplier: ${supplierName}`);
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

  console.log('[playwright] Looking for Save button...');

  for (const sel of saveSelectors) {
    if (shouldStop()) throw createGenerationAbortError();
    const btn = page.locator(sel).first();
    if ((await btn.count()) > 0 && (await btn.isVisible())) {
      await btn.click({ timeout: 10000 });
      console.log('[playwright] Clicked main PO Save button');
      return;
    }
  }

  throw new Error('Save button not found');
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

    await page.waitForLoadState('networkidle', { timeout: 8000 });
    console.log('[playwright] Navigated back to PO list');
  } catch (e) {
    if (shouldStop()) throw createGenerationAbortError();
    console.log('[playwright] Navigation fallback...');
    await page.goto(poListUrl, { waitUntil: 'networkidle', timeout: 12000 }).catch(() => {});
  }
}

export { createPlaywrightSession, generatePOsWithPlaywright };
