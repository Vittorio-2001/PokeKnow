# PokéKnow

**A Pokédex for every generation.** Pick a Pokémon, pick a game, and the whole page adapts: type matchups computed with that generation's rules, the stats and abilities it had back then, the Pokédex entry from that exact version, and a UI theme inspired by the era of the game.

**Live site:** [vittorio-2001.github.io/PokeKnow](https://vittorio-2001.github.io/PokeKnow/)

![Gengar seen through nine eras: Emerald, Platinum, Black, X, Sun, Sword, Legends: Arceus, Scarlet and Legends: Z-A](docs/eras.png)

> The site is currently in Italian; more languages are on the way.

## Features

- **Game by game, from the Game Boy Advance to today**: 18 games from Ruby and Sapphire to Legends: Z-A, each version selectable on its own.
- **Generation-accurate rules**:
  - type matchups use the type chart of the selected generation: Fairy only exists from Gen VI, and Steel resisted Ghost and Dark until Gen V;
  - Pokémon types changed over time are respected (Clefable is Normal until Gen V, Fairy afterwards);
  - so are base stats (Pikachu's Defense in Gen VI) and abilities, with hidden abilities only from Gen V;
  - games without abilities (Let's Go, the Legends titles) say so instead of showing wrong data.
- **Nine era themes**: each generation has its own colors, typefaces, shapes, text box and sprite stage, inspired by the interfaces of its games.
- **Version palettes**: every game pairs the colors of its two versions. Choose Sun and the sky fades from sun-orange into moon-violet; choose Moon and it flips. White and White 2 get a light take on the Unova theme.
- **Sprites from each era**: original pixel art up to Gen V (animated in Black and White), 3D renders afterwards. Every sprite is measured at runtime so its feet rest on the battle platform instead of floating above it.
- **Shareable state**: the chosen game lives in the URL (`?gioco=emerald`) and is remembered while you browse from one Pokémon to the next.
- **Search and filters**: search by name or National Dex number, filter by type.
- **Responsive and accessible**: works down to phone width, keyboard focus is always visible, and the typewriter effect respects reduced-motion settings.

## How it works

**Static data pipeline.** `scripts/fetch-data.mjs` downloads the official [PokéAPI](https://pokeapi.co) CSV dumps from GitHub once, caches them, and turns them into compact JSON. The site never calls an API at runtime: it is fully static, fast, and respects PokéAPI's fair use policy.

**History-aware data.** PokéAPI keeps past values in `*_past` tables, where each row is valid *up to and including* a given generation. The script resolves them for every generation from III to IX, so each game gets the types, stats, abilities and type chart it actually had.

**One renderer, two runtimes.** `src/lib/render.ts` holds pure functions that return the HTML of each section. Astro calls them at build time to generate the 1,025 static pages, and the browser calls the very same functions when you switch game. No duplicated markup and no client-side framework.

**Themes as design tokens.** The layout is defined once in `global.css`. Each era theme in `themes.css` only redefines CSS custom properties (colors, fonts, radii, text box frame, stage background), plus a handful of signature details. Version palettes are two more tokens, `--v1` for the chosen version and `--v2` for its counterpart. A tiny inline script in `<head>` applies the right theme before the first paint, so you never see a flash of the wrong one.

**Sprite anchoring.** Sprites come with different amounts of transparent padding. `src/lib/sprite-anchor.ts` reads the visible pixels through a canvas and shifts the image so it is grounded on themes with a platform, or truly centered on the others.

**Continuous deployment.** A GitHub Actions workflow runs the tests, builds the site and publishes it to GitHub Pages on every push to `main`. The base path is detected automatically, so the same code works under `/PokeKnow/` or on a custom domain.

## Tech stack

- [Astro](https://astro.build) 7 for static site generation, with TypeScript throughout
- Vanilla JavaScript on the client: no framework, a single small script per page
- [PokéAPI](https://pokeapi.co) data (CSV dumps) and sprites
- Self-hosted fonts through [Fontsource](https://fontsource.org): no requests to Google Fonts
- [Vitest](https://vitest.dev) for the type-chart logic
- GitHub Actions and GitHub Pages

## Getting started

Requires Node.js 22.23.4 or later.

```bash
npm install
npm run dev      # downloads the data on first run, then starts the dev server
npm run build    # generates the static site in dist/
npm test         # type-chart tests
```

To refresh the PokéAPI data: `npm run data -- --refresh`.

## Project structure

```
scripts/fetch-data.mjs           data download and transformation
src/lib/data.ts                  data types and helpers
src/lib/typechart.ts             weaknesses, resistances and coverage per generation
src/lib/render.ts                section HTML, shared by the build and the browser
src/lib/themes.ts                which theme and which sprites for each game
src/lib/sprite-anchor.ts         grounds sprites on the platform
src/lib/url.ts                   internal links that work under any base path
src/pages/index.astro            search and type filter
src/pages/pokemon/[slug].astro   Pokémon page with the game picker
src/styles/global.css            shared layout and the black-and-white base theme
src/styles/themes.css            era themes and version palettes
src/styles/fonts.css             self-hosted fonts
tests/                           Vitest tests
.github/workflows/deploy.yml     test, build and deploy to GitHub Pages
```

## Known data gaps

- **Italian Pokédex entries**: PokéAPI only has them from X and Y up to Sword and Shield. Other games fall back to the English text, with a note.
- **Scarlet and Violet** have few entries in PokéAPI, and **Legends: Z-A** none yet. The page says so instead of showing an empty box.
- Alternate forms (regional variants, Mega Evolutions, Gigantamax) are not included yet: only the default form.

## Roadmap

1. **Recommended builds per game**: a moveset with good type coverage using moves learnable in that game, a suggested nature, and ability and item where they exist. Story builds first, competitive sets later.
2. Regional forms and Mega Evolutions.
3. A multilingual interface, starting with English.
4. A custom domain.

## Credits and disclaimer

Data and sprites come from [PokéAPI](https://pokeapi.co). Fonts are distributed under the SIL Open Font License through Fontsource.

PokéKnow is a free, non-commercial fan project. It is not affiliated with, endorsed or sponsored by Nintendo, Creatures Inc., GAME FREAK or The Pokémon Company. Pokémon and Pokémon character names are trademarks of their respective owners.
