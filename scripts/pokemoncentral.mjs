// Voci del Pokédex in italiano da Pokémon Central (https://wiki.pokemoncentral.it), per i giochi
// in cui PokéAPI non le ha (terza, quarta e quinta generazione, Scarlatto e Violetto, Leggende Z-A…).
// Testi sotto licenza CC BY-NC-SA, usati con il permesso di Pokémon Central: il sito mette un link
// alla pagina di Pokémon Central accanto a ogni testo preso da lì.
//
// Le pagine si scaricano dall'API MediaWiki, 50 alla volta, e restano in cache in .cache/pokemoncentral:
// le build successive non le riscaricano (con --refresh sì). Se la wiki non è raggiungibile la build
// continua con quello che c'è in cache, o senza.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const WIKI = 'https://wiki.pokemoncentral.it';
const API = `${WIKI}/api.php`;
const BATCH = 50;
const PAUSE_MS = 1000; // una richiesta al secondo, per non pesare sul loro server

/** Chiavi del template {{Dex}} → versioni di PokéKnow. Chiavi sconosciute vengono segnalate nel log. */
export const DEX_KEYS = {
  rzdex: ['ruby', 'sapphire'],
  rubinodex: ['ruby'],
  zaffirodex: ['sapphire'],
  smeraldodex: ['emerald'],
  rfvfdex: ['firered', 'leafgreen'],
  rossofuocodex: ['firered'],
  verdefogliadex: ['leafgreen'],
  dpdex: ['diamond', 'pearl'],
  diamantedex: ['diamond'],
  perladex: ['pearl'],
  platinodex: ['platinum'],
  hgssdex: ['heartgold', 'soulsilver'],
  heartgolddex: ['heartgold'],
  soulsilverdex: ['soulsilver'],
  nbn2b2dex: ['black', 'white', 'black-2', 'white-2'],
  nbdex: ['black', 'white'],
  nerodex: ['black'],
  biancodex: ['white'],
  n2b2dex: ['black-2', 'white-2'],
  nero2dex: ['black-2'],
  bianco2dex: ['white-2'],
  xydex: ['x', 'y'],
  xdex: ['x'],
  ydex: ['y'],
  rozadex: ['omega-ruby', 'alpha-sapphire'],
  rodex: ['omega-ruby'],
  zadex: ['alpha-sapphire'],
  sldex: ['sun', 'moon'],
  soledex: ['sun'],
  lunadex: ['moon'],
  usuldex: ['ultra-sun', 'ultra-moon'],
  ultrasoledex: ['ultra-sun'],
  ultralunadex: ['ultra-moon'],
  lgpedex: ['lets-go-pikachu', 'lets-go-eevee'],
  lgpdex: ['lets-go-pikachu'],
  lgedex: ['lets-go-eevee'],
  spscdex: ['sword', 'shield'],
  spadadex: ['sword'],
  scudodex: ['shield'],
  dlpsdex: ['brilliant-diamond', 'shining-pearl'],
  diamantelucentedex: ['brilliant-diamond'],
  perlasplendentedex: ['shining-pearl'],
  lpadex: ['legends-arceus'],
  svdex: ['scarlet', 'violet'],
  scarlattodex: ['scarlet'],
  violettodex: ['violet'],
  lpzadex: ['legends-za'],
};

// chiavi di giochi che PokéKnow non mostra (prima e seconda generazione)
const IGNORED = new Set(['rossobludex', 'rossodex', 'bludex', 'verdedex', 'giallodex', 'orodex', 'argentodex', 'cristallodex', 'oadex']);

/** Testo wiki ripulito: link, grassetti e template semplici diventano testo normale. */
export function cleanWiki(text) {
  return text
    .replace(/<ref[^>]*\/>|<ref[^>]*>[\s\S]*?<\/ref>/g, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/\{\{tt\|([^|}]*)\|[^}]*\}\}/g, '$1')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/'''?/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Argomenti di un template a partire dalla posizione della sua apertura "{{", rispettando i template annidati. */
function templateBody(wikitext, start) {
  let depth = 0;
  for (let i = start; i < wikitext.length - 1; i++) {
    if (wikitext[i] === '{' && wikitext[i + 1] === '{') {
      depth++;
      i++;
    } else if (wikitext[i] === '}' && wikitext[i + 1] === '}') {
      depth--;
      i++;
      if (depth === 0) return wikitext.slice(start + 2, i - 1);
    }
  }
  return null;
}

/** Divide gli argomenti di un template sui "|" di primo livello. */
function splitArgs(body) {
  const parts = [];
  let depth = 0;
  let cur = '';
  for (let i = 0; i < body.length; i++) {
    const two = body.slice(i, i + 2);
    if (two === '{{' || two === '[[') {
      depth++;
      cur += two;
      i++;
    } else if (two === '}}' || two === ']]') {
      depth--;
      cur += two;
      i++;
    } else if (body[i] === '|' && depth === 0) {
      parts.push(cur);
      cur = '';
    } else cur += body[i];
  }
  parts.push(cur);
  return parts;
}

/**
 * Voci del Pokédex della forma base: il primo template {{Dex}} senza "forma=".
 * Restituisce { versione: testo } e le chiavi che non sappiamo collegare a un gioco.
 */
export function parseDex(wikitext, speciesName) {
  const entries = {};
  const unknown = [];
  const re = /\{\{\s*Dex\s*\n?\|/g;
  let match;
  while ((match = re.exec(wikitext))) {
    const body = templateBody(wikitext, match.index);
    if (!body) continue;
    const args = splitArgs(body).slice(1);
    const params = Object.fromEntries(
      args
        .map((a) => a.split('='))
        .filter((kv) => kv.length >= 2)
        .map(([k, ...v]) => [k.trim().toLowerCase(), v.join('=').trim()]),
    );
    if (params.forma) continue; // Mega, forme regionali, Gigamax…
    for (const [key, value] of Object.entries(params)) {
      if (!key.endsWith('dex') || !value) continue;
      const versions = DEX_KEYS[key];
      if (!versions) {
        if (!IGNORED.has(key)) unknown.push(key);
        continue;
      }
      let text = cleanWiki(value);
      // i giochi vecchi scrivono il nome in maiuscolo (GENGAR): lo riportiamo come negli altri testi
      if (speciesName) text = text.replaceAll(speciesName.toUpperCase(), speciesName);
      text = text.replace(/POKéMON/g, 'Pokémon').replace(/POKÉMON/g, 'Pokémon');
      if (text) for (const v of versions) entries[v] = text;
    }
    break;
  }
  return { entries, unknown };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Wikitesto delle pagine richieste (titolo → { title: titolo finale dopo i redirect, text }).
 * Usa la cache su disco; scarica solo le pagine mancanti, o tutte con `refresh`.
 */
export async function loadPages(titles, { cacheDir, refresh = false, log = console.log }) {
  await mkdir(cacheDir, { recursive: true });
  const file = join(cacheDir, 'pages.json');
  let cache = {};
  try {
    cache = JSON.parse(await readFile(file, 'utf8'));
  } catch {}
  const missing = refresh ? titles : titles.filter((t) => !(t in cache));
  if (missing.length) {
    log(`  Pokémon Central: scarico ${missing.length} pagine…`);
    try {
      for (let i = 0; i < missing.length; i += BATCH) {
        const batch = missing.slice(i, i + BATCH);
        const url = new URL(API);
        url.search = new URLSearchParams({
          action: 'query',
          prop: 'revisions',
          rvprop: 'content',
          rvslots: 'main',
          format: 'json',
          formatversion: '2',
          redirects: '1',
          titles: batch.join('|'),
        }).toString();
        const res = await fetch(url, { headers: { 'user-agent': 'PokeKnow/1.0 (https://github.com/Vittorio-2001/PokeKnow)' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        // titolo richiesto → titolo dopo normalizzazione e redirect
        const final = new Map(batch.map((t) => [t, t]));
        for (const n of data.query?.normalized ?? []) for (const [k, v] of final) if (v === n.from) final.set(k, n.to);
        for (const r of data.query?.redirects ?? []) for (const [k, v] of final) if (v === r.from) final.set(k, r.to);
        const pages = new Map((data.query?.pages ?? []).map((p) => [p.title, p.revisions?.[0]?.slots?.main?.content ?? null]));
        for (const [asked, title] of final) cache[asked] = { title, text: pages.get(title) ?? null };
        await writeFile(file, JSON.stringify(cache));
        if (i + BATCH < missing.length) await sleep(PAUSE_MS);
      }
    } catch (err) {
      log(`  Pokémon Central non raggiungibile (${err.message}): uso solo la cache.`);
    }
  }
  return cache;
}

/** Link alla pagina di Pokémon Central di un titolo. */
export function pageUrl(title) {
  return `${WIKI}/${encodeURIComponent(title.replaceAll(' ', '_')).replace(/%2F/g, '/')}`;
}
