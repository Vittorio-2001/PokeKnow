// Tipi dei dati generati da scripts/fetch-data.mjs.
import typesJson from '../data/generated/types.json';
import gamesJson from '../data/generated/games.json';

export type Lang = 'it' | 'en';
export type Localized = Partial<Record<Lang, string | null>>;

export interface TypeInfo {
  slug: string;
  gen: number;
  name: Localized;
  color: string;
}

/** chart[gen][attacco][difesa] = moltiplicatore; le coppie neutre (×1) non sono salvate. */
export type TypeChart = Record<string, Record<string, Record<string, number>>>;

export interface GameVersion {
  slug: string;
  id: number;
  name: Localized;
}

export interface Game {
  group: string;
  groupId: number;
  gen: number;
  order: number;
  nationalLimit: number | null;
  dexes: number[];
  versions: GameVersion[];
}

export interface AbilityRef {
  id: number;
  hidden: boolean;
}

export interface Ability {
  name: Localized;
  desc: Localized;
}

export interface RegionalEntry {
  dex: Localized;
  n: number;
}

export interface Pokemon {
  id: number;
  slug: string;
  name: Localized;
  genus: Localized;
  gen: number;
  height: number;
  weight: number;
  legendary: boolean;
  mythical: boolean;
  typesByGen: Record<string, string[]>;
  statsByGen: Record<string, number[]>;
  /** EV che si ottengono sconfiggendolo, nello stesso ordine delle statistiche */
  evsByGen: Record<string, number[]>;
  abilitiesByGen: Record<string, AbilityRef[]>;
  flavor: Record<string, Localized>;
  /** Gruppi di giochi in cui è presente, con l'eventuale numero nei Pokédex regionali. */
  games: Record<string, RegionalEntry[]>;
  capture: number;
  happiness: number | null;
  baseExp: number | null;
  growth: string | null;
  /** -1 senza genere, altrimenti ottavi di probabilità di essere femmina */
  genderRate: number;
  hatch: number | null;
  eggGroups: Localized[];
  chain: number;
  /** forma del corpo, come nella ricerca per forma del Pokédex */
  shape: string | null;
  /** Megaevoluzioni, con i giochi in cui esistono */
  megas?: Mega[];
  /** solo per una forma Mega: l'id PokéAPI della forma, per lo sprite */
  spriteId?: number;
}

export interface Mega {
  /** id PokéAPI della forma (per sprite) */
  id: number;
  slug: string;
  /** '' per una Mega sola, altrimenti 'x', 'y' o 'z' */
  suffix: string;
  name: Localized;
  types: string[];
  stats: number[];
  abilities: AbilityRef[];
  height: number;
  weight: number;
  /** gruppi di giochi in cui esiste */
  groups: string[];
  stone?: { slug: string; name: Localized };
  /** mossa richiesta al posto della Megapietra (Rayquaza) */
  move?: Localized;
}

export interface IndexEntry {
  id: number;
  slug: string;
  name: Localized;
  types: string[];
  shape: string | null;
}

export const TYPES = (typesJson as { types: TypeInfo[] }).types;
export const CHART = (typesJson as { chart: TypeChart }).chart;
export const GAMES = gamesJson as Game[];

export const TYPE_BY_SLUG = new Map(TYPES.map((t) => [t.slug, t]));

/** Ogni versione (Rubino, Zaffiro…) con il suo gruppo di giochi. */
export const VERSIONS = GAMES.flatMap((game) => game.versions.map((version) => ({ ...version, game })));
export const VERSION_BY_SLUG = new Map(VERSIONS.map((v) => [v.slug, v]));

export function text(value: Localized | undefined, lang: Lang = 'it'): string {
  if (!value) return '';
  return value[lang] ?? value.it ?? value.en ?? '';
}

export function isPresent(pokemon: Pokemon, group: string): boolean {
  return group in pokemon.games;
}

/**
 * Il gioco più recente in cui il Pokémon c'è e ha una voce del Pokédex nella lingua della pagina;
 * poi in un'altra lingua; altrimenti il più recente in cui c'è.
 */
export function defaultVersion(pokemon: Pokemon, lang: Lang = 'it'): string {
  const present = VERSIONS.filter((v) => isPresent(pokemon, v.game.group));
  const inLang = present.filter((v) => pokemon.flavor[v.slug]?.[lang]);
  const withText = present.filter((v) => pokemon.flavor[v.slug]);
  const pick = [inLang, withText, present].find((list) => list.length)?.at(-1) ?? VERSIONS.at(-1)!;
  return pick.slug;
}

export function padId(id: number): string {
  return String(id).padStart(4, '0');
}
