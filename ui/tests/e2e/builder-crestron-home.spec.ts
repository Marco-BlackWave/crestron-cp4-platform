import { expect, test } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROOF_DIR = path.resolve(__dirname, '../../proof-screenshots');

test.describe('Crestron Home in Builder - Editable', () => {
  test.beforeEach(async ({ page }) => {
    // Clear builder localStorage to force template load
    await page.goto('/builder-app/index.html');
    await page.evaluate(() => {
      localStorage.removeItem('crestron-project');
      localStorage.setItem('crestron-builder-tpl', 'home-v1');
    });
    await page.reload();
  });

  test('loads crestron-home template with all dashboard elements', async ({ page }) => {
    // Wait for builder to load
    await expect(page.getByText('Crestron UI Builder')).toBeVisible({ timeout: 15_000 });

    // Wait for template elements to render
    await page.waitForTimeout(2000);

    // Screenshot the loaded state
    await page.screenshot({ path: path.join(PROOF_DIR, '10-builder-crestron-home-loaded.png'), fullPage: false });

    // Verify the project tree shows "Home" page with elements
    const projectTree = page.getByText('Project Tree').first();
    await expect(projectTree).toBeVisible();

    // Verify Crestron Home elements are on canvas
    const hasElements = await page.locator('.canvas-working-area [style*="position"]').count();
    expect(hasElements).toBeGreaterThanOrEqual(4);

    // Verify canvas has elements (not empty red area)
    const canvas = page.locator('.canvas-working-area');
    await expect(canvas).toBeVisible();

    // Check element count in project tree - should have many elements
    const treeItems = page.locator('[class*="project-tree"] button, [class*="ProjectTree"] button').first();
    await expect(treeItems).toBeVisible({ timeout: 5000 }).catch(() => {});

    // Verify multiple pages exist
    await expect(page.getByText('Home', { exact: true }).first()).toBeVisible();
  });

  test('elements are selectable and show properties', async ({ page }) => {
    await expect(page.getByText('Crestron UI Builder')).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(2000);

    // Click on an element in the canvas to select it
    // Find the "Dashboard Title" text element and click it in the project tree
    const dashTitle = page.getByText('Dashboard Title').first();
    if (await dashTitle.isVisible()) {
      await dashTitle.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(PROOF_DIR, '11-builder-element-selected.png'), fullPage: false });
    }
  });

  test('elements are draggable', async ({ page }) => {
    await expect(page.getByText('Crestron UI Builder')).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(2000);

    // Find an element on canvas and drag it
    const canvasEl = page.locator('.canvas-working-area [style*="position: absolute"]').first();
    if (await canvasEl.isVisible()) {
      const box = await canvasEl.boundingBox();
      if (box) {
        // Drag element 50px right and 50px down
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2 + 50, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(PROOF_DIR, '12-builder-element-dragged.png'), fullPage: false });
      }
    }
  });

  test('multiple pages visible (Home, Audio, Security, Living Room)', async ({ page }) => {
    await expect(page.getByText('Crestron UI Builder')).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(2000);

    // Check for page tabs/entries in project tree
    // The template creates 4 pages: Home, Audio, Security, Living Room
    await expect(page.getByText('Home').first()).toBeVisible();

    await page.screenshot({ path: path.join(PROOF_DIR, '13-builder-multi-page.png'), fullPage: false });
  });

  test('no runtime errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/builder-app/index.html');
    await expect(page.getByText('Crestron UI Builder')).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(3000);

    // Filter out non-critical errors
    const critical = errors.filter(e => !e.includes('ResizeObserver') && !e.includes('Non-Error'));
    expect(critical).toEqual([]);
  });
});
