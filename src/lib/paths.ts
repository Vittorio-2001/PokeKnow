// Pagine dei Pokémon: le stesse per ogni lingua, cambia solo la cartella (/pokemon/ o /en/pokemon/).
import pokemonJson from '../data/generated/pokemon.json';
import encountersJson from '../data/generated/encounters.json';
import evolutionsJson from '../data/generated/evolutions.json';
import type { Encounter, Evolution, WhereData } from './where';
import type { ChainMember } from './chain';
import learnsetsJson from '../data/generated/learnsets.json';
import movesJson from '../data/generated/moves.json';
import type { LearnEntry, MoveInfo, MovesData } from './moves';
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
/** Versioni in cui si può ottenere almeno una pre-evoluzione (risalendo tutta la linea evolutiva). */
function chainAvailability(id: number): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  const seen = new Set<number>();
  let current = evolutions[id]?.[0]?.from;
  while (current && !seen.has(current)) {
    seen.add(current);
    for (const [version, list] of Object.entries(encounterData.encounters[current] ?? {})) {
      if (list.length) result[version] = true;
    }
    current = evolutions[current]?.[0]?.from;
  }
  return result;
}

export function whereFor(pokemon: Pokemon): WhereData {
  const encounters = encounterData.encounters[pokemon.id] ?? {};
  const areaIds = new Set(Object.values(encounters).flat().map((e) => String(e.a)));
  return {
    encounters,
    areas: Object.fromEntries([...areaIds].map((id) => [id, encounterData.areas[id]])),
    versionsWithData: encounterData.versions,
    evolutions: evolutions[pokemon.id] ?? [],
    chain: chainAvailability(pokemon.id),
  };
}

const byChain = new Map<number, Pokemon[]>();
for (const p of pokemonJson as Pokemon[]) {
  if (!byChain.has(p.chain)) byChain.set(p.chain, []);
  byChain.get(p.chain)!.push(p);
}

/** Tutta la famiglia evolutiva, con le regole di evoluzione di ogni membro. */
export function chainFor(pokemon: Pokemon): ChainMember[] {
  return (byChain.get(pokemon.chain) ?? [pokemon]).map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    gen: p.gen,
    from: evolutions[p.id]?.[0]?.from ?? null,
    rules: evolutions[p.id] ?? [],
  }));
}

const learnsets = learnsetsJson as unknown as Record<string, Record<string, LearnEntry[]>>;
const allMoves = movesJson as unknown as Record<string, MoveInfo>;

/** Le mosse di un Pokémon in tutti i giochi, con i dati delle sole mosse che usa. */
export function movesFor(id: number): MovesData {
  const own = learnsets[id] ?? {};
  const ids = new Set(Object.values(own).flat().map((e) => String(e[0])));
  return { learnsets: own, moves: Object.fromEntries([...ids].map((m) => [m, allMoves[m]])) };
}

export function pokemonPaths() {
  const all = pokemonJson as Pokemon[];
  const neighbour = (p: Pokemon | undefined): Neighbour | null => (p ? { slug: p.slug, name: p.name, id: p.id } : null);
  return all.map((pokemon, i) => ({
    params: { slug: pokemon.slug },
    props: { pokemon, where: whereFor(pokemon), chain: chainFor(pokemon), prev: neighbour(all[i - 1]), next: neighbour(all[i + 1]) },
  }));
}
