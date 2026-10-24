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
