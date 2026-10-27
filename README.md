# Eldervale

## Project status: permanently discontinued

**Eldervale was created using a single prompt, solely to test an AI model's ability to generate a playable game.** This repository preserves the output of that one-off experiment for inspection and reproduction.

**The project will not receive any further development in the future. No updates, bug fixes, or ongoing maintenance will be provided.**

<details>
<summary>Original game-generation prompt</summary>

> Create a classic 2D MMORPG with traditional gameplay and three distinct classes: Warrior, Archer, and Mage. Each class must have unique strengths, weaknesses, and playstyles.
>
> Implement a Character Customization system during character creation.
>
> Create all game assets using Aseprite. Download and install Aseprite if it is not already available.
>
> Every asset must be carefully crafted, with polished details and smooth, fluid animations. Maintain a consistent art direction across all game assets, as if they were created by a single professional art team. Ensure visual consistency in character design, environments, monsters, equipment, effects, and animations.

</details>

## About the experiment

**A little world. A grand adventure.**

A playable, classic-style 2D multiplayer RPG set in a warm woodland world. Create a character, meet the villagers of Willowrest, follow a three-chapter quest line, and explore with other players.

## Play

Requires **Node.js 22.12+** and npm.

```bash
npm install
npm run dev
```

Open **http://localhost:3000**. The server listens on `0.0.0.0`, so other devices can join through the host's reachable address. Open a second browser profile or private window to play another character in the same realm.

For a production build:

```bash
npm run build
npm start
```

`PORT` changes the default port. `DATA_DIR` changes the character-save directory.

```bash
PORT=8080 DATA_DIR=/path/to/saves npm start
```

The project is a **single-realm multiplayer vertical slice**. It implements a complete introductory gameplay loop with real shared combat, creatures, gathering, chat, and persistence. Large-scale sharding, account/password authentication, player trading, guilds, PvP, and an expanded endgame are outside this build.

## Three distinct callings

| Class       | Strengths                                                                  | Tradeoffs                                                          | Abilities                                               |
| ----------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------- |
| **Warrior** | 160 starting health, heavy armor, close-range area attacks                 | Short reach; slower movement                                       | Sword strike, Crescent cleave, Iron guard, Earthshatter |
| **Archer**  | Fastest movement, longest range, increased critical chance                 | Light armor; vulnerable when surrounded                            | Aimed shot, Piercing arrow, Windstep, Rain of arrows    |
| **Mage**    | Strong spell damage, area attacks, freezing crowd control, large mana pool | Lowest health and armor; powerful spells consume considerable mana | Arcane bolt, Ember burst, Winterbloom, Astral storm     |

All three gain health, mana, attack, and defense as they level. Their unique skills use server-enforced ranges, mana costs, durations, and cooldowns.

## Character creation

- Name your adventurer.
- Choose Warrior, Archer, or Mage.
- Choose a classic or slender silhouette.
- Pick one of **four hairstyles**.
- Choose from **six skin tones, six hair colors, and six clothing accents**.
- Rotate the live preview through four directions and preview idle, walk, or attack animations.
- Randomize appearance or generate a name.

Appearance carries into the world and is visible to other players. The returning-character button resumes the character saved in the browser.

## The first adventure

1. **Speak to Warden Elowen** near Willowrest's fountain. Press `E` from the starting point, or click her to walk over and talk.
2. Accept **A little trouble in the meadow**. Follow the eastern road across the wooden bridge. Defeat four dewdrop slimes and gather three silverleaf plants.
3. Return to Elowen for gold, experience, and health tonics.
4. Enter **Whispering Woods** for the next chapter. Defeat wandering shrooms and duskwolves.
5. Visit **Moonwell Ruins** northeast across the river and confront the Elderwood Guardian. Other adventurers can help; contributing nearby players share rewards.

### Village life

- **Milo** sells health and mana potions and buys gathered materials.
- **Bram** sells class-appropriate upgraded weapons and mossweave cloaks.
- **Iris**, **Rowan**, and the fountain restore health and mana for free.
- Defeated creatures automatically award loot, gold, and experience to eligible contributors.
- The backpack lets you inspect and equip items or drink potions.
- The journal tracks objectives and completed chapters.
- The map shows locations and creatures; click a walkable destination to travel there.
- Health regenerates out of combat. Mana regenerates faster between battles.
- Defeat returns you to Willowrest after a small gold loss; equipment and quest progress are retained.

## Controls

| Input                      | Action                                        |
| -------------------------- | --------------------------------------------- |
| `W A S D` / arrow keys     | Move                                          |
| Click ground / right-click | Walk to a location using pathfinding          |
| Click a creature           | Select and begin basic attacks while in range |
| `Tab`                      | Cycle through nearby targets                  |
| `1` / `Space`              | Basic attack                                  |
| `2`, `3`, `4`              | Class abilities                               |
| `E`                        | Talk, gather, or rest                         |
| `Q`                        | Health tonic                                  |
| `R`                        | Mana flask                                    |
| `B` / `I`                  | Backpack and equipment                        |
| `J`                        | Quest journal                                 |
| `M`                        | World map                                     |
| `Enter`                    | Chat                                          |
| `H` / `?`                  | How to play                                   |
| `Escape`                   | Close a panel or open settings                |

Touchscreens have a directional pad, clickable skill buttons, and the same menus. Movement and actions pause while a modal is open. Settings include camera zoom, character labels, ambient visual effects, optional synthesized music, and volume.

## Original Aseprite art

Every raster game illustration, environment object, character, monster, equipment icon, visual effect, and animation was authored and exported **inside Aseprite using its Lua drawing API**. No downloaded game-art packs or external image-generation services are used.

The included art collection has:

- **93 editable `.aseprite` documents**
- **1,331 total source frames**
- **1,152 character-animation frames** across three classes and four hairstyles
- Four directions × three actions × eight frames for each character sheet
- Animated slimes, shrooms, wolves, the guardian, fountain water, waystones, and effects
- An original terrain atlas, buildings, forest scenery, illustrated world map, UI icons, and character-creation diorama

### Files

| Location                      | Contents                                                    |
| ----------------------------- | ----------------------------------------------------------- |
| `art/build.lua`               | Authored Aseprite artwork and export program                |
| `art/source/*.aseprite`       | Editable original sprites, frames, and named animation tags |
| `art/ART_DIRECTION.md`        | Palette, proportions, animation, and consistency guide      |
| `public/assets/*.png`         | Game-ready sprite sheets exported by Aseprite               |
| `public/assets/manifest.json` | Dimensions, frame counts, and sheet layout                  |
| `scripts/install-aseprite.sh` | Reproducible local Aseprite installation                    |
| `scripts/build-assets.sh`     | Asset build entry point                                     |

### Rebuild the art

The Linux installation script builds official **Aseprite v1.3.18.6** sources with scripting enabled and the headless batch backend. It downloads its compiler-support tools and required X11 development packages into the user's home directory; root access is not needed on Debian. The installed executable reports `1.3.18.6-dev` because it is a local source build.

```bash
npm run install:aseprite
npm run assets
```

Installed executable:

```text
~/.local/bin/aseprite
```

Use an existing Aseprite installation on another machine with:

```bash
ASEPRITE=/path/to/aseprite npm run assets
```

The batch build has no interactive editor window. All `.aseprite` files can be opened in the regular Aseprite desktop editor. Changes to `art/build.lua` are reproducible; edit that source when rebuilding so custom manual sprite edits are not overwritten unintentionally.

The UI uses locally served **DM Sans** and **Lora** fonts under the SIL Open Font License; their license texts are in `public/fonts/`. Ambient music and interaction tones are synthesized at runtime with Web Audio, so there are no external sound recordings.

## Architecture

```text
src/
  App.tsx                  Application flow and settings
  components/              Character creation, HUD, dialogs, and menus
  game/assets.ts           Aseprite sheet loading and palette customization
  game/renderer.ts         Pixel-world rendering, animation, and crisp labels
  game/network.ts          WebSocket connection, heartbeat, and reconnection
  game/audio.ts            Optional procedural ambient audio
server/
  index.mjs                HTTP, Vite/production serving, WebSockets, saving
  game.mjs                 Authoritative multiplayer simulation
shared/
  data.js                  Classes, abilities, items, monsters, and quests
  world.js                 Shared map, collision, and A* pathfinding
art/
  build.lua                Aseprite drawing and export program
  source/                  Editable .aseprite source documents
public/
  assets/                  Ready-to-use PNG sheets and asset manifest
  fonts/                   UI fonts and their license texts
scripts/                   Art tools and browser/production verification
tests/
  game.test.mjs            Simulation and persistence checks
  browser/adventure.spec.ts End-to-end gameplay and multiplayer checks
```

The server simulates the world at **20 Hz** and broadcasts snapshots at **10 Hz**. Clients interpolate positions and render independently. Clients send intentions; the server determines movement, health, damage, loot, purchases, quest rewards, and respawns.

Character records are atomically saved every five seconds to `.data/characters.json`, and on a normal shutdown. A cryptographically random reconnect token stays in the player's browser and is never included in world snapshots. The save directory is excluded from both source control and browser file serving. If the same character reconnects in another tab, its old connection is replaced cleanly.

## Git repository contents

Commit the source code, configuration, tests, documentation, `package.json`, and `package-lock.json`, together with the artwork generator, `art/source/*.aseprite`, `public/assets/`, and `public/fonts/`. The exported game assets are included so the experiment can be run without installing Aseprite first.

The root `.gitignore` excludes dependencies, build output, local character saves, environment overrides, logs, caches, editor files, and test artifacts. `art/.gitignore` excludes `world-layout.json`, which is regenerated by `npm run assets`. Environment templates such as `.env.example` remain eligible for version control.

## Verification

```bash
npm test                # simulation tests
npm run test:e2e         # Chromium browser gameplay tests
npm run build           # TypeScript checks + production bundle
npm run test:production # verify the built production server
npm run format:check
```

For a fresh testing machine, install Chromium once with `npx playwright install chromium`. Browser tests start a development server when one is not already running. They create their own test characters in the local realm.

`node scripts/inspect-browser.mjs` also captures desktop/mobile views and reports browser errors. Screenshots are written to `test-results/screenshots/`; `ARTIFACT_DIR` can select another location.
