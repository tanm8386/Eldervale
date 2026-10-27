import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const base = path.resolve('.data');
await mkdir(base, { recursive: true });
const data = await mkdtemp(path.join(base, 'production-check-'));
const artifacts = process.env.ARTIFACT_DIR || path.resolve('test-results', 'screenshots');
await mkdir(artifacts, { recursive: true });
const child = spawn(process.execPath, ['server/index.mjs'], {
  env: { ...process.env, NODE_ENV: 'production', PORT: '3101', DATA_DIR: data },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let browser;
let output = '';
child.stdout.on('data', (chunk) => {
  output += chunk.toString();
});
child.stderr.on('data', (chunk) => {
  output += chunk.toString();
});

try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`Production server startup timed out: ${output}`)),
      15000,
    );
    child.stdout.on('data', (chunk) => {
      if (chunk.toString().includes('Eldervale is ready')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code) {
        clearTimeout(timeout);
        reject(new Error(output));
      }
    });
  });
  const url = 'http://localhost:3101';
  const manifestResponse = await fetch(`${url}/assets/manifest.json`);
  assert.equal(manifestResponse.status, 200);
  const manifest = await manifestResponse.json();
  assert.equal(Object.keys(manifest.assets).length, 93);
  assert.equal((await fetch(`${url}/fonts/lora.ttf`)).headers.get('content-type'), 'font/ttf');
  assert.equal((await fetch(`${url}/.data/characters.json`)).status, 404);
  browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  await page.goto(url);
  await page.getByRole('button', { name: 'Enter Eldervale' }).waitFor();
  await page.locator('.class-choice').filter({ hasText: 'Mage' }).click();
  await page.getByLabel('Character name').fill('ProductionMage');
  await page.getByRole('button', { name: 'Enter Eldervale' }).click();
  await page.getByRole('region', { name: 'Character status' }).waitFor();
  await page.keyboard.press('e');
  await page.getByRole('dialog', { name: 'Warden Elowen' }).waitFor();
  await page.getByRole('button', { name: 'I’d be glad to help' }).click();
  await page.getByRole('button', { name: 'A little trouble in the meadow', exact: true }).waitFor();
  assert.equal(await page.getByRole('dialog', { name: 'Warden Elowen' }).count(), 0);
  await page.keyboard.press('m');
  await page.getByRole('dialog', { name: 'A world worth getting lost in' }).waitFor();
  await page.screenshot({
    path: path.join(artifacts, 'map-final-production.png'),
    animations: 'disabled',
  });
  assert.deepEqual(errors, []);
  console.log(
    'Production verification passed: static assets, font MIME types, private saves, character creation, WebSockets, NPC dialogue, quests, and illustrated map.',
  );
} finally {
  await browser?.close();
  child.kill('SIGTERM');
  await new Promise((resolve) => {
    child.once('exit', resolve);
    setTimeout(resolve, 3000).unref();
  });
  if (child.exitCode === null) child.kill('SIGKILL');
  await rm(data, { recursive: true, force: true });
}
