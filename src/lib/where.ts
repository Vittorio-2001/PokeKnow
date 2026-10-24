// Dove e come ottenere un Pokémon in un gioco: incontri e frase sull'evoluzione.
// I dati vengono da scripts/fetch-data.mjs (encounters.json, evolutions.json).
import type { Lang, Localized } from './data';

export interface Encounter {
  /** id della zona (location area) */
  a: number;
  /** modo: walk, surf, old-rod, gift… */
  m: string;
  min: number;
  max: number;
  /** probabilità in percentuale, sommata sugli slot della zona */
  rate: number;
  /** condizioni non predefinite: time-night, swarm-yes… */
  c: string[];
}

export interface Evolution {
  from: number;
  fromName: Localized;
  /** ordine cronologico del primo gruppo di giochi in cui vale questa regola (0 = sempre) */
  since: number;
  trigger: string;
  level?: number;
  item?: Localized;
  held?: Localized;
  move?: Localized;
  moveType?: string;
  location?: Localized;
  happiness?: number;
  affection?: number;
  beauty?: number;
  time?: string;
  gender?: number;
  trade?: Localized;
  party?: Localized;
  partyType?: string;
  rain?: boolean;
  upsideDown?: boolean;
}

export interface WhereData {
  /** incontri per versione (solo quelle che hanno dati di incontri per questo Pokémon) */
  encounters: Record<string, Encounter[]>;
  /** nomi delle zone usate */
  areas: Record<string, Localized>;
  /** versioni per cui PokéAPI ha i dati degli incontri, per qualunque Pokémon */
  versionsWithData: string[];
  evolutions: Evolution[];
}

/** Le regole di evoluzione valide in un gioco: quelle del gruppo più recente non successivo al gioco. */
export function evolutionsFor(list: Evolution[], order: number): Evolution[] {
  const valid = list.filter((e) => e.since <= order);
  if (!valid.length) return [];
  const latest = Math.max(...valid.map((e) => e.since));
  return valid.filter((e) => e.since === latest);
}

type Words = {
  trade: string;
  tradeHolding: (item: string) => string;
  tradeFor: (species: string) => string;
  useItem: (item: string) => string;
  levelUp: string;
  atLevel: (n: number) => string;
  happiness: string;
  affection: string;
  beauty: string;
  time: Record<string, string>;
  holding: (item: string) => string;
  knowing: (move: string) => string;
  knowingType: (type: string) => string;
  at: (place: string) => string;
  female: string;
  male: string;
  withInParty: (species: string) => string;
  withTypeInParty: (type: string) => string;
  rain: string;
  upsideDown: string;
  special: string;
};

const WORDS: Record<Lang, Words> = {
  it: {
    trade: 'con uno scambio',
    tradeHolding: (item) => `con uno scambio tenendo ${item}`,
    tradeFor: (species) => `scambiandolo con ${species}`,
    useItem: (item) => `usando ${item}`,
    levelUp: 'salendo di livello',
    atLevel: (n) => `al livello ${n}`,
    happiness: 'con amicizia alta',
    affection: 'con affetto alto',
    beauty: 'con bellezza alta',
    time: { day: 'di giorno', night: 'di notte', dusk: 'al crepuscolo' },
    holding: (item) => `tenendo ${item}`,
    knowing: (move) => `conoscendo ${move}`,
    knowingType: (type) => `conoscendo una mossa di tipo ${type}`,
    at: (place) => `presso ${place}`,
    female: 'se è femmina',
    male: 'se è maschio',
    withInParty: (species) => `con ${species} in squadra`,
    withTypeInParty: (type) => `con un Pokémon di tipo ${type} in squadra`,
    rain: 'mentre piove',
    upsideDown: 'tenendo la console capovolta',
    special: 'in un modo particolare',
  },
  en: {
    trade: 'when traded',
    tradeHolding: (item) => `when traded holding ${item}`,
    tradeFor: (species) => `when traded for ${species}`,
    useItem: (item) => `with a ${item}`,
    levelUp: 'by leveling up',
    atLevel: (n) => `at level ${n}`,
    happiness: 'with high friendship',
    affection: 'with high affection',
    beauty: 'with high Beauty',
    time: { day: 'during the day', night: 'at night', dusk: 'at dusk' },
    holding: (item) => `holding ${item}`,
    knowing: (move) => `knowing ${move}`,
    knowingType: (type) => `knowing a ${type}-type move`,
    at: (place) => `at ${place}`,
    female: 'if female',
    male: 'if male',
    withInParty: (species) => `with ${species} in the party`,
    withTypeInParty: (type) => `with a ${type}-type Pokémon in the party`,
    rain: 'while it’s raining',
    upsideDown: 'holding the console upside down',
    special: 'in a special way',
  },
};

const name = (value: Localized | undefined, lang: Lang) => value?.[lang] ?? value?.en ?? value?.it ?? '';

/** "al livello 25", "con uno scambio", "usando Pietratuono", "salendo di livello di giorno con amicizia alta"… */
export function howItEvolves(e: Evolution, lang: Lang, typeName: (slug: string) => string): string {
  const w = WORDS[lang];
  const conditions: string[] = [];
  if (e.happiness) conditions.push(w.happiness);
  if (e.affection) conditions.push(w.affection);
  if (e.beauty) conditions.push(w.beauty);
  if (e.time && w.time[e.time]) conditions.push(w.time[e.time]);
  if (e.held && e.trigger !== 'trade') conditions.push(w.holding(name(e.held, lang)));
  if (e.move) conditions.push(w.knowing(name(e.move, lang)));
  if (e.moveType) conditions.push(w.knowingType(typeName(e.moveType)));
  if (e.location) conditions.push(w.at(name(e.location, lang)));
  if (e.gender === 1) conditions.push(w.female);
  if (e.gender === 2) conditions.push(w.male);
  if (e.party) conditions.push(w.withInParty(name(e.party, lang)));
  if (e.partyType) conditions.push(w.withTypeInParty(typeName(e.partyType)));
  if (e.rain) conditions.push(w.rain);
  if (e.upsideDown) conditions.push(w.upsideDown);

  let base: string;
  switch (e.trigger) {
    case 'trade':
      base = e.trade ? w.tradeFor(name(e.trade, lang)) : e.held ? w.tradeHolding(name(e.held, lang)) : w.trade;
      break;
    case 'use-item':
      base = e.item ? w.useItem(name(e.item, lang)) : w.special;
      break;
    case 'level-up':
      base = e.level ? w.atLevel(e.level) : w.levelUp;
      break;
    default:
      base = e.level ? w.atLevel(e.level) : w.special;
  }
  return [base, ...conditions].join(' ');
}
