import { useEffect, useRef } from 'react';
import { art } from '../game/assets';
import type { Appearance, ClassId } from '../types';

export function Icon({
  name,
  size = 24,
  className = '',
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <img
      className={`pixel-icon ${className}`}
      src={`/assets/icon-${name}.png`}
      width={size}
      height={size}
      alt=""
      draggable={false}
    />
  );
}

export function Avatar({
  classId,
  appearance,
  size = 96,
  direction = 0,
  action = 0,
  className = '',
}: {
  classId: ClassId;
  appearance: Appearance;
  size?: number;
  direction?: number;
  action?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let frame = 0;
    const animate = (time: number) => {
      const canvas = ref.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      art.drawAvatar(
        ctx,
        classId,
        appearance,
        canvas.width / 2,
        canvas.height - 2 * (size / 32),
        direction,
        action,
        Math.floor(time / (action ? 105 : 180)),
        size / 32,
      );
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [classId, appearance, size, direction, action]);
  return (
    <canvas
      className={`avatar ${className}`}
      ref={ref}
      width={size}
      height={size * 1.25}
      role="img"
      aria-label={`${classId} character preview`}
    />
  );
}

export function Key({ children }: { children: React.ReactNode }) {
  return <kbd>{children}</kbd>;
}

export function IconButton({
  icon,
  label,
  onClick,
  active = false,
  shortcut,
  className = '',
}: {
  icon: string;
  label: string;
  onClick: () => void;
  active?: boolean;
  shortcut?: string;
  className?: string;
}) {
  return (
    <button
      className={`icon-button ${active ? 'active' : ''} ${className}`}
      onClick={onClick}
      aria-label={label}
      title={`${label}${shortcut ? ` (${shortcut})` : ''}`}
    >
      <Icon name={icon} />
      {shortcut && <kbd>{shortcut}</kbd>}
    </button>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? 'compact' : ''}`}>
      <img src="/assets/emblem.png" alt="" />
      <div>
        <span>ELDERVALE</span>
        {!compact && <small>TALES OF THE ELDERWOOD</small>}
      </div>
    </div>
  );
}

export function Modal({
  title,
  eyebrow,
  icon,
  children,
  onClose,
  className = '',
}: {
  title: string;
  eyebrow?: string;
  icon: string;
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !ref.current) return;
      const elements = [
        ...ref.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input, select, [tabindex="0"]',
        ),
      ];
      const first = elements[0],
        last = elements.at(-1);
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === ref.current)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    ref.current?.addEventListener('keydown', trap);
    const current = ref.current;
    return () => {
      current?.removeEventListener('keydown', trap);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-shade"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`game-modal ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <header className="modal-header">
          <span className="modal-title-icon">
            <Icon name={icon} size={30} />
          </span>
          <div>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <h2>{title}</h2>
          </div>
          <IconButton icon="close" label="Close" onClick={onClose} />
        </header>
        {children}
      </div>
    </div>
  );
}
