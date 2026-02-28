import { expect, test } from '@playwright/test';

test('restart app, load provided UI template, and verify working area visibility', async ({ page }) => {
  // Simulate restart from a clean browser state.
  await page.addInitScript(() => {
    localStorage.removeItem('crestron-project');
  });

  await page.goto('/builder-app/index.html');
  await expect(page.getByText('Crestron UI Builder')).toBeVisible();

  // App auto-loads the provided default template on empty project.
  const canvas = page.locator('.canvas-working-area').first();
  await expect(canvas).toBeVisible();

  // Wait for template auto-load and canvas initialization
  await page.waitForTimeout(2000);

  // Verify canvas wrapper is properly constrained within the viewport
  const layout = await page.evaluate(() => {
    const mainFlex = document.querySelector('.flex-1.flex.overflow-hidden');
    const wrapper = mainFlex?.querySelector(':scope > .flex-1');
    const canvasArea = document.querySelector('.canvas-working-area');
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      wrapper: wrapper ? wrapper.getBoundingClientRect() : null,
      canvasArea: canvasArea ? canvasArea.getBoundingClientRect() : null,
    };
  });

  // Canvas wrapper must fit inside viewport (the critical fix)
  expect(layout.wrapper).toBeTruthy();
  expect(layout.wrapper!.width).toBeLessThanOrEqual(layout.viewport.width);
  expect(layout.wrapper!.left).toBeGreaterThanOrEqual(0);

  // Canvas working area must start within the visible viewport
  expect(layout.canvasArea).toBeTruthy();
  expect(layout.canvasArea!.left).toBeLessThan(layout.viewport.width);
  expect(layout.canvasArea!.top).toBeLessThan(layout.viewport.height);
  expect(layout.canvasArea!.width).toBeGreaterThan(100);
  expect(layout.canvasArea!.height).toBeGreaterThan(100);

  // Verify template content rendered inside canvas (crestron-home template)
  const canvasCrestronHome = canvas.getByText('Crestron Home').first();
  const canvasLivingRoom = canvas.getByText('Living Room').first();
  await expect(canvasCrestronHome).toBeVisible();
  await expect(canvasLivingRoom).toBeVisible();

  console.log('PROOF_LAYOUT', JSON.stringify(layout));
  console.log('PROOF_CRESTRON_HOME_BBOX', JSON.stringify(await canvasCrestronHome.boundingBox()));
  console.log('PROOF_LIVING_ROOM_BBOX', JSON.stringify(await canvasLivingRoom.boundingBox()));

  // Persist proof artifacts.
  await page.screenshot({ path: 'test-results/builder-restart-template-proof.png', fullPage: true });
});
