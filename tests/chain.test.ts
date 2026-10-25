import { describe, expect, it } from 'vitest';
import pokemonJson from '../src/data/generated/pokemon.json';
import type { Pokemon } from '../src/lib/data';
import { chainTree } from '../src/lib/chain';
import { chainFor } from '../src/lib/paths';

const bySlug = (slug: string) => (pokemonJson as Pokemon[]).find((p) => p.slug === slug)!;
const names = (nodes: ReturnType<typeof chainTree>): string[] => nodes.flatMap((n) => [n.member.slug, ...names(n.next)]);

describe('catena evolutiva', () => {
  it('Gengar: Gastly → Haunter → Gengar, dalla pagina di qualunque stadio', () => {
    const tree = chainTree(chainFor(bySlug('haunter')), 4, 13);
    expect(tree).toHaveLength(1);
    expect(names(tree)).toEqual(['gastly', 'haunter', 'gengar']);
    expect(tree[0].next[0].next[0].rules[0].trigger).toBe('trade');
  });

  it('mostra solo i Pokémon che esistono nella generazione del gioco', () => {
    const emerald = names(chainTree(chainFor(bySlug('eevee')), 3, 8));
    expect(emerald).toContain('umbreon');
    expect(emerald).not.toContain('leafeon');
    expect(emerald).not.toContain('sylveon');
    const sword = names(chainTree(chainFor(bySlug('eevee')), 8, 22));
    expect(sword).toContain('sylveon');
  });

  it('le pre-evoluzioni introdotte dopo non compaiono nei giochi più vecchi', () => {
    // Pichu è della Gen II: in Smeraldo c'è; Munchlax (Gen IV) no, quindi lì Snorlax è il primo stadio
    expect(names(chainTree(chainFor(bySlug('snorlax')), 3, 8))).toEqual(['snorlax']);
    expect(names(chainTree(chainFor(bySlug('snorlax')), 4, 13))).toEqual(['munchlax', 'snorlax']);
  });

  it('usa la regola del gioco scelto: Leafeon in Platino e in Spada', () => {
    const leafeon = (order: number) =>
      chainTree(chainFor(bySlug('eevee')), order < 20 ? 4 : 8, order)[0].next.find((n) => n.member.slug === 'leafeon')!;
    expect(leafeon(13).rules[0].trigger).toBe('level-up');
    expect(leafeon(22).rules[0].trigger).toBe('use-item');
  });
});
