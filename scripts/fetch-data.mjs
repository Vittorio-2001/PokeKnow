// Scarica i CSV ufficiali di PokéAPI da GitHub e genera i JSON usati dal sito.
// I CSV restano in cache in .cache/csv: le build successive non riscaricano nulla.
// Per forzare un aggiornamento: `npm run data -- --refresh`.

import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, '.cache', 'csv');
const OUT = join(ROOT, 'src', 'data', 'generated');
const SOURCE = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv';
const REFRESH = process.argv.includes('--refresh');

const LANG = { it: 8, en: 9 };
const LAST_SPECIES = 1025;
const FIRST_GEN = 3; // dai giochi GBA in poi
const LAST_GEN = 9;

// Gruppi di versioni inclusi nel selettore (giochi principali, niente DLC né spin-off).
const GROUPS = [
  'ruby-sapphire', 'emerald', 'firered-leafgreen',
  'diamond-pearl', 'platinum', 'heartgold-soulsilver',
  'black-white', 'black-2-white-2',
  'x-y', 'omega-ruby-alpha-sapphire',
  'sun-moon', 'ultra-sun-ultra-moon', 'lets-go-pikachu-lets-go-eevee',
  'sword-shield', 'brilliant-diamond-shining-pearl', 'legends-arceus',
  'scarlet-violet', 'legends-za',
];

// Giochi in cui tutto il Pokédex nazionale fino a quella generazione è ottenibile.
// Negli altri la presenza dipende dai Pokédex regionali.
const NATIONAL_LIMIT = {
  'ruby-sapphire': 386, 'emerald': 386, 'firered-leafgreen': 386,
  'diamond-pearl': 493, 'platinum': 493, 'heartgold-soulsilver': 493,
  'black-white': 649, 'black-2-white-2': 649,
  'x-y': 721, 'omega-ruby-alpha-sapphire': 721,
  'sun-moon': 807, 'ultra-sun-ultra-moon': 807,
  'brilliant-diamond-shining-pearl': 493,
};

// Nomi italiani dei Pokédex regionali (PokéAPI li ha solo in inglese).
const DEX_NAMES_IT = {
  2: 'Kanto', 3: 'Johto', 4: 'Hoenn', 5: 'Sinnoh', 6: 'Sinnoh (esteso)', 7: 'Johto',
  8: 'Unima', 9: 'Unima', 12: 'Kalos Centrale', 13: 'Kalos Costiera', 14: 'Kalos Montana',
  15: 'Hoenn', 16: 'Alola', 17: "Mele Mele", 18: 'Akala', 19: "Ula'ula", 20: 'Poni',
  21: 'Alola', 22: 'Mele Mele', 23: 'Akala', 24: "Ula'ula", 25: 'Poni', 26: 'Kanto',
  27: 'Galar', 28: 'Isola dell’Armatura', 29: 'Terre Innevate', 30: 'Hisui', 31: 'Paldea',
  32: 'Nordivia', 33: 'Mirtillo', 34: 'Luminopoli', 35: 'Iperspazio',
};

// Palette standard dei tipi, usata dalla community.
const TYPE_COLORS = {
  normal: '#A8A77A', fighting: '#C22E28', flying: '#A98FF3', poison: '#A33EA1',
  ground: '#E2BF65', rock: '#B6A136', bug: '#A6B91A', ghost: '#735797',
  steel: '#B7B7CE', fire: '#EE8130', water: '#6390F0', grass: '#7AC74C',
  electric: '#F7D02C', psychic: '#F95587', ice: '#96D9D6', dragon: '#6F35FC',
  dark: '#705746', fairy: '#D685AD',
};

const FILES = [
  'pokemon_species', 'pokemon_species_names', 'pokemon_species_flavor_text',
  'pokemon', 'pokemon_types', 'pokemon_types_past', 'pokemon_stats', 'pokemon_stats_past',
  'pokemon_abilities', 'pokemon_abilities_past', 'ability_names', 'ability_flavor_text',
  'types', 'type_names', 'type_efficacy', 'type_efficacy_past',
  'versions', 'version_groups', 'version_names',
  'pokedex_version_groups', 'pokemon_dex_numbers',
];

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}

async function load(name) {
  const path = join(CACHE, `${name}.csv`);
  if (REFRESH || !(await exists(path))) {
    const res = await fetch(`${SOURCE}/${name}.csv`);
    if (!res.ok) throw new Error(`Download di ${name}.csv fallito: HTTP ${res.status}`);
    await writeFile(path, await res.text());
    console.log(`  scaricato ${name}.csv`);
  }
  return parse(await readFile(path, 'utf8'), { columns: true, skip_empty_lines: true });
}

const num = (v) => (v === '' || v == null ? null : Number(v));

function groupBy(rows, key) {
  const map = new Map();
  for (const row of rows) {
    const k = row[key];
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(row);
  }
  return map;
}

/** Testo del Pokédex ripulito: niente a capo dei giochi, niente "POKéMON" maiuscolo. */
function cleanFlavor(text) {
  return text
    .replace(/­\s*/g, '')
    .replace(/-\n(?=\p{Ll})/gu, '')
    .replace(/[\f\n\r\t]+/g, ' ')
    .replace(/POKéMON/g, 'Pokémon')
    .replace(/POKé BALL/g, 'Poké Ball')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Le tabelle "_past" di PokéAPI indicano il valore valido FINO a quella generazione inclusa.
 * Per una generazione `gen` vale la voce passata con la generazione più bassa >= gen,
 * altrimenti il valore attuale.
 */
function pastFor(pastRows, gen) {
  let best = null;
  for (const row of pastRows) {
    const g = Number(row.generation_id);
    if (g >= gen && (best === null || g < Number(best[0].generation_id))) best = [row];
    else if (best && g === Number(best[0].generation_id)) best.push(row);
  }
  return best;
}

async function main() {
  await mkdir(CACHE, { recursive: true });
  await mkdir(OUT, { recursive: true });
  console.log('Carico i CSV di PokéAPI…');
  const csv = {};
  for (const f of FILES) csv[f] = await load(f);

  // ---------- Tipi e tabella per generazione ----------
  const typeRows = csv.types.filter((t) => Number(t.id) <= 18);
  const typeSlug = new Map(typeRows.map((t) => [t.id, t.identifier]));
  const typeNames = new Map();
  for (const r of csv.type_names) {
    if (!typeSlug.has(r.type_id)) continue;
    const lang = r.local_language_id === '8' ? 'it' : r.local_language_id === '9' ? 'en' : null;
    if (!lang) continue;
    if (!typeNames.has(r.type_id)) typeNames.set(r.type_id, {});
    typeNames.get(r.type_id)[lang] = r.name;
  }
  const types = typeRows.map((t) => ({
    slug: t.identifier,
    gen: Number(t.generation_id),
    name: typeNames.get(t.id),
    color: TYPE_COLORS[t.identifier],
  }));

  const pastEfficacy = csv.type_efficacy_past;
  const chart = {};
  for (let gen = FIRST_GEN; gen <= LAST_GEN; gen++) {
    const available = new Set(types.filter((t) => t.gen <= gen).map((t) => t.slug));
    const genChart = {};
    for (const row of csv.type_efficacy) {
      const atk = typeSlug.get(row.damage_type_id);
      const def = typeSlug.get(row.target_type_id);
      if (!atk || !def || !available.has(atk) || !available.has(def)) continue;
      const past = pastFor(
        pastEfficacy.filter((p) => p.damage_type_id === row.damage_type_id && p.target_type_id === row.target_type_id),
        gen,
      );
      const factor = Number((past ? past[0] : row).damage_factor) / 100;
      if (factor !== 1) (genChart[atk] ??= {})[def] = factor;
    }
    chart[gen] = genChart;
  }

  // ---------- Giochi ----------
  const groupsBySlug = new Map(csv.version_groups.map((g) => [g.identifier, g]));
  const versionNames = new Map();
  for (const r of csv.version_names) {
    const lang = r.local_language_id === '8' ? 'it' : r.local_language_id === '9' ? 'en' : null;
    if (!lang) continue;
    if (!versionNames.has(r.version_id)) versionNames.set(r.version_id, {});
    versionNames.get(r.version_id)[lang] = r.name;
  }
  const dexByGroup = groupBy(csv.pokedex_version_groups, 'version_group_id');
  const games = [];
  for (const slug of GROUPS) {
    const group = groupsBySlug.get(slug);
    if (!group) { console.warn(`  gruppo ${slug} non trovato, salto`); continue; }
    const versions = csv.versions
      .filter((v) => v.version_group_id === group.id)
      .map((v) => ({ slug: v.identifier, id: Number(v.id), name: versionNames.get(v.id) }));
    games.push({
      group: slug,
      groupId: Number(group.id),
      gen: Number(group.generation_id),
      order: Number(group.order),
      nationalLimit: NATIONAL_LIMIT[slug] ?? null,
      dexes: (dexByGroup.get(group.id) ?? []).map((d) => Number(d.pokedex_id)),
      versions,
    });
  }
  games.sort((a, b) => a.order - b.order);
  const versionToGame = new Map();
  for (const g of games) for (const v of g.versions) versionToGame.set(String(v.id), g);

  // ---------- Abilità ----------
  const abilityNames = new Map();
  for (const r of csv.ability_names) {
    const lang = r.local_language_id === '8' ? 'it' : r.local_language_id === '9' ? 'en' : null;
    if (!lang) continue;
    if (!abilityNames.has(r.ability_id)) abilityNames.set(r.ability_id, {});
    abilityNames.get(r.ability_id)[lang] = r.name;
  }
  // Descrizione: la più recente disponibile per ogni lingua.
  const abilityDesc = new Map();
  const groupOrder = new Map(csv.version_groups.map((g) => [g.id, Number(g.order)]));
  for (const r of csv.ability_flavor_text) {
    const lang = r.language_id === '8' ? 'it' : r.language_id === '9' ? 'en' : null;
    if (!lang) continue;
    const order = groupOrder.get(r.version_group_id) ?? 0;
    const cur = abilityDesc.get(r.ability_id) ?? {};
    if (!cur[lang] || cur[lang].order < order) cur[lang] = { order, text: cleanFlavor(r.flavor_text) };
    abilityDesc.set(r.ability_id, cur);
  }
  const usedAbilities = new Set();

  // ---------- Pokémon ----------
  const names = groupBy(csv.pokemon_species_names, 'pokemon_species_id');
  const flavors = groupBy(csv.pokemon_species_flavor_text, 'species_id');
  const pokemonRows = new Map(csv.pokemon.filter((p) => p.is_default === '1').map((p) => [p.species_id, p]));
  const typesNow = groupBy(csv.pokemon_types, 'pokemon_id');
  const typesPast = groupBy(csv.pokemon_types_past, 'pokemon_id');
  const statsNow = groupBy(csv.pokemon_stats, 'pokemon_id');
  const statsPast = groupBy(csv.pokemon_stats_past, 'pokemon_id');
  const abilNow = groupBy(csv.pokemon_abilities, 'pokemon_id');
  const abilPast = groupBy(csv.pokemon_abilities_past, 'pokemon_id');
  const dexNumbers = groupBy(csv.pokemon_dex_numbers, 'species_id');

  const pokemon = [];
  for (const sp of csv.pokemon_species) {
    const id = Number(sp.id);
    if (id > LAST_SPECIES) continue;
    const poke = pokemonRows.get(sp.id);
    const pid = poke.id;
    const nameRows = names.get(sp.id) ?? [];
    const pick = (lang, field) => nameRows.find((r) => r.local_language_id === String(LANG[lang]))?.[field] || null;
    const introduced = Number(sp.generation_id);

    const typesByGen = {};
    const statsByGen = {};
    const abilitiesByGen = {};
    for (let gen = Math.max(FIRST_GEN, introduced); gen <= LAST_GEN; gen++) {
      const pastT = pastFor(typesPast.get(pid) ?? [], gen);
      const tRows = (pastT ?? typesNow.get(pid)).slice().sort((a, b) => a.slot - b.slot);
      typesByGen[gen] = tRows.map((r) => typeSlug.get(r.type_id)).filter(Boolean);

      const stats = (statsNow.get(pid) ?? [])
        .filter((r) => Number(r.stat_id) <= 6)
        .sort((a, b) => a.stat_id - b.stat_id)
        .map((r) => {
          const past = pastFor((statsPast.get(pid) ?? []).filter((p) => p.stat_id === r.stat_id), gen);
          return Number((past ? past[0] : r).base_stat);
        });
      statsByGen[gen] = stats;

      const slots = new Map();
      for (const r of abilNow.get(pid) ?? []) slots.set(r.slot, r);
      const pastBySlot = groupBy(abilPast.get(pid) ?? [], 'slot');
      for (const [slot, rows] of pastBySlot) {
        const past = pastFor(rows, gen);
        if (past) slots.set(slot, past[0]);
      }
      abilitiesByGen[gen] = [...slots.values()]
        .filter((r) => r.ability_id && !(gen < 5 && r.is_hidden === '1'))
        .sort((a, b) => a.slot - b.slot)
        .map((r) => {
          usedAbilities.add(r.ability_id);
          return { id: Number(r.ability_id), hidden: r.is_hidden === '1' };
        });
    }

    const flavor = {};
    for (const r of flavors.get(sp.id) ?? []) {
      const lang = r.language_id === '8' ? 'it' : r.language_id === '9' ? 'en' : null;
      if (!lang || !versionToGame.has(r.version_id)) continue;
      const v = versionToGame.get(r.version_id).versions.find((x) => String(x.id) === r.version_id);
      (flavor[v.slug] ??= {})[lang] = cleanFlavor(r.flavor_text);
    }

    // Presenza e numero nel Pokédex regionale, per ogni gruppo di giochi.
    const dexRows = dexNumbers.get(sp.id) ?? [];
    const games_ = {};
    for (const g of games) {
      if (introduced > g.gen) continue;
      const regional = dexRows
        .filter((d) => g.dexes.includes(Number(d.pokedex_id)))
        .map((d) => ({ dex: DEX_NAMES_IT[d.pokedex_id] ?? `#${d.pokedex_id}`, n: Number(d.pokedex_number) }));
      const present = g.nationalLimit ? id <= g.nationalLimit : regional.length > 0;
      if (present || regional.length) games_[g.group] = regional;
    }

    pokemon.push({
      id,
      slug: sp.identifier,
      name: { it: pick('it', 'name'), en: pick('en', 'name') },
      genus: { it: pick('it', 'genus'), en: pick('en', 'genus') },
      gen: introduced,
      height: Number(poke.height) / 10,
      weight: Number(poke.weight) / 10,
      legendary: sp.is_legendary === '1',
      mythical: sp.is_mythical === '1',
      typesByGen,
      statsByGen,
      abilitiesByGen,
      flavor,
      games: games_,
    });
  }

  const abilities = {};
  for (const id of usedAbilities) {
    const d = abilityDesc.get(id) ?? {};
    abilities[id] = { name: abilityNames.get(id) ?? {}, desc: { it: d.it?.text ?? null, en: d.en?.text ?? null } };
  }

  const index = pokemon.map((p) => ({ id: p.id, slug: p.slug, name: p.name.it ?? p.name.en, types: p.typesByGen[LAST_GEN] }));

  await writeFile(join(OUT, 'types.json'), JSON.stringify({ types, chart }));
  await writeFile(join(OUT, 'games.json'), JSON.stringify(games));
  await writeFile(join(OUT, 'abilities.json'), JSON.stringify(abilities));
  await writeFile(join(OUT, 'pokemon.json'), JSON.stringify(pokemon));
  await writeFile(join(OUT, 'index.json'), JSON.stringify(index));
  console.log(`Fatto: ${pokemon.length} Pokémon, ${games.length} giochi, ${types.length} tipi.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
