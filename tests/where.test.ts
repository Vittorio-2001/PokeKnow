import { describe, expect, it } from 'vitest';
import { conditionText, spriteUrl } from '../src/lib/render';
import { type Evolution, evolutionsFor, howItEvolves } from '../src/lib/where';

const typeName = (slug: string) => ({ ghost: 'Spettro' })[slug] ?? slug;
const evo = (e: Partial<Evolution>): Evolution => ({ from: 1, fromName: { it: 'X', en: 'X' }, since: 0, trigger: 'level-up', ...e });

describe('come si evolve', () => {
  it('scrive le frasi più comuni in italiano e in inglese', () => {
    expect(howItEvolves(evo({ level: 25 }), 'it', typeName)).toBe('al livello 25');
    expect(howItEvolves(evo({ trigger: 'trade' }), 'en', typeName)).toBe('when traded');
    expect(howItEvolves(evo({ trigger: 'use-item', item: { it: 'Pietratuono', en: 'Thunder Stone' } }), 'it', typeName)).toBe('usando Pietratuono');
    expect(howItEvolves(evo({ happiness: 160, time: 'day' }), 'it', typeName)).toBe('salendo di livello con amicizia alta di giorno');
    expect(howItEvolves(evo({ trigger: 'trade', held: { it: 'Metalcoperta', en: 'Metal Coat' } }), 'en', typeName)).toBe('when traded holding Metal Coat');
  });

  it('usa la regola valida nel gioco scelto', () => {
    const list = [evo({ since: 12, location: { en: 'Eterna Forest' } }), evo({ since: 22, trigger: 'use-item', item: { en: 'Leaf Stone' } })];
    expect(evolutionsFor(list, 13).map((e) => e.since)).toEqual([12]); // Platino
    expect(evolutionsFor(list, 25).map((e) => e.trigger)).toEqual(['use-item']); // Spada e Scudo
    expect(evolutionsFor(list, 8)).toEqual([]); // Smeraldo: non esiste ancora
  });
});

describe('dove trovarlo', () => {
  it('unisce le condizioni alternative in una frase', () => {
    expect(conditionText(['slot2-ruby', 'slot2-sapphire'], 'it')).toBe('con Rubino o Zaffiro nello slot GBA');
    expect(conditionText(['weather-raining', 'weather-thunderstorm'], 'en')).toBe('in the rain or in a thunderstorm');
    expect(conditionText(['story-progress-hall-of-fame'], 'it')).toBe(''); // condizioni non tradotte: nessun testo
  });
});

describe('sprite shiny', () => {
  it('usa lo shiny dello stesso set di sprite', () => {
    expect(spriteUrl(94, 'emerald', true)).toMatch(/generation-iii\/emerald\/shiny\/94\.png$/);
    expect(spriteUrl(94, 'black-white', true)).toMatch(/black-white\/animated\/shiny\/94\.gif$/);
    expect(spriteUrl(94, 'scarlet-violet', true)).toMatch(/other\/home\/shiny\/94\.png$/);
    expect(spriteUrl(94, 'emerald')).not.toContain('shiny');
  });
});

describe('riepilogo ed esclusive', async () => {
  const { whereSummary } = await import('../src/lib/where');
  const base = (encounters: Record<string, { a: number; m: string; min: number }[]>, chain: Record<string, boolean> = {}) => ({
    encounters: Object.fromEntries(
      Object.entries(encounters).map(([v, list]) => [v, list.map((e) => ({ ...e, max: e.min, rate: 10, c: [] }))]),
    ),
    areas: {},
    versionsWithData: ['firered', 'leafgreen', 'emerald'],
    evolutions: [],
    chain,
  });
  const names: Record<number, string> = { 1: 'Percorso 4', 2: 'Percorso 11', 3: 'Old Chateau (2F)', 4: 'Old Chateau (entrance)', 5: 'Zafferanopoli' };
  const area = (id: number) => names[id];

  it('conta i luoghi distinti e trova il livello più basso', () => {
    const s = whereSummary(base({ firered: [{ a: 2, m: 'walk', min: 12 }, { a: 1, m: 'walk', min: 6 }, { a: 3, m: 'walk', min: 9 }, { a: 4, m: 'walk', min: 9 }] }), 'firered', ['leafgreen'], area);
    expect(s.wild).toEqual({ places: 3, level: 6, area: 1 });
  });

  it('distingue i regali dagli incontri selvatici', () => {
    const s = whereSummary(base({ firered: [{ a: 5, m: 'gift', min: 25 }] }), 'firered', ['leafgreen'], area);
    expect(s.wild).toBeUndefined();
    expect(s.gift).toEqual({ area: 5, level: 25, egg: false });
  });

  it('riconosce le esclusive di versione, in tutte e due le direzioni', () => {
    const data = base({ firered: [{ a: 1, m: 'walk', min: 6 }] });
    expect(whereSummary(data, 'firered', ['leafgreen'], area).exclusive).toEqual({ of: 'this', twin: 'leafgreen', byEvolution: false });
    expect(whereSummary(data, 'leafgreen', ['firered'], area).exclusive).toEqual({ of: 'twin', twin: 'firered', byEvolution: false });
  });

  it('se la pre-evoluzione c’è nella gemella, si ottiene per evoluzione invece che con uno scambio', () => {
    const data = base({ firered: [{ a: 1, m: 'walk', min: 6 }] }, { leafgreen: true });
    expect(whereSummary(data, 'firered', ['leafgreen'], area).exclusive?.byEvolution).toBe(true);
  });

  it('senza i dati della gemella non dichiara esclusive', () => {
    const data = base({ emerald: [{ a: 1, m: 'walk', min: 6 }] });
    expect(whereSummary(data, 'emerald', ['sapphire'], area).exclusive).toBeUndefined();
  });
});

describe('icone della catena evolutiva', async () => {
  const { evoIcons } = await import('../src/lib/render');
  it('mostra l’oggetto giusto per ogni modo di evolversi', () => {
    expect(evoIcons([evo({ trigger: 'use-item', itemSlug: 'thunder-stone', item: { it: 'Pietratuono', en: 'Thunder Stone' } })], 'it')).toContain('items/thunder-stone.png');
    expect(evoIcons([evo({ level: 16 })], 'it')).toContain('items/rare-candy.png');
    expect(evoIcons([evo({ happiness: 220 })], 'it')).toContain('items/soothe-bell.png');
    const trade = evoIcons([evo({ trigger: 'trade', heldSlug: 'metal-coat', held: { en: 'Metal Coat' } })], 'en');
    expect(trade).toContain('<svg');
    expect(trade).toContain('items/metal-coat.png');
    expect(evoIcons([], 'it')).toBe('');
  });
});
