import { useEffect, useRef, useState } from 'react';
import { CLASSES, MONSTERS, QUESTS } from '../../shared/data.js';
import { NPCS, zoneAt } from '../../shared/world.js';
import { paintMap } from '../game/renderer';
import { Avatar, Brand, Icon, IconButton, Key } from './Primitives';
import type { ChatMessage, Notice, Panel, Send, WorldState } from '../types';

export function Hud({
  state,
  send,
  onPanel,
  panel,
  chats,
  notices,
  status,
  ping,
  sound,
  onSound,
}: {
  state: WorldState;
  send: Send;
  onPanel: (panel: Panel) => void;
  panel: Panel;
  chats: ChatMessage[];
  notices: Notice[];
  status: string;
  ping: number;
  sound: boolean;
  onSound: () => void;
}) {
  const player = state.self,
    classData = CLASSES[player.classId],
    zone = zoneAt(player.x, player.y);
  const target = state.mobs.find((m) => m.id === player.target && m.health > 0);
  const map = useRef<HTMLCanvasElement>(null);
  const [questCollapsed, setQuestCollapsed] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (map.current) paintMap(map.current, state);
  }, [state]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 80);
    return () => clearInterval(timer);
  }, []);
  const serverNow = state.time + Math.min(180, now - Date.now());
  const quest = QUESTS[player.questIndex];
  const ready =
    quest &&
    player.questAccepted &&
    quest.objectives.every((o) => (player.questProgress[o.type] || 0) >= o.count);
  const nearbyHerb = state.herbs.find(
    (h) => h.available && Math.hypot(player.x - h.x, player.y - h.y) < 35,
  );
  const nearbyNPC = NPCS.filter((n) => Math.hypot(player.x - n.x, player.y - n.y) < 76).sort(
    (a, b) =>
      Math.hypot(player.x - a.x, player.y - a.y) - Math.hypot(player.x - b.x, player.y - b.y),
  )[0];
  const interaction = nearbyHerb
    ? 'Gather silverleaf'
    : nearbyNPC
      ? `Talk to ${nearbyNPC.name}`
      : Math.hypot(player.x - 610, player.y - 535) < 70
        ? 'Rest at the Moonwell'
        : null;

  return (
    <div className="hud">
      <header className="game-topbar">
        <Brand compact />
        <div className="topbar-realm">
          <span className={`status-dot ${status === 'online' ? '' : 'offline'}`} />
          ELDERWOOD <span>REALM 01</span>
        </div>
        <div className="game-top-actions">
          <button
            className="online-button"
            onClick={() => onPanel('players')}
            title="Adventurers online"
          >
            <Icon name="people" size={17} />
            <span>{state.online} online</span>
          </button>
          <span className="thin-divider" />
          <IconButton
            icon={sound ? 'sound' : 'mute'}
            label={sound ? 'Mute sound' : 'Enable sound'}
            onClick={onSound}
          />
          <button className="help-button" aria-label="How to play" onClick={() => onPanel('help')}>
            ?
          </button>
        </div>
      </header>
      <section className="player-hud hud-panel" aria-label="Character status">
        <div className="player-portrait">
          <Avatar classId={player.classId} appearance={player.appearance} size={60} />
          <span className="portrait-level">{player.level}</span>
        </div>
        <div className="player-vitals">
          <div className="player-name-line">
            <strong>{player.name}</strong>
            <span>{classData.name}</span>
          </div>
          <div className="vital-bar health-bar" title="Health">
            <div style={{ width: `${(player.health / player.maxHealth) * 100}%` }} />
            <Icon name="heart" size={13} />
            <span>
              {player.health} <i>/ {player.maxHealth}</i>
            </span>
          </div>
          <div className="vital-bar mana-bar" title="Mana">
            <div style={{ width: `${(player.mana / player.maxMana) * 100}%` }} />
            <span className="mana-diamond">◆</span>
            <span>
              {player.mana} <i>/ {player.maxMana}</i>
            </span>
          </div>
          <div className="player-subline">
            <span>
              LEVEL {player.level} {classData.role.split(' · ')[0]}
            </span>
            <span>
              {player.xp} / {player.nextLevelXp} XP
            </span>
          </div>
        </div>
      </section>
      {target && (
        <section className="target-hud hud-panel">
          <div>
            <span className="eyebrow">
              LEVEL {MONSTERS[target.type].level}{' '}
              {target.type === 'guardian' ? '· WORLD GUARDIAN' : ''}
            </span>
            <strong>{MONSTERS[target.type].name}</strong>
          </div>
          <button onClick={() => send({ type: 'target', id: null })} aria-label="Clear target">
            ×
          </button>
          <div className="target-health">
            <span style={{ width: `${(target.health / target.maxHealth) * 100}%` }} />
          </div>
          <small>
            {target.health} / {target.maxHealth}
          </small>
        </section>
      )}
      <section className="zone-heading" aria-label={`Current area: ${zone.name}`}>
        <span className="zone-ornament">— ◇ —</span>
        <h1>{zone.name}</h1>
        <span>
          <i className={zone.safe ? 'safe-dot' : 'wild-dot'} />
          {zone.safe ? 'SANCTUARY' : `LEVEL ${zone.level}`} <b>·</b> {zone.subtitle}
        </span>
      </section>
      <div className="right-hud">
        <section className="minimap-frame hud-panel">
          <button className="minimap-heading" onClick={() => onPanel('map')}>
            <Icon name="compass" size={19} />
            <span>The Elderwood</span>
            <span className="map-expand">⌗</span>
          </button>
          <button
            className="minimap-art"
            onClick={() => onPanel('map')}
            aria-label="Open world map"
          >
            <canvas ref={map} width={240} height={160} />
            <span className="map-north">N</span>
            <span
              className="map-player-ring"
              style={{ left: `${(player.x / 1280) * 100}%`, top: `${(player.y / 1024) * 100}%` }}
            />
          </button>
          <div className="minimap-footer">
            <span>
              <span className={zone.safe ? 'safe-dot' : 'wild-dot'} />
              {zone.safe ? 'Safe zone' : 'Wilderness'}
            </span>
            <span>
              {Math.floor(player.x / 16)}, {Math.floor(player.y / 16)}
            </span>
          </div>
        </section>
        <section className={`quest-tracker ${questCollapsed ? 'collapsed' : ''}`}>
          <button className="quest-tracker-heading" onClick={() => setQuestCollapsed((c) => !c)}>
            <Icon name="book" size={20} />
            <span>YOUR JOURNEY</span>
            <span>{questCollapsed ? '+' : '−'}</span>
          </button>
          {!questCollapsed && (
            <div className="quest-tracker-content">
              <div className="quest-category">
                <span className="tiny-diamond" />
                {quest ? quest.chapter : 'THE ELDERWOOD REMEMBERS'}
              </div>
              <button className="quest-title" onClick={() => onPanel('journal')}>
                {quest
                  ? player.questAccepted
                    ? quest.name
                    : player.questIndex === 0
                      ? 'A warm welcome'
                      : 'The next chapter'
                  : 'A friend of the elderwood'}
              </button>
              {quest ? (
                !player.questAccepted || ready ? (
                  <div className="tracked-objective">
                    <span className="objective-diamond">◇</span>
                    <div>
                      {ready ? 'Return to Warden Elowen' : 'Speak with Warden Elowen'}
                      <small>Willowrest Village</small>
                    </div>
                    {ready && <span className="objective-done">✓</span>}
                  </div>
                ) : (
                  quest.objectives.map((o) => (
                    <div
                      className={`tracked-objective ${(player.questProgress[o.type] || 0) >= o.count ? 'complete' : ''}`}
                      key={o.type}
                    >
                      <span className="objective-diamond">
                        {(player.questProgress[o.type] || 0) >= o.count ? '✓' : '◇'}
                      </span>
                      <div>{o.label}</div>
                      <span>
                        {player.questProgress[o.type] || 0}
                        <i>/{o.count}</i>
                      </span>
                    </div>
                  ))
                )
              ) : (
                <p className="all-done">The village is safe. The paths are yours to wander.</p>
              )}
              <button className="journal-link" onClick={() => onPanel('journal')}>
                Open journal <Key>J</Key>
              </button>
            </div>
          )}
        </section>
      </div>
      <div className="notices" aria-live="polite">
        {notices.map((notice) => (
          <div key={notice.id} className={`notice notice-${notice.tone}`}>
            <Icon
              name={
                notice.tone === 'quest'
                  ? 'book'
                  : notice.tone === 'level'
                    ? 'gem'
                    : notice.tone === 'discovery'
                      ? 'compass'
                      : notice.tone === 'success'
                        ? 'leaf'
                        : 'compass'
              }
              size={21}
            />
            <span>{notice.text}</span>
          </div>
        ))}
      </div>
      {status !== 'online' && (
        <div className="connection-banner">
          <span className="status-dot offline" />
          {status === 'reconnecting'
            ? 'Reconnecting to the realm… Your character is safe.'
            : 'Connecting to the elderwood…'}
        </div>
      )}
      <Chat chats={chats} send={send} />
      <div className="bottom-center">
        {interaction && (
          <button className="interaction-prompt" onClick={() => send({ type: 'interact' })}>
            <Key>E</Key>
            {interaction}
            <span>↗</span>
          </button>
        )}
        <div className="hotbar-caption">
          <span>YOUR ABILITIES</span>
          <span>
            Click an enemy to attack <b>·</b> <Key>Tab</Key> to target
          </span>
        </div>
        <div className="hotbar hud-panel">
          {classData.skills.map((skill, index) => {
            const cooldown = Math.max(0, (player.cooldowns[index] - serverNow) / 1000),
              emptyMana = player.mana < skill.cost;
            return (
              <button
                key={skill.name}
                className={`skill-slot ${cooldown > 0 ? 'cooling' : ''} ${emptyMana ? 'no-mana' : ''}`}
                onClick={() => send({ type: 'skill', index })}
                aria-label={`${skill.name}, key ${skill.key}`}
              >
                <Key>{skill.key}</Key>
                <Icon name={skill.icon} size={34} />
                <span className="skill-cost">{skill.cost || 'ATK'}</span>
                {cooldown > 0 && (
                  <>
                    <span
                      className="cooldown-shade"
                      style={{ height: `${(cooldown / skill.cooldown) * 100}%` }}
                    />
                    <strong className="cooldown-number">
                      {cooldown < 1 ? cooldown.toFixed(1) : Math.ceil(cooldown)}
                    </strong>
                  </>
                )}
                <div className="game-tooltip">
                  <strong>{skill.name}</strong>
                  <span>{skill.description}</span>
                  <small>
                    {skill.cost} mana <b>·</b> {skill.cooldown}s cooldown
                  </small>
                </div>
              </button>
            );
          })}
          <div className="hotbar-separator" />
          {[
            {
              id: 'health-potion',
              icon: 'potion',
              key: 'Q',
              name: 'Wildberry tonic',
              desc: 'Restore 70 health.',
            },
            {
              id: 'mana-potion',
              icon: 'mana',
              key: 'R',
              name: 'Moonwater flask',
              desc: 'Restore 65 mana.',
            },
          ].map((potion) => (
            <button
              key={potion.id}
              className="skill-slot potion-slot"
              onClick={() => send({ type: 'use', id: potion.id })}
              aria-label={`Use ${potion.name}`}
            >
              <Key>{potion.key}</Key>
              <Icon name={potion.icon} size={32} />
              <span className="item-count">
                {player.inventory.find((i) => i.id === potion.id)?.count || 0}
              </span>
              {player.potionUntil > serverNow && (
                <span className="cooldown-number">
                  {Math.ceil((player.potionUntil - serverNow) / 1000)}
                </span>
              )}
              <div className="game-tooltip">
                <strong>{potion.name}</strong>
                <span>{potion.desc}</span>
                <small>5s shared potion cooldown</small>
              </div>
            </button>
          ))}
          <div className="hotbar-separator" />
          <button
            className="skill-slot interact-slot"
            onClick={() => send({ type: 'interact' })}
            aria-label="Interact with nearby villager or plant"
          >
            <Key>E</Key>
            <Icon name="leaf" size={32} />
            <span className="skill-cost">TALK</span>
            <div className="game-tooltip">
              <strong>A little curiosity</strong>
              <span>Talk to villagers, gather silverleaf, or rest by the fountain.</span>
              <small>Move closer to interact.</small>
            </div>
          </button>
        </div>
        <div className="experience-track">
          <div style={{ width: `${(player.xp / player.nextLevelXp) * 100}%` }} />
          <span>LV. {player.level}</span>
          <small>
            {player.xp} / {player.nextLevelXp} XP
          </small>
        </div>
        <div className="movement-hint">
          <span>
            <Key>W</Key>
            <Key>A</Key>
            <Key>S</Key>
            <Key>D</Key> move
          </span>
          <i>·</i>
          <span>Click to walk</span>
          <i>·</i>
          <span>
            <Key>Space</Key> attack
          </span>
        </div>
      </div>
      <div className="bottom-right">
        <div className="gold-display">
          <Icon name="coin" size={24} />
          <strong>{player.gold.toLocaleString()}</strong>
          <span>GOLD</span>
        </div>
        <nav className="game-dock hud-panel" aria-label="Game menus">
          <IconButton
            icon="bag"
            label="Backpack"
            shortcut="B"
            active={panel === 'inventory'}
            onClick={() => onPanel('inventory')}
          />
          <IconButton
            icon="book"
            label="Quest journal"
            shortcut="J"
            active={panel === 'journal'}
            onClick={() => onPanel('journal')}
          />
          <IconButton
            icon="map"
            label="World map"
            shortcut="M"
            active={panel === 'map'}
            onClick={() => onPanel('map')}
          />
          <IconButton
            icon="settings"
            label="Settings"
            shortcut="Esc"
            active={panel === 'settings'}
            onClick={() => onPanel('settings')}
          />
        </nav>
        <div className="realm-connection">
          <span className="status-dot" />
          {status === 'online' ? `${ping || '<1'} ms` : 'Connecting'}
          <span>●</span>PROGRESS AUTOSAVED
        </div>
      </div>
    </div>
  );
}

function Chat({ chats, send }: { chats: ChatMessage[]; send: Send }) {
  const [channel, setChannel] = useState<'world' | 'local'>('world');
  const [value, setValue] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [chats, channel]);
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!value.trim()) {
      document.getElementById('chat-input')?.blur();
      return;
    }
    send({ type: 'chat', channel, text: value });
    setValue('');
  };
  return (
    <section className={`chat-panel ${collapsed ? 'collapsed' : ''}`}>
      <div className="chat-tabs">
        <button
          className={channel === 'world' ? 'active' : ''}
          onClick={() => {
            setChannel('world');
            setCollapsed(false);
          }}
        >
          World
        </button>
        <button
          className={channel === 'local' ? 'active' : ''}
          onClick={() => {
            setChannel('local');
            setCollapsed(false);
          }}
        >
          Nearby
        </button>
        <span>CHAT</span>
        <button
          className="chat-collapse"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand chat' : 'Collapse chat'}
        >
          {collapsed ? '+' : '−'}
        </button>
      </div>
      {!collapsed && (
        <>
          <div className="chat-log" ref={log} role="log" aria-label="Realm chat">
            <p className="system-chat">
              <span>Welcome to the elderwood.</span> A little kindness goes a long way.
            </p>
            {chats
              .filter((m) => m.channel === channel || m.system)
              .slice(-40)
              .map((message, i) => (
                <p key={`${message.at}-${i}`} className={message.system ? 'system-chat' : ''}>
                  <span className="chat-time">
                    {new Date(message.at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <strong>{message.system ? '✧' : `${message.name}:`}</strong> {message.text}
                </p>
              ))}
          </div>
          <form className="chat-input-row" onSubmit={submit}>
            <span>›</span>
            <input
              id="chat-input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Press Enter to say hello…"
              autoComplete="off"
              maxLength={180}
              aria-label="Chat message"
            />
            <button type="submit" aria-label="Send message">
              <Icon name="arrow-right" size={18} />
            </button>
          </form>
        </>
      )}
    </section>
  );
}
