import { useState } from 'react';
import {
  CLASSES,
  DEFAULT_APPEARANCE,
  SKIN_COLORS,
  HAIR_COLORS,
  OUTFIT_COLORS,
  HAIR_STYLES,
} from '../../shared/data.js';
import { Avatar, Brand, Icon, IconButton } from './Primitives';
import type { Appearance, Character, ClassId } from '../types';

const names = [
  'Ashryn',
  'Elara',
  'Rowen',
  'Thistle',
  'Aldren',
  'Sylvie',
  'Faelan',
  'Merryn',
  'Orin',
  'Liora',
  'Briar',
  'Wren',
];
const skinNames = ['Warm ivory', 'Sunlit peach', 'Amber', 'Copper', 'Deep umber', 'Porcelain'];
const hairNames = ['Chestnut', 'Warm brown', 'Honey gold', 'Auburn', 'Silver', 'Midnight'];
const outfitNames = ['Fern green', 'Terracotta', 'River blue', 'Heather', 'Harvest gold', 'Sage'];

function Swatches({
  label,
  colors,
  names: labels,
  selected,
  onChange,
}: {
  label: string;
  colors: string[];
  names: string[];
  selected: number;
  onChange: (index: number) => void;
}) {
  return (
    <fieldset className="color-field">
      <legend>
        {label}
        <span>{labels[selected]}</span>
      </legend>
      <div className="swatches">
        {colors.map((color, i) => (
          <button
            key={color}
            type="button"
            style={{ '--swatch': color } as React.CSSProperties}
            className={i === selected ? 'selected' : ''}
            onClick={() => onChange(i)}
            aria-label={`${label}: ${labels[i]}`}
            aria-pressed={i === selected}
            title={labels[i]}
          >
            {i === selected && <span>✓</span>}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function CharacterCreation({
  onCreate,
  online,
  connecting,
  error,
  onResume,
  sound,
  onSound,
}: {
  onCreate: (character: Character) => void;
  online: number;
  connecting: boolean;
  error: string;
  onResume?: () => void;
  sound: boolean;
  onSound: () => void;
}) {
  const [classId, setClassId] = useState<ClassId>('warrior');
  const [appearance, setAppearance] = useState<Appearance>({ ...DEFAULT_APPEARANCE });
  const [name, setName] = useState('Ashryn');
  const [direction, setDirection] = useState(0);
  const [animation, setAnimation] = useState(0);
  const data = CLASSES[classId];
  const change = (key: keyof Appearance, value: number) =>
    setAppearance((a) => ({ ...a, [key]: value }));
  const randomize = () => {
    setAppearance({
      skin: Math.floor(Math.random() * 6),
      hair: Math.floor(Math.random() * 6),
      outfit: Math.floor(Math.random() * 6),
      style: Math.floor(Math.random() * 4),
      body: Math.floor(Math.random() * 2),
    });
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length >= 2 && !connecting)
      onCreate({ name: name.trim(), classId, appearance });
  };

  return (
    <div className="creation-page">
      <div className="creation-backdrop" />
      <div className="creation-vignette" />
      <header className="creation-topbar">
        <Brand />
        <div className="realm-pill">
          <span className="status-dot" />
          <span>Elderwood</span>
          <span className="realm-divider" />
          <small>REALM ONLINE</small>
        </div>
        <div className="topbar-actions">
          {onResume && (
            <button className="text-button resume-button" onClick={onResume}>
              Continue your journey <Icon name="arrow-right" size={18} />
            </button>
          )}
          <IconButton
            icon={sound ? 'sound' : 'mute'}
            label={sound ? 'Mute sound' : 'Enable sound'}
            onClick={onSound}
          />
        </div>
      </header>
      <main className="creation-main">
        <div className="creation-heading">
          <div>
            <div className="eyebrow">
              <span className="tiny-diamond" /> A LITTLE WORLD. A GRAND ADVENTURE.
            </div>
            <h1>Your next chapter awaits.</h1>
            <p>Find your calling. Make your mark. A whole world is waiting.</p>
          </div>
          <div className="creation-step">
            <span>01</span>
            <div>
              CHARACTER CREATION<small>The beginning of something good.</small>
            </div>
          </div>
        </div>
        <form className="creation-card" onSubmit={submit}>
          <section className={`character-showcase class-${classId}`} aria-label="Character preview">
            <div className="showcase-scene">
              <img
                className="scene-art"
                src="/assets/creation-scene.png"
                alt="A moss-covered stone dais in an ancient woodland clearing"
              />
              <div className="scene-shading" />
              <div className="showcase-title">
                <div className="eyebrow">{data.title}</div>
                <h2>{data.name}</h2>
                <span className="role-tag">{data.role}</span>
              </div>
              <div className="hero-avatar">
                <Avatar
                  classId={classId}
                  appearance={appearance}
                  size={144}
                  direction={direction}
                  action={animation}
                />
                <div className="hero-spark spark-one" />
                <div className="hero-spark spark-two" />
              </div>
              <div className="preview-controls">
                <span className="level-tag">
                  LEVEL <b>1</b>
                </span>
                <div>
                  <button
                    type="button"
                    className="preview-button"
                    onClick={() => setDirection((d) => (d + 3) % 4)}
                    aria-label="Rotate character left"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="preview-button animation-toggle"
                    onClick={() => setAnimation((a) => (a + 1) % 3)}
                    aria-label="Change preview animation"
                  >
                    {['IDLE', 'WALK', 'ATTACK'][animation]}
                  </button>
                  <button
                    type="button"
                    className="preview-button"
                    onClick={() => setDirection((d) => (d + 1) % 4)}
                    aria-label="Rotate character right"
                  >
                    ›
                  </button>
                </div>
              </div>
            </div>
            <div className="class-profile">
              <p>{data.description}</p>
              <div className="class-ratings">
                {Object.entries(data.ratings).map(([label, rating]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <div className="rating-pips">
                      {Array.from({ length: 5 }, (_, i) => (
                        <i key={i} className={i < rating ? 'filled' : ''} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="class-tradeoff">
                <Icon name="leaf" size={18} />
                <span>{data.playstyle}</span>
              </div>
            </div>
          </section>
          <section className="creation-options">
            <div className="section-heading">
              <span className="section-number">01</span>
              <div>
                <h3>Choose your calling</h3>
                <p>Different strengths. Your own way to play.</p>
              </div>
            </div>
            <div className="class-choices" role="group" aria-label="Choose your class">
              {(Object.keys(CLASSES) as ClassId[]).map((id) => (
                <button
                  type="button"
                  key={id}
                  className={`class-choice ${id === classId ? 'selected' : ''}`}
                  onClick={() => setClassId(id)}
                  aria-pressed={id === classId}
                >
                  <span className="choice-check">{id === classId ? '✓' : ''}</span>
                  <Icon name={CLASSES[id].skills[0].icon} size={36} />
                  <strong>{CLASSES[id].name}</strong>
                  <span>
                    {id === 'warrior'
                      ? 'Strong & steadfast'
                      : id === 'archer'
                        ? 'Swift & precise'
                        : 'Wise & powerful'}
                  </span>
                </button>
              ))}
            </div>
            <div className="class-insight">
              <div>
                <span className="insight-marker">+</span>
                <p>{data.strength}</p>
              </div>
              <div>
                <span className="insight-marker weakness">−</span>
                <p>{data.weakness}</p>
              </div>
            </div>
            <div className="section-rule" />
            <div className="section-heading customization-heading">
              <span className="section-number">02</span>
              <div>
                <h3>Make it yours</h3>
                <p>A familiar face for an unfamiliar world.</p>
              </div>
              <button
                className="text-button randomize"
                type="button"
                onClick={randomize}
                title="Randomize appearance"
              >
                <Icon name="dice" size={18} />
                <span>Randomize</span>
              </button>
            </div>
            <div className="appearance-grid">
              <div className="name-field">
                <label htmlFor="character-name">Character name</label>
                <div className="name-input">
                  <input
                    id="character-name"
                    name="character-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    minLength={2}
                    maxLength={16}
                    pattern="[\p{L}\p{N} '\-]{2,16}"
                    required
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="What shall we call you?"
                  />
                  <button
                    type="button"
                    aria-label="Randomize name"
                    onClick={() => setName(names[Math.floor(Math.random() * names.length)])}
                  >
                    <Icon name="dice" size={20} />
                  </button>
                </div>
              </div>
              <fieldset className="body-field">
                <legend>Silhouette</legend>
                <div className="segmented-control">
                  {['Classic', 'Slender'].map((label, i) => (
                    <button
                      key={label}
                      type="button"
                      className={appearance.body === i ? 'selected' : ''}
                      onClick={() => change('body', i)}
                      aria-pressed={appearance.body === i}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="hair-style">
                <label>Hairstyle</label>
                <div className="style-selector">
                  <button
                    type="button"
                    aria-label="Previous hairstyle"
                    onClick={() => change('style', (appearance.style + 3) % 4)}
                  >
                    ‹
                  </button>
                  <span>{HAIR_STYLES[appearance.style]}</span>
                  <button
                    type="button"
                    aria-label="Next hairstyle"
                    onClick={() => change('style', (appearance.style + 1) % 4)}
                  >
                    ›
                  </button>
                </div>
              </div>
              <Swatches
                label="Skin tone"
                colors={SKIN_COLORS}
                names={skinNames}
                selected={appearance.skin}
                onChange={(i) => change('skin', i)}
              />
              <Swatches
                label="Hair color"
                colors={HAIR_COLORS}
                names={hairNames}
                selected={appearance.hair}
                onChange={(i) => change('hair', i)}
              />
              <Swatches
                label="Outfit color"
                colors={OUTFIT_COLORS}
                names={outfitNames}
                selected={appearance.outfit}
                onChange={(i) => change('outfit', i)}
              />
            </div>
            <div className="creation-submit">
              <div className="save-note">
                <span className="tiny-diamond" />
                <span>{error || 'Your story. Your pace.'}</span>
              </div>
              <button
                className="primary-button enter-button"
                type="submit"
                disabled={connecting || name.trim().length < 2}
              >
                {connecting ? 'Opening the woodland gates…' : 'Enter Eldervale'}
                <Icon name="arrow-right" size={23} />
              </button>
            </div>
          </section>
        </form>
        <div className="creation-below">
          <span>
            <Icon name="people" size={17} />
            {online === 0
              ? 'A quiet realm, ready for your arrival.'
              : `${online} ${online === 1 ? 'adventurer is' : 'adventurers are'} exploring the elderwood.`}
          </span>
          <span>
            <span className="save-dot" /> Your adventure saves as you go.
          </span>
        </div>
      </main>
      <footer className="creation-footer">
        <span>
          ELDERWOOD <i>◆</i> REALM 01
        </span>
        <span>Made for wandering.</span>
        <span>
          v1.0 <i>·</i> A NEW ADVENTURE
        </span>
      </footer>
    </div>
  );
}
