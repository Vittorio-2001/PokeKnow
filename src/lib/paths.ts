// Pagine dei Pokémon: le stesse per ogni lingua, cambia solo la cartella (/pokemon/ o /en/pokemon/).
import pokemonJson from '../data/generated/pokemon.json';
import encountersJson from '../data/generated/encounters.json';
import evolutionsJson from '../data/generated/evolutions.json';
import type { Encounter, Evolution, WhereData } from './where';
import type { Localized, Pokemon } from './data';

export interface Neighbour {
  slug: string;
  name: Localized;
  id: number;
}

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

export function pokemonPaths() {
  const all = pokemonJson as Pokemon[];
  const neighbour = (p: Pokemon | undefined): Neighbour | null => (p ? { slug: p.slug, name: p.name, id: p.id } : null);
  return all.map((pokemon, i) => ({
    params: { slug: pokemon.slug },
    props: { pokemon, where: whereFor(pokemon), prev: neighbour(all[i - 1]), next: neighbour(all[i + 1]) },
  }));
}
