import { expect, test } from '@playwright/test';

test('migrates right-shifted saved layout back into visible workspace', async ({ page }) => {
  const shiftedProject = {
    name: 'Shifted Test',
    pages: [
      {
        id: 'home',
        name: 'Home',
        width: 1920,
        height: 1080,
        elements: [
          { id: 'header', type: 'header', name: 'Header', x: 1400, y: 120, width: 500, height: 80, style: {} },
          { id: 'sidebar', type: 'sidebar', name: 'Sidebar', x: 1460, y: 220, width: 240, height: 760, style: {} },
        ],
      },
    ],
    templates: [],
    libraries: [],
    externalLibraries: [],
  };

  await page.addInitScript((project) => {
    localStorage.setItem('crestron-project', JSON.stringify(project));
  }, shiftedProject);

  await page.goto('/builder-app/index.html');
  await expect(page.getByText('Crestron UI Builder')).toBeVisible();

  // Allow autosave cycle to persist normalized structure.
  await page.waitForTimeout(1200);

  const minX = await page.evaluate(() => {
    const raw = localStorage.getItem('crestron-project');
    if (!raw) return Number.NaN;
    const parsed = JSON.parse(raw);
    const els = parsed?.pages?.[0]?.elements ?? [];
    if (!Array.isArray(els) || els.length === 0) return Number.NaN;
    return Math.min(...els.map((el: any) => Number(el?.x ?? 0)));
  });

  expect(Number.isFinite(minX)).toBeTruthy();
  expect(minX).toBeLessThanOrEqual(10);

  await page.screenshot({ path: 'test-results/builder-layout-migration-proof.png', fullPage: true });
});
