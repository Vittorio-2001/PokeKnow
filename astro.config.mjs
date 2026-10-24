// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  // Sostituisci con il dominio definitivo quando pubblichi (serve a sitemap e link canonici).
  site: 'https://pokeknow.example',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
});
