// Mosse che un Pokémon impara in un gioco: tabella per livello, MT/MN/DT, uova e Insegnamosse.
// Ogni mossa mostra i valori che aveva in quel gioco (tipo, potenza, precisione, PP).
import { type Lang, type Localized, text } from './data';
import { t } from './i18n';
import { esc, typeChip } from './render';

export interface MoveInfo {
  name: Localized;
  type: string | null;
  power?: number;
  acc?: number;
  pp?: number;
  cls: 'physical' | 'special' | 'status';
  past?: { before: number; type?: string; power?: number; acc?: number; pp?: number }[];
}

/** [id mossa, modo, valore]: modo L (livello), M (macchina), E (uovo), T (Insegnamosse). */
export type LearnEntry = [number, 'L' | 'M' | 'E' | 'T', (number | string)?];

/** Tutto ciò che serve alla sezione delle mosse di un Pokémon, in tutti i giochi. */
export interface MovesData {
  learnsets: Record<string, LearnEntry[]>;
  moves: Record<string, MoveInfo>;
}

// Prima della Gen IV fisico o speciale dipendeva dal tipo della mossa, non dalla mossa.
const PHYSICAL_TYPES = new Set(['normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel']);

/** I valori di una mossa in un certo gioco, tenendo conto dei cambiamenti nel tempo. */
export function moveInGame(move: MoveInfo, order: number, gen: number) {
  let { type, power, acc, pp } = move;
  // la modifica più vecchia tra quelle successive al gioco contiene i valori validi in quel gioco
  const change = move.past?.find((c) => c.before > order);
  if (change) {
    if (change.type !== undefined) type = change.type;
    if (change.power !== undefined) power = change.power;
    if (change.acc !== undefined) acc = change.acc;
    if (change.pp !== undefined) pp = change.pp;
  }
  let cls = move.cls;
  if (gen <= 3 && cls !== 'status' && type) cls = PHYSICAL_TYPES.has(type) ? 'physical' : 'special';
  return { type, power, acc, pp, cls };
}

/** "MT24", "MN04", "DT15"; da Scarlatto e Violetto le MT hanno tre cifre (MT024). */
export function machineLabel(code: string, gen: number, lang: Lang): string {
  const match = /^(tm|hm|tr)(\d+)$/.exec(code);
  if (!match) return code.toUpperCase();
  const [, kind, n] = match;
  return `${t(lang).machines[kind]}${n.padStart(kind === 'tm' && gen >= 9 ? 3 : 2, '0')}`;
}

export const METHODS = ['L', 'M', 'E', 'T'] as const;

/** Testo per la ricerca: minuscolo e senza accenti, così "pallaombra" o "palla ombra" trovano Palla Ombra. */
export function searchKey(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Il livello più basso a cui la mossa si impara salendo di livello (0 = all'evoluzione), per id mossa. */
export function levelsByMove(list: LearnEntry[]): Map<number, number> {
  const levels = new Map<number, number>();
  for (const [id, method, value] of list) {
    if (method !== 'L') continue;
    const level = Number(value);
    if (!levels.has(id) || level < levels.get(id)!) levels.set(id, level);
  }
  return levels;
}

/**
 * HTML della sezione: schede per modo di apprendimento e tabella delle mosse.
 * `active` è la scheda aperta; se in quel gioco è vuota si apre la prima che ha mosse.
 */
export function renderMoves(
  data: MovesData | null,
  group: string,
  gen: number,
  order: number,
  versionName: string,
  lang: Lang,
  active: string = 'L',
): string {
  const ui = t(lang);
  const list = data?.learnsets[group];
  if (!data || !list?.length) return `<p class="muted">${esc(ui.movesNoData(versionName))}</p>`;

  const levels = levelsByMove(list);
  const byMethod = new Map(METHODS.map((m) => [m, list.filter((e) => e[1] === m)]));
  const open = byMethod.get(active as (typeof METHODS)[number])?.length ? active : METHODS.find((m) => byMethod.get(m)!.length)!;

  const tabs = METHODS.filter((m) => byMethod.get(m)!.length)
    .map(
      (m) =>
        `<button class="moves__tab" type="button" role="tab" data-method="${m}" aria-selected="${m === open}">${esc(ui.moveMethods[m])} <span class="moves__count">${byMethod.get(m)!.length}</span></button>`,
    )
    .join('');

  const panels = METHODS.filter((m) => byMethod.get(m)!.length)
    .map((m) => {
      const rows = byMethod
        .get(m)!
        .map((entry) => ({ entry, info: data.moves[entry[0]] }))
        .filter((r) => r.info)
        .map((r) => ({ ...r, g: moveInGame(r.info, order, gen) }))
        .sort((a, b) => {
          if (m === 'L') return Number(a.entry[2]) - Number(b.entry[2]) || text(a.info.name, lang).localeCompare(text(b.info.name, lang));
          if (m === 'M') {
            const ka = String(a.entry[2]);
            const kb = String(b.entry[2]);
            const rank = (k: string) => (k.startsWith('tm') ? 0 : k.startsWith('hm') ? 1 : 2);
            return rank(ka) - rank(kb) || Number(ka.slice(2)) - Number(kb.slice(2));
          }
          return text(a.info.name, lang).localeCompare(text(b.info.name, lang), lang);
        })
        .map(({ entry, info, g }) => {
          // nelle altre schede: se la impara anche salendo di livello, a quale
          const level = m === 'L' ? undefined : levels.get(entry[0]);
          const also =
            level === undefined
              ? ''
              : ` <span class="moves__also">${esc(level === 0 ? ui.alsoOnEvolution : ui.alsoAtLevel(Math.max(level, 1)))}</span>`;
          // si cerca nel nome della lingua della pagina e in inglese
          const key = [...new Set([text(info.name, lang), info.name.en ?? ''])].map(searchKey).join(' ');
          const how =
            m === 'L'
              ? Number(entry[2]) === 0
                ? ui.learnEvolution
                : ui.learnLevel(Math.max(Number(entry[2]), 1))
              : m === 'M'
                ? machineLabel(String(entry[2]), gen, lang)
                : '';
          return `<tr data-search="${esc(key)}">
            ${m === 'L' || m === 'M' ? `<td class="moves__how">${esc(how)}</td>` : ''}
            <th scope="row" class="moves__name">${esc(text(info.name, lang))}${also}</th>
            <td>${g.type ? typeChip(g.type, lang, 'sm') : ''}</td>
            <td class="moves__cls moves__cls--${g.cls}" title="${esc(ui.moveClasses[g.cls])}"><span class="moves__cls-text">${esc(ui.moveClasses[g.cls])}</span></td>
            <td class="moves__num">${g.power ?? '—'}</td>
            <td class="moves__num">${g.acc ?? '—'}</td>
            <td class="moves__num">${g.pp ?? '—'}</td>
          </tr>`;
        })
        .join('');
      const howHead = m === 'L' ? `<th scope="col">${esc(ui.colLevel)}</th>` : m === 'M' ? `<th scope="col">${esc(ui.colMachine)}</th>` : '';
      return `<div class="moves__panel" role="tabpanel" data-panel="${m}"${m === open ? '' : ' hidden'}>
        <table class="moves__table">
          <thead><tr>${howHead}<th scope="col">${esc(ui.colMove)}</th><th scope="col">${esc(ui.colType)}</th><th scope="col"><span class="moves__cls-text">${esc(ui.colClass)}</span></th><th scope="col" class="moves__num">${esc(ui.colPower)}</th><th scope="col" class="moves__num">${esc(ui.colAccuracy)}</th><th scope="col" class="moves__num">PP</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p class="muted moves__empty" hidden>${esc(ui.movesNotFound)}</p>
      </div>`;
    })
    .join('');

  const search = `<label class="moves__search"><span class="sr-only">${esc(ui.movesSearch)}</span><input type="search" data-moves-search placeholder="${esc(ui.movesSearch)}" autocomplete="off" spellcheck="false" /></label>`;
  return `<div class="moves" data-open="${open}"><div class="moves__bar"><div class="moves__tabs" role="tablist">${tabs}</div>${search}</div>${panels}</div>`;
}

/** Nasconde le righe che non contengono `query` e aggiorna i contatori delle schede. */
export function filterMoves(box: HTMLElement, query: string) {
  const q = searchKey(query);
  for (const panel of box.querySelectorAll<HTMLElement>('[data-panel]')) {
    let shown = 0;
    for (const row of panel.querySelectorAll<HTMLElement>('tr[data-search]')) {
      const match = !q || row.dataset.search!.includes(q);
      row.hidden = !match;
      if (match) shown++;
    }
    panel.querySelector<HTMLElement>('.moves__empty')!.hidden = shown > 0;
    panel.querySelector<HTMLElement>('table')!.hidden = shown === 0;
    const count = box.querySelector(`[data-method="${panel.dataset.panel}"] .moves__count`);
    if (count) count.textContent = String(shown);
    box.querySelector(`[data-method="${panel.dataset.panel}"]`)?.classList.toggle('is-empty', shown === 0);
  }
}
