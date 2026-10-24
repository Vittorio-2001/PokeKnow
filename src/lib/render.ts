// Funzioni di rendering condivise: le usa Astro per l'HTML iniziale (SSG)
// e lo script del browser quando cambi gioco. Una sola fonte di markup, in ogni lingua.
import {
  type Ability,
  type Lang,
  type Pokemon,
  TYPE_BY_SLUG,
  VERSION_BY_SLUG,
  isPresent,
  text,
} from './data';
import { t } from './i18n';
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

const DEFENSE_GROUPS: { m: number; mark: string }[] = [
  { m: 4, mark: '×4' },
  { m: 2, mark: '×2' },
  { m: 0.5, mark: '×½' },
  { m: 0.25, mark: '×¼' },
  { m: 0, mark: '×0' },
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

export function typeChip(slug: string, lang: Lang, size: 'md' | 'sm' = 'md'): string {
  const type = TYPE_BY_SLUG.get(slug);
  if (!type) return '';
  return `<span class="type type--${size}" style="--type:${type.color}">${esc(text(type.name, lang))}</span>`;
}

function chips(slugs: string[], lang: Lang, size: 'md' | 'sm' = 'sm'): string {
  return `<span class="chips">${slugs.map((s) => typeChip(s, lang, size)).join('')}</span>`;
}

export interface RenderedView {
  versionName: string;
  gen: number;
  theme: Theme;
  sprite: string;
  slots: Record<string, string>;
}

/** Tutto ciò che dipende dal gioco scelto, già in HTML, nella lingua della pagina. */
export function renderView(
  pokemon: Pokemon,
  abilities: Record<string, Ability>,
  versionSlug: string,
  lang: Lang,
): RenderedView {
  const version = VERSION_BY_SLUG.get(versionSlug);
  if (!version) throw new Error(`Versione sconosciuta: ${versionSlug}`);
  const ui = t(lang);
  const { game } = version;
  const gen = game.gen;
  const versionName = text(version.name, lang);
  const name = text(pokemon.name, lang);
  const types = pokemon.typesByGen[gen] ?? [];

  return {
    versionName,
    gen,
    theme: themeFor(game.group),
    sprite: spriteUrl(pokemon.id, game.group),
    slots: {
      flavor: renderFlavor(pokemon, versionSlug, versionName, lang),
      types: chips(types, lang, 'md'),
      generation: esc(ui.rulesOf(roman(gen))),
      defense: renderDefense(types, gen, lang),
      offense: renderOffense(types, gen, lang),
      stats: renderStats(pokemon.statsByGen[gen] ?? [], lang),
      abilities: NO_ABILITIES.has(game.group)
        ? `<p class="muted">${esc(ui.noAbilitiesInGame(versionName))}</p>`
        : renderAbilities(pokemon.abilitiesByGen[gen] ?? [], abilities, lang),
      dex: renderDex(pokemon, game.group, versionName, name, lang),
    },
  };
}

/** La lingua in cui mostrare un testo: quella della pagina se c'è, altrimenti l'altra. */
function pickLang(value: { it?: string | null; en?: string | null }, lang: Lang): Lang | null {
  if (value[lang]) return lang;
  const other: Lang = lang === 'it' ? 'en' : 'it';
  return value[other] ? other : null;
}

function renderFlavor(pokemon: Pokemon, versionSlug: string, versionName: string, lang: Lang): string {
  const ui = t(lang);
  const entry = pokemon.flavor[versionSlug];
  const shown = entry ? pickLang(entry, lang) : null;
  if (!entry || !shown) {
    return `<p class="dialog__text dialog__text--empty">${esc(ui.noFlavor(versionName))}</p>`;
  }
  const note = shown !== lang ? `<p class="dialog__note">${esc(ui.flavorOtherLang)}</p>` : '';
  return `<p class="dialog__text" lang="${shown}">${esc(entry[shown]!)}</p>${note}`;
}

function renderDefense(types: string[], gen: number, lang: Lang): string {
  const ui = t(lang);
  const profile = defensiveProfile(types, gen);
  return DEFENSE_GROUPS.filter((g) => profile.get(g.m)?.length)
    .map(
      (g) => `<div class="matchup">
      <span class="matchup__mark">${g.mark}</span>
      <span class="matchup__label">${esc(ui.defenseLabels[g.m])}</span>
      ${chips(profile.get(g.m)!, lang)}
    </div>`,
    )
    .join('');
}

function renderOffense(types: string[], gen: number, lang: Lang): string {
  const ui = t(lang);
  return offensiveProfile(types, gen)
    .map((row) => {
      const lines = [
        [ui.superEffective, row.strong],
        [ui.notVeryEffective, row.weak],
        [ui.noEffect, row.immune],
      ] as const;
      const body = lines
        .filter(([, list]) => list.length)
        .map(
          ([label, list]) =>
            `<div class="offense__line"><span class="offense__label">${esc(label)}</span>${chips(list, lang)}</div>`,
        )
        .join('');
      return `<div class="offense">
        <h3 class="offense__title">${ui.movesOfType(typeChip(row.attack, lang))}</h3>
        ${body || `<p class="muted">${esc(ui.neutralAll)}</p>`}
      </div>`;
    })
    .join('');
}

function renderStats(stats: number[], lang: Lang): string {
  if (!stats.length) return '';
  const ui = t(lang);
  const total = stats.reduce((a, b) => a + b, 0);
  const rows = stats
    .map((value, i) => {
      const width = Math.min(value / 180, 1) * 100;
      return `<div class="stat">
        <span class="stat__label">${esc(ui.statLabels[i])}</span>
        <span class="stat__value">${value}</span>
        <span class="stat__bar" aria-hidden="true"><span style="width:${width.toFixed(1)}%"></span></span>
      </div>`;
    })
    .join('');
  return `${rows}<div class="stat stat--total"><span class="stat__label">${esc(ui.total)}</span><span class="stat__value">${total}</span></div>`;
}

function renderAbilities(
  list: { id: number; hidden: boolean }[],
  abilities: Record<string, Ability>,
  lang: Lang,
): string {
  const ui = t(lang);
  if (!list.length) return `<p class="muted">${esc(ui.noAbilities)}</p>`;
  return list
    .map(({ id, hidden }) => {
      const ability = abilities[id];
      if (!ability) return '';
      const descLang = pickLang(ability.desc, lang);
      const desc = descLang ? ability.desc[descLang] : null;
      return `<div class="ability">
        <h3 class="ability__name">${esc(text(ability.name, lang))}${hidden ? ` <span class="tag">${esc(ui.hidden)}</span>` : ''}</h3>
        ${desc ? `<p class="ability__desc" lang="${descLang}">${esc(desc)}</p>` : ''}
      </div>`;
    })
    .join('');
}

function renderDex(pokemon: Pokemon, group: string, versionName: string, name: string, lang: Lang): string {
  const ui = t(lang);
  if (!isPresent(pokemon, group)) return `<p>${esc(ui.notInGame(name, versionName))}</p>`;
  const entries = pokemon.games[group];
  if (!entries.length) return `<p>${esc(ui.notInRegionalDex(versionName))}</p>`;
  return `<ul class="dex">${entries
    .map(
      (e) =>
        `<li><span class="dex__name">${esc(text(e.dex, lang))}</span><span class="dex__n">${esc(ui.dexNumber(e.n))}</span></li>`,
    )
    .join('')}</ul>`;
}
