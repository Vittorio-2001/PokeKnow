# PokéKnow

**A Pokédex for every generation.** Pick a Pokémon, pick a game, and the whole page adapts: type matchups computed with that generation's rules, the stats and abilities it had back then, the Pokédex entry from that exact version, and a UI theme inspired by the era of the game.

**Live site:** [English](https://vittorio-2001.github.io/PokeKnow/en/) · [Italiano](https://vittorio-2001.github.io/PokeKnow/)

![Gengar seen through nine eras: Emerald, Platinum, Black, X, Sun, Sword, Legends: Arceus, Scarlet and Legends: Z-A](docs/eras.png)

## Features

- **Game by game, from the Game Boy Advance to today**: 18 games from Ruby and Sapphire to Legends: Z-A, each version selectable on its own.
- **Generation-accurate rules**:
  - type matchups use the type chart of the selected generation: Fairy only exists from Gen VI, and Steel resisted Ghost and Dark until Gen V;
  - Pokémon types changed over time are respected (Clefable is Normal until Gen V, Fairy afterwards);
  - so are base stats (Pikachu's Defense in Gen VI) and abilities, with hidden abilities only from Gen V;
  - games without abilities (Let's Go, the Legends titles) say so instead of showing wrong data.
- **Evolution chain**: the whole family as a tree with era sprites and links, showing how each stage evolves in the selected game (Leafeon needs the Moss Rock in Platinum and a Leaf Stone in Sword) and only the Pokémon that exist in that generation.
- **Deeper stats**: minimum and maximum values at level 100 for every stat, and the EVs the Pokémon gives when defeated.
- **Catching and breeding**: catch rate with the chance of a Poké Ball at full HP, base friendship and experience, growth rate, gender ratio, egg groups and egg cycles.
- **Where to find it**: for every game, a one-line summary (how many wild locations and from which level, gifts and in-game trades), **version exclusives** compared with the twin version (and whether the other version can get it by evolution or needs a trade), then the locations where the Pokémon appears with the method (grass, surfing, fishing, gifts, Wanderers…), levels, encounter rate and conditions such as time of day, weather, swarms or the GBA slot, plus how it evolves in that game.
- **Shiny sprites**: a toggle on the sprite stage shows the shiny version from the same era's sprite set, and the choice is remembered.
- **Nine era themes**: each generation has its own colors, typefaces, shapes, text box and sprite stage, inspired by the interfaces of its games.
- **Version palettes**: every game pairs the colors of its two versions. Choose Sun and the sky fades from sun-orange into moon-violet; choose Moon and it flips. White and White 2 get a light take on the Unova theme.
- **Sprites from each era**: original pixel art up to Gen V (animated in Black and White), 3D renders afterwards. Every sprite is measured at runtime so its feet rest on the battle platform instead of floating above it.
- **Shareable state**: the chosen game lives in the URL (`?gioco=emerald`) and is remembered while you browse from one Pokémon to the next.
- **Italian and English**: the whole interface, Pokémon names, categories, abilities and Pokédex entries in both languages, with a language switch that keeps the game you picked.
- **Search and filters**: search by name or National Dex number, filter by type.
- **Light and dark home**: Solrock and Lunatone swap places to switch the home page between light and dark, following the system setting until you choose.
- **Responsive and accessible**: works down to phone width, keyboard focus is always visible, and the typewriter effect respects reduced-motion settings.

## How it works

**Static data pipeline.** `scripts/fetch-data.mjs` downloads the official [PokéAPI](https://pokeapi.co) CSV dumps from GitHub once, caches them, and turns them into compact JSON. The site never calls an API at runtime: it is fully static, fast, and respects PokéAPI's fair use policy.

**History-aware data.** PokéAPI keeps past values in `*_past` tables, where each row is valid *up to and including* a given generation. The script resolves them for every generation from III to IX, so each game gets the types, stats, abilities and type chart it actually had.

**One renderer, two runtimes.** `src/lib/render.ts` holds pure functions that return the HTML of each section. Astro calls them at build time to generate the 1,025 static pages, and the browser calls the very same functions when you switch game. No duplicated markup and no client-side framework.

**Themes as design tokens.** The layout is defined once in `global.css`. Each era theme in `themes.css` only redefines CSS custom properties (colors, fonts, radii, text box frame, stage background), plus a handful of signature details. Version palettes are two more tokens, `--v1` for the chosen version and `--v2` for its counterpart. A tiny inline script in `<head>` applies the right theme before the first paint, so you never see a flash of the wrong one.

**Sprite anchoring.** Sprites come with different amounts of transparent padding. `src/lib/sprite-anchor.ts` reads the visible pixels through a canvas and shifts the image so it is grounded on themes with a platform, or truly centered on the others.

**Internationalization without a framework.** Every interface string lives in one typed dictionary per language (`src/lib/i18n.ts`); a test fails if a language is missing a key. Italian is served at the root and English under `/en/`, with `hreflang` alternates for search engines. Pages are thin wrappers around shared components, so adding a language means adding a dictionary and two route files.

**Continuous deployment.** A GitHub Actions workflow runs the tests, builds the site and publishes it to GitHub Pages on every push to `main`. The base path is detected automatically, so the same code works under `/PokeKnow/` or on a custom domain.

## Tech stack

- [Astro](https://astro.build) 7 for static site generation, with TypeScript throughout
- Vanilla JavaScript on the client: no framework, a single small script per page
- [PokéAPI](https://pokeapi.co) data (CSV dumps) and sprites
- Self-hosted fonts through [Fontsource](https://fontsource.org): no requests to Google Fonts
- [Vitest](https://vitest.dev) for the type chart, the translations, the Pokédex entry fallback, evolutions, encounters, evolution chains and stat formulas
- GitHub Actions and GitHub Pages

## Getting started

Requires Node.js 22.23.4 or later.

```bash
npm install
npm run dev      # downloads the data on first run, then starts the dev server
npm run build    # generates the static site in dist/
npm test         # unit tests
```

To refresh the PokéAPI data: `npm run data -- --refresh`.

## Project structure

```
scripts/fetch-data.mjs           data download and transformation
src/lib/data.ts                  data types and helpers
src/lib/typechart.ts             weaknesses, resistances and coverage per generation
src/lib/where.ts                 encounters and how each Pokémon evolves
src/lib/chain.ts                 evolution family as a tree, per game
src/lib/stats.ts                 level 100 stat ranges and catch chance
src/lib/render.ts                section HTML, shared by the build and the browser
src/lib/themes.ts                which theme and which sprites for each game
src/lib/sprite-anchor.ts         grounds sprites on the platform
src/lib/url.ts                   internal links that work under any base path
src/lib/i18n.ts                  interface strings for every language
src/lib/paths.ts                 static routes shared by all languages
src/components/                  home and Pokémon page, shared by all languages
src/pages/                       Italian routes (index, pokemon/[slug])
src/pages/en/                    English routes
src/styles/global.css            shared layout and the black-and-white base theme
src/styles/themes.css            era themes and version palettes
src/styles/fonts.css             self-hosted fonts
tests/                           Vitest tests
.github/workflows/deploy.yml     test, build and deploy to GitHub Pages
```

## Known data gaps

- **Italian Pokédex entries**: PokéAPI only has them from X and Y up to Sword and Shield. When a game has no entry in the page language, the site shows the entry from the nearest game in that language, says which game it comes from, and keeps the game's original text one click away.
- **Scarlet and Violet** have few entries in PokéAPI, and **Legends: Z-A** none yet. These games show the nearest available entry, clearly labeled with its source game.
- Alternate forms (regional variants, Mega Evolutions, Gigantamax) are not included yet: only the default form.
- **Encounter locations** are missing for Brilliant Diamond and Shining Pearl, Legends: Arceus, Scarlet and Violet, and Legends: Z-A, and partial for Omega Ruby and Alpha Sapphire. Many location names have no Italian translation in PokéAPI: the site uses the English name, turning "Route 12" into "Percorso 12".

## Roadmap

1. Regional forms and Mega Evolutions.
2. More languages.
3. A custom domain.

## License

The source code is released under the [MIT License](LICENSE). The license covers the code only: Pokémon data, names, sprites and trademarks belong to their respective owners, the site icon follows the Icons8 license, and fonts keep their own licenses.

## Credits and disclaimer

Data and sprites come from [PokéAPI](https://pokeapi.co). The site icon is [Pokedex](https://icons8.com/icon/ih6hQU67d27H/pokedex) by Those Icons on [Icons8](https://icons8.com). Fonts are distributed under the SIL Open Font License through Fontsource.

PokéKnow is a free, non-commercial fan project. It is not affiliated with, endorsed or sponsored by Nintendo, Creatures Inc., GAME FREAK or The Pokémon Company. Pokémon and Pokémon character names are trademarks of their respective owners.
