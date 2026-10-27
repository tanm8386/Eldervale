import { useEffect, useRef } from 'react';
import { NPCS } from '../../shared/world.js';
import { WorldRenderer } from '../game/renderer';
import type { Panel, Send, WorldState } from '../types';

export function GameCanvas({
  state,
  send,
  blocked,
  onPanel,
  onEscape,
  onRenderer,
  zoom,
  labels,
  particles,
}: {
  state: WorldState;
  send: Send;
  blocked: boolean;
  onPanel: (panel: Panel) => void;
  onEscape: () => void;
  onRenderer: (renderer: WorldRenderer | null) => void;
  zoom: number;
  labels: boolean;
  particles: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<WorldRenderer | null>(null);
  const latest = useRef({ state, blocked, onPanel, onEscape, send });
  latest.current = { state, blocked, onPanel, onEscape, send };
  const keys = useRef(new Set<string>());
  const pendingInteraction = useRef<string | null>(null);
  const joystick = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const game = new WorldRenderer(ref.current!, textRef.current!);
    renderer.current = game;
    onRenderer(game);
    game.update(latest.current.state);
    game.camera = { x: latest.current.state.self.x, y: latest.current.state.self.y - 65 };
    let lastInput = 0;
    game.onFrame = () => {
      const now = performance.now();
      if (now - lastInput < 50) return;
      lastInput = now;
      const { state: current, blocked: isBlocked, send: transmit } = latest.current;
      const typing =
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement;
      const x =
        isBlocked || typing
          ? 0
          : (keys.current.has('d') || keys.current.has('arrowright') ? 1 : 0) -
            (keys.current.has('a') || keys.current.has('arrowleft') ? 1 : 0) +
            joystick.current.x;
      const y =
        isBlocked || typing
          ? 0
          : (keys.current.has('s') || keys.current.has('arrowdown') ? 1 : 0) -
            (keys.current.has('w') || keys.current.has('arrowup') ? 1 : 0) +
            joystick.current.y;
      transmit({ type: 'input', x, y });
      if (pendingInteraction.current) {
        const target =
          NPCS.find((n) => n.id === pendingInteraction.current) ||
          current.herbs.find((h) => h.id === pendingInteraction.current);
        const range = pendingInteraction.current.startsWith('herb') ? 33 : 70;
        if (target && Math.hypot(target.x - current.self.x, target.y - current.self.y) < range) {
          transmit({ type: 'interact', id: pendingInteraction.current });
          pendingInteraction.current = null;
        }
      }
    };
    const keydown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase(),
        {
          blocked: isBlocked,
          state: current,
          send: transmit,
          onPanel: open,
          onEscape: escape,
        } = latest.current;
      const typing =
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement;
      if (key === 'escape') {
        event.preventDefault();
        keys.current.clear();
        escape();
        (document.activeElement as HTMLElement)?.blur();
        return;
      }
      if (typing) return;
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        if (!isBlocked) {
          event.preventDefault();
          keys.current.add(key);
          pendingInteraction.current = null;
        }
        return;
      }
      if (event.repeat) return;
      if (key === 'b' || key === 'i') {
        event.preventDefault();
        open('inventory');
        return;
      }
      if (key === 'j') {
        event.preventDefault();
        open('journal');
        return;
      }
      if (key === 'm') {
        event.preventDefault();
        open('map');
        return;
      }
      if (key === 'h' || key === '?') {
        event.preventDefault();
        open('help');
        return;
      }
      if (isBlocked) return;
      if (key === 'enter') {
        event.preventDefault();
        document.getElementById('chat-input')?.focus();
        return;
      }
      if (key === 'tab') {
        event.preventDefault();
        const targets = current.mobs
          .filter(
            (m) => m.health > 0 && Math.hypot(m.x - current.self.x, m.y - current.self.y) < 290,
          )
          .sort(
            (a, b) =>
              Math.hypot(a.x - current.self.x, a.y - current.self.y) -
              Math.hypot(b.x - current.self.x, b.y - current.self.y),
          );
        const index = targets.findIndex((m) => m.id === current.self.target);
        if (targets.length)
          transmit({ type: 'target', id: targets[(index + 1) % targets.length].id });
      }
      if (['1', '2', '3', '4', ' '].includes(key)) {
        event.preventDefault();
        transmit({ type: 'skill', index: key === ' ' ? 0 : Number(key) - 1 });
      }
      if (key === 'e') {
        event.preventDefault();
        transmit({ type: 'interact' });
      }
      if (key === 'q') transmit({ type: 'use', id: 'health-potion' });
      if (key === 'r') transmit({ type: 'use', id: 'mana-potion' });
    };
    const keyup = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    const blur = () => {
      keys.current.clear();
      joystick.current = { x: 0, y: 0 };
      latest.current.send({ type: 'input', x: 0, y: 0 });
    };
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    window.addEventListener('blur', blur);
    game.start();
    return () => {
      game.destroy();
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', blur);
      onRenderer(null);
      renderer.current = null;
    };
  }, [onRenderer]);

  useEffect(() => {
    renderer.current?.update(state);
  }, [state]);
  useEffect(() => {
    if (renderer.current) {
      renderer.current.zoom = zoom;
      renderer.current.labels = labels;
      renderer.current.particles = particles;
    }
  }, [zoom, labels, particles]);
  useEffect(() => {
    if (blocked) {
      keys.current.clear();
      joystick.current = { x: 0, y: 0 };
      send({ type: 'stop' });
    }
  }, [blocked, send]);

  const click = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const game = renderer.current;
    if (!game || blocked) return;
    const point = game.worldPoint(event.clientX, event.clientY),
      entity = event.button === 2 ? null : game.pick(point);
    pendingInteraction.current = null;
    if (entity?.type === 'mob') {
      send({ type: 'skill', index: 0, target: entity.id });
      return;
    }
    if (entity) {
      const target =
        NPCS.find((n) => n.id === entity.id) || state.herbs.find((h) => h.id === entity.id);
      if (!target) return;
      if (
        Math.hypot(target.x - state.self.x, target.y - state.self.y) <
        (entity.type === 'herb' ? 34 : 73)
      )
        send({ type: 'interact', id: entity.id });
      else {
        pendingInteraction.current = entity.id;
        send({ type: 'move', x: target.x, y: target.y + (entity.type === 'npc' ? 25 : 0) });
      }
    } else {
      send({ type: 'move', ...point });
      game.destination = { ...point, at: performance.now() };
    }
    (document.activeElement as HTMLElement)?.blur();
  };

  return (
    <>
      <canvas
        ref={ref}
        className="world-canvas"
        aria-label="Eldervale game world. Move with WASD or click the ground. Click enemies to attack."
        onPointerDown={click}
        onContextMenu={(e) => e.preventDefault()}
        onPointerMove={(event) => {
          const game = renderer.current;
          if (!game) return;
          const target = game.pick(game.worldPoint(event.clientX, event.clientY));
          game.hover = target?.id || null;
          game.canvas.style.cursor =
            target?.type === 'mob' ? 'crosshair' : target ? 'pointer' : 'default';
        }}
      />
      <canvas ref={textRef} className="world-labels" aria-hidden="true" />
      <div className="mobile-joystick" aria-label="Movement controls">
        {[
          { label: 'Move up', symbol: '↑', x: 0, y: -1, c: 'up' },
          { label: 'Move left', symbol: '←', x: -1, y: 0, c: 'left' },
          { label: 'Move right', symbol: '→', x: 1, y: 0, c: 'right' },
          { label: 'Move down', symbol: '↓', x: 0, y: 1, c: 'down' },
        ].map((d) => (
          <button
            key={d.c}
            className={d.c}
            aria-label={d.label}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              joystick.current = { x: d.x, y: d.y };
            }}
            onPointerUp={() => {
              joystick.current = { x: 0, y: 0 };
            }}
            onPointerCancel={() => {
              joystick.current = { x: 0, y: 0 };
            }}
          >
            {d.symbol}
          </button>
        ))}
      </div>
    </>
  );
}
