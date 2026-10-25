import { describe, expect, it } from 'vitest';
import { catchChance, rangeAt100, statAt } from '../src/lib/stats';

describe('statistiche calcolate', () => {
  it('Gengar al livello 100: valori noti', () => {
    expect(rangeAt100(60, 0, 94)).toEqual([230, 324]); // PS
    expect(rangeAt100(130, 3, 94)).toEqual([238, 394]); // Att. Sp.
    expect(rangeAt100(110, 5, 94)).toEqual([202, 350]); // Velocità
  });

  it('Shedinja ha sempre 1 PS', () => {
    expect(rangeAt100(1, 0, 292)).toEqual([1, 1]);
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
