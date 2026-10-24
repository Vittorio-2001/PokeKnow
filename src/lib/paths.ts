// Pagine dei Pokémon: le stesse per ogni lingua, cambia solo la cartella (/pokemon/ o /en/pokemon/).
import pokemonJson from '../data/generated/pokemon.json';
import learnsetsJson from '../data/generated/learnsets.json';
import movesJson from '../data/generated/moves.json';
import naturesJson from '../data/generated/natures.json';
import encountersJson from '../data/generated/encounters.json';
import evolutionsJson from '../data/generated/evolutions.json';
import type { Encounter, Evolution, WhereData } from './where';
import { type Build, type Learnset, type MoveInfo, type NatureInfo, computeBuild } from './builds';
import { GAMES, type Localized, type Pokemon, isPresent } from './data';

export interface Neighbour {
  slug: string;
  name: Localized;
  id: number;
}

const learnsets = learnsetsJson as unknown as Record<string, Record<string, Learnset>>;
const moves = movesJson as unknown as Record<string, MoveInfo>;
const natures = naturesJson as NatureInfo[];
const encounterData = encountersJson as unknown as {
  versions: string[];
  areas: Record<string, Localized>;
  encounters: Record<string, Record<string, Encounter[]>>;
};
const evolutions = evolutionsJson as unknown as Record<string, Evolution[]>;

/** Dove trovarlo: solo i dati di questo Pokémon, con i nomi delle sole zone che servono. */
export function whereFor(pokemon: Pokemon): WhereData {
  const encounters = encounterData.encounters[pokemon.id] ?? {};
  const areaIds = new Set(Object.values(encounters).flat().map((e) => String(e.a)));
  return {
    encounters,
    areas: Object.fromEntries([...areaIds].map((id) => [id, encounterData.areas[id]])),
    versionsWithData: encounterData.versions,
    evolutions: evolutions[pokemon.id] ?? [],
  };
}

/**
 * Build per ogni gioco in cui il Pokémon è presente. Un gioco senza learnset nei dati
 * (per ora Leggende: Z-A) non compare tra le chiavi: la pagina lo spiega.
 */
export function buildsFor(pokemon: Pokemon): Record<string, Build | null> {
  const result: Record<string, Build | null> = {};
  const own = learnsets[pokemon.id] ?? {};
  for (const game of GAMES) {
    if (!isPresent(pokemon, game.group) || !(game.group in own)) continue;
    result[game.group] = computeBuild({
      types: pokemon.typesByGen[game.gen] ?? [],
      stats: pokemon.statsByGen[game.gen] ?? [],
      gen: game.gen,
      order: game.order,
      learnset: own[game.group],
      moves,
      natures,
    });
  }
  return result;
}

export function pokemonPaths() {
  const all = pokemonJson as Pokemon[];
  const neighbour = (p: Pokemon | undefined): Neighbour | null => (p ? { slug: p.slug, name: p.name, id: p.id } : null);
  return all.map((pokemon, i) => ({
    params: { slug: pokemon.slug },
    props: { pokemon, builds: buildsFor(pokemon), where: whereFor(pokemon), prev: neighbour(all[i - 1]), next: neighbour(all[i + 1]) },
  }));
}
