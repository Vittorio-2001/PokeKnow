// Statistiche calcolate: valori minimi e massimi al livello 100, probabilità di cattura.
// Formule dalla Gen III in poi (le uniche generazioni che il sito copre).

/** Valore di una statistica a un livello, dati base, IV, EV e moltiplicatore della natura. */
export function statAt(base: number, index: number, level: number, iv: number, ev: number, nature: number): number {
  const core = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100);
  if (index === 0) return core + level + 10; // PS
  return Math.floor((core + 5) * nature);
}

/**
 * Intervallo a un livello: minimo con IV 0, EV 0 e natura sfavorevole,
 * massimo con IV 31, EV 252 e natura favorevole. Shedinja ha sempre 1 PS.
 */
export function statRange(base: number, index: number, pokemonId: number, level: number): [number, number] {
  if (index === 0 && pokemonId === 292) return [1, 1];
  const min = statAt(base, index, level, 0, 0, index === 0 ? 1 : 0.9);
  const max = statAt(base, index, level, 31, 252, index === 0 ? 1 : 1.1);
  return [min, max];
}

/** I livelli mostrati nella tabella: 50 (lotte ufficiali) e 100. */
export const RANGE_LEVELS = [50, 100];

/** Probabilità di cattura con una Poké Ball a PS pieni e senza stato, in percentuale. */
export function catchChance(captureRate: number): number {
  return Math.min(100, ((captureRate / 3) / 255) * 100);
}
