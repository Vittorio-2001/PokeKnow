import { describe, expect, it } from 'vitest';
import { catchChance, statRange, statAt } from '../src/lib/stats';

describe('statistiche calcolate', () => {
  it('Gengar al livello 100: valori noti', () => {
    expect(statRange(60, 0, 94, 100)).toEqual([230, 324]); // PS
    expect(statRange(130, 3, 94, 100)).toEqual([238, 394]); // Att. Sp.
    expect(statRange(110, 5, 94, 100)).toEqual([202, 350]); // Velocità
  });

  it('Gengar al livello 50: valori noti', () => {
    expect(statRange(60, 0, 94, 50)).toEqual([120, 167]); // PS
    expect(statRange(130, 3, 94, 50)).toEqual([121, 200]); // Att. Sp.
    expect(statRange(110, 5, 94, 50)).toEqual([103, 178]); // Velocità
  });

  it('Shedinja ha sempre 1 PS', () => {
    expect(statRange(1, 0, 292, 100)).toEqual([1, 1]);
    expect(statRange(1, 0, 292, 50)).toEqual([1, 1]);
  });

  it('formula a livello 50 con IV e EV massimi', () => {
    expect(statAt(130, 3, 50, 31, 252, 1)).toBe(182);
  });

  it('probabilità di cattura a PS pieni con una Poké Ball', () => {
    expect(catchChance(255)).toBeCloseTo(33.3, 1);
    expect(catchChance(45)).toBeCloseTo(5.9, 1);
    expect(catchChance(3)).toBeCloseTo(0.4, 1);
  });
});
