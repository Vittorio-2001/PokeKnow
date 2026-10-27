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

// Nomi dei Pokédex regionali (PokéAPI li ha solo in inglese, e con prefissi come "Original").
const DEX_NAMES = {
  2: ['Kanto', 'Kanto'], 3: ['Johto', 'Johto'], 4: ['Hoenn', 'Hoenn'], 5: ['Sinnoh', 'Sinnoh'],
  6: ['Sinnoh (esteso)', 'Sinnoh (extended)'], 7: ['Johto', 'Johto'], 8: ['Unima', 'Unova'], 9: ['Unima', 'Unova'],
  12: ['Kalos Centrale', 'Central Kalos'], 13: ['Kalos Costiera', 'Coastal Kalos'], 14: ['Kalos Montana', 'Mountain Kalos'],
  15: ['Hoenn', 'Hoenn'], 16: ['Alola', 'Alola'], 17: ['Mele Mele', 'Melemele'], 18: ['Akala', 'Akala'],
  19: ["Ula'ula", "Ula'ula"], 20: ['Poni', 'Poni'], 21: ['Alola', 'Alola'], 22: ['Mele Mele', 'Melemele'],
  23: ['Akala', 'Akala'], 24: ["Ula'ula", "Ula'ula"], 25: ['Poni', 'Poni'], 26: ['Kanto', 'Kanto'],
  27: ['Galar', 'Galar'], 28: ['Isola dell’Armatura', 'Isle of Armor'], 29: ['Terre Innevate', 'Crown Tundra'],
  30: ['Hisui', 'Hisui'], 31: ['Paldea', 'Paldea'], 32: ['Nordivia', 'Kitakami'], 33: ['Mirtillo', 'Blueberry'],
  34: ['Luminopoli', 'Lumiose'], 35: ['Iperspazio', 'Hyperspace'],
};

function dexName(id) {
  const [it, en] = DEX_NAMES[id] ?? [`#${id}`, `#${id}`];
  return { it, en };
}

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
  'move_names',
  'encounters', 'encounter_slots', 'encounter_methods', 'encounter_condition_value_map', 'encounter_condition_values',
  'location_areas', 'location_area_prose', 'locations', 'location_names',
  'pokemon_evolution', 'evolution_triggers', 'item_names',
  'pokemon_egg_groups', 'egg_group_prose', 'growth_rates', 'pokemon_shapes', 'items',
  'pokemon_moves', 'moves', 'move_changelog', 'machines',
  'pokemon_forms', 'pokemon_form_names',
];

// ---------- Megaevoluzioni: in quali giochi esistono ----------
// PokéAPI dice solo in che gioco è nata ogni Mega; dopo X e Y sono rimaste in ROZA, Sole e Luna,
// Ultrasole e Ultraluna e Leggende Z-A (dove sono tornate tutte), e in Let's Go solo quelle di Kanto.
const MEGA_GROUPS = {
  'x-y': ['x-y', 'omega-ruby-alpha-sapphire', 'sun-moon', 'ultra-sun-ultra-moon', 'legends-za'],
  'omega-ruby-alpha-sapphire': ['omega-ruby-alpha-sapphire', 'sun-moon', 'ultra-sun-ultra-moon', 'legends-za'],
  'legends-za': ['legends-za'],
  'mega-dimension': ['legends-za'],
};
const LETS_GO_MEGAS = new Set([
  'venusaur-mega', 'charizard-mega-x', 'charizard-mega-y', 'blastoise-mega', 'beedrill-mega', 'pidgeot-mega',
  'alakazam-mega', 'slowbro-mega', 'gengar-mega', 'kangaskhan-mega', 'pinsir-mega', 'gyarados-mega',
  'aerodactyl-mega', 'mewtwo-mega-x', 'mewtwo-mega-y',
]);
const MEGA_STONE_CATEGORY = '44';

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

  const growthSlug = new Map(csv.growth_rates.map((g) => [g.id, g.identifier]));
  const shapeSlug = new Map(csv.pokemon_shapes.map((s) => [s.id, s.identifier]));
  const eggGroupsBySpecies = groupBy(csv.pokemon_egg_groups, 'species_id');
  const eggGroupNames = new Map();
  for (const r of csv.egg_group_prose) {
    const lang = r.local_language_id === '8' ? 'it' : r.local_language_id === '9' ? 'en' : null;
    if (!lang) continue;
    if (!eggGroupNames.has(r.egg_group_id)) eggGroupNames.set(r.egg_group_id, {});
    eggGroupNames.get(r.egg_group_id)[lang] = r.name;
  }

  const megasBySpecies = buildMegas(csv, typeSlug, usedAbilities);

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
    const evsByGen = {};
    const abilitiesByGen = {};
    for (let gen = Math.max(FIRST_GEN, introduced); gen <= LAST_GEN; gen++) {
      const pastT = pastFor(typesPast.get(pid) ?? [], gen);
      const tRows = (pastT ?? typesNow.get(pid)).slice().sort((a, b) => a.slot - b.slot);
      typesByGen[gen] = tRows.map((r) => typeSlug.get(r.type_id)).filter(Boolean);

      const statRows = (statsNow.get(pid) ?? [])
        .filter((r) => Number(r.stat_id) <= 6)
        .sort((a, b) => a.stat_id - b.stat_id)
        .map((r) => {
          const past = pastFor((statsPast.get(pid) ?? []).filter((p) => p.stat_id === r.stat_id), gen);
          return past ? past[0] : r;
        });
      statsByGen[gen] = statRows.map((r) => Number(r.base_stat));
      // EV che si ottengono sconfiggendolo, nello stesso ordine delle statistiche
      evsByGen[gen] = statRows.map((r) => Number(r.effort));

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
        .map((d) => ({ dex: dexName(d.pokedex_id), n: Number(d.pokedex_number) }));
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
      evsByGen,
      abilitiesByGen,
      flavor,
      games: games_,
      // cattura e allevamento (valori attuali di PokéAPI)
      capture: Number(sp.capture_rate),
      happiness: num(sp.base_happiness),
      baseExp: num(poke.base_experience),
      growth: growthSlug.get(sp.growth_rate_id) ?? null,
      genderRate: Number(sp.gender_rate), // -1 senza genere, altrimenti ottavi di femmine
      hatch: num(sp.hatch_counter),
      eggGroups: (eggGroupsBySpecies.get(sp.id) ?? []).map((r) => eggGroupNames.get(r.egg_group_id) ?? {}),
      chain: Number(sp.evolution_chain_id),
      shape: shapeSlug.get(sp.shape_id) ?? null,
      ...(megasBySpecies.has(sp.id) ? { megas: megasBySpecies.get(sp.id) } : {}),
    });
  }

  const abilities = {};
  for (const id of usedAbilities) {
    const d = abilityDesc.get(id) ?? {};
    abilities[id] = { name: abilityNames.get(id) ?? {}, desc: { it: d.it?.text ?? null, en: d.en?.text ?? null } };
  }

  const index = pokemon.map((p) => ({ id: p.id, slug: p.slug, name: { it: p.name.it ?? p.name.en, en: p.name.en ?? p.name.it }, types: p.typesByGen[LAST_GEN], shape: p.shape }));

  await writeFile(join(OUT, 'types.json'), JSON.stringify({ types, chart }));
  await writeFile(join(OUT, 'games.json'), JSON.stringify(games));
  await writeFile(join(OUT, 'abilities.json'), JSON.stringify(abilities));
  await writeFile(join(OUT, 'pokemon.json'), JSON.stringify(pokemon));
  await writeFile(join(OUT, 'index.json'), JSON.stringify(index));

  await buildWhereData(csv, games, typeSlug);
  await buildLearnsets(csv, games, typeSlug);
  console.log(`Fatto: ${pokemon.length} Pokémon, ${games.length} giochi, ${types.length} tipi.`);
}

/**
 * Megaevoluzioni di ogni specie: tipi, statistiche, abilità, altezza e peso della forma Mega,
 * la Megapietra (o la mossa, per Rayquaza) e i giochi in cui esiste.
 * Solo le Mega della forma predefinita (niente Meowstic femmina o Tatsugiri Ricurvo, che il sito non mostra).
 */
function buildMegas(csv, typeSlug, usedAbilities) {
  const groupSlug = new Map(csv.version_groups.map((g) => [g.id, g.identifier]));
  const pokemonById = new Map(csv.pokemon.map((p) => [p.id, p]));
  const defaultBySpecies = new Map(csv.pokemon.filter((p) => p.is_default === '1').map((p) => [p.species_id, p]));
  const speciesSlug = new Map(csv.pokemon_species.map((s) => [s.id, s.identifier]));
  const speciesNames = groupBy(csv.pokemon_species_names, 'pokemon_species_id');
  const formNames = groupBy(csv.pokemon_form_names, 'pokemon_form_id');
  const typesBy = groupBy(csv.pokemon_types, 'pokemon_id');
  const statsBy = groupBy(csv.pokemon_stats, 'pokemon_id');
  const abilBy = groupBy(csv.pokemon_abilities, 'pokemon_id');
  const itemNames = groupBy(csv.item_names, 'item_id');
  const stones = csv.items.filter((i) => i.category_id === MEGA_STONE_CATEGORY);
  const nameIn = (rows, lang, field) => rows?.find((r) => r.local_language_id === String(LANG[lang]))?.[field] || null;

  // Megapietra: stesso inizio del nome della specie e stesso suffisso (charizardite-x per Mega Charizard X)
  function stoneFor(base, suffix) {
    for (let n = base.length; n >= 4; n--) {
      const found = stones.filter((s) => s.identifier.startsWith(base.slice(0, n)) && (suffix ? s.identifier.endsWith(`-${suffix}`) : !/-[xyz]$/.test(s.identifier)));
      if (found.length === 1) return found[0];
      if (found.length > 1) return null;
    }
    return null;
  }

  const bySpecies = new Map();
  for (const form of csv.pokemon_forms) {
    if (form.is_mega !== '1') continue;
    const poke = pokemonById.get(form.pokemon_id);
    if (!poke || Number(poke.species_id) > LAST_SPECIES) continue;
    const base = defaultBySpecies.get(poke.species_id);
    const [prefix, rest = ''] = poke.identifier.split('-mega');
    if (prefix !== base.identifier && prefix !== speciesSlug.get(poke.species_id)) continue;
    const suffix = rest.replace(/^-/, ''); // '', 'x', 'y', 'z'
    const intro = groupSlug.get(form.introduced_in_version_group_id);
    const groups = [...(MEGA_GROUPS[intro] ?? ['legends-za'])];
    if (LETS_GO_MEGAS.has(poke.identifier)) groups.push('lets-go-pikachu-lets-go-eevee');

    const speciesName = (lang) => nameIn(speciesNames.get(poke.species_id), lang, 'name');
    const tail = suffix ? ` ${suffix.toUpperCase()}` : '';
    const names = formNames.get(form.id);
    const name = {
      it: nameIn(names, 'it', 'form_name') ?? `Mega${speciesName('it') ?? speciesName('en')}${tail}`,
      en: nameIn(names, 'en', 'pokemon_name') ?? nameIn(names, 'en', 'form_name') ?? `Mega ${speciesName('en')}${tail}`,
    };

    const stone = stoneFor(speciesSlug.get(poke.species_id), suffix);
    const abilities = (abilBy.get(poke.id) ?? []).sort((a, b) => a.slot - b.slot).map((r) => {
      usedAbilities.add(r.ability_id);
      return { id: Number(r.ability_id), hidden: false };
    });

    const mega = {
      id: Number(poke.id),
      slug: poke.identifier,
      suffix,
      name,
      types: (typesBy.get(poke.id) ?? []).sort((a, b) => a.slot - b.slot).map((r) => typeSlug.get(r.type_id)).filter(Boolean),
      stats: (statsBy.get(poke.id) ?? []).filter((r) => Number(r.stat_id) <= 6).sort((a, b) => a.stat_id - b.stat_id).map((r) => Number(r.base_stat)),
      abilities,
      height: Number(poke.height) / 10,
      weight: Number(poke.weight) / 10,
      groups,
    };
    if (stone) {
      mega.stone = { slug: stone.identifier, name: { it: nameIn(itemNames.get(stone.id), 'it', 'name'), en: nameIn(itemNames.get(stone.id), 'en', 'name') } };
    } else if (poke.identifier === 'rayquaza-mega') {
      // Rayquaza non usa una Megapietra: deve conoscere Ascesa del Drago
      const move = csv.moves.find((m) => m.identifier === 'dragon-ascent');
      const moveNames = csv.move_names.filter((n) => n.move_id === move?.id);
      mega.move = { it: nameIn(moveNames, 'it', 'name'), en: nameIn(moveNames, 'en', 'name') };
    }
    if (!bySpecies.has(poke.species_id)) bySpecies.set(poke.species_id, []);
    bySpecies.get(poke.species_id).push(mega);
  }
  const total = [...bySpecies.values()].flat();
  console.log(`  Megaevoluzioni: ${total.length} (${total.filter((m) => !m.stone && !m.move).length} senza Megapietra).`);
  return bySpecies;
}

/**
 * Le mosse che ogni Pokémon impara in ogni gioco: per livello, con MT/MN/DT, come mossa uovo
 * e dall'Insegnamosse. Più i dati delle mosse con i valori che avevano nei giochi passati.
 */
async function buildLearnsets(csv, games, typeSlug) {
  const groupById = new Map(games.map((g) => [String(g.groupId), g]));
  const orderById = new Map(csv.version_groups.map((g) => [g.id, Number(g.order)]));

  // numero della macchina per gruppo di giochi: "tm24", "hm4", "tr15"
  const itemCode = new Map(csv.items.map((i) => [i.id, i.identifier]));
  const machine = new Map();
  for (const m of csv.machines) {
    if (!groupById.has(m.version_group_id)) continue;
    const code = itemCode.get(m.item_id) ?? 'tm';
    const kind = code.startsWith('hm') ? 'hm' : code.startsWith('tr') ? 'tr' : 'tm';
    // in alcuni giochi MN e DT sono numerate da 100 in su (MN01 = 101, DT00 = 100)
    const raw = Number(m.machine_number);
    const n = (kind === 'hm' || kind === 'tr') && raw >= 100 ? raw - 100 : raw;
    machine.set(`${m.version_group_id}:${m.move_id}`, `${kind}${n}`);
  }

  // learnsets[pokemon][gruppo] = [[mossa, modo, valore]]; modo: L livello, M macchina, E uovo, T insegnamosse
  const METHOD = { 1: 'L', 2: 'E', 3: 'T', 4: 'M' };
  const seen = new Set();
  const learnsets = {};
  const usedMoves = new Set();
  for (const r of csv.pokemon_moves) {
    const id = Number(r.pokemon_id);
    if (id > LAST_SPECIES) continue;
    const game = groupById.get(r.version_group_id);
    const method = METHOD[r.pokemon_move_method_id];
    if (!game || !method) continue;
    let value = null;
    if (method === 'L') value = Number(r.level);
    if (method === 'M') {
      value = machine.get(`${r.version_group_id}:${r.move_id}`);
      if (!value) continue;
    }
    const key = `${id}|${game.group}|${r.move_id}|${method}|${value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    ((learnsets[id] ??= {})[game.group] ??= []).push(value === null ? [Number(r.move_id), method] : [Number(r.move_id), method, value]);
    usedMoves.add(r.move_id);
  }

  const moveNames = namesBy(csv.move_names, 'move_id');
  const changes = groupBy(csv.move_changelog, 'move_id');
  const CLASS = { 1: 'status', 2: 'physical', 3: 'special' };
  const moves = {};
  for (const m of csv.moves) {
    if (!usedMoves.has(m.id)) continue;
    moves[m.id] = compact({
      name: moveNames.get(m.id) ?? {},
      type: typeSlug.get(m.type_id) ?? null,
      power: num(m.power),
      acc: num(m.accuracy),
      pp: num(m.pp),
      cls: CLASS[m.damage_class_id] ?? 'status',
      // valori che la mossa aveva PRIMA del gruppo di giochi "before" (ordine cronologico)
      past: (changes.get(m.id) ?? [])
        .map((c) =>
          compact({
            before: orderById.get(c.changed_in_version_group_id) ?? 0,
            type: c.type_id ? typeSlug.get(c.type_id) ?? null : null,
            power: c.power ? Number(c.power) : null,
            acc: c.accuracy ? Number(c.accuracy) : null,
            pp: c.pp ? Number(c.pp) : null,
          }),
        )
        .sort((a, b) => a.before - b.before),
    });
    if (!moves[m.id].past.length) delete moves[m.id].past;
  }

  await writeFile(join(OUT, 'learnsets.json'), JSON.stringify(learnsets));
  await writeFile(join(OUT, 'moves.json'), JSON.stringify(moves));
  console.log(`Mosse: ${Object.keys(moves).length}; learnset per ${Object.keys(learnsets).length} Pokémon.`);
}

/** Toglie i campi vuoti: i JSON restano piccoli. */
function compact(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null && v !== false && v !== undefined));
}

/** Nome italiano e inglese da una tabella *_names; l'italiano manca spesso. */
function namesBy(rows, idField) {
  const map = new Map();
  for (const r of rows) {
    const lang = r.local_language_id === '8' ? 'it' : r.local_language_id === '9' ? 'en' : null;
    if (!lang) continue;
    if (!map.has(r[idField])) map.set(r[idField], {});
    map.get(r[idField])[lang] = r.name;
  }
  return map;
}

// Parti di una zona (piani, lati): per l'italiano si traducono le parole singole; le descrizioni
// composte ("2f right room") restano in inglese, per non produrre frasi innaturali.
const AREA_WORDS_IT = {
  north: 'nord', south: 'sud', east: 'est', west: 'ovest', inside: 'interno', outside: 'esterno',
  entrance: 'ingresso', back: 'fondo', front: 'davanti', upper: 'alto', lower: 'basso', center: 'centro',
  room: 'stanza', area: 'area', basement: 'seminterrato', summit: 'vetta', cave: 'grotta', depths: 'profondità',
};

function areaSuffix(identifier, lang) {
  if (!identifier) return '';
  return identifier
    .split('-')
    .map((w) => (/^b?\d+f$/.test(w) ? w.toUpperCase() : w))
    .map((w, _, all) => (lang === 'it' && all.length === 1 ? AREA_WORDS_IT[w] ?? w : w))
    .join(' ');
}

/**
 * Dove si trova ogni Pokémon in ogni versione (zona, modo, livelli, probabilità, condizioni)
 * e come si evolve. Le zone hanno spesso solo il nome inglese: "Route 12" diventa "Percorso 12".
 */
async function buildWhereData(csv, games, typeSlug) {
  // versioni del selettore, con i DLC ricondotti al gioco base
  const versionSlug = new Map();
  const ourVersions = new Set(games.flatMap((g) => g.versions.map((v) => v.slug)));
  for (const v of csv.versions) {
    if (ourVersions.has(v.identifier)) versionSlug.set(v.id, v.identifier);
    const dlc = /-(sword|shield|scarlet|violet)$/.exec(v.identifier);
    if (dlc && !ourVersions.has(v.identifier)) versionSlug.set(v.id, dlc[1]);
  }

  const locationNames = namesBy(csv.location_names, 'location_id');
  const areaProse = namesBy(csv.location_area_prose, 'location_area_id');
  const areaById = new Map(csv.location_areas.map((a) => [a.id, a]));
  const areaName = (areaId) => {
    const area = areaById.get(areaId);
    const loc = locationNames.get(area?.location_id) ?? {};
    const en = areaProse.get(areaId)?.en ?? [loc.en, areaSuffix(area?.identifier, 'en')].filter(Boolean).join(' ');
    let it = loc.it ?? (loc.en ? loc.en.replace(/^Route (\d+)/, 'Percorso $1') : null);
    if (it && area?.identifier) it = `${it} (${areaSuffix(area.identifier, 'it')})`;
    return { it: it ?? null, en: en || loc.en || null };
  };

  const slots = new Map(csv.encounter_slots.map((s) => [s.id, s]));
  const methodSlug = new Map(csv.encounter_methods.map((m) => [m.id, m.identifier]));
  const condValues = new Map(csv.encounter_condition_values.map((c) => [c.id, c]));
  const condByEncounter = groupBy(csv.encounter_condition_value_map, 'encounter_id');

  // incontri[pokemonId][versione] = [{a: zona, m: modo, min, max, rate, c: [condizioni]}]
  const merged = new Map();
  const usedAreas = new Set();
  for (const e of csv.encounters) {
    const version = versionSlug.get(e.version_id);
    const pid = Number(e.pokemon_id);
    if (!version || pid > LAST_SPECIES) continue;
    const slot = slots.get(e.encounter_slot_id);
    const method = methodSlug.get(slot?.encounter_method_id) ?? 'other';
    const conds = (condByEncounter.get(e.id) ?? [])
      .map((c) => condValues.get(c.encounter_condition_value_id))
      .filter((c) => c && c.is_default !== '1')
      .map((c) => c.identifier)
      .sort();
    const key = `${pid}|${version}|${e.location_area_id}|${method}|${conds.join(',')}`;
    const cur = merged.get(key) ?? { pid, version, a: Number(e.location_area_id), m: method, min: 999, max: 0, rate: 0, c: conds };
    cur.min = Math.min(cur.min, Number(e.min_level));
    cur.max = Math.max(cur.max, Number(e.max_level));
    cur.rate += Number(slot?.rarity ?? 0);
    merged.set(key, cur);
    usedAreas.add(e.location_area_id);
  }
  // Stessa zona, stesso modo e stessi livelli: un'unica riga che elenca le condizioni alternative
  // (meteo, orario, gioco nello slot GBA…). Se una variante non ha condizioni, vale sempre.
  const rows = new Map();
  for (const e of merged.values()) {
    const key = `${e.pid}|${e.version}|${e.a}|${e.m}|${e.min}|${e.max}`;
    const cur = rows.get(key);
    if (!cur) {
      rows.set(key, { ...e, c: [...e.c], always: e.c.length === 0 });
      continue;
    }
    cur.rate = Math.max(cur.rate, e.rate);
    if (e.c.length === 0) cur.always = true;
    for (const c of e.c) if (!cur.c.includes(c)) cur.c.push(c);
  }
  const encounters = {};
  for (const { pid, version, always, ...rest } of rows.values()) {
    if (always) rest.c = [];
    rest.rate = Math.min(rest.rate, 100);
    ((encounters[pid] ??= {})[version] ??= []).push(rest);
  }
  for (const byVersion of Object.values(encounters)) {
    for (const list of Object.values(byVersion)) list.sort((x, y) => y.rate - x.rate || x.min - y.min);
  }
  const areas = {};
  for (const id of usedAreas) areas[id] = areaName(id);
  const versionsWithData = [...new Set([...merged.values()].map((e) => e.version))];

  // Evoluzioni: da chi si evolve e come, per gruppo di giochi
  const speciesFrom = new Map(csv.pokemon_species.map((s) => [s.id, s.evolves_from_species_id]));
  const speciesNames = namesBy(csv.pokemon_species_names, 'pokemon_species_id');
  const itemNames = namesBy(csv.item_names, 'item_id');
  const itemSlug = new Map(csv.items.map((i) => [i.id, i.identifier]));
  const moveNames = namesBy(csv.move_names, 'move_id');
  const triggers = new Map(csv.evolution_triggers.map((t) => [t.id, t.identifier]));
  const groupOrder = new Map(csv.version_groups.map((g) => [g.id, Number(g.order)]));
  const pick = (map, id) => (id ? map.get(id) ?? null : null);
  const evolutions = {};
  for (const r of csv.pokemon_evolution) {
    const sid = Number(r.evolved_species_id);
    const from = speciesFrom.get(r.evolved_species_id);
    if (sid > LAST_SPECIES || !from) continue;
    (evolutions[sid] ??= []).push(compact({
      from: Number(from),
      fromName: speciesNames.get(from) ?? {},
      since: groupOrder.get(r.version_group_id) ?? 0,
      trigger: triggers.get(r.evolution_trigger_id) ?? 'other',
      level: num(r.minimum_level),
      item: pick(itemNames, r.trigger_item_id),
      held: pick(itemNames, r.held_item_id),
      // identificatori degli oggetti, per mostrarne lo sprite nella catena evolutiva
      itemSlug: r.trigger_item_id ? itemSlug.get(r.trigger_item_id) ?? null : null,
      heldSlug: r.held_item_id ? itemSlug.get(r.held_item_id) ?? null : null,
      move: pick(moveNames, r.known_move_id),
      moveType: r.known_move_type_id ? typeSlug.get(r.known_move_type_id) ?? null : null,
      location: r.location_id ? locationNames.get(r.location_id) ?? null : null,
      happiness: num(r.minimum_happiness),
      affection: num(r.minimum_affection),
      beauty: num(r.minimum_beauty),
      time: r.time_of_day || null,
      gender: num(r.gender_id),
      trade: pick(speciesNames, r.trade_species_id),
      party: pick(speciesNames, r.party_species_id),
      partyType: r.party_type_id ? typeSlug.get(r.party_type_id) ?? null : null,
      rain: r.needs_overworld_rain === '1',
      upsideDown: r.turn_upside_down === '1',
    }));
  }
  // Specie che hanno una pre-evoluzione ma nessuna regola nei dati: almeno il "da chi"
  for (const [sid, from] of speciesFrom) {
    if (!from || Number(sid) > LAST_SPECIES || evolutions[sid]) continue;
    evolutions[sid] = [{ from: Number(from), fromName: speciesNames.get(from) ?? {}, since: 0, trigger: 'other' }];
  }

  await writeFile(join(OUT, 'encounters.json'), JSON.stringify({ versions: versionsWithData, areas, encounters }));
  await writeFile(join(OUT, 'evolutions.json'), JSON.stringify(evolutions));
  console.log(`Incontri: ${merged.size} in ${versionsWithData.length} versioni; evoluzioni: ${Object.keys(evolutions).length}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
