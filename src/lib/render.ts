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
import { type Evolution, type WhereData, evolutionsFor, howItEvolves, placeName, whereSummary } from './where';
import { type ChainMember, type ChainNode, chainTree } from './chain';
import { RANGE_LEVELS, statRange } from './stats';
import { GAME_PARAM, localePath } from './i18n';
import { href } from './url';

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

const CRIES = 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon';

/**
 * Verso del Pokémon: fino alla Gen V quello originale ("legacy"), dopo quello attuale.
 * Il verso originale non esiste per tutti: lo script della pagina ripiega su quello attuale.
 */
export function cryUrl(id: number, gen: number): { primary: string; fallback: string } {
  const latest = `${CRIES}/latest/${id}.ogg`;
  return { primary: gen <= 5 ? `${CRIES}/legacy/${id}.ogg` : latest, fallback: latest };
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
  chain?: ChainMember[],
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
      stats: renderStats(pokemon.statsByGen[gen] ?? [], pokemon.evsByGen?.[gen] ?? [], pokemon.id, lang),
      chain: chain ? renderChain(chain, pokemon.id, version.slug, game.group, gen, game.order, lang) : '',
      abilities: NO_ABILITIES.has(game.group)
        ? `<p class="muted">${esc(ui.noAbilitiesInGame(versionName))}</p>`
        : renderAbilities(pokemon.abilitiesByGen[gen] ?? [], abilities, lang),
      dex: renderDex(pokemon, game.group, versionName, name, lang),
      where: where
        ? renderWhere(where, versionSlug, game.order, versionName, lang, game.versions.map((v) => v.slug).filter((v) => v !== versionSlug))
        : '',
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

function renderStats(stats: number[], evs: number[], pokemonId: number, lang: Lang): string {
  if (!stats.length) return '';
  const ui = t(lang);
  const total = stats.reduce((a, b) => a + b, 0);
  const head = `<div class="stat stat--head" aria-hidden="true"><span></span><span></span><span></span>${RANGE_LEVELS.map(
    (level) => `<span class="stat__range">${esc(ui.learnLevel(level))}</span>`,
  ).join('')}</div>`;
  const rows = stats
    .map((value, i) => {
      const width = Math.min(value / 180, 1) * 100;
      const ranges = RANGE_LEVELS.map((level) => {
        const [min, max] = statRange(value, i, pokemonId, level);
        return `<span class="stat__range" title="${esc(ui.rangeTitle(level))}">${min}–${max}</span>`;
      }).join('');
      return `<div class="stat">
        <span class="stat__label">${esc(ui.statLabels[i])}</span>
        <span class="stat__value">${value}</span>
        <span class="stat__bar" aria-hidden="true"><span style="width:${width.toFixed(1)}%"></span></span>
        ${ranges}
      </div>`;
    })
    .join('');
  const evText = evs
    .map((n, i) => (n ? `+${n} ${ui.statLabels[i]}` : ''))
    .filter(Boolean)
    .join(', ');
  return `${head}${rows}<div class="stat stat--total"><span class="stat__label">${esc(ui.total)}</span><span class="stat__value">${total}</span></div>
    <p class="stat__note">${esc(ui.rangeNote)}</p>
    ${evText ? `<p class="evs"><span class="evs__label">${esc(ui.evYield)}</span> <strong>${esc(evText)}</strong></p>` : ''}`;
}

const ITEMS = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items';

// Icona dello scambio: disegnata per PokéKnow (due frecce opposte), 16×16.
const TRADE_ICON =
  '<svg class="evo__icon" viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges"><path fill="currentColor" d="M10 2h1v1h1v1h1v1h1v1h-1v1h-1v1h-1v1h-1V7H2V5h8zM6 7h-1v1H4v1H3v1H2v1h1v1h1v1h1v1h1v-2h8V9H6z"/></svg>';

/**
 * Le icone che accompagnano la condizione di evoluzione: lo sprite dell'oggetto da usare o da tenere,
 * la Caramella Rara per il livello, il Calmanella per l'amicizia, le frecce per lo scambio.
 */
export function evoIcons(rules: Evolution[], lang: Lang): string {
  const ui = t(lang);
  const icons = new Map<string, string>();
  const item = (slug: string, label: string) =>
    icons.set(
      slug,
      `<img class="evo__icon pixelated" src="${ITEMS}/${slug}.png" alt="" title="${esc(label)}" width="30" height="30" loading="lazy" />`,
    );
  for (const r of rules) {
    if (r.trigger === 'trade') icons.set('trade', TRADE_ICON);
    else if (r.trigger === 'use-item' && r.itemSlug) item(r.itemSlug, text(r.item, lang));
    else if (r.trigger === 'level-up') {
      if (r.happiness || r.affection) item('soothe-bell', ui.friendship);
      else item('rare-candy', ui.levelUp);
    }
    if (r.heldSlug) item(r.heldSlug, text(r.held, lang));
  }
  return icons.size ? `<span class="evo__icons">${[...icons.values()].join('')}</span>` : '';
}

/** Catena evolutiva: ogni stadio con sprite dell'epoca, nome e come ci si arriva in questo gioco. */
function renderChain(
  members: ChainMember[],
  currentId: number,
  versionSlug: string,
  group: string,
  gen: number,
  order: number,
  lang: Lang,
): string {
  const ui = t(lang);
  const trees = chainTree(members, gen, order);
  const count = (nodes: ChainNode[]): number => nodes.reduce((n, node) => n + 1 + count(node.next), 0);
  if (count(trees) <= 1) return `<p class="muted">${esc(ui.noEvolution)}</p>`;
  const typeName = (slug: string) => text(TYPE_BY_SLUG.get(slug)?.name, lang);
  const pixel = themeFor(group).pixel;

  const node = (n: ChainNode): string => {
    const m = n.member;
    const name = text(m.name, lang);
    const link = `${href(localePath(lang, `pokemon/${m.slug}/`))}?${GAME_PARAM[lang]}=${versionSlug}`;
    const current = m.id === currentId;
    const card = `<a class="evo__mon${current ? ' is-current' : ''}" href="${link}"${current ? ' aria-current="page"' : ''}>
      <img class="${pixel ? 'pixelated' : ''}" src="${spriteUrl(m.id, group)}" alt="" width="64" height="64" loading="lazy" />
      <span class="evo__name">${esc(name)}</span>
    </a>`;
    const many = n.next.length > 3;
    const how = (child: ChainNode) =>
      `<span class="evo__how">${evoIcons(child.rules, lang)}<span class="evo__text">${esc(howOrUnknown(child, ui.evolvesSomehow))}</span></span>`;
    const step = (child: ChainNode) =>
      many
        ? `<li class="evo__step">${node(child)}${how(child)}</li>`
        : `<li class="evo__step">${how(child)}${node(child)}</li>`;
    // Con tante evoluzioni (Eevee) una sola freccia porta a una griglia, e ogni carta dice come ci si arriva.
    const next = n.next.length
      ? `${many ? '<span class="evo__arrow" aria-hidden="true"></span>' : ''}<ul class="evo__next${many ? ' evo__next--many' : ''}">${n.next.map(step).join('')}</ul>`
      : '';
    return `<div class="evo">${card}${next}</div>`;
  };
  function howOrUnknown(n: ChainNode, fallback: string): string {
    if (!n.rules.length) return fallback;
    return [...new Set(n.rules.map((r) => howItEvolves(r, lang, typeName)))].join(lang === 'it' ? ' oppure ' : ' or ');
  }
  return `<div class="chain">${trees.map(node).join('')}</div>`;
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

function renderSummary(where: WhereData, versionSlug: string, versionName: string, twins: string[], lang: Lang): string {
  const ui = t(lang);
  const area = (id: number) => text(where.areas[id], lang);
  const s = whereSummary(where, versionSlug, twins, area);
  const lines: string[] = [];
  if (s.exclusive) {
    const twinName = text(VERSION_BY_SLUG.get(s.exclusive.twin)?.name, lang);
    const text_ =
      s.exclusive.of === 'this'
        ? ui.exclusiveHere(versionName, twinName, s.exclusive.byEvolution)
        : ui.exclusiveTwin(twinName, versionName, s.exclusive.byEvolution);
    lines.push(`<p class="where__exclusive"><span class="tag">${esc(ui.exclusiveTag)}</span> ${esc(text_)}</p>`);
  }
  if (s.wild) lines.push(`<p>${esc(ui.wildSummary(s.wild.places, s.wild.level, placeName(area(s.wild.area))))}</p>`);
  if (s.gift) lines.push(`<p>${esc(ui.giftSummary(area(s.gift.area), s.gift.level, s.gift.egg))}</p>`);
  if (s.trade) lines.push(`<p>${esc(ui.tradeSummary(area(s.trade.area)))}</p>`);
  return lines.length ? `<div class="where__summary">${lines.join('')}</div>` : '';
}

function renderWhere(
  where: WhereData,
  versionSlug: string,
  order: number,
  versionName: string,
  lang: Lang,
  twins: string[] = [],
): string {
  const ui = t(lang);
  const summary = renderSummary(where, versionSlug, versionName, twins, lang);
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
    const other = evoLines.length || summary ? '' : ` ${esc(ui.whereOtherWays)}`;
    return `${summary}${evoHtml}<p class="muted">${esc(ui.whereNotWild)}${other}</p>`;
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
  return `${summary}${evoHtml}<ul class="where__list">${first}</ul>${more}`;
}
