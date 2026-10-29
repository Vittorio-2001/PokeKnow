import { describe, expect, it } from 'vitest';
import pokemonJson from '../src/data/generated/pokemon.json';
import abilitiesJson from '../src/data/generated/abilities.json';
import type { Ability, Pokemon } from '../src/lib/data';
import { asMega, megasIn, renderMegaButtons, renderMegaHow } from '../src/lib/forms';
import { renderView } from '../src/lib/render';

const all = pokemonJson as unknown as Pokemon[];
const bySlug = (slug: string) => all.find((p) => p.slug === slug)!;
const abilities = abilitiesJson as Record<string, Ability>;

describe('Megaevoluzioni', () => {
  it('Charizard ha Mega X e Mega Y in X e Y, nessuna in Spada e Scudo', () => {
    const charizard = bySlug('charizard');
    expect(megasIn(charizard, 'x-y').map((m) => m.suffix)).toEqual(['x', 'y']);
    expect(megasIn(charizard, 'sword-shield')).toEqual([]);
    expect(megasIn(charizard, 'emerald')).toEqual([]);
  });

  it("in Let's Go solo le Mega di Kanto", () => {
    expect(megasIn(bySlug('gengar'), 'lets-go-pikachu-lets-go-eevee')).toHaveLength(1);
    expect(megasIn(bySlug('ampharos'), 'lets-go-pikachu-lets-go-eevee')).toEqual([]);
  });

  it('le Mega nate in ROZA non ci sono in X e Y', () => {
    expect(megasIn(bySlug('salamence'), 'x-y')).toEqual([]);
    expect(megasIn(bySlug('salamence'), 'omega-ruby-alpha-sapphire')).toHaveLength(1);
  });

  it('le nuove Mega di Z-A solo in Z-A', () => {
    const clefable = bySlug('clefable');
    expect(megasIn(clefable, 'legends-za')).toHaveLength(1);
    expect(megasIn(clefable, 'sun-moon')).toEqual([]);
  });

  it('nella forma Mega cambiano tipi e statistiche', () => {
    const charizard = bySlug('charizard');
    const x = charizard.megas!.find((m) => m.suffix === 'x')!;
    const view = renderView(asMega(charizard, x), abilities, 'x', 'it');
    expect(view.slots.types).toContain('Drago');
    expect(view.sprite).toContain(`/${x.id}.png`);
  });

  it('Megapietra o mossa', () => {
    const venusaur = bySlug('venusaur').megas![0];
    expect(renderMegaHow(venusaur, 'it')).toContain('venusaurite.png');
    expect(renderMegaHow(bySlug('rayquaza').megas![0], 'it')).toBe('conoscendo Ascesa del Drago');
  });

  it('pulsanti sul palco', () => {
    const html = renderMegaButtons(megasIn(bySlug('mewtwo'), 'x-y'), 'en', 'mewtwo-mega-y');
    expect(html).toContain('>Mega X<');
    expect(html).toContain('data-mega="mewtwo-mega-y" aria-pressed="true"');
  });
});

describe('abilità della Mega', () => {
  it('Mega Charizard X ha Unghiedure', () => {
    const charizard = bySlug('charizard');
    const x = charizard.megas!.find((m) => m.suffix === 'x')!;
    expect(renderView(asMega(charizard, x), abilities, 'x', 'it').slots.abilities).toContain('Unghiedure');
  });
});

describe('Mega nella catena evolutiva', () => {
  const chain = (slug: string) => {
    const p = bySlug(slug);
    const family = all.filter((x) => x.chain === p.chain);
    return family.map((x) => ({ id: x.id, slug: x.slug, name: x.name, gen: x.gen, from: null as number | null, rules: [], megas: x.megas }));
  };

  it('Kangaskhan in ROZA mostra la Mega con la Megapietra', () => {
    const html = renderView(bySlug('kangaskhan'), abilities, 'omega-ruby', 'it', undefined, chain('kangaskhan')).slots.chain;
    expect(html).toContain('MegaKangaskhan');
    expect(html).toContain('con Kangaskhanite');
  });

  it('in Spada e Scudo niente Mega nella catena', () => {
    const html = renderView(bySlug('kangaskhan'), abilities, 'sword', 'it', undefined, chain('kangaskhan')).slots.chain;
    expect(html).not.toContain('Mega');
  });
});

describe('scena di lotta', () => {
  it('usa gli sprite di lotta del gioco, di fronte e di spalle', async () => {
    const { battleSprites } = await import('../src/lib/render');
    const em = battleSprites(6, 'emerald');
    expect(em.front).toContain('generation-iii/emerald/6.png');
    expect(em.back).toContain('generation-iii/emerald/back/6.png');
    expect(battleSprites(6, 'sun-moon', true).back).toContain('ultra-sun-ultra-moon/back/shiny/6.gif');
    expect(battleSprites(6, 'legends-arceus').back).toContain('showdown/back/6.gif');
  });
});
