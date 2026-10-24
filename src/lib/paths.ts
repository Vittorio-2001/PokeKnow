// Pagine dei Pokémon: le stesse per ogni lingua, cambia solo la cartella (/pokemon/ o /en/pokemon/).
import pokemonJson from '../data/generated/pokemon.json';
import type { Localized, Pokemon } from './data';

export interface Neighbour {
  slug: string;
  name: Localized;
  id: number;
}

export function pokemonPaths() {
  const all = pokemonJson as Pokemon[];
  const neighbour = (p: Pokemon | undefined): Neighbour | null => (p ? { slug: p.slug, name: p.name, id: p.id } : null);
  return all.map((pokemon, i) => ({
    params: { slug: pokemon.slug },
    props: { pokemon, prev: neighbour(all[i - 1]), next: neighbour(all[i + 1]) },
  }));
}
