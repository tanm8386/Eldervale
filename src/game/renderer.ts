import {
  BUILDINGS,
  DECORATIONS,
  PROPS,
  NPCS,
  WIDTH,
  HEIGHT,
  TILE,
  waterAt,
  bridgeAt,
  pathAt,
  seeded,
} from '../../shared/world.js';
import { MONSTERS, QUESTS } from '../../shared/data.js';
import { art } from './assets';
import type { Appearance, ClassId, GameEvent, Mob, PublicPlayer, WorldState } from '../types';

type DrawEntity = { y: number; draw: () => void };
type Position = { x: number; y: number };
type AnimatedEvent = GameEvent & { born: number };

export class WorldRenderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  textCanvas: HTMLCanvasElement;
  private labelQueue: {
    text: string;
    x: number;
    y: number;
    color: string;
    size: number;
    alpha: number;
  }[] = [];
  ground: HTMLCanvasElement;
  camera = { x: 610, y: 520 };
  zoom = 2.5;
  labels = true;
  particles = true;
  state: WorldState | null = null;
  hover: string | null = null;
  pointer: Position = { x: 0, y: 0 };
  destination: (Position & { at: number }) | null = null;
  effects: AnimatedEvent[] = [];
  positions = new Map<string, Position>();
  private animation = 0;
  private lastFrame = 0;
  private lastEvent = 0;
  private waterTiles: Position[] = [];
  private leaves: { x: number; y: number; speed: number; phase: number }[] = [];
  onFrame: () => void = () => {};

  constructor(canvas: HTMLCanvasElement, textCanvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.textCanvas = textCanvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.ground = this.buildGround();
    const random = seeded(921);
    for (let i = 0; i < 26; i++)
      this.leaves.push({
        x: random() * 1700,
        y: random() * 1200,
        speed: 0.8 + random(),
        phase: random() * 7,
      });
  }

  buildGround() {
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH * TILE;
    canvas.height = HEIGHT * TILE;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const terrain = art.images.get('terrain')!,
      path = art.images.get('path-edges')!;
    for (let y = 0; y < HEIGHT; y++)
      for (let x = 0; x < WIDTH; x++) {
        const v = (x * 71 + y * 37 + x * y * 3) % 16;
        ctx.drawImage(terrain, v * 16, 0, 16, 16, x * 16, y * 16, 16, 16);
        if (waterAt(x, y)) {
          ctx.drawImage(terrain, v * 16, 32, 16, 16, x * 16, y * 16, 16, 16);
          this.waterTiles.push({ x, y });
        } else {
          ctx.fillStyle = '#9aa074';
          if (waterAt(x, y - 1)) ctx.fillRect(x * 16, y * 16, 16, 2);
          if (waterAt(x, y + 1)) ctx.fillRect(x * 16, y * 16 + 14, 16, 2);
          if (waterAt(x - 1, y)) ctx.fillRect(x * 16, y * 16, 2, 16);
          if (waterAt(x + 1, y)) ctx.fillRect(x * 16 + 14, y * 16, 2, 16);
        }
        if (pathAt(x, y) && !bridgeAt(x, y)) {
          const mask =
            (pathAt(x, y - 1) ? 1 : 0) +
            (pathAt(x + 1, y) ? 2 : 0) +
            (pathAt(x, y + 1) ? 4 : 0) +
            (pathAt(x - 1, y) ? 8 : 0);
          ctx.drawImage(path, mask * 16, 0, 16, 16, x * 16, y * 16, 16, 16);
        }
        if (bridgeAt(x, y)) art.draw(ctx, 'bridge', x * 16, y * 16);
      }
    for (const decoration of DECORATIONS)
      art.draw(ctx, decoration.sprite, decoration.x - 8, decoration.y - 12);
    ctx.fillStyle = 'rgba(28, 58, 39, .16)';
    for (const prop of PROPS) {
      if (prop.sprite.startsWith('oak') || prop.sprite === 'pine') {
        ctx.beginPath();
        ctx.ellipse(prop.x + 4, prop.y - 3, 23, 10, -0.25, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // The old Moonwell courtyard is paved in weathered stone.
    for (let y = 11; y < 20; y++)
      for (let x = 61; x < 71; x++) {
        if ((x * 13 + y * 7) % 5 === 0) continue;
        ctx.fillStyle = (x + y) % 3 === 0 ? '#87937b' : '#7b8c72';
        ctx.fillRect(x * 16 + 1, y * 16 + 1, 14, 14);
        ctx.fillStyle = '#9ca487';
        ctx.fillRect(x * 16 + 2, y * 16 + 1, 11, 1);
        if ((x + y) % 2 === 0) {
          ctx.fillStyle = '#668450';
          ctx.fillRect(x * 16 + 11, y * 16 + 13, 3, 2);
        }
      }
    return canvas;
  }

  update(state: WorldState) {
    this.state = state;
    for (const event of state.events) {
      if (event.id > this.lastEvent) this.effects.push({ ...event, born: performance.now() });
      this.lastEvent = Math.max(this.lastEvent, event.id);
    }
  }

  start() {
    const render = (time: number) => {
      const dt = Math.min(0.05, (time - (this.lastFrame || time)) / 1000);
      this.lastFrame = time;
      this.draw(time, dt);
      this.onFrame();
      this.animation = requestAnimationFrame(render);
    };
    this.animation = requestAnimationFrame(render);
  }

  destroy() {
    cancelAnimationFrame(this.animation);
  }

  worldPoint(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x:
        ((clientX - rect.left) / rect.width) * this.canvas.width +
        this.camera.x -
        this.canvas.width / 2,
      y:
        ((clientY - rect.top) / rect.height) * this.canvas.height +
        this.camera.y -
        this.canvas.height / 2,
    };
  }

  pick(point: Position) {
    if (!this.state) return null;
    const mob = this.state.mobs
      .filter(
        (m) =>
          m.health > 0 &&
          Math.abs(point.x - m.x) < (m.type === 'guardian' ? 28 : 18) &&
          point.y > m.y - (m.type === 'guardian' ? 70 : 35) &&
          point.y < m.y + 5,
      )
      .sort((a, b) => b.y - a.y)[0];
    if (mob) return { type: 'mob', id: mob.id };
    const npc = NPCS.find(
      (n) => Math.abs(point.x - n.x) < 15 && point.y > n.y - 38 && point.y < n.y + 4,
    );
    if (npc) return { type: 'npc', id: npc.id };
    const herb = this.state.herbs.find(
      (h) => h.available && Math.hypot(point.x - h.x, point.y - (h.y - 8)) < 14,
    );
    if (herb) return { type: 'herb', id: herb.id };
    return null;
  }

  private smooth(id: string, x: number, y: number, dt: number) {
    const old = this.positions.get(id) || { x, y };
    const factor = 1 - Math.exp(-18 * dt);
    if (Math.hypot(old.x - x, old.y - y) > 100) {
      old.x = x;
      old.y = y;
    } else {
      old.x += (x - old.x) * factor;
      old.y += (y - old.y) * factor;
    }
    this.positions.set(id, old);
    return old;
  }

  private name(text: string, x: number, y: number, color = '#f2e6c7', size = 6) {
    this.labelQueue.push({ text, x, y, color, size, alpha: this.ctx.globalAlpha });
  }

  draw(time: number, dt: number) {
    this.labelQueue = [];
    const responsiveZoom = this.canvas.clientWidth < 721 ? this.zoom * 0.8 : this.zoom;
    const width = Math.ceil(this.canvas.clientWidth / responsiveZoom),
      height = Math.ceil(this.canvas.clientHeight / responsiveZoom);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    const state = this.state;
    if (state) {
      const pos = this.smooth(state.self.id, state.self.x, state.self.y, dt);
      const factor = 1 - Math.exp(-6 * dt);
      this.camera.x += (pos.x - this.camera.x) * factor;
      this.camera.y += (pos.y - height * 0.12 - this.camera.y) * factor;
    }
    this.camera.x = Math.max(width / 2, Math.min(WIDTH * TILE - width / 2, this.camera.x));
    this.camera.y = Math.max(height / 2, Math.min(HEIGHT * TILE - height / 2, this.camera.y));
    const left = Math.round(this.camera.x - width / 2),
      top = Math.round(this.camera.y - height / 2);
    ctx.fillStyle = '#35523c';
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(-left, -top);
    ctx.drawImage(this.ground, 0, 0);
    const phase = Math.floor(time / 340) % 4;
    const terrain = art.images.get('terrain')!;
    for (const { x, y } of this.waterTiles) {
      if (
        x * 16 < left - 16 ||
        x * 16 > left + width ||
        y * 16 < top - 16 ||
        y * 16 > top + height ||
        bridgeAt(x, y)
      )
        continue;
      const v = (x * 71 + y * 37 + x * y * 3) % 16;
      ctx.drawImage(terrain, v * 16, 32 + phase * 16, 16, 16, x * 16, y * 16, 16, 16);
    }
    if (this.destination && time - this.destination.at < 1400) {
      const t = (time - this.destination.at) / 1400;
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = '#e6d5a1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(this.destination.x, this.destination.y, 8 + t * 8, 4 + t * 4, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    const visible = (x: number, y: number, padding = 100) =>
      x > left - padding &&
      x < left + width + padding &&
      y > top - 10 &&
      y < top + height + padding;
    const entities: DrawEntity[] = [];
    for (const b of BUILDINGS)
      if (visible(b.x, b.y, 130))
        entities.push({ y: b.y, draw: () => art.draw(ctx, b.sprite, b.x - b.w / 2, b.y - b.h) });
    for (const p of PROPS)
      if (visible(p.x, p.y))
        entities.push({
          y: p.y,
          draw: () => {
            const occludes =
              state &&
              p.h > 60 &&
              Math.abs(p.x - state.self.x) < p.w * 0.42 &&
              state.self.y < p.y - 2 &&
              state.self.y > p.y - p.h + 10;
            if (occludes) ctx.globalAlpha = 0.57;
            art.draw(ctx, p.sprite, p.x - p.w / 2, p.y - p.h, Math.floor(time / 130));
            ctx.globalAlpha = 1;
          },
        });
    for (const h of state?.herbs || [])
      if (h.available && visible(h.x, h.y))
        entities.push({
          y: h.y,
          draw: () => {
            art.draw(ctx, 'herb', h.x - 8, h.y - 16);
            if (Math.sin(time / 500 + h.x) > 0.6)
              art.draw(ctx, 'fx-spark', h.x - 32, h.y - 46, Math.floor(time / 120));
            if (this.hover === h.id) this.name('Silverleaf · E', h.x, h.y - 21, '#e0e1ae');
          },
        });
    for (const npc of NPCS)
      if (visible(npc.x, npc.y))
        entities.push({
          y: npc.y,
          draw: () => {
            this.shadow(npc.x, npc.y);
            art.drawAvatar(
              ctx,
              npc.classId as ClassId,
              npc.appearance as Appearance,
              npc.x,
              npc.y,
              npc.direction,
              0,
              Math.floor(time / 185),
            );
            if (this.labels) {
              this.name(npc.name, npc.x, npc.y - 44, '#ecd695');
              if (
                this.hover === npc.id ||
                (state && Math.hypot(state.self.x - npc.x, state.self.y - npc.y) < 65)
              )
                this.name(npc.role, npc.x, npc.y - 52, '#c1c9a3', 5);
            }
            if (npc.type === 'quest' && (!state || state.self.questIndex < QUESTS.length)) {
              const q = state && QUESTS[state.self.questIndex];
              const ready =
                q &&
                state?.self.questAccepted &&
                q.objectives.every((g) => (state.self.questProgress[g.type] || 0) >= g.count);
              const symbol = ready ? '?' : state?.self.questAccepted ? '◆' : '!';
              this.name(
                symbol,
                npc.x,
                npc.y - 61 + Math.sin(time / 500) * 1.5,
                state?.self.questAccepted && !ready ? '#a3bc91' : '#f0cc75',
                10,
              );
            }
          },
        });
    for (const mob of state?.mobs || [])
      if (mob.health > 0 && visible(mob.x, mob.y)) {
        const pos = this.smooth(mob.id, mob.x, mob.y, dt);
        entities.push({ y: pos.y, draw: () => this.drawMob(mob, pos, time) });
      }
    for (const player of state?.players || [])
      if (visible(player.x, player.y)) {
        const pos = this.smooth(player.id, player.x, player.y, dt);
        entities.push({ y: pos.y, draw: () => this.drawPlayer(player, pos, time) });
      }
    entities.sort((a, b) => a.y - b.y);
    for (const entity of entities) entity.draw();
    this.drawEffects(time);
    if (this.particles) {
      for (const leaf of this.leaves) {
        const x = (leaf.x + time * 0.006 * leaf.speed) % 1320;
        const y =
          (leaf.y + time * 0.003 * leaf.speed + Math.sin(time / 1700 + leaf.phase) * 6) % 1050;
        if (visible(x, y, 20)) {
          ctx.globalAlpha = 0.65;
          art.draw(ctx, 'fx-leaf', x - 32, y - 32, Math.floor(time / 160 + leaf.phase));
        }
      }
      ctx.globalAlpha = 1;
      // Soft pool of lamplight is a rendering treatment, not a replacement art asset.
      for (const p of PROPS)
        if (p.sprite === 'lamp' && visible(p.x, p.y)) {
          const glow = ctx.createRadialGradient(p.x, p.y - 31, 1, p.x, p.y - 31, 18);
          glow.addColorStop(0, 'rgba(252,210,119,.13)');
          glow.addColorStop(1, 'rgba(252,210,119,0)');
          ctx.fillStyle = glow;
          ctx.fillRect(p.x - 18, p.y - 49, 36, 36);
        }
    }
    ctx.restore();
    const vignette = ctx.createRadialGradient(
      width / 2,
      height / 2,
      width * 0.15,
      width / 2,
      height / 2,
      width * 0.7,
    );
    vignette.addColorStop(0, 'rgba(13,32,22,0)');
    vignette.addColorStop(1, 'rgba(13,32,22,.27)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
    this.drawLabels(left, top);
  }

  private drawLabels(left: number, top: number) {
    const canvas = this.textCanvas,
      ratio = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(this.canvas.clientWidth * ratio),
      h = Math.round(this.canvas.clientHeight * ratio);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, w, h);
    const sx = w / this.canvas.width,
      sy = h / this.canvas.height;
    for (const label of this.labelQueue) {
      const size = label.size * sx;
      ctx.font = `${label.size >= 8 ? 700 : 600} ${size}px "DM Sans", sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2.8 * ratio;
      ctx.globalAlpha = label.alpha;
      ctx.strokeStyle = 'rgba(28, 47, 33, .82)';
      ctx.strokeText(label.text, (label.x - left) * sx, (label.y - top) * sy);
      ctx.fillStyle = label.color;
      ctx.fillText(label.text, (label.x - left) * sx, (label.y - top) * sy);
    }
    ctx.globalAlpha = 1;
  }

  shadow(x: number, y: number) {
    this.ctx.fillStyle = 'rgba(25, 46, 30, .27)';
    this.ctx.beginPath();
    this.ctx.ellipse(x, y - 1, 9, 3, 0, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawPlayer(player: PublicPlayer, pos: Position, time: number) {
    const ctx = this.ctx,
      now = this.state?.time || Date.now();
    const self = player.id === this.state?.self.id;
    this.shadow(pos.x, pos.y);
    if (self) {
      ctx.strokeStyle = 'rgba(228,222,172,.55)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y - 1, 11, 4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (player.health <= 0) ctx.globalAlpha = 0.45;
    const action = player.attackUntil > now ? 2 : player.moving ? 1 : 0;
    art.drawAvatar(
      ctx,
      player.classId,
      player.appearance,
      pos.x,
      pos.y,
      player.direction,
      action,
      Math.floor(time / (action === 1 ? 90 : action === 2 ? 65 : 170)),
    );
    ctx.globalAlpha = 1;
    if (player.guardUntil > now || player.hasteUntil > now) {
      ctx.strokeStyle = player.guardUntil > now ? '#d6c789' : '#adcd9a';
      ctx.globalAlpha = 0.6 + Math.sin(time / 180) * 0.15;
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y - 17, 16, 22, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (this.labels) {
      this.name(player.name, pos.x, pos.y - 44, self ? '#f9edc7' : '#bbd9bd');
      if (self) this.name('YOU', pos.x, pos.y - 52, '#d1dbb2', 5);
    }
  }

  drawMob(mob: Mob, pos: Position, time: number) {
    const ctx = this.ctx,
      data = MONSTERS[mob.type];
    const selected = this.state?.self.target === mob.id || this.hover === mob.id;
    if (selected) {
      ctx.strokeStyle = '#dfad77';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y - 1, mob.type === 'guardian' ? 23 : 15, 5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    const flip = mob.type === 'wolf' && mob.direction === 3;
    ctx.save();
    if (flip) {
      ctx.translate(Math.round(pos.x), 0);
      ctx.scale(-1, 1);
    }
    art.draw(
      ctx,
      data.sprite,
      (flip ? 0 : pos.x) - data.w / 2,
      pos.y - data.h + 3,
      Math.floor(time / (mob.moving ? 105 : 180)),
    );
    ctx.restore();
    const hurt = this.effects.some(
      (e) => e.targetId === mob.id && e.kind === 'damage' && performance.now() - e.born < 160,
    );
    if (hurt) {
      ctx.fillStyle = 'rgba(250,237,196,.4)';
      ctx.fillRect(pos.x - 3, pos.y - data.h / 2, 6, 3);
    }
    if (this.labels && (selected || mob.health < mob.maxHealth || mob.type === 'guardian')) {
      this.name(
        `${data.name}`,
        pos.x,
        pos.y - data.h - 5,
        mob.type === 'guardian' ? '#dbc99b' : '#e3d6b8',
        5,
      );
      ctx.fillStyle = '#344c3c';
      ctx.fillRect(Math.round(pos.x - 15), Math.round(pos.y - data.h - 2), 30, 3);
      ctx.fillStyle = '#bd7a61';
      ctx.fillRect(
        Math.round(pos.x - 14),
        Math.round(pos.y - data.h - 1),
        Math.round((28 * mob.health) / mob.maxHealth),
        1,
      );
    }
    if (mob.stunUntil > (this.state?.time || Date.now()))
      art.draw(ctx, 'fx-spark', pos.x - 32, pos.y - data.h - 24, Math.floor(time / 90));
  }

  drawEffects(time: number) {
    const ctx = this.ctx;
    this.effects = this.effects.filter(
      (e) => time - e.born < (['damage', 'hurt', 'heal'].includes(e.kind) ? 1300 : 900),
    );
    for (const e of this.effects) {
      const age = time - e.born,
        frame = Math.min(7, Math.floor(age / 95));
      if (['damage', 'hurt', 'heal'].includes(e.kind)) {
        ctx.globalAlpha = Math.min(1, (1300 - age) / 350);
        this.name(
          `${e.critical ? '✧ ' : ''}${e.amount ?? ''}`,
          e.x + Math.sin(e.id) * 5,
          e.y - age * 0.018,
          e.kind === 'hurt'
            ? '#ffab8b'
            : e.kind === 'heal'
              ? e.mana
                ? '#b7d7eb'
                : '#c6e6a4'
              : e.critical
                ? '#ffe2a0'
                : '#fff0cb',
          e.critical ? 10 : 8,
        );
        ctx.globalAlpha = 1;
      } else if (e.kind === 'attack') {
        const fx =
          e.classId === 'warrior'
            ? e.index === 3
              ? 'dust'
              : 'slash'
            : e.classId === 'archer'
              ? e.index === 3
                ? 'dust'
                : 'spark'
              : e.index === 1
                ? 'fire'
                : e.index === 2
                  ? 'frost'
                  : 'arcane';
        if (e.index === 0 && e.classId !== 'warrior' && age < 350) {
          const t = Math.min(1, age / 230),
            x = (e.fromX || e.x) + ((e.targetX || e.x) - (e.fromX || e.x)) * t,
            y = (e.fromY || e.y) + ((e.targetY || e.y) - (e.fromY || e.y)) * t - 17;
          art.draw(
            ctx,
            e.classId === 'archer' ? 'icon-arrow' : 'fx-spark',
            x - (e.classId === 'archer' ? 12 : 32),
            y - (e.classId === 'archer' ? 12 : 32),
            frame,
          );
        } else
          art.draw(
            ctx,
            `fx-${fx}`,
            (e.targetX ?? e.x) - 32,
            (e.targetY ?? e.y) - 45,
            frame,
            e.index === 3 ? 1.4 : 1,
          );
      } else {
        const effect = ['level', 'quest', 'heal', 'gather', 'guard', 'haste'].includes(e.kind)
          ? 'heal'
          : 'dust';
        art.draw(ctx, `fx-${effect}`, e.x - 32, e.y - 44, frame);
        if (e.kind === 'level') this.name('LEVEL UP', e.x, e.y - 58 - age * 0.015, '#eed28c', 9);
      }
    }
  }
}

export function paintMap(canvas: HTMLCanvasElement, state: WorldState | null, large = false) {
  const ctx = canvas.getContext('2d')!;
  const sx = canvas.width / (WIDTH * TILE),
    sy = canvas.height / (HEIGHT * TILE);
  ctx.fillStyle = '#3b5840';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const illustration = art.images.get('world-map');
  ctx.imageSmoothingEnabled = false;
  if (illustration) ctx.drawImage(illustration, 0, 0, canvas.width, canvas.height);
  ctx.fillStyle = large ? 'rgba(39, 61, 43, .20)' : 'rgba(39, 61, 43, .12)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#e7cc8d';
  for (const npc of NPCS) {
    ctx.beginPath();
    ctx.arc(npc.x * sx, npc.y * sy, large ? 3 : 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  if (large && state)
    for (const mob of state.mobs)
      if (mob.health > 0) {
        ctx.fillStyle = mob.type === 'guardian' ? '#d9bc83' : '#b58769';
        ctx.fillRect(mob.x * sx - 2, mob.y * sy - 2, 4, 4);
      }
  if (state)
    for (const p of state.players) {
      if (large && p.id === state.self.id) {
        ctx.beginPath();
        ctx.arc(p.x * sx, p.y * sy, 9, 0, Math.PI * 2);
        ctx.strokeStyle = '#f4e6ac';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.fillStyle = p.id === state.self.id ? '#fcf1c0' : '#bce0c3';
      ctx.beginPath();
      ctx.arc(p.x * sx, p.y * sy, large ? 4 : 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#344e3a';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
}
