import { useCallback, useEffect, useRef, useState } from 'react';
import { art } from './game/assets';
import { RealmConnection } from './game/network';
import { audio } from './game/audio';
import { WorldRenderer } from './game/renderer';
import { CharacterCreation } from './components/CharacterCreation';
import { GameCanvas } from './components/GameCanvas';
import { Hud } from './components/Hud';
import { Defeated, Dialogue, GamePanels } from './components/Panels';
import type { Preferences } from './components/Panels';
import { Brand, Icon } from './components/Primitives';
import type { Character, ChatMessage, Notice, Panel, WorldState } from './types';

const defaults: Preferences = {
  zoom: 2,
  labels: true,
  particles: true,
  sound: false,
  volume: 0.25,
};
function savedPreferences(): Preferences {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem('eldervale-preferences') || '{}') };
  } catch {
    return defaults;
  }
}

export default function App() {
  const [progress, setProgress] = useState(0);
  const [artReady, setArtReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [state, setState] = useState<WorldState | null>(null);
  const [creation, setCreation] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [creationError, setCreationError] = useState('');
  const [status, setStatus] = useState('offline');
  const [online, setOnline] = useState(0);
  const [panel, setPanel] = useState<Panel>(null);
  const [dialogue, setDialogue] = useState<string | null>(null);
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [preferences, setPreferences] = useState<Preferences>(savedPreferences);
  const [resumeAvailable, setResumeAvailable] = useState(!!localStorage.getItem('eldervale-token'));
  const realm = useRef(new RealmConnection());
  const renderer = useRef<WorldRenderer | null>(null);
  const noticeId = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [retryAssets, setRetryAssets] = useState(0);

  const notify = useCallback((text: string, tone = 'info') => {
    const id = ++noticeId.current;
    setNotices((n) => [...n.slice(-2), { id, text, tone }]);
    const timer = setTimeout(
      () => setNotices((n) => n.filter((item) => item.id !== id)),
      tone === 'level' || tone === 'quest' ? 6500 : 4500,
    );
    timers.current.push(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadError('');
    art
      .load((value) => {
        if (!cancelled) setProgress(value);
      })
      .then(() => {
        if (!cancelled) setArtReady(true);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error.message);
      });
    fetch('/api/status')
      .then((r) => r.json())
      .then((info) => {
        if (!cancelled) setOnline(info.online);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [retryAssets]);

  useEffect(() => {
    const connection = realm.current;
    connection.onStatus = setStatus;
    connection.onMessage = (message) => {
      if (message.type === 'welcome') {
        setCreation(false);
        setConnecting(false);
        setResumeAvailable(true);
        setCreationError('');
        localStorage.setItem(
          'eldervale-character',
          JSON.stringify({
            name: message.player.name,
            classId: message.player.classId,
            appearance: message.player.appearance,
          }),
        );
      } else if (message.type === 'state') {
        setState(message);
        setOnline(message.online);
        for (const event of message.events)
          if (event.playerId === message.self.id || event.targetId === message.self.id)
            audio.effect(event.kind);
      } else if (message.type === 'notice') notify(message.text, message.tone);
      else if (message.type === 'chat') setChats((list) => [...list.slice(-99), message]);
      else if (message.type === 'dialogue') {
        setPanel(null);
        setDialogue(message.npc);
      } else if (message.type === 'loot')
        notify(`+${message.xp} XP  ·  +${message.gold} gold  ·  Loot gathered`, 'loot');
      else if (message.type === 'error') {
        setCreationError(message.text);
        setConnecting(false);
      } else if (message.type === 'character-required') {
        setCreation(true);
        setConnecting(false);
        setResumeAvailable(false);
        connection.close();
      } else if (message.type === 'replaced') {
        setCreation(true);
        setState(null);
        setConnecting(false);
        setCreationError('Your character is adventuring in another tab.');
        connection.close();
      }
    };
    return () => {
      connection.close();
      for (const timer of timers.current) clearTimeout(timer);
    };
  }, [notify]);

  const send = useCallback((message: Record<string, unknown>) => realm.current.send(message), []);
  const setRenderer = useCallback((value: WorldRenderer | null) => {
    renderer.current = value;
  }, []);
  const openPanel = useCallback((value: Panel) => {
    setDialogue(null);
    setPanel((current) => (current === value ? null : value));
  }, []);
  const closePanel = useCallback(() => {
    setPanel(null);
    setDialogue(null);
  }, []);
  const escape = useCallback(() => {
    if (dialogue || panel) {
      setDialogue(null);
      setPanel(null);
    } else {
      setPanel('settings');
      send({ type: 'stop' });
    }
  }, [dialogue, panel, send]);
  const updatePreferences = useCallback((values: Partial<Preferences>) => {
    setPreferences((current) => {
      const next = { ...current, ...values };
      localStorage.setItem('eldervale-preferences', JSON.stringify(next));
      if (values.sound !== undefined) void audio.setEnabled(next.sound);
      if (values.volume !== undefined) audio.setVolume(next.volume);
      return next;
    });
  }, []);
  const create = (character: Character) => {
    setConnecting(true);
    setCreationError('');
    setNotices([]);
    setChats([]);
    realm.current.token = null;
    realm.current.connect(character);
    audio.setVolume(preferences.volume);
    if (preferences.sound) void audio.setEnabled(true);
  };
  const resume = () => {
    setConnecting(true);
    setCreationError('');
    realm.current.connect(undefined, localStorage.getItem('eldervale-token'));
    audio.setVolume(preferences.volume);
    if (preferences.sound) void audio.setEnabled(true);
  };
  const characterSelect = () => {
    realm.current.close();
    setCreation(true);
    setState(null);
    setPanel(null);
    setDialogue(null);
    setNotices([]);
    setConnecting(false);
  };

  if (!artReady)
    return (
      <div className="loading-screen">
        <div className="loading-backdrop" />
        <Brand />
        <div className="loading-center">
          <img src="/assets/emblem.png" width="64" height="64" alt="" />
          <span className="eyebrow">A LITTLE WORLD. A GRAND ADVENTURE.</span>
          <h1>The elderwood is waking.</h1>
          <p>{loadError || 'Gathering the little things that make a world…'}</p>
          {loadError ? (
            <button className="primary-button" onClick={() => setRetryAssets((r) => r + 1)}>
              Try again
            </button>
          ) : (
            <>
              <div className="loading-track">
                <span style={{ width: `${progress * 100}%` }} />
              </div>
              <small>{Math.round(progress * 100)}%</small>
            </>
          )}
        </div>
        <span className="loading-footer">Made for wandering.</span>
      </div>
    );

  if (creation)
    return (
      <CharacterCreation
        onCreate={create}
        online={online}
        connecting={connecting}
        error={creationError}
        onResume={resumeAvailable ? resume : undefined}
        sound={preferences.sound}
        onSound={() => updatePreferences({ sound: !preferences.sound })}
      />
    );
  if (!state)
    return (
      <div className="loading-screen">
        <Brand />
        <div className="loading-center">
          <h1>Welcome to the elderwood.</h1>
          <p>Stepping through the woodland gates…</p>
          <div className="loading-track indeterminate">
            <span />
          </div>
          <button className="text-button" onClick={characterSelect}>
            Back to character creation
          </button>
        </div>
      </div>
    );

  return (
    <main className="game-screen">
      <GameCanvas
        state={state}
        send={send}
        blocked={!!panel || !!dialogue || state.self.health <= 0 || status !== 'online'}
        onPanel={openPanel}
        onEscape={escape}
        onRenderer={setRenderer}
        zoom={preferences.zoom}
        labels={preferences.labels}
        particles={preferences.particles}
      />
      <Hud
        state={state}
        send={send}
        onPanel={openPanel}
        panel={panel}
        chats={chats}
        notices={notices}
        status={status}
        ping={realm.current.ping}
        sound={preferences.sound}
        onSound={() => updatePreferences({ sound: !preferences.sound })}
      />
      <GamePanels
        panel={panel}
        state={state}
        send={send}
        onClose={closePanel}
        onPanel={openPanel}
        preferences={preferences}
        onPreferences={updatePreferences}
        onCharacterSelect={characterSelect}
      />
      {dialogue && state.self.health > 0 && (
        <Dialogue npcId={dialogue} state={state} send={send} onClose={closePanel} />
      )}
      {state.self.health <= 0 && <Defeated player={state.self} send={send} />}
      {status === 'offline' && !creation && (
        <div className="offline-recovery">
          <Icon name="compass" size={30} />
          <p>The realm connection has closed.</p>
          <button className="primary-button" onClick={resume}>
            Reconnect
          </button>
        </div>
      )}
    </main>
  );
}
