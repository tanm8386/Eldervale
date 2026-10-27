import { randomBytes, randomUUID } from 'node:crypto';
import {
  CLASSES,
  DEFAULT_APPEARANCE,
  ITEMS,
  QUESTS,
  MONSTERS,
  classStats,
  xpForLevel,
} from '../shared/data.js';
import {
  SPAWN,
  NPCS,
  HERBS,
  MOB_SPAWNS,
  moveEntity,
  findPath,
  collides,
  zoneAt,
} from '../shared/world.js';

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
const finite = (n) => typeof n === 'number' && Number.isFinite(n);

export class Game {
  constructor({ accounts = [], now = () => Date.now(), random = Math.random } = {}) {
    this.now = now;
    this.random = random;
    this.accounts = new Map(accounts.map((a) => [a.token, a]));
    this.players = new Map();
    this.connections = new Map();
    this.events = [];
    this.sequence = 0;
    this.herbs = HERBS.map((h) => ({ ...h, readyAt: 0 }));
    this.mobs = MOB_SPAWNS.map((spawn, i) => {
      const mob = {
        ...spawn,
        id: `mob-${i}`,
        home: { x: spawn.x, y: spawn.y },
        health: MONSTERS[spawn.type].health,
        direction: 0,
        moving: false,
        attackAt: 0,
        respawnAt: 0,
        stunUntil: 0,
        target: null,
        wanderAt: 0,
        contributors: {},
      };
      if (collides(mob.x, mob.y)) {
        for (let r = 8; r < 90; r += 8) {
          let found = false;
          for (let a = 0; a < Math.PI * 2; a += 0.7) {
            const x = spawn.x + Math.cos(a) * r,
              y = spawn.y + Math.sin(a) * r;
            if (!collides(x, y)) {
              mob.x = x;
              mob.y = y;
              mob.home = { x, y };
              found = true;
              break;
            }
          }
          if (found) break;
        }
      }
      return mob;
    });
  }

  send(player, message) {
    const connection = this.connections.get(typeof player === 'string' ? player : player.id);
    if (connection?.readyState === 1) connection.send(JSON.stringify(message));
  }

  broadcast(message) {
    const text = JSON.stringify(message);
    for (const connection of this.connections.values())
      if (connection.readyState === 1) connection.send(text);
  }

  notice(player, text, tone = 'info') {
    this.send(player, { type: 'notice', text, tone });
  }
  event(event) {
    this.events.push({ ...event, id: ++this.sequence, at: this.now() });
  }

  connect(connection, request) {
    let account = typeof request.token === 'string' ? this.accounts.get(request.token) : null;
    if (!account) {
      if (request.token && !request.character) {
        connection.send(JSON.stringify({ type: 'character-required' }));
        return null;
      }
      const char = request.character;
      if (!char || !Object.hasOwn(CLASSES, char.classId)) {
        connection.send(
          JSON.stringify({ type: 'error', text: 'Choose a class to begin your journey.' }),
        );
        return null;
      }
      const name = String(char.name || '')
        .trim()
        .replace(/[^\p{L}\p{N} '\-]/gu, '')
        .slice(0, 16);
      if (name.length < 2) {
        connection.send(
          JSON.stringify({ type: 'error', text: 'Your name needs at least two letters.' }),
        );
        return null;
      }
      const appearance = { ...DEFAULT_APPEARANCE };
      for (const [key, max] of Object.entries({ skin: 5, hair: 5, style: 3, outfit: 5, body: 1 })) {
        appearance[key] = clamp(Math.floor(Number(char.appearance?.[key]) || 0), 0, max);
      }
      account = {
        id: randomUUID(),
        token: randomBytes(32).toString('hex'),
        name,
        classId: char.classId,
        appearance,
        x: SPAWN.x,
        y: SPAWN.y,
        direction: 0,
        level: 1,
        xp: 0,
        gold: 30,
        inventory: [
          { id: CLASSES[char.classId].weapon, count: 1 },
          { id: 'linen-tunic', count: 1 },
          { id: 'health-potion', count: 3 },
          { id: 'mana-potion', count: 2 },
        ],
        equipment: { weapon: CLASSES[char.classId].weapon, armor: 'linen-tunic', charm: null },
        questIndex: 0,
        questAccepted: false,
        questProgress: {},
        completedQuests: [],
        discovered: ['Willowrest'],
        kills: 0,
      };
      const stats = classStats(account);
      account.health = stats.maxHealth;
      account.mana = stats.maxMana;
      this.accounts.set(account.token, account);
    }
    const old = this.connections.get(account.id);
    if (old && old !== connection) {
      old.send(JSON.stringify({ type: 'replaced' }));
      old.close(4001, 'Connected in another tab');
    }
    const player = {
      ...account,
      input: { x: 0, y: 0 },
      moving: false,
      path: [],
      target: null,
      autoAttack: false,
      cooldowns: [0, 0, 0, 0],
      potionUntil: 0,
      guardUntil: 0,
      hasteUntil: 0,
      combatUntil: 0,
      attackUntil: 0,
      lastInput: this.now(),
      lastChat: 0,
      lastMoveTo: 0,
      lastInteract: 0,
      lastCommand: 0,
    };
    if (collides(player.x, player.y)) {
      player.x = SPAWN.x;
      player.y = SPAWN.y;
    }
    this.players.set(player.id, player);
    this.connections.set(player.id, connection);
    this.send(player, {
      type: 'welcome',
      id: player.id,
      token: player.token,
      player: this.privatePlayer(player),
      serverTime: this.now(),
    });
    this.notice(
      player,
      `Welcome ${account.kills ? 'back' : 'to Willowrest'}, ${player.name}. Your adventure is saved automatically.`,
      'success',
    );
    this.broadcast({
      type: 'chat',
      channel: 'world',
      name: 'Eldervale',
      system: true,
      text: `${player.name} has arrived in the elderwood.`,
      at: this.now(),
    });
    this.sync();
    return player.id;
  }

  disconnect(id, connection) {
    if (this.connections.get(id) !== connection) return;
    const player = this.players.get(id);
    if (player) this.persistPlayer(player);
    this.connections.delete(id);
    this.players.delete(id);
  }

  persistPlayer(player) {
    const keys = [
      'id',
      'token',
      'name',
      'classId',
      'appearance',
      'x',
      'y',
      'direction',
      'level',
      'xp',
      'gold',
      'health',
      'mana',
      'inventory',
      'equipment',
      'questIndex',
      'questAccepted',
      'questProgress',
      'completedQuests',
      'discovered',
      'kills',
    ];
    this.accounts.set(player.token, Object.fromEntries(keys.map((key) => [key, player[key]])));
  }

  serialize() {
    for (const p of this.players.values()) this.persistPlayer(p);
    return [...this.accounts.values()];
  }

  publicPlayer(p) {
    return {
      id: p.id,
      name: p.name,
      classId: p.classId,
      appearance: p.appearance,
      x: p.x,
      y: p.y,
      direction: p.direction,
      moving: p.moving,
      health: Math.ceil(p.health),
      maxHealth: classStats(p).maxHealth,
      level: p.level,
      attackUntil: p.attackUntil,
      guardUntil: p.guardUntil,
      hasteUntil: p.hasteUntil,
    };
  }

  privatePlayer(p) {
    return {
      ...this.publicPlayer(p),
      mana: Math.floor(p.mana),
      ...classStats(p),
      xp: p.xp,
      nextLevelXp: xpForLevel(p.level),
      gold: p.gold,
      inventory: p.inventory,
      equipment: p.equipment,
      questIndex: p.questIndex,
      questAccepted: p.questAccepted,
      questProgress: p.questProgress,
      completedQuests: p.completedQuests,
      discovered: p.discovered,
      kills: p.kills,
      cooldowns: p.cooldowns,
      potionUntil: p.potionUntil,
      target: p.target,
    };
  }

  sync() {
    const state = {
      type: 'state',
      time: this.now(),
      online: this.players.size,
      players: [...this.players.values()].map((p) => this.publicPlayer(p)),
      mobs: this.mobs.map(({ contributors, home, wanderTarget, ...mob }) => ({
        ...mob,
        health: Math.ceil(mob.health),
        maxHealth: MONSTERS[mob.type].health,
      })),
      herbs: this.herbs.map((h) => ({
        id: h.id,
        x: h.x,
        y: h.y,
        available: h.readyAt <= this.now(),
      })),
      events: this.events.splice(0),
    };
    for (const p of this.players.values()) this.send(p, { ...state, self: this.privatePlayer(p) });
  }

  handle(id, msg) {
    const p = this.players.get(id);
    if (!p || !msg || typeof msg !== 'object') return;
    const now = this.now();
    if (msg.type === 'ping') {
      this.send(p, { type: 'pong', sent: msg.sent, time: now });
      return;
    }
    if (msg.type === 'chat') {
      if (now - p.lastChat < 1100) return;
      const text = String(msg.text || '')
        .trim()
        .replace(/[\u0000-\u001F\u007F]/g, '')
        .slice(0, 180);
      if (!text) return;
      p.lastChat = now;
      const channel = msg.channel === 'local' ? 'local' : 'world';
      const chat = { type: 'chat', channel, name: p.name, text, at: now, playerId: p.id };
      if (channel === 'local') {
        for (const other of this.players.values())
          if (distance(p, other) < 400) this.send(other, chat);
      } else this.broadcast(chat);
      return;
    }
    if (msg.type === 'respawn' && p.health <= 0) {
      Object.assign(p, {
        x: SPAWN.x,
        y: SPAWN.y,
        health: classStats(p).maxHealth,
        mana: classStats(p).maxMana,
        input: { x: 0, y: 0 },
        path: [],
        combatUntil: 0,
      });
      this.event({ kind: 'heal', x: p.x, y: p.y, amount: 'Revived', playerId: p.id });
      return;
    }
    if (p.health <= 0) return;
    switch (msg.type) {
      case 'input': {
        p.input = {
          x: finite(msg.x) ? clamp(msg.x, -1, 1) : 0,
          y: finite(msg.y) ? clamp(msg.y, -1, 1) : 0,
        };
        p.lastInput = now;
        if (p.input.x || p.input.y) p.path = [];
        break;
      }
      case 'move': {
        if (!finite(msg.x) || !finite(msg.y) || now - p.lastMoveTo < 160) return;
        p.lastMoveTo = now;
        p.autoAttack = false;
        p.path = findPath(p, { x: clamp(msg.x, 20, 1260), y: clamp(msg.y, 20, 1004) });
        break;
      }
      case 'target':
        p.target =
          this.mobs.find((m) => m.id === msg.id && m.health > 0 && distance(p, m) < 320)?.id ||
          null;
        break;
      case 'skill': {
        const index = Number(msg.index);
        if (!Number.isInteger(index) || index < 0 || index > 3) return;
        if (typeof msg.target === 'string')
          p.target =
            this.mobs.find((m) => m.id === msg.target && m.health > 0 && distance(p, m) < 320)
              ?.id || null;
        if (index === 0) p.autoAttack = true;
        this.useSkill(p, index, true);
        break;
      }
      case 'stop':
        p.autoAttack = false;
        p.path = [];
        p.input = { x: 0, y: 0 };
        break;
      case 'interact':
        this.interact(p, msg.id);
        break;
      case 'quest':
        this.quest(p);
        break;
      case 'buy':
        this.buy(p, msg.id);
        break;
      case 'sell':
        this.sell(p);
        break;
      case 'equip':
        this.equip(p, msg.id);
        break;
      case 'use':
        this.consume(p, msg.id);
        break;
      case 'rest': {
        if (
          distance(
            p,
            NPCS.find((n) => n.id === 'iris'),
          ) > 80 &&
          distance(
            p,
            NPCS.find((n) => n.id === 'rowan'),
          ) > 80 &&
          distance(p, { x: 610, y: 535 }) > 75
        )
          return;
        p.health = classStats(p).maxHealth;
        p.mana = classStats(p).maxMana;
        this.notice(p, 'Restored by the kindness of Willowrest.', 'success');
        this.event({ kind: 'heal', x: p.x, y: p.y, amount: 'Restored', playerId: p.id });
        break;
      }
    }
  }

  useSkill(p, index, feedback = false) {
    const now = this.now(),
      skill = CLASSES[p.classId].skills[index];
    if (p.health <= 0 || p.cooldowns[index] > now) return false;
    if (p.mana < skill.cost) {
      if (feedback) this.notice(p, 'Not enough mana. Use a moonwater flask with R.', 'warning');
      return false;
    }
    let target = this.mobs.find((m) => m.id === p.target && m.health > 0);
    if (!target && !['guard', 'haste'].includes(skill.kind)) {
      target = this.mobs
        .filter((m) => m.health > 0 && distance(p, m) < (skill.range || 35))
        .sort((a, b) => distance(p, a) - distance(p, b))[0];
      if (target) p.target = target.id;
    }
    if (
      ['basic', 'target', 'ranged-aoe'].includes(skill.kind) &&
      (!target || distance(p, target) > skill.range)
    ) {
      if (feedback)
        this.notice(
          p,
          target
            ? 'Move closer to your target.'
            : 'Select an enemy, or press Tab to find one nearby.',
        );
      return false;
    }
    p.mana -= skill.cost;
    p.cooldowns[index] = now + skill.cooldown * 1000;
    p.attackUntil = now + 450;
    if (target) {
      const dx = target.x - p.x,
        dy = target.y - p.y;
      p.direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 0 : 2;
    }
    if (skill.kind === 'guard' || skill.kind === 'haste') {
      p[skill.kind === 'guard' ? 'guardUntil' : 'hasteUntil'] = now + skill.duration * 1000;
      this.event({ kind: skill.kind, x: p.x, y: p.y, playerId: p.id, classId: p.classId, index });
      return true;
    }
    p.combatUntil = now + 7000;
    const center = skill.kind === 'ranged-aoe' ? target : p;
    const victims = ['aoe', 'ranged-aoe'].includes(skill.kind)
      ? this.mobs.filter(
          (m) => m.health > 0 && distance(center, m) <= (skill.radius || skill.range),
        )
      : target
        ? [target]
        : [];
    this.event({
      kind: 'attack',
      playerId: p.id,
      classId: p.classId,
      index,
      x: center.x,
      y: center.y,
      fromX: p.x,
      fromY: p.y,
      targetX: target?.x ?? p.x,
      targetY: target?.y ?? p.y,
      direction: p.direction,
    });
    for (const mob of victims) {
      const critical = this.random() < (p.classId === 'archer' ? 0.2 : 0.1);
      const raw =
        classStats(p).damage * skill.power * (critical ? 1.55 : 1) * (0.94 + this.random() * 0.12);
      const amount = Math.max(1, Math.round(raw - MONSTERS[mob.type].armor));
      mob.health = Math.max(0, mob.health - amount);
      mob.target = p.id;
      mob.contributors[p.id] = (mob.contributors[p.id] || 0) + amount;
      if (skill.stun) mob.stunUntil = now + skill.stun * 1000;
      this.event({ kind: 'damage', x: mob.x, y: mob.y - 19, amount, critical, targetId: mob.id });
      if (mob.health <= 0) this.killMob(mob);
    }
    return true;
  }

  addItem(p, id, count = 1) {
    const entry = p.inventory.find((i) => i.id === id);
    if (entry) entry.count += count;
    else p.inventory.push({ id, count });
  }

  awardXp(p, amount) {
    p.xp += amount;
    while (p.xp >= xpForLevel(p.level) && p.level < 50) {
      p.xp -= xpForLevel(p.level);
      p.level++;
      p.health = classStats(p).maxHealth;
      p.mana = classStats(p).maxMana;
      this.notice(p, `Level ${p.level}! Your health and mana have been restored.`, 'level');
      this.event({ kind: 'level', x: p.x, y: p.y, amount: p.level, playerId: p.id });
    }
  }

  killMob(mob) {
    const data = MONSTERS[mob.type];
    mob.respawnAt = this.now() + (mob.type === 'guardian' ? 60000 : 22000);
    mob.moving = false;
    mob.target = null;
    const contributors = Object.keys(mob.contributors)
      .map((id) => this.players.get(id))
      .filter((p) => p && p.health > 0 && distance(p, mob) < 500);
    for (const p of contributors) {
      const gold = data.gold[0] + Math.floor(this.random() * (data.gold[1] - data.gold[0] + 1));
      p.gold += gold;
      p.kills++;
      this.awardXp(p, data.xp);
      this.addItem(p, data.loot);
      if (this.random() < 0.16)
        this.addItem(p, this.random() < 0.5 ? 'health-potion' : 'mana-potion');
      this.progressQuest(p, mob.type);
      this.send(p, { type: 'loot', gold, xp: data.xp, item: data.loot });
      if (p.target === mob.id) {
        p.target = null;
        p.autoAttack = false;
      }
    }
    this.event({ kind: 'death', x: mob.x, y: mob.y, targetId: mob.id, monster: mob.type });
  }

  progressQuest(p, type) {
    const q = QUESTS[p.questIndex];
    if (!p.questAccepted || !q) return;
    const goal = q.objectives.find((g) => g.type === type);
    if (!goal) return;
    const wasReady = this.questReady(p);
    p.questProgress[type] = Math.min(goal.count, (p.questProgress[type] || 0) + 1);
    if (!wasReady && this.questReady(p))
      this.notice(p, 'All done! Return to Warden Elowen for your reward.', 'quest');
  }

  questReady(p) {
    const q = QUESTS[p.questIndex];
    return (
      !!q && p.questAccepted && q.objectives.every((g) => (p.questProgress[g.type] || 0) >= g.count)
    );
  }

  quest(p) {
    if (distance(p, NPCS[0]) > 78) {
      this.notice(p, 'Speak with Warden Elowen in Willowrest.');
      return;
    }
    const q = QUESTS[p.questIndex];
    if (!q) return;
    if (!p.questAccepted) {
      p.questAccepted = true;
      p.questProgress = {};
      this.notice(p, `Quest accepted: ${q.name}`, 'quest');
    } else if (this.questReady(p)) {
      this.awardXp(p, q.xp);
      p.gold += q.gold;
      for (const item of q.items) this.addItem(p, item.id, item.count);
      p.completedQuests.push(q.id);
      p.questIndex++;
      p.questAccepted = false;
      p.questProgress = {};
      this.notice(p, `Quest complete! +${q.xp} XP · +${q.gold} gold`, 'quest');
      this.event({ kind: 'quest', x: p.x, y: p.y, playerId: p.id });
    } else this.notice(p, 'There’s still a little work to do. Your journal has the details.');
  }

  interact(p, requestedId) {
    const now = this.now();
    if (now - p.lastInteract < 300) return;
    p.lastInteract = now;
    const herb = this.herbs
      .filter(
        (h) => h.readyAt <= now && distance(p, h) < 38 && (!requestedId || requestedId === h.id),
      )
      .sort((a, b) => distance(p, a) - distance(p, b))[0];
    if (herb) {
      herb.readyAt = now + 30000;
      this.addItem(p, 'wild-herb');
      this.awardXp(p, 5);
      this.progressQuest(p, 'herb');
      this.notice(p, 'Gathered silverleaf · +5 XP', 'success');
      this.event({ kind: 'gather', x: herb.x, y: herb.y, playerId: p.id });
      return;
    }
    const npc = NPCS.filter(
      (n) => distance(p, n) < 78 && (!requestedId || requestedId === n.id),
    ).sort((a, b) => distance(p, a) - distance(p, b))[0];
    if (npc) {
      p.autoAttack = false;
      p.path = [];
      this.send(p, { type: 'dialogue', npc: npc.id });
      return;
    }
    if (distance(p, { x: 610, y: 535 }) < 70) {
      this.handle(p.id, { type: 'rest' });
      return;
    }
    this.notice(p, 'Walk closer to a villager or a silverleaf plant to interact.');
  }

  buy(p, id) {
    const item = Object.hasOwn(ITEMS, id || '') ? ITEMS[id] : null;
    const merchant = NPCS.find((n) => n.id === (item?.type === 'consumable' ? 'milo' : 'bram'));
    if (!item?.price || !merchant || distance(p, merchant) > 85) return;
    if (item.class && item.class !== p.classId) {
      this.notice(p, 'This weapon belongs to a different calling.');
      return;
    }
    if (p.gold < item.price) {
      this.notice(p, 'You need a little more gold.', 'warning');
      return;
    }
    if (item.type !== 'consumable' && p.inventory.some((i) => i.id === id)) {
      this.notice(p, 'You already own this equipment.');
      return;
    }
    p.gold -= item.price;
    this.addItem(p, id);
    this.notice(p, `Purchased ${item.name}.`, 'success');
  }

  sell(p) {
    if (!NPCS.some((n) => ['shop', 'forge'].includes(n.type) && distance(p, n) < 85)) return;
    let gold = 0;
    p.inventory = p.inventory.filter((entry) => {
      const item = ITEMS[entry.id];
      if (item?.sell) {
        gold += item.sell * entry.count;
        return false;
      }
      return true;
    });
    p.gold += gold;
    this.notice(
      p,
      gold
        ? `Sold your gathered materials for ${gold} gold.`
        : 'Your bag has no materials to sell.',
      gold ? 'success' : 'info',
    );
  }

  equip(p, id) {
    const item = Object.hasOwn(ITEMS, id || '') ? ITEMS[id] : null;
    if (
      !item ||
      !['weapon', 'armor', 'charm'].includes(item.type) ||
      !p.inventory.some((i) => i.id === id)
    )
      return;
    if (item.class && item.class !== p.classId) return;
    p.equipment[item.type] = id;
    this.notice(p, `Equipped ${item.name}.`, 'success');
  }

  consume(p, id) {
    if (!['health-potion', 'mana-potion'].includes(id)) return;
    if (p.potionUntil > this.now()) {
      this.notice(p, 'Your next potion will be ready in a moment.');
      return;
    }
    const item = ITEMS[id],
      entry = p.inventory.find((i) => i.id === id);
    if (!entry?.count) {
      this.notice(p, 'Your bag is empty. Milo sells more in Willowrest.', 'warning');
      return;
    }
    const stats = classStats(p);
    if ((item.heal && p.health >= stats.maxHealth) || (item.mana && p.mana >= stats.maxMana)) {
      this.notice(p, `Your ${item.heal ? 'health' : 'mana'} is already full.`);
      return;
    }
    if (item.heal) p.health = Math.min(stats.maxHealth, p.health + item.heal);
    if (item.mana) p.mana = Math.min(stats.maxMana, p.mana + item.mana);
    entry.count--;
    p.inventory = p.inventory.filter((i) => i.count > 0);
    p.potionUntil = this.now() + 5000;
    this.event({
      kind: 'heal',
      x: p.x,
      y: p.y - 20,
      amount: `+${item.heal || item.mana}`,
      mana: !!item.mana,
      playerId: p.id,
    });
  }

  tick(dt = 0.05) {
    const now = this.now();
    for (const p of this.players.values()) {
      p.moving = false;
      if (p.health <= 0) continue;
      let dx = 0,
        dy = 0;
      if (now - p.lastInput < 600) {
        dx = p.input.x;
        dy = p.input.y;
      }
      if (!dx && !dy && p.path.length) {
        const point = p.path[0],
          dist = distance(p, point);
        if (dist < 3) p.path.shift();
        else {
          dx = (point.x - p.x) / dist;
          dy = (point.y - p.y) / dist;
        }
      }
      const magnitude = Math.hypot(dx, dy);
      if (magnitude > 0) {
        const speed = classStats(p).speed * (p.hasteUntil > now ? 1.7 : 1);
        const before = { x: p.x, y: p.y };
        moveEntity(
          p,
          (dx / Math.max(1, magnitude)) * speed * dt,
          (dy / Math.max(1, magnitude)) * speed * dt,
        );
        p.moving = distance(before, p) > 0.1;
        if (p.moving) p.direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 0 : 2;
        else if (p.path.length) p.path = [];
      }
      const zone = zoneAt(p.x, p.y);
      if (!p.discovered.includes(zone.name)) {
        p.discovered.push(zone.name);
        this.notice(p, `Discovered ${zone.name}`, 'discovery');
        this.awardXp(p, 15);
      }
      if (p.autoAttack && p.target) this.useSkill(p, 0);
      const stats = classStats(p);
      p.mana = Math.min(stats.maxMana, p.mana + dt * (p.combatUntil > now ? 1.5 : 5));
      if (p.combatUntil < now)
        p.health = Math.min(stats.maxHealth, p.health + dt * (zone.safe ? 6 : 2));
    }
    for (const mob of this.mobs) this.tickMob(mob, dt, now);
  }

  tickMob(mob, dt, now) {
    const data = MONSTERS[mob.type];
    mob.moving = false;
    if (mob.health <= 0) {
      if (mob.respawnAt && mob.respawnAt <= now)
        Object.assign(mob, {
          x: mob.home.x,
          y: mob.home.y,
          health: data.health,
          target: null,
          contributors: {},
          respawnAt: 0,
        });
      return;
    }
    if (mob.stunUntil > now) return;
    let target = this.players.get(mob.target);
    if (
      !target ||
      target.health <= 0 ||
      distance(mob, mob.home) > 220 ||
      distance(mob, target) > 250 ||
      zoneAt(target.x, target.y).safe
    ) {
      mob.target = null;
      target = null;
    }
    if (!target) {
      target = [...this.players.values()]
        .filter((p) => p.health > 0 && !zoneAt(p.x, p.y).safe && distance(p, mob) < data.aggro)
        .sort((a, b) => distance(mob, a) - distance(mob, b))[0];
      if (target) mob.target = target.id;
    }
    if (target) {
      const dist = distance(mob, target);
      if (dist > data.range) this.moveMob(mob, target, data.speed * dt);
      else if (mob.attackAt <= now) {
        mob.attackAt = now + (mob.type === 'wolf' ? 1150 : 1500);
        const stats = classStats(target);
        const amount = Math.max(
          1,
          Math.round(
            (data.damage - stats.armor * 0.75) *
              (target.guardUntil > now ? 0.35 : target.hasteUntil > now ? 0.5 : 1),
          ),
        );
        target.health = Math.max(0, target.health - amount);
        target.combatUntil = now + 7000;
        this.event({
          kind: 'hurt',
          x: target.x,
          y: target.y - 25,
          amount,
          targetId: target.id,
          fromX: mob.x,
          fromY: mob.y,
        });
        if (target.health <= 0) {
          const lost = Math.min(20, Math.floor(target.gold * 0.1));
          target.gold -= lost;
          target.input = { x: 0, y: 0 };
          target.path = [];
          target.autoAttack = false;
          this.notice(
            target,
            `The forest grows quiet. You dropped ${lost} gold, but your story isn’t over.`,
            'warning',
          );
        }
      }
    } else {
      if (mob.health < data.health) mob.health = Math.min(data.health, mob.health + dt * 8);
      if (distance(mob, mob.home) > 60) this.moveMob(mob, mob.home, data.speed * dt);
      else {
        if (mob.wanderAt <= now) {
          const angle = this.random() * Math.PI * 2,
            radius = this.random() * 32;
          mob.wanderTarget = {
            x: mob.home.x + Math.cos(angle) * radius,
            y: mob.home.y + Math.sin(angle) * radius,
          };
          mob.wanderAt = now + 4000 + this.random() * 5000;
        }
        if (mob.wanderTarget && distance(mob, mob.wanderTarget) > 3)
          this.moveMob(mob, mob.wanderTarget, data.speed * dt * 0.35);
      }
    }
  }

  moveMob(mob, destination, step) {
    const dist = distance(mob, destination);
    if (!dist) return;
    const dx = (destination.x - mob.x) / dist,
      dy = (destination.y - mob.y) / dist;
    const before = { x: mob.x, y: mob.y };
    moveEntity(mob, dx * Math.min(step, dist), dy * Math.min(step, dist));
    mob.moving = distance(mob, before) > 0.1;
    mob.direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 0 : 2;
  }
}
