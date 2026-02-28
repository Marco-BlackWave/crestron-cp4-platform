import { expect, test } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROOF_DIR = path.resolve(__dirname, '../../proof-screenshots');

test.describe('Crestron Home PROOF', () => {
  test('PROOF: full dashboard renders 1:1 at 1280x800', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/crestron-home/index.html');
    await expect(page.getByText('Crestron Home')).toBeVisible({ timeout: 15_000 });

    // Wait for images/animations to settle
    await page.waitForTimeout(2000);

    await page.screenshot({ path: path.join(PROOF_DIR, '01-overview-dashboard.png'), fullPage: false });

    // Measure layout
    const root = page.locator('#root > div');
    const rootBox = await root.boundingBox();
    const nav = page.locator('nav').first();
    const navBox = await nav.boundingBox();
    const main = page.locator('main').first();
    const mainBox = await main.boundingBox();

    console.log('PROOF_ROOT_BOX', JSON.stringify(rootBox));
    console.log('PROOF_NAV_BOX', JSON.stringify(navBox));
    console.log('PROOF_MAIN_BOX', JSON.stringify(mainBox));

    expect(rootBox).not.toBeNull();
    expect(rootBox!.width).toBeGreaterThanOrEqual(1270);
    expect(rootBox!.height).toBeGreaterThanOrEqual(790);
  });

  test('PROOF: Audio section', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/crestron-home/index.html');
    await expect(page.getByText('Crestron Home')).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: 'Audio' }).click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(PROOF_DIR, '02-audio-section.png'), fullPage: false });
  });

  test('PROOF: Security section', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/crestron-home/index.html');
    await expect(page.getByText('Crestron Home')).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: 'Security' }).click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(PROOF_DIR, '03-security-section.png'), fullPage: false });
  });

  test('PROOF: Living Room detail', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/crestron-home/index.html');
    await expect(page.getByText('Crestron Home')).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: 'Living Room' }).click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(PROOF_DIR, '04-living-room.png'), fullPage: false });
  });

  test('PROOF: Tech Control panel', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/crestron-home/index.html');
    await expect(page.getByText('Crestron Home')).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: 'Tech Control' }).click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(PROOF_DIR, '05-tech-control.png'), fullPage: false });
  });

  test('PROOF: embedded via host route (iframe)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/#/crestron-home');

    const frame = page.frameLocator('iframe[title="Crestron Home"]');
    await expect(frame.getByText('Crestron Home')).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(2000);

    await page.screenshot({ path: path.join(PROOF_DIR, '06-embedded-host-route.png'), fullPage: false });
  });

  test('PROOF: Settings section (editable)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/crestron-home/index.html');
    await expect(page.getByText('Crestron Home')).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: 'Settings' }).click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(PROOF_DIR, '07-settings-editable.png'), fullPage: false });
  });
});
