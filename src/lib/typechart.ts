// Calcolo di debolezze, resistenze e copertura offensiva per una generazione.
import { CHART, TYPES } from './data';

export type Multiplier = 0 | 0.25 | 0.5 | 1 | 2 | 4;

function chartFor(gen: number) {
  const chart = CHART[String(gen)];
  if (!chart) throw new Error(`Nessuna tabella dei tipi per la generazione ${gen}`);
  return chart;
}

export function typesInGen(gen: number): string[] {
  return TYPES.filter((t) => t.gen <= gen).map((t) => t.slug);
}

/** Moltiplicatore di un attacco di tipo `attack` contro un difensore con tipi `defense`. */
export function effectiveness(attack: string, defense: string[], gen: number): number {
  const row = chartFor(gen)[attack] ?? {};
  return defense.reduce((acc, def) => acc * (row[def] ?? 1), 1);
}

/** Per ogni tipo attaccante, quanto fa al Pokémon. Esclude i neutri. */
export function defensiveProfile(defense: string[], gen: number): Map<number, string[]> {
  const groups = new Map<number, string[]>();
  for (const attack of typesInGen(gen)) {
    const m = effectiveness(attack, defense, gen);
    if (m === 1) continue;
    if (!groups.has(m)) groups.set(m, []);
    groups.get(m)!.push(attack);
  }
  return groups;
}

export interface OffensiveRow {
  attack: string;
  strong: string[];
  weak: string[];
  immune: string[];
}

/** Cosa fanno le mosse dello stesso tipo del Pokémon (STAB) contro ogni tipo singolo. */
export function offensiveProfile(own: string[], gen: number): OffensiveRow[] {
  const all = typesInGen(gen);
  return own.map((attack) => {
    const row = chartFor(gen)[attack] ?? {};
    return {
      attack,
      strong: all.filter((d) => row[d] === 2),
      weak: all.filter((d) => row[d] === 0.5),
      immune: all.filter((d) => row[d] === 0),
    };
  });
}
