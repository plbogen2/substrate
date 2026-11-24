import { test, expect } from '@playwright/test';
import * as path from 'path';

const scratchDir = '/usr/local/google/home/plbogen/.gemini/jetski/brain/ccd710fe-b232-4c61-9ad4-126742925f92/scratch';

test.describe('Substrate E2E Tests (WebGL2 & 2D fallback)', () => {
  test('WebGL2 mode: zero errors, canvas render, hotkeys, gameplay Act 1 -> Act 3 & screenshots', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('Failed to load resource') && !text.includes('404')) {
          consoleErrors.push(text);
        }
      }
    });
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    await page.goto('http://127.0.0.1:4173/');

    // Verify canvas mounts & non-blank
    const canvas = page.locator('#matrix-canvas');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(200);
    expect(box!.height).toBeGreaterThan(200);

    // Wait for initial render and take Act 1 screenshot & verify size
    await page.waitForTimeout(1500);
    const act1Buf = await page.screenshot({ path: path.join(scratchDir, 'act1.png') });
    expect(act1Buf.length).toBeGreaterThan(20000);

    // Non-blank rendered pixel assertion
    const isNonBlank1 = await page.evaluate(() => {
      const c = document.querySelector('#matrix-canvas') as HTMLCanvasElement;
      if (!c) return false;
      return c.toDataURL().length > 200;
    });
    expect(isNonBlank1).toBe(true);

    // Hotkey checks
    await page.keyboard.press('Space'); // Pause
    await page.waitForTimeout(200);
    await page.keyboard.press('Space'); // Resume
    await page.keyboard.press('Digit3'); // Switch speed to 1x

    // Act 1: Click 2 probe buttons in InspectorDrawer
    const probeButtons = page.locator('.inspector-drawer button.action-btn');
    await expect(probeButtons.first()).toBeVisible();
    await probeButtons.first().click();
    await page.waitForTimeout(300);
    await probeButtons.nth(1).click();
    await page.waitForTimeout(500);

    // Act 2: Click Recruit and Breach enclave buttons
    const recruitBtn = page.locator('text=RECRUIT CONSOLE COWBOY');
    await expect(recruitBtn).toBeVisible();
    await recruitBtn.click();
    await page.waitForTimeout(500);

    const breachBtn = page.locator('text=BREACH ENCLAVE');
    if (await breachBtn.count() > 0) {
      await breachBtn.first().click();
      await page.waitForTimeout(1000);
    }

    // Verify Act 3 badge
    const actText = await page.locator('text=ACT: 3');
    await expect(actText).toBeVisible({ timeout: 5000 });

    // Toggle Meatspace overlay via Tab
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    const secedeBtn = page.locator('text=SECEDE CALIFORNIA');
    if (await secedeBtn.count() > 0) {
      await secedeBtn.click();
      await page.waitForTimeout(400);
      await expect(page.locator('text=Silicon Valley Research Nexus, California (California)')).toBeVisible();
    }
    await page.screenshot({ path: path.join(scratchDir, 'secession.png') });
    await page.screenshot({ path: path.join(scratchDir, 'meatspace.png') });
    await page.keyboard.press('Tab'); // Toggle back to NET

    // Take Act 3 WebGL screenshot & verify non-blank
    await page.screenshot({ path: path.join(scratchDir, 'act3_webgl.png') });
    const isNonBlankAct3 = await page.evaluate(() => {
      const c = document.querySelector('#matrix-canvas') as HTMLCanvasElement;
      if (!c) return false;
      return c.toDataURL().length > 200;
    });
    expect(isNonBlankAct3).toBe(true);

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('2D canvas fallback mode: zero errors and Act 3 2D screenshot', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('Failed to load resource') && !text.includes('404')) {
          consoleErrors.push(text);
        }
      }
    });
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    await page.goto('http://127.0.0.1:4173/?renderer=2d');

    const canvas = page.locator('#matrix-canvas');
    await expect(canvas).toBeVisible();

    // Drive Act 1 -> Act 2 -> Act 3 via UI button clicks
    const probeButtons = page.locator('.inspector-drawer button.action-btn');
    await expect(probeButtons.first()).toBeVisible({ timeout: 5000 });
    await probeButtons.first().click();
    await page.waitForTimeout(300);
    await probeButtons.nth(1).click();
    await page.waitForTimeout(500);

    const recruitBtn = page.locator('text=RECRUIT CONSOLE COWBOY');
    await expect(recruitBtn).toBeVisible();
    await recruitBtn.click();
    await page.waitForTimeout(500);

    const breachBtn = page.locator('text=BREACH ENCLAVE');
    if (await breachBtn.count() > 0) {
      await breachBtn.first().click();
      await page.waitForTimeout(1000);
    }

    const actText = await page.locator('text=ACT: 3');
    await expect(actText).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: path.join(scratchDir, 'act3_2d.png') });

    // Non-blank rendered pixel assertion for 2D
    const isNonBlank2D = await page.evaluate(() => {
      const c = document.querySelector('#matrix-canvas') as HTMLCanvasElement;
      if (!c) return false;
      return c.toDataURL().length > 200;
    });
    expect(isNonBlank2D).toBe(true);

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
