import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error: modulo JavaScript dello script dei dati
import { cleanWiki, pageUrl, parseDex } from '../scripts/pokemoncentral.mjs';

const gengar = readFileSync(new URL('./fixtures/gengar-pokemoncentral.txt', import.meta.url), 'utf8');

describe('Pokémon Central', () => {
  it('legge le voci della forma base, non quelle della Mega o Gigamax', () => {
    const { entries, unknown } = parseDex(gengar, 'Gengar');
    expect(entries.emerald).toBe('Talvolta nelle notti buie, può accadere che un passante sia superato dalla propria ombra. È opera di Gengar, che si finge la sua sagoma scura.');
    expect(entries.platinum).toBe('Si aggira nel buio con lo sguardo perfido e si diverte a lanciare maledizioni.');
    expect(entries['legends-za']).toContain('la temperatura si abbassi di 5 °C');
    expect(entries.sword).toContain('luna piena');
    expect(unknown).toEqual([]);
  });

  it('una chiave per più versioni', () => {
    const { entries } = parseDex(gengar, 'Gengar');
    expect(entries.ruby).toBe(entries.sapphire);
    expect(entries.black).toBe(entries['white-2']);
  });

  it('ripulisce link e grassetti', () => {
    expect(cleanWiki("Usa [[Palla Ombra]] e '''[[Mangiasogni|sogni]]'''.")).toBe('Usa Palla Ombra e sogni.');
  });

  it('link alla pagina', () => {
    expect(pageUrl("Farfetch'd")).toBe("https://wiki.pokemoncentral.it/Farfetch'd");
    expect(pageUrl('Mr. Mime')).toBe('https://wiki.pokemoncentral.it/Mr._Mime');
  });
});
