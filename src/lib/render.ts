// Funzioni di rendering condivise: le usa Astro per l'HTML iniziale (SSG)
// e lo script del browser quando cambi gioco. Una sola fonte di markup.
import {
  type Ability,
  type Lang,
  type Pokemon,
  TYPE_BY_SLUG,
  VERSION_BY_SLUG,
  isPresent,
  text,
} from './data';
import { defensiveProfile, offensiveProfile } from './typechart';
import { type Theme, themeFor } from './themes';

const SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

// Sprite dell'epoca: pixel art originali fino alla Gen V (animati in Nero e Bianco),
// render 3D di Pokémon HOME per i giochi successivi.
const SPRITE_FILE: Record<string, string> = {
  'ruby-sapphire': 'versions/generation-iii/ruby-sapphire/{id}.png',
  emerald: 'versions/generation-iii/emerald/{id}.png',
  'firered-leafgreen': 'versions/generation-iii/firered-leafgreen/{id}.png',
  'diamond-pearl': 'versions/generation-iv/diamond-pearl/{id}.png',
  platinum: 'versions/generation-iv/platinum/{id}.png',
  'heartgold-soulsilver': 'versions/generation-iv/heartgold-soulsilver/{id}.png',
  'black-white': 'versions/generation-v/black-white/animated/{id}.gif',
  'black-2-white-2': 'versions/generation-v/black-white/animated/{id}.gif',
};

export function spriteUrl(id: number, group?: string): string {
  if (!group) return `${SPRITES}/${id}.png`;
  const file = SPRITE_FILE[group];
  if (file) return `${SPRITES}/${file.replace('{id}', String(id))}`;
  return themeFor(group).pixel ? `${SPRITES}/${id}.png` : `${SPRITES}/other/home/${id}.png`;
}

export function defaultSpriteUrl(id: number): string {
  return spriteUrl(id);
}

// Giochi in cui le abilità non esistono come meccanica.
const NO_ABILITIES = new Set(['lets-go-pikachu-lets-go-eevee', 'legends-arceus', 'legends-za']);

const STAT_LABELS = ['PS', 'Attacco', 'Difesa', 'Att. Sp.', 'Dif. Sp.', 'Velocità'];

const DEFENSE_GROUPS: { m: number; label: string; mark: string }[] = [
  { m: 4, label: 'Debolissimo', mark: '×4' },
  { m: 2, label: 'Debole', mark: '×2' },
  { m: 0.5, label: 'Resiste', mark: '×½' },
  { m: 0.25, label: 'Resiste molto', mark: '×¼' },
  { m: 0, label: 'Immune', mark: '×0' },
];

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
export const roman = (n: number) => ROMAN[n] ?? String(n);

export function esc(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function typeChip(slug: string, size: 'md' | 'sm' = 'md'): string {
  const t = TYPE_BY_SLUG.get(slug);
  if (!t) return '';
  return `<span class="type type--${size}" style="--type:${t.color}">${esc(text(t.name))}</span>`;
}

function chips(slugs: string[], size: 'md' | 'sm' = 'sm'): string {
  return `<span class="chips">${slugs.map((s) => typeChip(s, size)).join('')}</span>`;
}

export interface RenderedView {
  versionName: string;
  gen: number;
  theme: Theme;
  sprite: string;
  slots: Record<string, string>;
}

/** Tutto ciò che dipende dal gioco scelto, già in HTML. */
export function renderView(
  pokemon: Pokemon,
  abilities: Record<string, Ability>,
  versionSlug: string,
): RenderedView {
  const version = VERSION_BY_SLUG.get(versionSlug);
  if (!version) throw new Error(`Versione sconosciuta: ${versionSlug}`);
  const { game } = version;
  const gen = game.gen;
  const versionName = text(version.name);
  const name = text(pokemon.name);
  const types = pokemon.typesByGen[gen] ?? [];

  return {
    versionName,
    gen,
    theme: themeFor(game.group),
    sprite: spriteUrl(pokemon.id, game.group),
    slots: {
      flavor: renderFlavor(pokemon, versionSlug, versionName),
      types: chips(types, 'md'),
      generation: `Regole della Generazione ${roman(gen)}`,
      defense: renderDefense(types, gen),
      offense: renderOffense(types, gen),
      stats: renderStats(pokemon.statsByGen[gen] ?? []),
      abilities: NO_ABILITIES.has(game.group)
        ? `<p class="muted">In ${esc(versionName)} i Pokémon non hanno abilità.</p>`
        : renderAbilities(pokemon.abilitiesByGen[gen] ?? [], abilities),
      dex: renderDex(pokemon, game.group, versionName, name),
    },
  };
}

function renderFlavor(pokemon: Pokemon, versionSlug: string, versionName: string): string {
  const entry = pokemon.flavor[versionSlug];
  if (!entry) {
    return `<p class="dialog__text dialog__text--empty">In ${esc(versionName)} non c’è ancora una voce del Pokédex per questo Pokémon nei dati che usiamo.</p>`;
  }
  const lang: Lang = entry.it ? 'it' : 'en';
  const note = lang === 'en' ? `<p class="dialog__note">Testo originale in inglese: il gioco non ha una traduzione italiana di questa voce.</p>` : '';
  return `<p class="dialog__text" lang="${lang}">${esc(entry[lang]!)}</p>${note}`;
}

function renderDefense(types: string[], gen: number): string {
  const profile = defensiveProfile(types, gen);
  const rows = DEFENSE_GROUPS.filter((g) => profile.get(g.m)?.length).map(
    (g) => `<div class="matchup">
      <span class="matchup__mark">${g.mark}</span>
      <span class="matchup__label">${g.label}</span>
      ${chips(profile.get(g.m)!)}
    </div>`,
  );
  return rows.join('');
}

function renderOffense(types: string[], gen: number): string {
  return offensiveProfile(types, gen)
    .map((row) => {
      const lines = [
        ['Superefficaci contro', row.strong],
        ['Poco efficaci contro', row.weak],
        ['Nessun effetto su', row.immune],
      ] as const;
      const body = lines
        .filter(([, list]) => list.length)
        .map(([label, list]) => `<div class="offense__line"><span class="offense__label">${label}</span>${chips(list)}</div>`)
        .join('');
      return `<div class="offense">
        <h3 class="offense__title">Mosse di tipo ${typeChip(row.attack)}</h3>
        ${body || '<p class="muted">Neutre contro tutti i tipi.</p>'}
      </div>`;
    })
    .join('');
}

function renderStats(stats: number[]): string {
  if (!stats.length) return '';
  const total = stats.reduce((a, b) => a + b, 0);
  const rows = stats
    .map((value, i) => {
      const width = Math.min(value / 180, 1) * 100;
      return `<div class="stat">
        <span class="stat__label">${STAT_LABELS[i]}</span>
        <span class="stat__value">${value}</span>
        <span class="stat__bar" aria-hidden="true"><span style="width:${width.toFixed(1)}%"></span></span>
      </div>`;
    })
    .join('');
  return `${rows}<div class="stat stat--total"><span class="stat__label">Totale</span><span class="stat__value">${total}</span></div>`;
}

function renderAbilities(list: { id: number; hidden: boolean }[], abilities: Record<string, Ability>): string {
  if (!list.length) return '<p class="muted">Nessuna abilità in questo gioco.</p>';
  return list
    .map(({ id, hidden }) => {
      const a = abilities[id];
      if (!a) return '';
      const descLang: Lang = a.desc.it ? 'it' : 'en';
      const desc = a.desc[descLang];
      return `<div class="ability">
        <h3 class="ability__name">${esc(text(a.name))}${hidden ? ' <span class="tag">Nascosta</span>' : ''}</h3>
        ${desc ? `<p class="ability__desc" lang="${descLang}">${esc(desc)}</p>` : ''}
      </div>`;
    })
    .join('');
}

function renderDex(pokemon: Pokemon, group: string, versionName: string, name: string): string {
  if (!isPresent(pokemon, group)) return `<p>${esc(name)} non è presente in ${esc(versionName)}.</p>`;
  const entries = pokemon.games[group];
  if (!entries.length) {
    return `<p>Non compare nel Pokédex regionale di ${esc(versionName)}, ma è presente nel Pokédex Nazionale del gioco.</p>`;
  }
  return `<ul class="dex">${entries
    .map((e) => `<li><span class="dex__name">${esc(e.dex)}</span><span class="dex__n">n. ${e.n}</span></li>`)
    .join('')}</ul>`;
}
