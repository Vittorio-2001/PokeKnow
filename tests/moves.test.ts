import { describe, expect, it } from 'vitest';
import movesJson from '../src/data/generated/moves.json';
import learnsetsJson from '../src/data/generated/learnsets.json';
import { type MoveInfo, levelsByMove, machineLabel, moveInGame, renderMoves, searchKey } from '../src/lib/moves';
import { movesFor } from '../src/lib/paths';

const moves = movesJson as unknown as Record<string, MoveInfo>;
const byName = (en: string) => Object.values(moves).find((m) => m.name.en === en)!;

describe('moveInGame', () => {
  it('Fascino è di tipo Normale prima di X e Y, Folletto dopo', () => {
    const charm = byName('Charm');
    expect(moveInGame(charm, 16, 5).type).toBe('normal');
    expect(moveInGame(charm, 17, 6).type).toBe('fairy');
  });

  it('prima della Gen IV la categoria dipende dal tipo', () => {
    const shadowBall = byName('Shadow Ball');
    expect(moveInGame(shadowBall, 8, 3).cls).toBe('physical');
    expect(moveInGame(shadowBall, 13, 4).cls).toBe('special');
  });

  it('usa la potenza di quel gioco', () => {
    const thunderbolt = byName('Thunderbolt');
    expect(moveInGame(thunderbolt, 16, 5).power).toBe(95);
    expect(moveInGame(thunderbolt, 17, 6).power).toBe(90);
  });
});

describe('machineLabel', () => {
  it('traduce e numera le macchine', () => {
    expect(machineLabel('tm24', 4, 'it')).toBe('MT24');
    expect(machineLabel('hm4', 3, 'it')).toBe('MN04');
    expect(machineLabel('tr15', 8, 'en')).toBe('TR15');
    expect(machineLabel('tm7', 9, 'en')).toBe('TM007');
  });
});

describe('learnset', () => {
  it('Gengar impara Palla Ombra tramite MT in Platino', () => {
    const data = movesFor(94);
    const id = Object.entries(data.moves).find(([, m]) => m.name.en === 'Shadow Ball')![0];
    expect(data.learnsets.platinum.some((e) => String(e[0]) === id && e[1] === 'M')).toBe(true);
  });

  it('ogni mossa dei learnset esiste', () => {
    const missing = Object.values(learnsetsJson as Record<string, Record<string, [number][]>>)
      .flatMap((groups) => Object.values(groups).flat())
      .filter((e) => !moves[e[0]]);
    expect(missing).toEqual([]);
  });

  it('un gioco senza dati lo dice', () => {
    expect(renderMoves(movesFor(94), 'legends-za', 9, 30, 'Leggende Pokémon: Z-A', 'it')).toContain('non ha ancora');
  });
});

describe('ricerca e livelli', () => {
  it('la ricerca ignora maiuscole, accenti e spazi', () => {
    expect(searchKey('Palla Ombra')).toBe('pallaombra');
    expect(searchKey('Psicamisù')).toBe('psicamisu');
  });

  it('nelle altre schede dice a che livello la impara', () => {
    const html = renderMoves(movesFor(94), 'platinum', 4, 13, 'Platino', 'it', 'M');
    expect(html).toMatch(/Palla Ombra <span class="moves__also">anche al Liv\. 33<\/span>/);
  });

  it('il livello più basso vince', () => {
    expect(levelsByMove([[1, 'L', 8], [1, 'L', 1], [2, 'M', 'tm1']]).get(1)).toBe(1);
  });
});
