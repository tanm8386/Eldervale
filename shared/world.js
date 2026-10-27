export const TILE = 16;
export const WIDTH = 80;
export const HEIGHT = 64;
export const SPAWN = { x: 608, y: 592 };

export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

export const NPCS = [
  {
    id: 'elowen',
    name: 'Warden Elowen',
    role: 'Village warden',
    x: 659,
    y: 554,
    classId: 'archer',
    appearance: { skin: 1, hair: 4, style: 2, outfit: 0, body: 1 },
    type: 'quest',
    direction: 0,
  },
  {
    id: 'milo',
    name: 'Milo',
    role: 'General goods',
    x: 469,
    y: 613,
    classId: 'archer',
    appearance: { skin: 2, hair: 1, style: 1, outfit: 4, body: 0 },
    type: 'shop',
    direction: 1,
  },
  {
    id: 'bram',
    name: 'Bram',
    role: 'Blacksmith',
    x: 764,
    y: 484,
    classId: 'warrior',
    appearance: { skin: 3, hair: 0, style: 1, outfit: 1, body: 0 },
    type: 'forge',
    direction: 0,
  },
  {
    id: 'iris',
    name: 'Iris',
    role: 'Village healer',
    x: 552,
    y: 480,
    classId: 'mage',
    appearance: { skin: 0, hair: 2, style: 3, outfit: 2, body: 1 },
    type: 'healer',
    direction: 0,
  },
  {
    id: 'rowan',
    name: 'Rowan',
    role: 'The Wandering Acorn',
    x: 508,
    y: 446,
    classId: 'warrior',
    appearance: { skin: 1, hair: 3, style: 0, outfit: 4, body: 0 },
    type: 'inn',
    direction: 0,
  },
];

export const BUILDINGS = [
  {
    id: 'inn',
    sprite: 'inn',
    name: 'The Wandering Acorn',
    x: 494,
    y: 421,
    w: 128,
    h: 120,
    solid: { x: -48, y: -53, w: 94, h: 49 },
  },
  {
    id: 'forge',
    sprite: 'forge',
    name: 'Bram’s Forge',
    x: 761,
    y: 454,
    w: 112,
    h: 104,
    solid: { x: -44, y: -45, w: 86, h: 41 },
  },
  {
    id: 'cottage',
    sprite: 'cottage',
    name: 'The Willow House',
    x: 672,
    y: 354,
    w: 96,
    h: 96,
    solid: { x: -35, y: -36, w: 70, h: 32 },
  },
  {
    id: 'shop',
    sprite: 'market',
    name: 'Milo’s Market',
    x: 426,
    y: 608,
    w: 80,
    h: 64,
    solid: { x: -32, y: -28, w: 64, h: 24 },
  },
  {
    id: 'cottage2',
    sprite: 'cottage',
    name: 'Gatherer’s Cottage',
    x: 773,
    y: 683,
    w: 96,
    h: 96,
    solid: { x: -35, y: -36, w: 70, h: 32 },
  },
];

export function waterAt(x, y) {
  const center = 55 + Math.sin(y * 0.13) * 1.4;
  const river = Math.abs(x - center) < 2.6 + Math.sin(y * 0.32) * 0.3;
  const pond = ((x - 18) / 6) ** 2 + ((y - 15) / 4.2) ** 2 < 1;
  return river || pond;
}

export function bridgeAt(x, y) {
  return x >= 51 && x <= 59 && y >= 35 && y <= 37;
}

export function pathAt(x, y) {
  if (waterAt(x, y) && !bridgeAt(x, y)) return false;
  return (
    (y >= 35 && y <= 37 && x >= 6 && x <= 75) ||
    (x >= 37 && x <= 39 && y >= 10 && y <= 56) ||
    ((x - 38) / 9) ** 2 + ((y - 34.5) / 7) ** 2 < 1 ||
    (x >= 64 && x <= 66 && y >= 15 && y <= 36) ||
    (x >= 61 && x <= 71 && y >= 15 && y <= 17) ||
    (x >= 45 && x <= 47 && y >= 28 && y <= 42) ||
    (x >= 29 && x <= 31 && y >= 26 && y <= 36)
  );
}

export function zoneAt(x, y) {
  if (x > 935 && y < 365)
    return { name: 'Moonwell Ruins', subtitle: 'ANCIENT GROUNDS', safe: false, level: '4–5' };
  if (x > 940)
    return { name: 'Sunlit Meadow', subtitle: 'THE EASTERN WILDS', safe: false, level: '1–3' };
  if (x < 420 || y < 305 || y > 775)
    return { name: 'Whispering Woods', subtitle: 'THE ELDERWOOD', safe: false, level: '2–3' };
  return { name: 'Willowrest', subtitle: 'A PLACE TO CALL HOME', safe: true, level: '1' };
}

const random = seeded(68294);
export const PROPS = [
  {
    id: 'fountain',
    sprite: 'fountain',
    x: 610,
    y: 535,
    w: 64,
    h: 64,
    radius: 21,
    centerY: -17,
    animated: true,
  },
  {
    id: 'waystone',
    sprite: 'waystone',
    x: 1017,
    y: 247,
    w: 48,
    h: 64,
    radius: 13,
    centerY: -8,
    animated: true,
  },
  { id: 'sign-meadow', sprite: 'sign', x: 824, y: 557, w: 24, h: 32, radius: 5 },
  { id: 'sign-forest', sprite: 'sign', x: 365, y: 557, w: 24, h: 32, radius: 5 },
  { id: 'chest', sprite: 'chest', x: 1064, y: 220, w: 24, h: 24, radius: 8 },
];

const nearBuilding = (x, y, pad = 0) =>
  BUILDINGS.some(
    (b) =>
      x > b.x - b.w / 2 - pad &&
      x < b.x + b.w / 2 + pad &&
      y > b.y - b.h / 2 - pad &&
      y < b.y + 20 + pad,
  );

for (let i = 0; i < 520; i++) {
  const x = Math.floor(random() * (WIDTH - 3) + 1.5) * 16 + Math.floor(random() * 10);
  const y = Math.floor(random() * (HEIGHT - 3) + 1.5) * 16 + Math.floor(random() * 10);
  const tx = x / 16,
    ty = y / 16;
  const inTown = tx > 25 && tx < 51 && ty > 20 && ty < 47;
  const ruins = tx > 60 && tx < 73 && ty > 10 && ty < 21;
  if (
    waterAt(tx, ty) ||
    pathAt(tx, ty) ||
    pathAt(tx - 1, ty) ||
    pathAt(tx + 1, ty) ||
    pathAt(tx, ty + 1) ||
    nearBuilding(x, y, 26) ||
    ruins
  )
    continue;
  if (inTown && random() < 0.85) continue;
  if (tx > 60 && ty > 25 && ty < 47 && random() < 0.8) continue;
  if (PROPS.some((p) => Math.hypot(p.x - x, p.y - y) < 31)) continue;
  const variant = random();
  PROPS.push({
    id: `tree-${i}`,
    sprite: variant < 0.2 ? 'pine' : variant < 0.35 ? 'oak-gold' : 'oak',
    x,
    y,
    w: 64,
    h: 88,
    radius: 8,
    centerY: -7,
  });
}

for (let i = 0; i < 180; i++) {
  const x = Math.floor(random() * 1230 + 24),
    y = Math.floor(random() * 970 + 24);
  if (waterAt(x / 16, y / 16) || pathAt(x / 16, y / 16) || nearBuilding(x, y, 5)) continue;
  const sprite = random() < 0.6 ? 'bush' : 'rock';
  PROPS.push({ id: `small-${i}`, sprite, x, y, w: 32, h: 24, radius: sprite === 'rock' ? 8 : 0 });
}

// Deliberately placed town details keep the visual language human and lived-in.
for (const [sprite, x, y, w, h] of [
  ['lamp', 565, 580, 16, 48],
  ['lamp', 702, 580, 16, 48],
  ['lamp', 824, 612, 16, 48],
  ['lamp', 578, 395, 16, 48],
  ['barrel', 437, 422, 16, 24],
  ['barrel', 451, 427, 16, 24],
  ['crate', 819, 444, 24, 24],
  ['crate', 818, 465, 24, 24],
  ['flowers', 546, 437, 16, 16],
  ['flowers', 453, 459, 16, 16],
  ['flowers', 688, 590, 16, 16],
  ['flowers', 562, 534, 16, 16],
  ['bench', 674, 497, 32, 24],
  ['bench', 553, 550, 32, 24],
  ['well', 711, 392, 32, 40],
  ['column', 979, 220, 24, 48],
  ['column', 1125, 220, 24, 48],
  ['column', 978, 300, 24, 48],
  ['column', 1126, 300, 24, 48],
  ['ruin', 1040, 178, 48, 40],
  ['ruin', 1094, 178, 48, 40],
])
  PROPS.push({
    id: `${sprite}-${x}-${y}`,
    sprite,
    x,
    y,
    w,
    h,
    radius: ['column', 'well', 'crate', 'barrel'].includes(sprite) ? 7 : 0,
  });

for (let x = 51; x <= 59; x++) {
  PROPS.push({
    id: `rail-n-${x}`,
    sprite: 'fence',
    x: x * 16 + 8,
    y: 563,
    w: 16,
    h: 24,
    radius: 0,
  });
  PROPS.push({
    id: `rail-s-${x}`,
    sprite: 'fence',
    x: x * 16 + 8,
    y: 616,
    w: 16,
    h: 24,
    radius: 0,
  });
}
for (let x = 26; x <= 33; x++)
  PROPS.push({ id: `fence-${x}`, sprite: 'fence', x: x * 16, y: 666, w: 16, h: 24, radius: 0 });

export const HERBS = [
  [967, 628],
  [995, 555],
  [1090, 626],
  [1165, 551],
  [1138, 698],
  [998, 688],
  [1044, 474],
  [1187, 647],
  [334, 610],
  [298, 541],
  [250, 631],
  [350, 485],
].map(([x, y], i) => ({ id: `herb-${i}`, x, y }));

export const MOB_SPAWNS = [
  ...[
    [998, 583],
    [1030, 640],
    [1110, 594],
    [1165, 626],
    [1065, 695],
    [1200, 541],
    [985, 730],
    [1127, 490],
  ].map(([x, y]) => ({ type: 'slime', x, y })),
  ...[
    [309, 624],
    [266, 498],
    [206, 611],
    [315, 718],
    [352, 400],
    [1137, 406],
  ].map(([x, y]) => ({ type: 'mushroom', x, y })),
  ...[
    [254, 723],
    [220, 450],
    [314, 353],
    [1110, 345],
    [1192, 775],
  ].map(([x, y]) => ({ type: 'wolf', x, y })),
  { type: 'guardian', x: 1051, y: 279 },
];

export const DECORATIONS = [];
for (let i = 0; i < 1550; i++) {
  const x = Math.floor(random() * 1260 + 10),
    y = Math.floor(random() * 1000 + 10);
  if (waterAt(x / 16, y / 16) || pathAt(x / 16, y / 16) || nearBuilding(x, y)) continue;
  DECORATIONS.push({
    x,
    y,
    sprite: random() < 0.17 ? 'flowers' : random() < 0.15 ? 'toadstool' : 'grass-tuft',
    variant: Math.floor(random() * 4),
  });
}

export function collides(x, y, radius = 5) {
  if (x < 20 || y < 20 || x > WIDTH * TILE - 20 || y > HEIGHT * TILE - 20) return true;
  for (const [dx, dy] of [
    [-radius, 0],
    [radius, 0],
    [0, -radius],
    [0, radius],
  ]) {
    const tx = Math.floor((x + dx) / TILE),
      ty = Math.floor((y + dy) / TILE);
    if (waterAt(tx, ty) && !bridgeAt(tx, ty)) return true;
  }
  for (const b of BUILDINGS) {
    const r = b.solid;
    if (
      x + radius > b.x + r.x &&
      x - radius < b.x + r.x + r.w &&
      y + radius > b.y + r.y &&
      y - radius < b.y + r.y + r.h
    )
      return true;
  }
  for (const p of PROPS) {
    if (
      p.radius &&
      Math.abs(x - p.x) < p.radius + radius &&
      Math.hypot(x - p.x, y - (p.y + (p.centerY || 0))) < p.radius + radius
    )
      return true;
  }
  return false;
}

export function moveEntity(entity, dx, dy) {
  // Substeps prevent tunneling when a frame is delayed.
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 4));
  for (let n = 0; n < steps; n++) {
    if (!collides(entity.x + dx / steps, entity.y)) entity.x += dx / steps;
    if (!collides(entity.x, entity.y + dy / steps)) entity.y += dy / steps;
  }
}

const navCache = new Map();
const navBlocked = (x, y) => {
  const key = y * WIDTH + x;
  if (!navCache.has(key))
    navCache.set(
      key,
      x < 1 || y < 1 || x >= WIDTH - 1 || y >= HEIGHT - 1 || collides(x * TILE + 8, y * TILE + 8),
    );
  return navCache.get(key);
};

export function findPath(start, end) {
  const sx = Math.floor(start.x / TILE),
    sy = Math.floor(start.y / TILE);
  const ex = Math.max(1, Math.min(WIDTH - 2, Math.floor(end.x / TILE))),
    ey = Math.max(1, Math.min(HEIGHT - 2, Math.floor(end.y / TILE)));
  if (navBlocked(ex, ey)) return [];
  const from = sy * WIDTH + sx,
    to = ey * WIDTH + ex;
  const open = [{ key: from, x: sx, y: sy, g: 0, f: 0 }],
    visited = new Map([[from, { g: 0, parent: -1 }]]);
  let iterations = 0;
  while (open.length && iterations++ < 5000) {
    let min = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[min].f) min = i;
    const node = open.splice(min, 1)[0];
    if (node.key === to) {
      const result = [];
      let at = to;
      while (at !== from) {
        result.unshift({ x: (at % WIDTH) * TILE + 8, y: Math.floor(at / WIDTH) * TILE + 8 });
        at = visited.get(at).parent;
      }
      if (!collides(end.x, end.y)) result.push({ x: end.x, y: end.y });
      return result;
    }
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ]) {
      const x = node.x + dx,
        y = node.y + dy,
        key = y * WIDTH + x;
      if (
        navBlocked(x, y) ||
        (dx && dy && (navBlocked(node.x + dx, node.y) || navBlocked(node.x, node.y + dy)))
      )
        continue;
      const g = node.g + (dx && dy ? 1.414 : 1);
      if (visited.has(key) && visited.get(key).g <= g) continue;
      visited.set(key, { g, parent: node.key });
      open.push({ key, x, y, g, f: g + Math.hypot(ex - x, ey - y) });
    }
  }
  return [];
}
