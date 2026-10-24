// Build per la storia: quattro mosse, natura e ruolo, calcolati dalle mosse che il Pokémon
// impara davvero in quel gioco per livello o con MT/MN (niente allevamento né Insegnamosse).
// Le regole sono semplici e spiegabili, e girano in fase di build: il browser riceve solo il risultato.
import type { Localized } from './data';
import { effectiveness, typesInGen } from './typechart';

export interface MoveInfo {
  slug: string;
  name: Localized;
  type: string | null;
  power: number | null;
  acc: number | null;
  cls: 'physical' | 'special' | 'status';
  minHits: number | null;
  maxHits: number | null;
  drain: number;
  past: { before: number; type?: string | null; power?: number; acc?: number }[];
}

export interface NatureInfo {
  slug: string;
  name: Localized;
  up: number;
  down: number;
}

/** [id mossa, come si impara]: un livello (numero) oppure una macchina ("tm24", "hm3", "tr12"). */
export type Learnset = [number, number | string][];

export type Role = 'physical' | 'special' | 'mixed';
export type Speed = 'fast' | 'slow' | null;

export interface BuildMove {
  id: number;
  name: Localized;
  type: string;
  cls: 'physical' | 'special' | 'status';
  power: number | null;
  acc: number | null;
  how: number | string;
}

export interface Build {
  role: Role;
  speed: Speed;
  nature: { slug: string; name: Localized; up: number; down: number };
  moves: BuildMove[];
  /** Tipi singoli colpiti in modo superefficace da almeno una mossa. */
  coverage: string[];
}

// Prima della Gen IV fisico o speciale dipendeva dal tipo della mossa, non dalla mossa.
const PHYSICAL_TYPES = new Set(['normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel']);

// Mosse che in una partita normale non convengono: l'utilizzatore va KO, servono condizioni
// particolari, o la potenza dipende da fattori che qui non si possono valutare.
const EXCLUDED = new Set([
  'explosion', 'self-destruct', 'misty-explosion', 'final-gambit', 'memento', 'healing-wish',
  'dream-eater', 'focus-punch', 'last-resort', 'belch', 'synchronoise', 'fake-out', 'first-impression',
  'snore', 'sleep-talk', 'hidden-power', 'natural-gift', 'fling', 'spit-up', 'future-sight', 'doom-desire',
  'steel-roller', 'burn-up', 'double-shock', 'dragon-rage', 'sonic-boom', 'night-shade', 'seismic-toss',
  'super-fang', 'endeavor', 'counter', 'mirror-coat', 'metal-burst', 'bide', 'present', 'magnitude',
  'return', 'frustration', 'trump-card', 'wring-out', 'crush-grip', 'punishment', 'beat-up', 'round',
  'echoed-voice', 'fury-cutter', 'rollout', 'ice-ball', 'pursuit', 'retaliate', 'stomping-tantrum',
  'hyperspace-fury', 'aura-wheel', 'hold-back', 'false-swipe', 'shell-trap', 'upper-hand',
]);

// Mosse che fanno perdere un turno: al primo turno caricano, o al secondo bisogna ricaricare.
const TWO_TURN = new Set([
  'hyper-beam', 'giga-impact', 'blast-burn', 'frenzy-plant', 'hydro-cannon', 'rock-wrecker', 'roar-of-time',
  'prismatic-laser', 'eternabeam', 'meteor-assault', 'solar-beam', 'solar-blade', 'sky-attack', 'skull-bash',
  'razor-wind', 'meteor-beam', 'electro-shot', 'fly', 'dig', 'dive', 'bounce', 'phantom-force', 'shadow-force',
  'sky-drop', 'freeze-shock', 'ice-burn', 'geomancy',
]);

// Mosse molto forti che però abbassano le statistiche di chi le usa.
const SELF_DROP = new Set([
  'overheat', 'draco-meteor', 'leaf-storm', 'psycho-boost', 'fleur-cannon', 'v-create', 'hammer-arm',
  'ice-hammer', 'superpower', 'make-it-rain', 'armor-cannon', 'headlong-rush',
]);

// Mosse di potenziamento utili in una partita: un turno speso per vincere i successivi.
const SETUP: Record<'physical' | 'special', string[]> = {
  physical: ['dragon-dance', 'swords-dance', 'shift-gear', 'bulk-up', 'coil', 'victory-dance'],
  special: ['quiver-dance', 'nasty-plot', 'calm-mind', 'tail-glow', 'take-heart'],
};

const NATURE_FOR: Record<string, string> = {
  'physical:fast': 'jolly',
  'physical:other': 'adamant',
  'special:fast': 'timid',
  'special:other': 'modest',
  'mixed:fast': 'hasty',
  'mixed:physical': 'lonely',
  'mixed:special': 'mild',
};

/** I valori di una mossa in un certo gioco, tenendo conto dei cambiamenti nel tempo. */
export function moveInGame(move: MoveInfo, order: number, gen: number) {
  let { type, power, acc } = move;
  // la modifica più vecchia tra quelle successive al gioco contiene i valori validi in quel gioco
  const change = move.past.find((c) => c.before > order);
  if (change) {
    if (change.type !== undefined) type = change.type;
    if (change.power !== undefined) power = change.power;
    if (change.acc !== undefined) acc = change.acc;
  }
  let cls = move.cls;
  if (gen <= 3 && cls !== 'status' && type) cls = PHYSICAL_TYPES.has(type) ? 'physical' : 'special';
  return { type, power, acc, cls };
}

function averageHits(move: MoveInfo): number {
  if (!move.minHits || !move.maxHits) return 1;
  if (move.minHits === 2 && move.maxHits === 5) return 3; // in media poco più di 3 colpi
  return (move.minHits + move.maxHits) / 2;
}

export function roleOf(stats: number[]): { role: Role; speed: Speed } {
  const [, atk, , spa, , spe] = stats;
  const role: Role = atk >= spa * 1.15 ? 'physical' : spa >= atk * 1.15 ? 'special' : 'mixed';
  const speed: Speed = spe >= 95 ? 'fast' : spe <= 60 ? 'slow' : null;
  return { role, speed };
}

interface Candidate extends BuildMove {
  score: number;
}

export function computeBuild(input: {
  types: string[];
  stats: number[];
  gen: number;
  order: number;
  learnset: Learnset | undefined;
  moves: Record<string, MoveInfo>;
  natures: NatureInfo[];
}): Build | null {
  const { types, stats, gen, order, learnset, moves, natures } = input;
  if (!learnset?.length || stats.length < 6) return null;

  const { role, speed } = roleOf(stats);
  const atk = stats[1];
  const spa = stats[3];
  const best = Math.max(atk, spa);

  // Candidate: tutte le mosse d'attacco, con un punteggio di "danno atteso". Una mossa della
  // categoria "sbagliata" non è esclusa ma pesa meno, in proporzione alla statistica che usa:
  // così Charizard può tenere Terremoto e in Smeraldo Gengar valuta Palla Ombra (allora fisica).
  const candidates: Candidate[] = [];
  const learnable = new Map<string, BuildMove>();
  for (const [id, how] of learnset) {
    const move = moves[id];
    if (!move) continue;
    const g = moveInGame(move, order, gen);
    const entry: BuildMove = { id, name: move.name, type: g.type ?? 'normal', cls: g.cls, power: g.power, acc: g.acc, how };
    learnable.set(move.slug, entry);
    if (g.cls === 'status' || !g.power || !g.type || EXCLUDED.has(move.slug)) continue;

    let score = g.power * ((g.acc ?? 100) / 100) * averageHits(move);
    score *= (g.cls === 'physical' ? atk : spa) / best;
    if (types.includes(g.type)) score *= 1.5; // STAB: mossa dello stesso tipo del Pokémon
    if (TWO_TURN.has(move.slug)) score *= 0.5;
    if (SELF_DROP.has(move.slug)) score *= 0.7;
    if (move.drain < 0) score *= 0.9; // contraccolpo
    if (typeof how === 'number' && how > 50) score *= 0.9; // si impara molto tardi
    candidates.push({ ...entry, score });
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score);

  const chosen: Candidate[] = [];
  const allTypes = typesInGen(gen);
  const covered = (list: BuildMove[]) =>
    new Set(allTypes.filter((def) => list.some((m) => effectiveness(m.type, [def], gen) >= 2)));

  // 1. La mossa migliore di ogni tipo del Pokémon (STAB), se è almeno discreta.
  const strongest = candidates[0].score;
  for (const type of types) {
    const top = candidates.find((c) => c.type === type && !chosen.includes(c));
    if (top && top.score >= strongest * 0.5) chosen.push(top);
  }

  // Una mossa di potenziamento occupa l'ultimo posto, se il Pokémon ne impara una adatta.
  const setup =
    role === 'mixed' ? undefined : SETUP[role].map((slug) => learnable.get(slug)).find((m) => m !== undefined);
  const attackSlots = setup ? 3 : 4;

  // 2. Le altre mosse: forti, e capaci di colpire tipi che il set non copre ancora.
  //    Il bonus di copertura moltiplica la potenza: una mossa debole non vince solo perché copre.
  while (chosen.length < attackSlots) {
    const already = covered(chosen);
    const usedTypes = new Set(chosen.map((m) => m.type));
    let pick: Candidate | null = null;
    let pickValue = -Infinity;
    for (const c of candidates) {
      if (chosen.includes(c)) continue;
      const gain = [...covered([c])].filter((t) => !already.has(t)).length;
      let value = c.score * (1 + 0.3 * gain);
      if (usedTypes.has(c.type)) value *= 0.35; // due mosse dello stesso tipo aggiungono poco
      if (value > pickValue) {
        pickValue = value;
        pick = c;
      }
    }
    if (!pick) break;
    chosen.push(pick);
  }

  const result: BuildMove[] = chosen.map(({ score: _score, ...m }) => m);
  if (setup && chosen.length >= 3) result.push(setup);

  const natureKey =
    role === 'mixed'
      ? speed === 'fast'
        ? 'mixed:fast'
        : stats[1] >= stats[3]
          ? 'mixed:physical'
          : 'mixed:special'
      : `${role}:${speed === 'fast' ? 'fast' : 'other'}`;
  const nature = natures.find((n) => n.slug === NATURE_FOR[natureKey])!;

  return {
    role,
    speed,
    nature: { slug: nature.slug, name: nature.name, up: nature.up, down: nature.down },
    moves: result,
    coverage: [...covered(chosen)],
  };
}
