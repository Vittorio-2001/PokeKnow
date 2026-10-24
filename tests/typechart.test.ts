import { describe, expect, it } from 'vitest';
import { defensiveProfile, effectiveness, offensiveProfile } from '../src/lib/typechart';

describe('tabella dei tipi per generazione', () => {
  it('Spettro e Buio sono resistiti da Acciaio fino alla Gen V, poi neutri', () => {
    expect(effectiveness('ghost', ['steel'], 5)).toBe(0.5);
    expect(effectiveness('dark', ['steel'], 5)).toBe(0.5);
    expect(effectiveness('ghost', ['steel'], 6)).toBe(1);
    expect(effectiveness('dark', ['steel'], 9)).toBe(1);
  });

  it('il tipo Folletto esiste solo dalla Gen VI', () => {
    const gen5 = offensiveProfile(['dragon'], 5)[0];
    expect(gen5.immune).toEqual([]);
    const gen6 = offensiveProfile(['dragon'], 6)[0];
    expect(gen6.immune).toEqual(['fairy']);
  });

  it('combina i moltiplicatori dei due tipi (Gyarados: Elettro ×4, Terra ×0)', () => {
    const profile = defensiveProfile(['water', 'flying'], 9);
    expect(profile.get(4)).toEqual(['electric']);
    expect(profile.get(0)).toEqual(['ground']);
  });

  it('Gengar nella Gen III non subisce Normale e Lotta', () => {
    const profile = defensiveProfile(['ghost', 'poison'], 3);
    expect(profile.get(0)?.sort()).toEqual(['fighting', 'normal']);
    expect(profile.get(2)?.sort()).toEqual(['dark', 'ghost', 'ground', 'psychic']);
  });
});
