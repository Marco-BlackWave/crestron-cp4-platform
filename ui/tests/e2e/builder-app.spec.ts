import { expect, test } from '@playwright/test';

test.describe('Builder App E2E', () => {
  test('loads embedded builder route with no runtime crash', async ({ page }) => {
    await page.goto('/#/builder-app');

    const frame = page.frameLocator('iframe[title="Crestron HTML5 UI Builder"]');

    await expect(frame.getByText('Crestron UI Builder')).toBeVisible();
    await expect(frame.getByText('Project Tree')).toBeVisible();
    await expect(frame.getByText('Runtime Error Caught')).toHaveCount(0);
  });

  test('direct builder page renders workspace chrome', async ({ page }) => {
    await page.goto('/builder-app/index.html');

    await expect(page.getByText('Crestron UI Builder')).toBeVisible();
    await expect(page.getByText('Project Tree')).toBeVisible();
    await expect(page.getByText('Runtime Error Caught')).toHaveCount(0);

    const sidebar = page.getByText('Project Tree').first();
    const box = await sidebar.boundingBox();
    expect(box).not.toBeNull();
    expect((box?.width ?? 0) > 80).toBeTruthy();
  });
});
