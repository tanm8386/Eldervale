import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../server/game.mjs';
import { CLASSES, ITEMS, MONSTERS, classStats } from '../shared/data.js';
import { SPAWN, NPCS, collides, findPath, moveEntity } from '../shared/world.js';

function fixture() {
  let time = 1_000_000;
  const game = new Game({ now: () => time, random: () => 0.5 });
  const connect = (classId = 'warrior', name = 'Traveler', token) => {
    const messages = [];
    const socket = {
      readyState: 1,
      send: (text) => messages.push(JSON.parse(text)),
      close() {
        this.readyState = 3;
      },
    };
    const id = game.connect(
      socket,
      token
        ? { token }
        : {
            character: {
              classId,
              name,
              appearance: { skin: 2, hair: 3, style: 2, outfit: 4, body: 1 },
            },
          },
    );
    return { player: game.players.get(id), socket, messages };
  };
  const advance = (seconds, tick = true) => {
    for (let i = 0; i < seconds * 20; i++) {
      time += 50;
      if (tick) game.tick(0.05);
    }
  };
  return { game, connect, advance, time: () => time };
}

test('creation preserves customization, class identity, and private reconnect tokens', () => {
  const { game, connect } = fixture();
  for (const classId of Object.keys(CLASSES)) {
    const { player, messages } = connect(classId, `${classId}Hero`);
    assert.equal(player.classId, classId);
    assert.deepEqual(player.appearance, { skin: 2, hair: 3, style: 2, outfit: 4, body: 1 });
    assert.equal(player.health, CLASSES[classId].health);
    assert.equal(player.equipment.weapon, CLASSES[classId].weapon);
    assert.equal(messages.find((m) => m.type === 'welcome').token.length, 64);
    game.sync();
    const state = messages.filter((m) => m.type === 'state').at(-1);
    assert.ok(
      !JSON.stringify(state).includes(player.token),
      'world snapshots must never expose authentication tokens',
    );
  }
});

test('movement is speed-limited, diagonal-normalized, and cannot tunnel through obstacles', () => {
  const { game, connect, advance } = fixture();
  const { player } = connect();
  const initial = { x: player.x, y: player.y };
  game.handle(player.id, { type: 'input', x: 99999, y: 99999 });
  advance(0.3);
  assert.ok(Math.hypot(player.x - initial.x, player.y - initial.y) <= CLASSES.warrior.speed * 0.31);
  assert.ok(Number.isFinite(player.x) && Number.isFinite(player.y));
  game.handle(player.id, { type: 'input', x: NaN, y: Infinity });
  advance(0.1);
  assert.equal(player.input.x, 0);
  assert.equal(player.input.y, 0);
  const entity = { x: 600, y: 585 };
  moveEntity(entity, 0, -100);
  assert.ok(!collides(entity.x, entity.y));
  assert.ok(entity.y > 530, 'the fountain must stop movement even with a large time step');
});

test('pathfinding reaches the meadow by the bridge and never crosses blocked tiles', () => {
  const route = findPath(SPAWN, { x: 1000, y: 584 });
  assert.ok(route.length > 15, 'the meadow is connected to the starting village');
  for (const point of route)
    assert.equal(collides(point.x, point.y), false, `blocked waypoint at ${point.x}, ${point.y}`);
  assert.ok(
    route.some((p) => p.x > 840 && p.x < 950 && p.y > 560 && p.y < 610),
    'route crosses the actual bridge',
  );
  assert.equal(
    findPath(SPAWN, { x: 880, y: 200 }).length,
    0,
    'water outside the bridge is not a walkable destination',
  );
});

test('melee and ranged classes have distinct reach; cooldown and mana rules are authoritative', () => {
  const { game, connect, advance } = fixture();
  const warrior = connect('warrior').player;
  const mage = connect('mage').player;
  const mob = game.mobs[0];
  Object.assign(warrior, { x: 1000, y: 580 });
  Object.assign(mage, { x: 1000, y: 580 });
  Object.assign(mob, { x: 1100, y: 580, health: 500 });
  warrior.target = mob.id;
  mage.target = mob.id;
  game.handle(warrior.id, { type: 'skill', index: 0 });
  assert.equal(mob.health, 500, 'a sword cannot hit a distant target');
  game.handle(mage.id, { type: 'skill', index: 1 });
  const health = mob.health;
  assert.ok(health < 500, 'a mage can cast at range');
  const mana = mage.mana;
  game.handle(mage.id, { type: 'skill', index: 1 });
  assert.equal(mob.health, health, 'spamming commands cannot bypass the cooldown');
  assert.equal(mage.mana, mana);
  advance(4.1, false);
  mage.mana = 0;
  game.handle(mage.id, { type: 'skill', index: 1 });
  assert.equal(mob.health, health, 'a spell cannot be cast without mana');
  assert.ok(CLASSES.archer.speed > CLASSES.warrior.speed);
  assert.ok(CLASSES.archer.range > CLASSES.mage.range);
  assert.ok(CLASSES.warrior.armor > CLASSES.archer.armor);
});

test('area spells hit multiple targets and crowd control prevents monster attacks', () => {
  const { game, connect, advance, time } = fixture();
  const { player } = connect('mage');
  Object.assign(player, { x: 1064, y: 584 });
  for (const mob of game.mobs) {
    mob.health = 0;
    mob.respawnAt = 0;
  }
  for (const [i, mob] of game.mobs.slice(0, 2).entries())
    Object.assign(mob, {
      x: player.x + 12 + i * 6,
      y: player.y,
      health: 54,
      home: { x: player.x, y: player.y },
      target: player.id,
      attackAt: time() - 100,
    });
  game.handle(player.id, { type: 'skill', index: 2 });
  for (const mob of game.mobs.slice(0, 2)) {
    assert.ok(mob.health < 54);
    assert.ok(mob.stunUntil > time());
  }
  const health = player.health;
  advance(1);
  assert.equal(player.health, health, 'frozen monsters cannot deal damage');
});

test('shared fights reward contributing nearby players and do not reward bystanders', () => {
  const { game, connect, advance } = fixture();
  const a = connect('archer', 'RangerA').player,
    b = connect('mage', 'MageB').player,
    spectator = connect('warrior', 'Spectator').player;
  const mob = game.mobs[0];
  Object.assign(mob, { x: 1080, y: 584, health: 40 });
  Object.assign(a, { x: 1030, y: 584, target: mob.id });
  Object.assign(b, { x: 1030, y: 584, target: mob.id });
  Object.assign(spectator, { x: 1030, y: 584 });
  const spectatorGold = spectator.gold;
  game.handle(a.id, { type: 'skill', index: 0 });
  game.handle(b.id, { type: 'skill', index: 0 });
  advance(1, false);
  if (mob.health > 0) game.handle(b.id, { type: 'skill', index: 0 });
  assert.equal(mob.health, 0);
  for (const p of [a, b]) {
    assert.equal(p.kills, 1);
    assert.ok(p.gold > 30);
    assert.ok(p.inventory.some((i) => i.id === 'slime-gel'));
  }
  assert.equal(spectator.kills, 0);
  assert.equal(spectator.gold, spectatorGold);
});

test('quests require proximity, actual kills and gathering, then award rewards exactly once', () => {
  const { game, connect, advance } = fixture();
  const { player } = connect('mage');
  player.x = 1000;
  player.y = 650;
  game.handle(player.id, { type: 'quest' });
  assert.equal(player.questAccepted, false);
  Object.assign(player, { x: NPCS[0].x, y: NPCS[0].y + 30 });
  game.handle(player.id, { type: 'quest' });
  assert.equal(player.questAccepted, true);
  for (let i = 0; i < 4; i++) {
    const mob = game.mobs[i];
    Object.assign(player, { x: 1040, y: 584, target: mob.id, mana: 130 });
    Object.assign(mob, { x: 1070, y: 584, health: 1 });
    player.cooldowns[0] = 0;
    game.handle(player.id, { type: 'skill', index: 0 });
  }
  assert.equal(player.questProgress.slime, 4);
  assert.equal(game.questReady(player), false);
  for (let i = 0; i < 3; i++) {
    const herb = game.herbs[i];
    Object.assign(player, { x: herb.x, y: herb.y });
    advance(0.4, false);
    game.handle(player.id, { type: 'interact', id: herb.id });
    assert.ok(herb.readyAt > 0);
  }
  assert.equal(player.questProgress.herb, 3);
  assert.equal(game.questReady(player), true);
  Object.assign(player, { x: NPCS[0].x, y: NPCS[0].y + 25 });
  const gold = player.gold;
  game.handle(player.id, { type: 'quest' });
  assert.equal(player.questIndex, 1);
  assert.equal(player.gold, gold + 45);
  assert.deepEqual(player.completedQuests, ['meadow']);
  game.handle(player.id, { type: 'quest' });
  assert.equal(player.gold, gold + 45, 'a repeat request cannot duplicate the previous reward');
});

test('shops enforce location, affordability, class restrictions and equipment bonuses', () => {
  const { game, connect } = fixture();
  const { player } = connect('warrior');
  const initialGold = player.gold;
  game.handle(player.id, { type: 'buy', id: 'health-potion' });
  assert.equal(player.gold, initialGold, 'purchases cannot be made across the map');
  const merchant = NPCS.find((n) => n.id === 'milo');
  Object.assign(player, { x: merchant.x, y: merchant.y + 20 });
  game.handle(player.id, { type: 'buy', id: 'health-potion' });
  assert.equal(player.gold, initialGold - ITEMS['health-potion'].price);
  const smith = NPCS.find((n) => n.id === 'bram');
  Object.assign(player, { x: smith.x, y: smith.y + 20, gold: 200 });
  game.handle(player.id, { type: 'buy', id: 'starlit-staff' });
  assert.equal(player.gold, 200);
  game.handle(player.id, { type: 'buy', id: 'oakheart-blade' });
  const before = classStats(player).damage;
  game.handle(player.id, { type: 'equip', id: 'oakheart-blade' });
  assert.equal(classStats(player).damage, before + 9);
  assert.equal(player.gold, 115);
  game.handle(player.id, { type: 'buy', id: 'oakheart-blade' });
  assert.equal(player.gold, 115, 'owned equipment is not repurchased accidentally');
});

test('potions respect capacity and cooldown; death and respawn preserve progression', () => {
  const { game, connect, advance } = fixture();
  const { player } = connect();
  const quantity = () => player.inventory.find((i) => i.id === 'health-potion')?.count || 0;
  game.handle(player.id, { type: 'use', id: 'health-potion' });
  assert.equal(quantity(), 3, 'a full-health potion is not wasted');
  player.health = 20;
  game.handle(player.id, { type: 'use', id: 'health-potion' });
  assert.equal(player.health, 90);
  assert.equal(quantity(), 2);
  game.handle(player.id, { type: 'use', id: 'health-potion' });
  assert.equal(quantity(), 2);
  advance(5.1, false);
  game.handle(player.id, { type: 'use', id: 'health-potion' });
  assert.equal(player.health, 160);
  player.health = 0;
  player.xp = 27;
  game.handle(player.id, { type: 'skill', index: 1 });
  assert.equal(player.cooldowns[1], 0);
  game.handle(player.id, { type: 'respawn' });
  assert.equal(player.health, classStats(player).maxHealth);
  assert.equal(player.xp, 27);
  assert.deepEqual({ x: player.x, y: player.y }, SPAWN);
});

test('characters survive disconnects and restart, with stale sockets unable to disconnect a replacement', () => {
  const { game, connect } = fixture();
  const original = connect('archer', 'Persistent');
  original.player.gold = 143;
  original.player.questAccepted = true;
  game.disconnect(original.player.id, original.socket);
  const records = JSON.parse(JSON.stringify(game.serialize()));
  const restarted = new Game({ accounts: records });
  const messages = [],
    socket = { readyState: 1, send: (m) => messages.push(JSON.parse(m)), close() {} };
  const id = restarted.connect(socket, { token: original.player.token });
  assert.equal(restarted.players.get(id).gold, 143);
  assert.equal(restarted.players.get(id).classId, 'archer');
  assert.equal(restarted.players.get(id).questAccepted, true);
  const replacement = { ...socket };
  restarted.connect(replacement, { token: original.player.token });
  restarted.disconnect(id, socket);
  assert.ok(
    restarted.players.has(id),
    'closing the old connection must not remove the new session',
  );
});

test('chat reaches the correct audience and is rate-limited', () => {
  const { game, connect, advance } = fixture();
  const a = connect('warrior', 'Alden'),
    b = connect('archer', 'Briar');
  b.player.x = 1200;
  b.player.y = 900;
  a.messages.length = 0;
  b.messages.length = 0;
  game.handle(a.player.id, { type: 'chat', channel: 'local', text: 'Hello nearby!' });
  assert.equal(a.messages.filter((m) => m.type === 'chat').length, 1);
  assert.equal(b.messages.filter((m) => m.type === 'chat').length, 0);
  game.handle(a.player.id, { type: 'chat', channel: 'world', text: 'Too soon' });
  assert.equal(b.messages.filter((m) => m.type === 'chat').length, 0);
  advance(1.2, false);
  game.handle(a.player.id, { type: 'chat', channel: 'world', text: 'Hello realm!' });
  assert.equal(b.messages.find((m) => m.type === 'chat')?.text, 'Hello realm!');
});
