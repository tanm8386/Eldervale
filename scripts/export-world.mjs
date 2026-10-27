import { writeFile } from 'node:fs/promises';
import { BUILDINGS, PROPS, WIDTH, HEIGHT, waterAt, pathAt, bridgeAt } from '../shared/world.js';

const tiles = [];
for (let y = 0; y < HEIGHT; y++) {
  for (let x = 0; x < WIDTH; x++) {
    const mask =
      (pathAt(x, y - 1) ? 1 : 0) |
      (pathAt(x + 1, y) ? 2 : 0) |
      (pathAt(x, y + 1) ? 4 : 0) |
      (pathAt(x - 1, y) ? 8 : 0);
    tiles.push({ x, y, kind: bridgeAt(x, y) ? 3 : waterAt(x, y) ? 2 : pathAt(x, y) ? 1 : 0, mask });
  }
}
const props = [...BUILDINGS, ...PROPS]
  .filter((p) =>
    [
      'inn',
      'forge',
      'cottage',
      'market',
      'oak',
      'oak-gold',
      'pine',
      'fountain',
      'waystone',
      'column',
      'ruin',
    ].includes(p.sprite),
  )
  .sort((a, b) => a.y - b.y)
  .map(({ sprite, x, y, w, h }) => ({ sprite, x, y, w, h }));
await writeFile(
  new URL('../art/world-layout.json', import.meta.url),
  JSON.stringify({ tiles, props }),
);
