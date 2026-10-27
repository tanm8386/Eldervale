import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { WorldState } from '../../src/types';

function observe(page: Page) {
  let state: WorldState | null = null;
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('websocket', (socket) =>
    socket.on('framereceived', (frame) => {
      try {
        const message = JSON.parse(String(frame.payload));
        if (message.type === 'state') state = message;
      } catch {}
    }),
  );
  return { state: () => state!, errors };
}

async function create(page: Page, className = 'Warrior', name = 'TestTraveler') {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Enter Eldervale' })).toBeVisible();
  await page.locator('.class-choice').filter({ hasText: className }).click();
  await page.getByLabel('Character name').fill(name);
  await page.getByRole('button', { name: 'Enter Eldervale' }).click();
  await expect(page.getByRole('region', { name: 'Character status' })).toBeVisible();
}

async function mapTravel(page: Page, x: number, y: number) {
  await page.keyboard.press('m');
  const map = page.locator('.large-map canvas');
  await expect(map).toBeVisible();
  const box = (await map.boundingBox())!;
  await map.click({ position: { x: (x / 1280) * box.width, y: (y / 1024) * box.height } });
}

test('character creation applies class and every visual choice, then resumes the saved character', async ({
  page,
}) => {
  const world = observe(page);
  await page.goto('/');
  await page.locator('.class-choice').filter({ hasText: 'Mage' }).click();
  await page.getByRole('button', { name: 'Skin tone: Copper', exact: true }).click();
  await page.getByRole('button', { name: 'Hair color: Silver', exact: true }).click();
  await page.getByRole('button', { name: 'Outfit color: Heather', exact: true }).click();
  await page.getByRole('button', { name: 'Next hairstyle' }).click();
  await page.getByRole('button', { name: 'Slender', exact: true }).click();
  await page.getByLabel('Character name').fill('Liora');
  await page.getByRole('button', { name: 'Enter Eldervale' }).click();
  await expect(page.getByRole('region', { name: 'Character status' })).toBeVisible();
  await expect.poll(() => world.state()?.self.classId).toBe('mage');
  expect(world.state().self.appearance).toEqual({ skin: 3, hair: 4, outfit: 3, style: 1, body: 1 });
  const id = world.state().self.id;
  await page.reload();
  await page.getByRole('button', { name: /Continue your journey/ }).click();
  await expect(page.getByRole('region', { name: 'Character status' })).toBeVisible();
  await expect.poll(() => world.state()?.self.id).toBe(id);
  expect(world.errors).toEqual([]);
});

test('a new adventurer can talk, accept a quest, navigate the bridge, gather, and fight', async ({
  page,
}) => {
  test.setTimeout(70000);
  const world = observe(page);
  await create(page, 'Mage', 'MeadowMage');
  await page.keyboard.press('e');
  await expect(page.getByRole('dialog', { name: 'Warden Elowen' })).toBeVisible();
  await page.getByRole('button', { name: 'I’d be glad to help' }).click();
  await expect.poll(() => world.state()?.self.questAccepted).toBe(true);
  await expect(page.getByRole('dialog', { name: 'Warden Elowen' })).not.toBeVisible();
  await mapTravel(page, 967, 628);
  await expect
    .poll(() => Math.hypot(world.state().self.x - 967, world.state().self.y - 628), {
      timeout: 18000,
    })
    .toBeLessThan(30);
  await page.keyboard.press('e');
  await expect.poll(() => world.state()?.self.questProgress.herb).toBe(1);
  await page.keyboard.press('Tab');
  await expect.poll(() => world.state()?.self.target).toBeTruthy();
  await page.keyboard.press('2');
  await page.keyboard.press('4');
  await page.keyboard.press('Space');
  await expect.poll(() => world.state()?.self.kills, { timeout: 15000 }).toBeGreaterThan(0);
  await expect.poll(() => world.state()?.self.questProgress.slime).toBeGreaterThan(0);
  expect(world.state().self.inventory.some((i) => i.id === 'slime-gel')).toBe(true);
  await page.keyboard.press('b');
  await expect(page.getByRole('dialog', { name: 'Traveler’s satchel' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Dewdrop jelly, quantity/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.keyboard.press('j');
  await expect(page.getByRole('dialog', { name: 'The story so far' })).toBeVisible();
  expect(world.errors).toEqual([]);
});

test('two browsers share a real realm, chat, and movement', async ({ browser }) => {
  const contextA = await browser.newContext(),
    contextB = await browser.newContext();
  const a = await contextA.newPage(),
    b = await contextB.newPage();
  const worldA = observe(a),
    worldB = observe(b);
  await create(a, 'Warrior', 'Alden');
  await create(b, 'Archer', 'Briar');
  await expect.poll(() => worldA.state()?.players.some((p) => p.name === 'Briar')).toBe(true);
  await expect.poll(() => worldB.state()?.players.some((p) => p.name === 'Alden')).toBe(true);
  await a.getByLabel('Chat message').fill('Meet me by the willow!');
  await a.getByRole('button', { name: 'Send message' }).click();
  await expect(b.getByRole('log', { name: 'Realm chat' })).toContainText('Meet me by the willow!');
  const initialX = worldA.state().self.x;
  await a.locator('.world-canvas').click({ position: { x: 600, y: 500 }, button: 'right' });
  await a.keyboard.down('d');
  await a.waitForTimeout(550);
  await a.keyboard.up('d');
  await expect
    .poll(() => worldB.state().players.find((p) => p.id === worldA.state().self.id)?.x || 0)
    .toBeGreaterThan(initialX + 20);
  expect(worldA.errors).toEqual([]);
  expect(worldB.errors).toEqual([]);
  await contextA.close();
  await contextB.close();
});

test('equipment shop, settings, and all navigation panels work through the UI', async ({
  page,
}) => {
  const world = observe(page);
  await create(page, 'Archer', 'ShopRanger');
  await mapTravel(page, 469, 633);
  await expect
    .poll(() => Math.hypot(world.state().self.x - 469, world.state().self.y - 613), {
      timeout: 12000,
    })
    .toBeLessThan(70);
  await page.keyboard.press('e');
  await expect(page.getByRole('dialog', { name: 'Milo' })).toBeVisible();
  await page.getByRole('button', { name: 'Buy Wildberry tonic for 12 gold' }).click();
  await expect.poll(() => world.state().self.gold).toBe(18);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Make yourself at home' })).toBeVisible();
  await page.getByRole('button', { name: 'Wide', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Wide', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('switch', { name: 'Show character names' }).click();
  await expect(page.getByRole('switch', { name: 'Show character names' })).toHaveAttribute(
    'aria-checked',
    'false',
  );
  await page.getByRole('button', { name: 'How to play', exact: true }).last().click();
  await expect(page.getByRole('dialog', { name: 'Welcome to the elderwood' })).toBeVisible();
  await page.getByRole('button', { name: 'I’ll find my way' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(world.errors).toEqual([]);
});

test('mobile character creation has no horizontal overflow and touch controls move the hero', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage(),
    world = observe(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Enter Eldervale' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Enter Eldervale' }).click();
  await expect(page.getByRole('region', { name: 'Character status' })).toBeVisible();
  const initial = world.state().self.x;
  const right = page.getByRole('button', { name: 'Move right' });
  const control = (await right.boundingBox())!;
  await page.mouse.move(control.x + control.width / 2, control.y + control.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(500);
  await page.mouse.up();
  await expect.poll(() => world.state().self.x).toBeGreaterThan(initial + 20);
  await page.getByRole('button', { name: 'Backpack', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Traveler’s satchel' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(world.errors).toEqual([]);
  await context.close();
});
