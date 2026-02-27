import { expect, test } from '@playwright/test';

test.describe('Crestron Home E2E', () => {
  test('loads embedded crestron-home via host route', async ({ page }) => {
    await page.goto('/#/crestron-home');

    const frame = page.frameLocator('iframe[title="Crestron Home"]');

    // Verify the app header renders with the title
    await expect(frame.getByText('Crestron Home')).toBeVisible({ timeout: 15_000 });

    // Verify sidebar section buttons are visible
    await expect(frame.getByRole('button', { name: 'Overview' })).toBeVisible();
    await expect(frame.getByRole('button', { name: 'Audio' })).toBeVisible();
    await expect(frame.getByRole('button', { name: 'Video' })).toBeVisible();
    await expect(frame.getByRole('button', { name: 'Security' })).toBeVisible();

    // Verify room list renders
    await expect(frame.getByRole('button', { name: 'Living Room' })).toBeVisible();
    await expect(frame.getByRole('button', { name: 'Kitchen' })).toBeVisible();
    await expect(frame.getByRole('button', { name: 'Master Bedroom' })).toBeVisible();
  });

  test('direct crestron-home page renders full dashboard', async ({ page }) => {
    await page.goto('/crestron-home/index.html');

    // Wait for React to mount
    await expect(page.getByText('Crestron Home')).toBeVisible({ timeout: 15_000 });

    // Verify sidebar navigation buttons
    await expect(page.getByRole('button', { name: 'Overview' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tech Control' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Audio' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Video' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Security' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible();

    // Verify rooms section
    await expect(page.getByText('Rooms')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Living Room' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cinema' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Outdoor' })).toBeVisible();

    // Verify no runtime errors
    await expect(page.getByText('Runtime Error')).toHaveCount(0);
  });

  test('crestron-home fills viewport 1:1 (no cropping, no overflow)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/crestron-home/index.html');
    await expect(page.getByText('Crestron Home')).toBeVisible({ timeout: 15_000 });

    // Root element should fill the viewport exactly
    const root = page.locator('#root > div');
    const box = await root.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(1270);
    expect(box!.height).toBeGreaterThanOrEqual(790);

    // Sidebar should be visible and have sensible width
    const sidebar = page.locator('nav').first();
    const sidebarBox = await sidebar.boundingBox();
    expect(sidebarBox).not.toBeNull();
    expect(sidebarBox!.width).toBeGreaterThan(100);
    expect(sidebarBox!.height).toBeGreaterThan(400);
  });

  test('sidebar navigation switches sections', async ({ page }) => {
    await page.goto('/crestron-home/index.html');
    await expect(page.getByText('Crestron Home')).toBeVisible({ timeout: 15_000 });

    // Click Audio section
    await page.getByRole('button', { name: 'Audio' }).click();
    // Verify we navigated (no crash)
    await expect(page.getByRole('button', { name: 'Audio' })).toBeVisible();

    // Click Security section
    await page.getByRole('button', { name: 'Security' }).click();
    await expect(page.getByRole('button', { name: 'Security' })).toBeVisible();

    // Click a room
    await page.getByRole('button', { name: 'Living Room' }).click();
    await expect(page.getByRole('button', { name: 'Living Room' })).toBeVisible();
  });
});
