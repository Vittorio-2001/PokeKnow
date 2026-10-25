// Funzioni di rendering condivise: le usa Astro per l'HTML iniziale (SSG)
// e lo script del browser quando cambi gioco. Una sola fonte di markup, in ogni lingua.
import {
  type Ability,
  type Lang,
  type Pokemon,
  TYPE_BY_SLUG,
  VERSIONS,
  VERSION_BY_SLUG,
  isPresent,
  text,
} from './data';
import { t } from './i18n';
import { defensiveProfile, offensiveProfile } from './typechart';
import { type Theme, themeFor } from './themes';
import { type WhereData, evolutionsFor, howItEvolves } from './where';

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

/** Sprite di un Pokémon nel gioco scelto; con shiny, la versione cromatica dello stesso set. */
export function spriteUrl(id: number, group?: string, shiny = false): string {
  const s = shiny ? 'shiny/' : '';
  if (!group) return `${SPRITES}/${s}${id}.png`;
  const file = SPRITE_FILE[group];
  if (file) {
    // la cartella "shiny" va subito prima del nome del file: …/emerald/shiny/94.png
    const path = file.replace('{id}', String(id)).replace(/([^/]+)$/, `${s}$1`);
    return `${SPRITES}/${path}`;
  }
  return themeFor(group).pixel ? `${SPRITES}/${s}${id}.png` : `${SPRITES}/other/home/${s}${id}.png`;
}

export function defaultSpriteUrl(id: number, shiny = false): string {
  return spriteUrl(id, undefined, shiny);
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
  spriteShiny: string;
  slots: Record<string, string>;
}

/** Tutto ciò che dipende dal gioco scelto, già in HTML, nella lingua della pagina. */
export function renderView(
  pokemon: Pokemon,
  abilities: Record<string, Ability>,
  versionSlug: string,
  lang: Lang,
  where?: WhereData,
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
    spriteShiny: spriteUrl(pokemon.id, game.group, true),
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
      where: where ? renderWhere(where, versionSlug, game.order, versionName, lang) : '',
    },
  };
}

/** La lingua in cui mostrare un testo: quella della pagina se c'è, altrimenti l'altra. */
function pickLang(value: { it?: string | null; en?: string | null }, lang: Lang): Lang | null {
  if (value[lang]) return lang;
  const other: Lang = lang === 'it' ? 'en' : 'it';
  return value[other] ? other : null;
}

export type FlavorChoice =
  | { kind: 'exact'; version: string; lang: Lang }
  | { kind: 'otherGame'; version: string; lang: Lang; original: Lang | null }
  | { kind: 'otherLang'; version: string; lang: Lang }
  | { kind: 'nearest'; version: string; lang: Lang }
  | { kind: 'none' };

/**
 * Quale voce del Pokédex mostrare per un gioco, in ordine di preferenza:
 * 1. la voce di quel gioco nella lingua della pagina;
 * 2. la voce nella lingua della pagina del gioco più vicino (prima l'altra versione della coppia),
 *    con il testo originale di quel gioco a portata di clic;
 * 3. la voce di quel gioco nell'altra lingua;
 * 4. la voce più vicina in qualunque lingua, per i giochi che non ne hanno nessuna.
 */
export function chooseFlavor(pokemon: Pokemon, versionSlug: string, lang: Lang): FlavorChoice {
  const other: Lang = lang === 'it' ? 'en' : 'it';
  const here = pokemon.flavor[versionSlug];
  if (here?.[lang]) return { kind: 'exact', version: versionSlug, lang };

  const index = VERSIONS.findIndex((v) => v.slug === versionSlug);
  const group = VERSIONS[index]?.game.group;
  const byDistance = VERSIONS.map((v, i) => ({ v, i }))
    .filter(({ v }) => v.slug !== versionSlug && pokemon.flavor[v.slug])
    .sort(
      (a, b) =>
        Number(a.v.game.group !== group) - Number(b.v.game.group !== group) ||
        Math.abs(a.i - index) - Math.abs(b.i - index) ||
        b.i - a.i, // a parità di distanza, il gioco più recente
    )
    .map(({ v }) => v.slug);

  const nearestInLang = byDistance.find((slug) => pokemon.flavor[slug]?.[lang]);
  if (nearestInLang) {
    const original = here?.[other] ? other : null;
    return here ? { kind: 'otherGame', version: nearestInLang, lang, original } : { kind: 'nearest', version: nearestInLang, lang };
  }
  if (here?.[other]) return { kind: 'otherLang', version: versionSlug, lang: other };
  const nearestAny = byDistance[0];
  if (nearestAny) return { kind: 'nearest', version: nearestAny, lang: pickLang(pokemon.flavor[nearestAny], lang)! };
  return { kind: 'none' };
}

function renderFlavor(pokemon: Pokemon, versionSlug: string, versionName: string, lang: Lang): string {
  const ui = t(lang);
  const choice = chooseFlavor(pokemon, versionSlug, lang);
  if (choice.kind === 'none') {
    return `<p class="dialog__text dialog__text--empty">${esc(ui.noFlavor(versionName))}</p>`;
  }
  const body = pokemon.flavor[choice.version][choice.lang]!;
  const text_ = `<p class="dialog__text" lang="${choice.lang}">${esc(body)}</p>`;
  const sourceName = text(VERSION_BY_SLUG.get(choice.version)?.name, lang);

  switch (choice.kind) {
    case 'exact':
      return text_;
    case 'otherLang':
      return `${text_}<p class="dialog__note">${esc(ui.flavorOtherLang)}</p>`;
    case 'nearest':
      return `${text_}<p class="dialog__note">${esc(ui.flavorNearest(sourceName, versionName))}</p>`;
    case 'otherGame': {
      const note = `<p class="dialog__note">${esc(ui.flavorFromGame(sourceName, versionName))}</p>`;
      if (!choice.original) return text_ + note;
      const original = pokemon.flavor[versionSlug][choice.original]!;
      return `${text_}${note}<details class="dialog__alt">
        <summary>${esc(ui.showOriginal(versionName, ui.langNameIn[choice.original]))}</summary>
        <p lang="${choice.original}">${esc(original)}</p>
      </details>`;
    }
  }
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

// Modi di incontro in cui la probabilità non ha senso: il Pokémon è lì e basta.
const SURE = new Set(['gift', 'gift-egg', 'static', 'npc-trade', 'roaming-grass', 'roaming-water', 'devon-scope']);
const MAX_ROWS = 8;

const SLOT2_GAMES: Record<string, Record<Lang, string>> = {
  ruby: { it: 'Rubino', en: 'Ruby' },
  sapphire: { it: 'Zaffiro', en: 'Sapphire' },
  emerald: { it: 'Smeraldo', en: 'Emerald' },
  firered: { it: 'Rosso Fuoco', en: 'FireRed' },
  leafgreen: { it: 'Verde Foglia', en: 'LeafGreen' },
};

/** Condizioni alternative in una frase: "con Rubino o Zaffiro nello slot GBA", "con la pioggia o con il temporale". */
export function conditionText(conds: string[], lang: Lang): string {
  const ui = t(lang);
  const or = lang === 'it' ? ' o ' : ' or ';
  const slot2 = conds.filter((c) => c.startsWith('slot2-')).map((c) => SLOT2_GAMES[c.slice(6)]?.[lang]).filter(Boolean);
  const others = conds.filter((c) => !c.startsWith('slot2-')).map((c) => ui.conditions[c]).filter(Boolean);
  const parts = [...others];
  if (slot2.length) parts.unshift(lang === 'it' ? `con ${slot2.join(or)} nello slot GBA` : `with ${slot2.join(or)} in the GBA slot`);
  return parts.join(or);
}

function renderWhere(where: WhereData, versionSlug: string, order: number, versionName: string, lang: Lang): string {
  const ui = t(lang);
  const typeName = (slug: string) => text(TYPE_BY_SLUG.get(slug)?.name, lang);
  const evolutions = evolutionsFor(where.evolutions, order);
  const evoLines = [
    ...new Set(evolutions.map((e) => ui.evolvesFrom(text(e.fromName, lang), howItEvolves(e, lang, typeName)))),
  ];
  const evoHtml = evoLines.length ? `<ul class="where__evo">${evoLines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : '';

  if (!where.versionsWithData.includes(versionSlug)) {
    return `${evoHtml}<p class="muted">${esc(ui.whereNoData(versionName))}</p>`;
  }
  const list = where.encounters[versionSlug] ?? [];
  if (!list.length) {
    return `${evoHtml}<p class="muted">${esc(ui.whereNotWild)} ${evoLines.length ? '' : esc(ui.whereOtherWays)}</p>`;
  }

  const row = (e: (typeof list)[number]) => {
    const place = text(where.areas[e.a], lang) || '—';
    const method = ui.methods[e.m] ?? e.m.replaceAll('-', ' ');
    const levels = e.min === e.max ? `${e.min}` : `${e.min}–${e.max}`;
    const conds = conditionText(e.c, lang);
    const showRate = !SURE.has(e.m) && e.rate > 0 && e.rate < 100;
    const rate = `<span class="where__rate">${showRate ? `${e.rate}%` : ''}</span>`;
    return `<li class="where__row">
      <span class="where__place">${esc(place)}</span>
      <span class="where__method">${esc(method)}${conds ? ` <span class="where__cond">${esc(conds)}</span>` : ''}</span>
      <span class="where__lv">${esc(ui.learnLevel(Number(e.min)).replace(/\d+$/, levels))}</span>
      ${rate}
    </li>`;
  };

  const first = list.slice(0, MAX_ROWS).map(row).join('');
  const rest = list.slice(MAX_ROWS);
  const more = rest.length
    ? `<details class="where__more"><summary>${esc(ui.moreLocations(rest.length))}</summary><ul class="where__list">${rest.map(row).join('')}</ul></details>`
    : '';
  return `${evoHtml}<ul class="where__list">${first}</ul>${more}`;
}
