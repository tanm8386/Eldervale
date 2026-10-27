import { useEffect, useRef, useState } from 'react';
import { CLASSES, ITEMS as itemData, QUESTS } from '../../shared/data.js';
import { NPCS, zoneAt } from '../../shared/world.js';
import { paintMap } from '../game/renderer';
import { Avatar, Icon, Key, Modal } from './Primitives';
import type { Appearance, ClassId, Item, Panel, Player, Send, WorldState } from '../types';

const ITEMS = itemData as Record<string, Item>;
export type Preferences = {
  zoom: number;
  labels: boolean;
  particles: boolean;
  sound: boolean;
  volume: number;
};

export function GamePanels({
  panel,
  state,
  send,
  onClose,
  onPanel,
  preferences,
  onPreferences,
  onCharacterSelect,
}: {
  panel: Panel;
  state: WorldState;
  send: Send;
  onClose: () => void;
  onPanel: (panel: Panel) => void;
  preferences: Preferences;
  onPreferences: (value: Partial<Preferences>) => void;
  onCharacterSelect: () => void;
}) {
  if (panel === 'inventory') return <Inventory player={state.self} send={send} onClose={onClose} />;
  if (panel === 'journal')
    return <Journal player={state.self} onClose={onClose} onMap={() => onPanel('map')} />;
  if (panel === 'map') return <WorldMap state={state} send={send} onClose={onClose} />;
  if (panel === 'settings')
    return (
      <Settings
        preferences={preferences}
        onChange={onPreferences}
        onClose={onClose}
        onHelp={() => onPanel('help')}
        onCharacterSelect={onCharacterSelect}
      />
    );
  if (panel === 'help') return <Help onClose={onClose} />;
  if (panel === 'players')
    return (
      <Modal
        title="Good company"
        eyebrow="ADVENTURERS IN THE ELDERWOOD"
        icon="people"
        onClose={onClose}
        className="players-modal"
      >
        <div className="modal-body">
          <p className="modal-intro">
            A shared world is better with a few familiar faces. Open this realm on another browser
            to adventure together.
          </p>
          <div className="online-list">
            {state.players.map((player) => (
              <div key={player.id}>
                <Avatar classId={player.classId} appearance={player.appearance} size={40} />
                <div>
                  <strong>
                    {player.name}
                    {player.id === state.self.id && <small> YOU</small>}
                  </strong>
                  <span>
                    Level {player.level} {CLASSES[player.classId].name}
                  </span>
                </div>
                <span className="player-zone">
                  <i className="status-dot" />
                  {zoneAt(player.x, player.y).name}
                </span>
              </div>
            ))}
          </div>
          <div className="panel-footnote">
            Combat, gathering, and chat are shared live with everyone in this realm.
          </div>
        </div>
      </Modal>
    );
  return null;
}

function Inventory({ player, send, onClose }: { player: Player; send: Send; onClose: () => void }) {
  const [selected, setSelected] = useState(player.equipment.weapon);
  const item = ITEMS[selected];
  const equipped = Object.values(player.equipment).includes(selected);
  const entries = player.inventory.filter((i) => i.count > 0);
  const quantity = entries.find((i) => i.id === selected)?.count || 0;
  return (
    <Modal
      title="Traveler’s satchel"
      eyebrow="A FEW THINGS FOR THE ROAD"
      icon="bag"
      onClose={onClose}
      className="inventory-modal"
    >
      <div className="inventory-layout">
        <aside className="equipment-panel">
          <div className="inventory-portrait">
            <div className="portrait-orbit" />
            <Avatar classId={player.classId} appearance={player.appearance} size={100} />
            <span>{player.name}</span>
            <small>
              LEVEL {player.level} {CLASSES[player.classId].name.toUpperCase()}
            </small>
          </div>
          <div className="equipment-slots">
            {(['weapon', 'armor', 'charm'] as const).map((slot) => (
              <button
                key={slot}
                className={selected === player.equipment[slot] ? 'selected' : ''}
                onClick={() => player.equipment[slot] && setSelected(player.equipment[slot]!)}
                title={
                  player.equipment[slot]
                    ? ITEMS[player.equipment[slot]!].name
                    : `Empty ${slot} slot`
                }
              >
                <Icon
                  name={
                    player.equipment[slot]
                      ? ITEMS[player.equipment[slot]!].icon
                      : slot === 'weapon'
                        ? 'sword'
                        : slot === 'armor'
                          ? 'armor'
                          : 'charm'
                  }
                  size={30}
                />
                <span>{slot}</span>
              </button>
            ))}
          </div>
          <div className="character-stats">
            <div>
              <Icon name="sword" size={19} />
              <span>Attack</span>
              <b>{player.damage}</b>
            </div>
            <div>
              <Icon name="shield" size={19} />
              <span>Defense</span>
              <b>{player.armor}</b>
            </div>
            <div>
              <Icon name="heart" size={19} />
              <span>Max health</span>
              <b>{player.maxHealth}</b>
            </div>
            <div>
              <Icon name="mana" size={19} />
              <span>Max mana</span>
              <b>{player.maxMana}</b>
            </div>
          </div>
        </aside>
        <div className="bag-panel">
          <div className="bag-heading">
            <span>
              BACKPACK <small>{entries.length} item types</small>
            </span>
            <div>
              <Icon name="coin" size={20} />
              <b>{player.gold}</b>
            </div>
          </div>
          <div className="inventory-grid">
            {Array.from({ length: Math.max(24, Math.ceil(entries.length / 6) * 6) }, (_, i) => {
              const entry = entries[i],
                data = entry && ITEMS[entry.id];
              return entry && data ? (
                <button
                  key={entry.id}
                  className={`inventory-slot rarity-${data.rarity} ${selected === entry.id ? 'selected' : ''}`}
                  onClick={() => setSelected(entry.id)}
                  aria-label={`${data.name}, quantity ${entry.count}`}
                  title={data.name}
                >
                  <Icon name={data.icon} size={35} />
                  {entry.count > 1 && <span>{entry.count}</span>}
                  {Object.values(player.equipment).includes(entry.id) && <i>◆</i>}
                </button>
              ) : (
                <div key={`empty-${i}`} className="inventory-slot empty">
                  <span>·</span>
                </div>
              );
            })}
          </div>
          {item && (
            <div className={`item-detail rarity-${item.rarity}`}>
              <div className="item-detail-top">
                <div className="item-art">
                  <Icon name={item.icon} size={42} />
                </div>
                <div>
                  <span className="eyebrow">
                    {item.rarity.toUpperCase()} {item.type.toUpperCase()}
                  </span>
                  <h3>{item.name}</h3>
                </div>
                {equipped && <span className="equipped-label">EQUIPPED</span>}
              </div>
              <p>{item.description}</p>
              <div className="item-detail-footer">
                <span>
                  {item.sell
                    ? `Worth ${item.sell} gold each`
                    : item.type === 'consumable'
                      ? `${quantity} in your satchel`
                      : item.class
                        ? `${CLASSES[item.class].name} equipment`
                        : 'All callings'}
                </span>
                {['weapon', 'armor', 'charm'].includes(item.type) && (
                  <button
                    className="small-primary"
                    disabled={equipped}
                    onClick={() => send({ type: 'equip', id: selected })}
                  >
                    {equipped ? 'Equipped' : 'Equip item'}
                  </button>
                )}
                {item.type === 'consumable' && (
                  <button
                    className="small-primary"
                    disabled={!quantity}
                    onClick={() => send({ type: 'use', id: selected })}
                  >
                    Drink potion
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="panel-footnote">
            <Icon name="leaf" size={17} />
            Materials can be sold to Milo or Bram in Willowrest.
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Journal({
  player,
  onClose,
  onMap,
}: {
  player: Player;
  onClose: () => void;
  onMap: () => void;
}) {
  const [selected, setSelected] = useState(Math.min(player.questIndex, QUESTS.length - 1));
  const quest = QUESTS[selected],
    complete = player.completedQuests.includes(quest.id),
    current = selected === player.questIndex;
  const ready =
    current &&
    player.questAccepted &&
    quest.objectives.every((o) => (player.questProgress[o.type] || 0) >= o.count);
  return (
    <Modal
      title="The story so far"
      eyebrow="YOUR ADVENTURE JOURNAL"
      icon="book"
      onClose={onClose}
      className="journal-modal"
    >
      <div className="journal-layout">
        <aside className="journal-chapters">
          <div className="eyebrow">THE ELDERWOOD</div>
          {QUESTS.map((q, i) => (
            <button
              key={q.id}
              className={selected === i ? 'selected' : ''}
              onClick={() => setSelected(i)}
              disabled={i > player.questIndex}
            >
              <span className="chapter-number">
                {player.completedQuests.includes(q.id) ? '✓' : `0${i + 1}`}
              </span>
              <div>
                <small>{q.chapter}</small>
                <span>{q.name}</span>
              </div>
            </button>
          ))}
          <div className="journal-progress">
            <span>
              {player.completedQuests.length} / {QUESTS.length} chapters completed
            </span>
            <div>
              <i style={{ width: `${(player.completedQuests.length / QUESTS.length) * 100}%` }} />
            </div>
          </div>
        </aside>
        <article className="quest-article">
          <div className="quest-article-eyebrow">
            <Icon name="leaf" size={21} />
            {quest.chapter}
            <span className={complete || ready ? 'quest-ready' : ''}>
              {complete
                ? 'COMPLETED'
                : ready
                  ? 'READY TO TURN IN'
                  : player.questAccepted && current
                    ? 'IN PROGRESS'
                    : 'AVAILABLE'}
            </span>
          </div>
          <h3>{quest.name}</h3>
          <p>{quest.description}</p>
          <h4>THE LITTLE THINGS THAT MATTER</h4>
          <div className="journal-objectives">
            {quest.objectives.map((o) => {
              const progress = complete ? o.count : current ? player.questProgress[o.type] || 0 : 0;
              return (
                <div key={o.type} className={progress >= o.count ? 'complete' : ''}>
                  <span className="objective-check">{progress >= o.count ? '✓' : ''}</span>
                  <span>{o.label}</span>
                  <b>
                    {progress} / {o.count}
                  </b>
                </div>
              );
            })}
          </div>
          <h4>A TOKEN OF THANKS</h4>
          <div className="quest-rewards">
            <span>
              <Icon name="coin" size={24} />
              <b>{quest.gold}</b> gold
            </span>
            <span>
              <Icon name="gem" size={24} />
              <b>{quest.xp}</b> XP
            </span>
            {quest.items.map((item) => (
              <span key={item.id}>
                <Icon name={ITEMS[item.id].icon} size={25} />
                {item.count > 1 ? `${item.count}× ` : ''}
                {ITEMS[item.id].name}
              </span>
            ))}
          </div>
          <div className="quest-location">
            <Icon name="compass" size={30} />
            <div>
              <strong>
                {complete
                  ? 'Thank you for looking after the elderwood.'
                  : ready || !player.questAccepted
                    ? 'Warden Elowen is waiting in Willowrest.'
                    : selected === 0
                      ? 'Head east across the bridge to Sunlit Meadow.'
                      : selected === 1
                        ? 'Explore the woods west of Willowrest.'
                        : 'The Moonwell Ruins lie northeast, across the river.'}
              </strong>
              <span>
                {complete
                  ? 'There are always more paths to wander.'
                  : 'Your progress is tracked automatically.'}
              </span>
            </div>
          </div>
          <button className="secondary-button" onClick={onMap}>
            <Icon name="map" size={20} />
            Find your way on the map
            <Icon name="arrow-right" size={20} />
          </button>
        </article>
      </div>
    </Modal>
  );
}

function WorldMap({
  state,
  send,
  onClose,
}: {
  state: WorldState;
  send: Send;
  onClose: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) paintMap(ref.current, state, true);
  }, [state]);
  return (
    <Modal
      title="A world worth getting lost in"
      eyebrow="THE ELDERWOOD · WORLD MAP"
      icon="map"
      onClose={onClose}
      className="world-map-modal"
    >
      <div className="large-map">
        <canvas
          ref={ref}
          width={960}
          height={768}
          aria-label="Map of the Elderwood. Click a destination to walk there."
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            send({
              type: 'move',
              x: ((event.clientX - rect.left) / rect.width) * 1280,
              y: ((event.clientY - rect.top) / rect.height) * 1024,
            });
            onClose();
          }}
        />
        <div className="large-map-label woods">
          <span>THE WHISPERING</span>
          <strong>Woods</strong>
          <small>LEVEL 2–3</small>
        </div>
        <div className="large-map-label village">
          <Icon name="leaf" size={24} />
          <strong>Willowrest</strong>
          <small>A SAFE HAVEN</small>
        </div>
        <div className="large-map-label meadow">
          <span>THE SUNLIT</span>
          <strong>Meadow</strong>
          <small>LEVEL 1–3</small>
        </div>
        <div className="large-map-label ruins">
          <Icon name="gem" size={26} />
          <strong>Moonwell Ruins</strong>
          <small>LEVEL 4–5 · GUARDIAN</small>
        </div>
        <div className="map-compass">
          <span>N</span>
          <Icon name="compass" size={46} />
          <span>S</span>
        </div>
      </div>
      <div className="map-legend">
        <span>
          <i className="map-key you" />
          You are here
        </span>
        <span>
          <i className="map-key npc" />
          Villager
        </span>
        <span>
          <i className="map-key enemy" />
          Creature
        </span>
        <span>{state.self.discovered.length} / 4 areas discovered</span>
        <small>Click a clear spot to walk there.</small>
      </div>
    </Modal>
  );
}

function Settings({
  preferences,
  onChange,
  onClose,
  onHelp,
  onCharacterSelect,
}: {
  preferences: Preferences;
  onChange: (value: Partial<Preferences>) => void;
  onClose: () => void;
  onHelp: () => void;
  onCharacterSelect: () => void;
}) {
  return (
    <Modal
      title="Make yourself at home"
      eyebrow="A FEW PERSONAL TOUCHES"
      icon="settings"
      onClose={onClose}
      className="settings-modal"
    >
      <div className="modal-body">
        <div className="settings-section">
          <h3>Sights & sounds</h3>
          <div className="setting-row">
            <div>
              <strong>Woodland melodies</strong>
              <span>A gentle, original ambient soundscape.</span>
            </div>
            <button
              className={`toggle ${preferences.sound ? 'on' : ''}`}
              role="switch"
              aria-checked={preferences.sound}
              aria-label="Woodland melodies"
              onClick={() => onChange({ sound: !preferences.sound })}
            >
              <i />
            </button>
          </div>
          <div className="setting-row">
            <div>
              <strong>Volume</strong>
              <span>Keep it as quiet as you like.</span>
            </div>
            <label className="volume-control">
              <input
                type="range"
                aria-label="Audio volume"
                min="0"
                max="100"
                value={Math.round(preferences.volume * 100)}
                onChange={(event) => onChange({ volume: Number(event.target.value) / 100 })}
              />
              <span>{Math.round(preferences.volume * 100)}%</span>
            </label>
          </div>
          <div className="setting-row">
            <div>
              <strong>A closer look</strong>
              <span>Set your view of the world.</span>
            </div>
            <div className="segmented-control zoom-options">
              {[2, 2.5, 3].map((zoom) => (
                <button
                  key={zoom}
                  className={zoom === preferences.zoom ? 'selected' : ''}
                  onClick={() => onChange({ zoom })}
                  aria-pressed={zoom === preferences.zoom}
                >
                  {zoom === 2 ? 'Wide' : zoom === 2.5 ? 'Classic' : 'Close'}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-row">
            <div>
              <strong>Character names</strong>
              <span>Show names above villagers and adventurers.</span>
            </div>
            <button
              className={`toggle ${preferences.labels ? 'on' : ''}`}
              role="switch"
              aria-checked={preferences.labels}
              aria-label="Show character names"
              onClick={() => onChange({ labels: !preferences.labels })}
            >
              <i />
            </button>
          </div>
          <div className="setting-row">
            <div>
              <strong>A little atmosphere</strong>
              <span>Drifting leaves and warm lamplight.</span>
            </div>
            <button
              className={`toggle ${preferences.particles ? 'on' : ''}`}
              role="switch"
              aria-checked={preferences.particles}
              aria-label="Ambient visual effects"
              onClick={() => onChange({ particles: !preferences.particles })}
            >
              <i />
            </button>
          </div>
        </div>
        <div className="settings-actions">
          <button className="secondary-button" onClick={onHelp}>
            <Icon name="book" size={20} />
            How to play
          </button>
          <button className="secondary-button" onClick={onCharacterSelect}>
            <Icon name="people" size={20} />
            Character selection
          </button>
        </div>
        <p className="panel-footnote">Your character and preferences are saved automatically.</p>
      </div>
    </Modal>
  );
}

function Help({ onClose }: { onClose: () => void }) {
  const controls = [
    {
      keys: ['W', 'A', 'S', 'D'],
      title: 'Find your own way',
      desc: 'Move with WASD or arrow keys. Click the ground to follow a path.',
    },
    {
      keys: ['1', 'Space'],
      title: 'A little courage',
      desc: 'Click a creature to target and attack it. Your basic attack repeats while it is in range.',
    },
    {
      keys: ['2', '3', '4'],
      title: 'Your particular magic',
      desc: 'Use class abilities. Keep an eye on mana and cooldowns.',
    },
    {
      keys: ['Tab'],
      title: 'Pick your battle',
      desc: 'Cycle through nearby creatures to select your next target.',
    },
    {
      keys: ['E'],
      title: 'Stay curious',
      desc: 'Talk to villagers, gather glowing silverleaf, or rest by the fountain.',
    },
    {
      keys: ['Q', 'R'],
      title: 'Take care of yourself',
      desc: 'Drink a health tonic with Q, or restore mana with R.',
    },
    {
      keys: ['B', 'J', 'M'],
      title: 'All the little details',
      desc: 'Open your backpack, quest journal, and world map.',
    },
    {
      keys: ['Enter'],
      title: 'Say hello',
      desc: 'Chat with the realm, or switch to Nearby to speak to adventurers around you.',
    },
  ];
  return (
    <Modal
      title="Welcome to the elderwood"
      eyebrow="NO NEED TO RUSH"
      icon="compass"
      onClose={onClose}
      className="help-modal"
    >
      <div className="modal-body">
        <p className="modal-intro">
          Start by speaking to <b>Warden Elowen</b> near Willowrest’s fountain. Explore, grow
          stronger, and find a little company along the way.
        </p>
        <div className="help-controls">
          {controls.map((control) => (
            <div key={control.title}>
              <div className="control-keys">
                {control.keys.map((key) => (
                  <Key key={key}>{key}</Key>
                ))}
              </div>
              <div>
                <strong>{control.title}</strong>
                <p>{control.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="help-tip">
          <Icon name="leaf" size={27} />
          <p>
            Defeated creatures share rewards with nearby adventurers who helped fight. Health
            recovers out of combat; the village healer will always help for free.
          </p>
        </div>
        <button className="primary-button" onClick={onClose}>
          I’ll find my way <Icon name="arrow-right" size={21} />
        </button>
      </div>
    </Modal>
  );
}

export function Dialogue({
  npcId,
  state,
  send,
  onClose,
}: {
  npcId: string;
  state: WorldState;
  send: Send;
  onClose: () => void;
}) {
  const npc = NPCS.find((n) => n.id === npcId);
  if (!npc) return null;
  const player = state.self,
    quest = QUESTS[player.questIndex];
  const ready =
    quest &&
    player.questAccepted &&
    quest.objectives.every((o) => (player.questProgress[o.type] || 0) >= o.count);
  const merchant = npc.type === 'shop' || npc.type === 'forge';
  const shopItems =
    npc.type === 'shop'
      ? ['health-potion', 'mana-potion']
      : [
          player.classId === 'warrior'
            ? 'oakheart-blade'
            : player.classId === 'archer'
              ? 'ranger-bow'
              : 'starlit-staff',
          'ranger-cloak',
        ];
  const text =
    npc.type === 'quest'
      ? !quest
        ? 'The guardian’s light is shining again. You’ve done more for this little village than you know. There will always be a warm hearth and a friend waiting for you here. Thank you, traveler.'
        : ready
          ? 'There you are! The gatherers have already noticed the difference. A little courage, a little kindness… that’s how we look after each other here. Please, take this with our thanks.'
          : player.questAccepted
            ? 'Good to see you again. Take your time out there, and mind the duskwolves. Your journal will remind you what we need. I’ll be right here when you’re done.'
            : quest.dialogue
      : npc.type === 'shop'
        ? 'Oh, hello there! Heading out beyond the bridge? Best take something for the road. My wildberry tonics are the finest in Willowrest. Well… the only ones. But they’re good!'
        : npc.type === 'forge'
          ? 'A good tool makes all the difference. These pieces are made to last, with a little elderwood worked into every one. Bring me your spare materials, too; nothing goes to waste here.'
          : npc.type === 'healer'
            ? 'You look like you’ve been wandering. Come, rest a moment. There’s no charge for a little kindness. The elderwood gives us more than enough to share.'
            : 'A traveler! Welcome to the Wandering Acorn. Set down your pack, warm your hands, and stay a while. The world will still be there when you’re ready.';
  return (
    <Modal
      title={npc.name}
      eyebrow={npc.role.toUpperCase()}
      icon={npc.type === 'quest' ? 'book' : merchant ? 'coin' : 'leaf'}
      onClose={onClose}
      className={`dialogue-modal ${merchant ? 'merchant-modal' : ''}`}
    >
      <div className="dialogue-body">
        <div className="npc-portrait">
          <Avatar
            classId={npc.classId as ClassId}
            appearance={npc.appearance as Appearance}
            size={108}
          />
          <span>WILLOWREST</span>
        </div>
        <div className="npc-conversation">
          <p className="npc-dialogue">“{text}”</p>
          {npc.type === 'quest' && quest && (
            <div className="dialogue-quest">
              <div className="eyebrow">{ready ? 'A WELL-EARNED THANK YOU' : quest.chapter}</div>
              <h3>{quest.name}</h3>
              <div className="dialogue-rewards">
                <span>
                  <Icon name="coin" size={19} />
                  {quest.gold} gold
                </span>
                <span>
                  <Icon name="gem" size={19} />
                  {quest.xp} XP
                </span>
                {quest.items.map((i) => (
                  <span key={i.id}>
                    <Icon name={ITEMS[i.id].icon} size={19} />
                    {i.count}× {ITEMS[i.id].name}
                  </span>
                ))}
              </div>
            </div>
          )}
          {merchant && (
            <div className="shop-stock">
              {shopItems.map((id) => {
                const item = ITEMS[id],
                  owned = item.type !== 'consumable' && player.inventory.some((i) => i.id === id);
                return (
                  <div key={id}>
                    <div className={`shop-icon rarity-${item.rarity}`}>
                      <Icon name={item.icon} size={34} />
                    </div>
                    <div>
                      <strong>{item.name}</strong>
                      <span>{item.description}</span>
                    </div>
                    <button
                      className="purchase-button"
                      onClick={() => send({ type: 'buy', id })}
                      disabled={owned || player.gold < (item.price || 0)}
                      aria-label={`Buy ${item.name} for ${item.price} gold`}
                    >
                      {owned ? (
                        'Owned'
                      ) : (
                        <>
                          <Icon name="coin" size={17} />
                          {item.price}
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <div className="dialogue-actions">
            {npc.type === 'quest' && quest && (
              <button
                className="primary-button"
                onClick={() => {
                  if (!player.questAccepted || ready) send({ type: 'quest' });
                  onClose();
                }}
              >
                {ready
                  ? 'Claim your reward'
                  : player.questAccepted
                    ? 'I’ll be back soon'
                    : 'I’d be glad to help'}
                <Icon name="arrow-right" size={20} />
              </button>
            )}
            {['healer', 'inn'].includes(npc.type) && (
              <button
                className="primary-button"
                onClick={() => {
                  send({ type: 'rest' });
                  onClose();
                }}
              >
                <Icon name="leaf" size={20} />
                Rest and recover
              </button>
            )}
            {merchant && (
              <>
                <button className="secondary-button" onClick={() => send({ type: 'sell' })}>
                  Sell gathered materials
                </button>
                <span className="shop-wallet">
                  <Icon name="coin" size={22} />
                  {player.gold} gold
                </span>
              </>
            )}
            <button className="text-button" onClick={onClose}>
              {merchant ? 'Safe travels' : 'Until next time'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function Defeated({ player, send }: { player: Player; send: Send }) {
  return (
    <div className="defeated-shade">
      <div className="defeated-panel">
        <Icon name="leaf" size={44} />
        <div className="eyebrow">A MOMENT TO CATCH YOUR BREATH</div>
        <h2>Every path has a way back.</h2>
        <p>
          The woods can be a little wild, {player.name}.<br />
          Willowrest’s warm lights are waiting for you.
        </p>
        <button className="primary-button" onClick={() => send({ type: 'respawn' })}>
          Return to Willowrest
          <Icon name="arrow-right" size={23} />
        </button>
        <span>Your equipment, experience, and story are safe.</span>
      </div>
    </div>
  );
}
