import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const directory = process.env.ARTIFACT_DIR || path.resolve('test-results', 'screenshots');
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({
  viewport: { width: 1440, height: 960 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
await page.goto('http://localhost:3000');
await page.getByRole('button', { name: 'Enter Eldervale' }).waitFor();
await page.screenshot({ path: `${directory}/creation-desktop.png`, fullPage: true });
console.log(
  'Creation layout:',
  await page.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
    contentWidth: document.documentElement.scrollWidth,
    contentHeight: document.documentElement.scrollHeight,
  })),
);
await page.getByRole('button', { name: 'Enter Eldervale' }).click();
await page.getByRole('region', { name: 'Character status' }).waitFor({ timeout: 15000 });
await page.waitForTimeout(1000);
await page.screenshot({ path: `${directory}/world-desktop.png` });
await page.keyboard.press('b');
await page.getByRole('dialog', { name: 'Traveler’s satchel' }).waitFor();
await page.screenshot({ path: `${directory}/inventory-desktop.png` });
await page.keyboard.press('Escape');
await page.keyboard.press('e');
await page.getByRole('dialog', { name: 'Warden Elowen' }).waitFor();
await page.screenshot({ path: `${directory}/dialogue-desktop.png` });
await page.getByRole('button', { name: 'I’d be glad to help' }).click();
await page.keyboard.press('m');
await page.getByRole('dialog', { name: 'A world worth getting lost in' }).waitFor();
await page.screenshot({ path: `${directory}/map-desktop.png` });
console.log('Browser errors:', errors);
await page.close();
const mobile = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 1,
});
mobile.on('pageerror', (error) => errors.push(error.message));
await mobile.goto('http://localhost:3000');
await mobile.getByRole('button', { name: 'Enter Eldervale' }).waitFor();
await mobile.screenshot({ path: `${directory}/creation-mobile.png`, fullPage: true });
console.log(
  'Mobile layout:',
  await mobile.evaluate(() => ({
    width: innerWidth,
    contentWidth: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
  })),
);
await mobile.getByRole('button', { name: 'Enter Eldervale' }).click();
await mobile.getByRole('region', { name: 'Character status' }).waitFor();
await mobile.waitForTimeout(600);
await mobile.screenshot({ path: `${directory}/world-mobile.png` });
await browser.close();
if (errors.length) process.exitCode = 1;
