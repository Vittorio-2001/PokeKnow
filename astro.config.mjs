// @ts-check
import { defineConfig } from 'astro/config';

// In GitHub Actions queste variabili arrivano da actions/configure-pages:
// indirizzo e sottocartella si adattano da soli, anche quando colleghi un dominio tuo.
const site = process.env.SITE_URL || 'https://pokeknow.example';
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  site,
  base,
  trailingSlash: 'ignore',
  build: { format: 'directory' },
});
