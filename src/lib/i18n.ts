// Testi dell'interfaccia in tutte le lingue del sito.
// L'italiano è alla radice (/), l'inglese sotto /en/. Per aggiungere una lingua:
// una voce in LANGS, un blocco in UI con le stesse chiavi (lo controlla un test) e le pagine in src/pages/<lingua>/.
import type { Lang } from './data';

export const LANGS: Lang[] = ['it', 'en'];
export const DEFAULT_LANG: Lang = 'it';

export const LANG_NAMES: Record<Lang, string> = { it: 'Italiano', en: 'English' };

const it = {
  // pagina e testata
  siteTagline: 'un Pokédex per ogni generazione',
  homeDescription:
    'Cerca un Pokémon e scopri tipi, debolezze, statistiche, abilità e voce del Pokédex in ogni gioco, dal Game Boy Advance a oggi.',
  pokemonDescription: (name: string, genus: string) =>
    `${name}, ${genus}: tipi, debolezze, statistiche, abilità e voce del Pokédex in ogni gioco.`,
  navMain: 'Principale',
  navSearch: 'Cerca',
  switchLanguage: 'Lingua',

  // home
  searchTitle: 'Cerca un Pokémon',
  searchLead: 'Un Pokédex per ogni generazione: apri un Pokémon, scegli il gioco e la scheda cambia con lui.',
  searchLabel: 'Nome o numero del Pokémon',
  searchPlaceholder: 'Nome o numero, per esempio Gengar o 94',
  count: (n: number) => `${n} Pokémon`,
  filterByType: 'Filtra per tipo',
  listHeading: 'Elenco',
  typeOf: (types: string[]) => `Tipo ${types.join(' e ')}`,
  empty: 'Nessun Pokémon corrisponde alla ricerca. Prova con un altro nome o togli un filtro.',

  // scheda
  game: 'Gioco',
  generation: (g: string) => `Generazione ${g}`,
  absent: '(assente)',
  spriteAlt: (name: string, game: string) => `Sprite di ${name} in ${game}`,
  dexOf: (game: string) => `Pokédex di ${game}`,
  height: 'Altezza',
  weight: 'Peso',
  debut: 'Debutto',
  legendary: 'Leggendario',
  mythical: 'Misterioso',
  defense: 'In difesa',
  offense: 'In attacco',
  offenseAside: 'Efficacia delle mosse dello stesso tipo del Pokémon',
  baseStats: 'Statistiche base',
  abilities: 'Abilità',
  regionalDex: 'Pokédex regionale',
  nearby: 'Pokémon vicini',
  previous: 'Precedente',
  next: 'Successivo',

  // sezioni che cambiano con il gioco
  rulesOf: (g: string) => `Regole della Generazione ${g}`,
  noFlavor: (game: string) => `In ${game} non c’è ancora una voce del Pokédex per questo Pokémon nei dati che usiamo.`,
  flavorOtherLang: 'Testo originale in inglese: il gioco non ha una traduzione italiana di questa voce.',
  flavorFromGame: (source: string, game: string) => `Voce di ${source}: in ${game} non è disponibile in italiano.`,
  flavorNearest: (source: string, game: string) => `In ${game} non c’è ancora una voce: questa viene da ${source}.`,
  showOriginal: (game: string, language: string) => `Mostra il testo originale di ${game} (${language})`,
  langNameIn: { it: 'italiano', en: 'inglese' } as Record<Lang, string>,
  defenseLabels: { 4: 'Debolissimo', 2: 'Debole', 0.5: 'Resiste', 0.25: 'Resiste molto', 0: 'Immune' } as Record<number, string>,
  superEffective: 'Superefficaci contro',
  notVeryEffective: 'Poco efficaci contro',
  noEffect: 'Nessun effetto su',
  movesOfType: (chip: string) => `Mosse di tipo ${chip}`,
  neutralAll: 'Neutre contro tutti i tipi.',
  statLabels: ['PS', 'Attacco', 'Difesa', 'Att. Sp.', 'Dif. Sp.', 'Velocità'],
  total: 'Totale',
  noAbilitiesInGame: (game: string) => `In ${game} i Pokémon non hanno abilità.`,
  noAbilities: 'Nessuna abilità in questo gioco.',
  hidden: 'Nascosta',
  notInGame: (name: string, game: string) => `${name} non è presente in ${game}.`,
  notInRegionalDex: (game: string) =>
    `Non compare nel Pokédex regionale di ${game}, ma è presente nel Pokédex Nazionale del gioco.`,
  dexNumber: (n: number) => `n. ${n}`,

  // piè di pagina
  footerDisclaimer:
    'PokéKnow è un progetto amatoriale e senza scopo di lucro. Non è affiliato con Nintendo, Creatures Inc., GAME FREAK o The Pokémon Company. Pokémon e i nomi dei personaggi sono marchi dei rispettivi proprietari. I temi sono ispirati alle interfacce dei giochi di ogni epoca.',
  footerData: 'Dati e sprite',
  footerIcon: 'Icona',
  footerIconBy: 'di Those Icons su',
};

type Dictionary = typeof it;

const en: Dictionary = {
  siteTagline: 'a Pokédex for every generation',
  homeDescription:
    'Look up any Pokémon and see its types, matchups, stats, abilities and Pokédex entry in every game, from the Game Boy Advance to today.',
  pokemonDescription: (name, genus) =>
    `${name}, the ${genus}: types, matchups, stats, abilities and Pokédex entry in every game.`,
  navMain: 'Main',
  navSearch: 'Search',
  switchLanguage: 'Language',

  searchTitle: 'Find a Pokémon',
  searchLead: 'A Pokédex for every generation: open a Pokémon, pick a game and the page changes with it.',
  searchLabel: 'Pokémon name or number',
  searchPlaceholder: 'Name or number, like Gengar or 94',
  count: (n) => `${n} Pokémon`,
  filterByType: 'Filter by type',
  listHeading: 'List',
  typeOf: (types) => `${types.join(' and ')} type`,
  empty: 'No Pokémon matches your search. Try another name or remove a filter.',

  game: 'Game',
  generation: (g) => `Generation ${g}`,
  absent: '(not in this game)',
  spriteAlt: (name, game) => `${name} sprite in ${game}`,
  dexOf: (game) => `${game} Pokédex`,
  height: 'Height',
  weight: 'Weight',
  debut: 'Debut',
  legendary: 'Legendary',
  mythical: 'Mythical',
  defense: 'Defending',
  offense: 'Attacking',
  offenseAside: 'How moves of the Pokémon’s own types perform',
  baseStats: 'Base stats',
  abilities: 'Abilities',
  regionalDex: 'Regional Pokédex',
  nearby: 'Nearby Pokémon',
  previous: 'Previous',
  next: 'Next',

  rulesOf: (g) => `Generation ${g} rules`,
  noFlavor: (game) => `Our data has no ${game} Pokédex entry for this Pokémon yet.`,
  flavorOtherLang: 'Shown in Italian: no English entry is available for this game.',
  flavorFromGame: (source, game) => `Entry from ${source}: ${game} has no English entry.`,
  flavorNearest: (source, game) => `${game} has no entry yet: this one is from ${source}.`,
  showOriginal: (game, language) => `Show the original ${game} text (${language})`,
  langNameIn: { it: 'Italian', en: 'English' },
  defenseLabels: { 4: 'Very weak', 2: 'Weak', 0.5: 'Resists', 0.25: 'Strongly resists', 0: 'Immune' },
  superEffective: 'Super effective against',
  notVeryEffective: 'Not very effective against',
  noEffect: 'No effect on',
  movesOfType: (chip) => `${chip} moves`,
  neutralAll: 'Neutral against every type.',
  statLabels: ['HP', 'Attack', 'Defense', 'Sp. Atk', 'Sp. Def', 'Speed'],
  total: 'Total',
  noAbilitiesInGame: (game) => `Pokémon have no abilities in ${game}.`,
  noAbilities: 'No abilities in this game.',
  hidden: 'Hidden',
  notInGame: (name, game) => `${name} isn’t in ${game}.`,
  notInRegionalDex: (game) =>
    `It isn’t in the ${game} regional Pokédex, but it is in the game’s National Pokédex.`,
  dexNumber: (n) => `No. ${n}`,

  footerDisclaimer:
    'PokéKnow is a free, non-commercial fan project. It is not affiliated with Nintendo, Creatures Inc., GAME FREAK or The Pokémon Company. Pokémon and Pokémon character names are trademarks of their respective owners. The themes are inspired by the interfaces of each era’s games.',
  footerData: 'Data and sprites',
  footerIcon: 'Icon',
  footerIconBy: 'by Those Icons on',
};

export const UI: Record<Lang, Dictionary> = { it, en };

export function t(lang: Lang): Dictionary {
  return UI[lang] ?? UI[DEFAULT_LANG];
}

export function isLang(value: string | undefined | null): value is Lang {
  return !!value && (LANGS as string[]).includes(value);
}

/** Percorso interno nella lingua scelta, senza la base del sito: 'pokemon/gengar/' → 'en/pokemon/gengar/'. */
export function localePath(lang: Lang, path = ''): string {
  const clean = path.replace(/^\//, '');
  return lang === DEFAULT_LANG ? clean : `${lang}/${clean}`;
}

/** Il parametro dell'URL con il gioco scelto, nella lingua della pagina. */
export const GAME_PARAM: Record<Lang, string> = { it: 'gioco', en: 'game' };
