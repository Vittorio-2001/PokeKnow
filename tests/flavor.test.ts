import { describe, expect, it } from 'vitest';
import type { Pokemon } from '../src/lib/data';
import { chooseFlavor } from '../src/lib/render';

// Pokémon finto: solo le voci del Pokédex contano per questi test.
const mon = (flavor: Pokemon['flavor']) => ({ flavor }) as Pokemon;

describe('scelta della voce del Pokédex', () => {
  it('usa la voce del gioco nella lingua della pagina, se c’è', () => {
    const p = mon({ x: { it: 'IT', en: 'EN' } });
    expect(chooseFlavor(p, 'x', 'it')).toEqual({ kind: 'exact', version: 'x', lang: 'it' });
  });

  it('senza italiano prende la voce italiana del gioco più vicino e tiene l’originale', () => {
    const p = mon({ emerald: { en: 'EN' }, x: { it: 'IT X' }, sun: { it: 'IT Sole' } });
    expect(chooseFlavor(p, 'emerald', 'it')).toEqual({ kind: 'otherGame', version: 'x', lang: 'it', original: 'en' });
  });

  it('preferisce l’altra versione della stessa coppia', () => {
    const p = mon({ x: { en: 'EN' }, y: { it: 'IT Y' }, 'omega-ruby': { it: 'IT ROZA' } });
    expect(chooseFlavor(p, 'x', 'it')).toMatchObject({ kind: 'otherGame', version: 'y' });
  });

  it('se nessun gioco ha la lingua della pagina, usa l’altra lingua dello stesso gioco', () => {
    const p = mon({ emerald: { en: 'EN' } });
    expect(chooseFlavor(p, 'emerald', 'it')).toEqual({ kind: 'otherLang', version: 'emerald', lang: 'en' });
  });

  it('per un gioco senza voci mostra la più vicina', () => {
    const p = mon({ 'legends-arceus': { en: 'EN LA' }, sword: { it: 'IT', en: 'EN' } });
    expect(chooseFlavor(p, 'legends-za', 'it')).toEqual({ kind: 'nearest', version: 'sword', lang: 'it' });
    expect(chooseFlavor(p, 'legends-za', 'en')).toEqual({ kind: 'nearest', version: 'legends-arceus', lang: 'en' });
  });

  it('senza nessuna voce lo dice', () => {
    expect(chooseFlavor(mon({}), 'emerald', 'it')).toEqual({ kind: 'none' });
  });
});
