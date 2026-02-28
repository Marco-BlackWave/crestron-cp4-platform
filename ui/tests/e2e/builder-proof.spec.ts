import { expect, test } from '@playwright/test';

test('proof: capture builder console/network/screenshot', async ({ page }) => {
  const consoleErrors: string[] = [];
  const failedResponses: Array<{ url: string; status: number }> = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('response', (resp) => {
    if (resp.status() >= 400) {
      failedResponses.push({ url: resp.url(), status: resp.status() });
    }
  });

  await page.goto('/builder-app/index.html');
  await expect(page.getByText('Crestron UI Builder')).toBeVisible();
  await expect(page.getByText('Project Tree')).toBeVisible();

  const canvas = page.locator('.canvas-working-area').first();
  await expect(canvas).toBeVisible();

  const canvasBox = await canvas.boundingBox();
  console.log('PROOF_CANVAS_BBOX', JSON.stringify(canvasBox));

  const faviconFailures = failedResponses.filter((r) => /favicon\.ico$/i.test(r.url));
  const runtimeFailures = failedResponses.filter((r) => /index-.*\.js/i.test(r.url));

  console.log('PROOF_FAILED_RESPONSES', JSON.stringify(failedResponses, null, 2));
  console.log('PROOF_CONSOLE_ERRORS', JSON.stringify(consoleErrors, null, 2));

  await page.screenshot({ path: 'test-results/builder-proof.png', fullPage: true });

  expect(runtimeFailures.length).toBe(0);
  expect(page.getByText('Runtime Error Caught')).toHaveCount(0);

  // Keep this visible to report, but don't fail suite for missing favicon.
  if (faviconFailures.length > 0) {
    console.log('PROOF_FAVICON_404_COUNT', faviconFailures.length);
  }
});
