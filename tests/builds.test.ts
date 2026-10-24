import { describe, expect, it } from 'vitest';
import pokemonJson from '../src/data/generated/pokemon.json';
import movesJson from '../src/data/generated/moves.json';
import { type MoveInfo, moveInGame, roleOf } from '../src/lib/builds';
import type { Pokemon } from '../src/lib/data';
import { buildsFor } from '../src/lib/paths';
import { howLearned } from '../src/lib/render';

const moves = movesJson as unknown as Record<string, MoveInfo>;
const bySlug = (slug: string) => (pokemonJson as Pokemon[]).find((p) => p.slug === slug)!;
const moveSlug = (id: number) => moves[id].slug;
const slugsOf = (pokemon: string, group: string) => buildsFor(bySlug(pokemon))[group]!.moves.map((m) => moveSlug(m.id));

describe('build per la storia', () => {
  it('Gengar in Scarlatto e Violetto: attaccante speciale veloce, natura Timida, mosse di tipo Spettro e Veleno', () => {
    const build = buildsFor(bySlug('gengar'))['scarlet-violet']!;
    expect(build.role).toBe('special');
    expect(build.speed).toBe('fast');
    expect(build.nature.slug).toBe('timid');
    const types = build.moves.map((m) => m.type);
    expect(types).toContain('ghost');
    expect(types).toContain('poison');
    expect(build.moves).toHaveLength(4);
  });

  it('Garchomp in Platino: fisico, Terremoto e Danzaspada', () => {
    const slugs = slugsOf('garchomp', 'platinum');
    expect(slugs).toContain('earthquake');
    expect(slugs).toContain('swords-dance');
    expect(buildsFor(bySlug('garchomp')).platinum!.nature.slug).toBe('jolly');
  });

  it('non sceglie due mosse dello stesso tipo quando ci sono alternative', () => {
    for (const [mon, group] of [['charizard', 'firered-leafgreen'], ['dragonite', 'black-white'], ['lucario', 'diamond-pearl']]) {
      const types = buildsFor(bySlug(mon))[group]!.moves.filter((m) => m.cls !== 'status').map((m) => m.type);
      expect(new Set(types).size).toBe(types.length);
    }
  });

  it('esclude le mosse che mandano KO chi le usa', () => {
    expect(slugsOf('electrode', 'emerald')).not.toContain('explosion');
  });

  it('un gioco senza learnset nei dati non ha build', () => {
    expect('legends-za' in buildsFor(bySlug('gengar'))).toBe(false);
  });

  it('prima della Gen IV fisico o speciale dipende dal tipo', () => {
    const shadowBall = Object.values(moves).find((m) => m.slug === 'shadow-ball')!;
    expect(moveInGame(shadowBall, 8, 3).cls).toBe('physical'); // Smeraldo
    expect(moveInGame(shadowBall, 12, 4).cls).toBe('special'); // Diamante e Perla
  });

  it('usa i valori storici delle mosse: Morso era di tipo Normale nella Gen I', () => {
    const bite = Object.values(moves).find((m) => m.slug === 'bite')!;
    expect(moveInGame(bite, 1, 1).type).toBe('normal');
    expect(moveInGame(bite, 8, 3).type).toBe('dark');
  });

  it('riconosce il ruolo dalle statistiche', () => {
    expect(roleOf([60, 65, 60, 130, 75, 110])).toEqual({ role: 'special', speed: 'fast' });
    expect(roleOf([108, 130, 95, 80, 85, 102]).role).toBe('physical');
    expect(roleOf([70, 110, 70, 115, 70, 90]).role).toBe('mixed');
  });

  it('scrive come si impara una mossa', () => {
    expect(howLearned(32, 4, 'it')).toBe('Liv. 32');
    expect(howLearned(0, 7, 'en')).toBe('On evolution');
    expect(howLearned('tm6', 3, 'it')).toBe('MT06');
    expect(howLearned('hm4', 3, 'en')).toBe('HM04');
    expect(howLearned('tr15', 8, 'it')).toBe('DT15');
    expect(howLearned('tm58', 9, 'en')).toBe('TM058');
  });
});
