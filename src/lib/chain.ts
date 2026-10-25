// Catena evolutiva: la famiglia del Pokémon come albero, filtrata sui Pokémon che esistono
// nel gioco scelto e con il modo di evolversi valido in quel gioco.
import type { Localized } from './data';
import { type Evolution, evolutionsFor } from './where';

export interface ChainMember {
  id: number;
  slug: string;
  name: Localized;
  gen: number;
  /** da chi si evolve (null per il primo stadio) */
  from: number | null;
  rules: Evolution[];
}

export interface ChainNode {
  member: ChainMember;
  /** regole con cui si arriva a questo stadio nel gioco scelto (vuote per il primo) */
  rules: Evolution[];
  next: ChainNode[];
}

/** Gli alberi della famiglia nel gioco scelto. Di solito uno solo, con la radice al primo stadio. */
export function chainTree(members: ChainMember[], gen: number, order: number): ChainNode[] {
  const present = members.filter((m) => m.gen <= gen);
  const ids = new Set(present.map((m) => m.id));
  const build = (member: ChainMember): ChainNode => ({
    member,
    rules: member.from && ids.has(member.from) ? evolutionsFor(member.rules, order) : [],
    next: present
      .filter((m) => m.from === member.id)
      .sort((a, b) => a.id - b.id)
      .map(build),
  });
  return present
    .filter((m) => !m.from || !ids.has(m.from))
    .sort((a, b) => a.id - b.id)
    .map(build);
}
