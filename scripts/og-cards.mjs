// Immagini di anteprima dei link: una per Pokémon e per lingua, nello stile del gioco predefinito.
// Da lanciare dopo `npm run build`: fotografa le pagine dist/og-card/<lingua>/<slug>/ con Chrome,
// salva le immagini in dist/og/<lingua>/<slug>.jpg e poi cancella le pagine og-card (non vanno pubblicate).
// Le immagini già fatte stanno in .cache/og: si rifà solo una card la cui pagina è cambiata.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright-core';

const DIST = path.resolve('dist');
const CARDS = path.join(DIST, 'og-card');
const OUT = path.join(DIST, 'og');
const CACHE = path.resolve('.cache/og');
const BASE = (process.env.BASE_PATH ?? '/').replace(/\/?$/, '/');
const PARALLEL = 6;

if (!fs.existsSync(CARDS)) {
  console.error('Manca dist/og-card: lancia prima `npm run build`.');
  process.exit(1);
}

// server statico minimo: il sito è stato costruito per stare sotto BASE (/PokeKnow/)
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.woff': 'font/woff', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (url.startsWith(BASE)) url = '/' + url.slice(BASE.length);
  let file = path.join(DIST, url);
  if (!file.startsWith(DIST)) return res.writeHead(403).end();
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((resolve) => server.listen(0, resolve));
const origin = `http://localhost:${server.address().port}`;

const jobs = fs.readdirSync(CARDS).flatMap((lang) => fs.readdirSync(path.join(CARDS, lang)).map((slug) => ({ lang, slug })));
fs.mkdirSync(CACHE, { recursive: true });

// su GitHub Actions c'è già Chrome; in locale si usa il Chromium di Playwright
const browser = await chromium.launch(process.env.CI ? { channel: 'chrome' } : {});
const context = await browser.newContext({ viewport: { width: 1200, height: 630 } });
let made = 0;
let reused = 0;
const failed = [];

async function card({ lang, slug }) {
  const html = fs.readFileSync(path.join(CARDS, lang, slug, 'index.html'));
  const key = createHash('sha1').update(html).digest('hex').slice(0, 16);
  const cached = path.join(CACHE, `${lang}-${slug}-${key}.jpg`);
  const target = path.join(OUT, lang, `${slug}.jpg`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (fs.existsSync(cached)) {
    fs.copyFileSync(cached, target);
    reused++;
    return;
  }
  const page = await context.newPage();
  try {
    await page.goto(`${origin}${BASE}og-card/${lang}/${slug}/`);
    await page.waitForSelector('body[data-ready="1"]', { timeout: 20000 });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: cached, type: 'jpeg', quality: 85 });
    // le versioni vecchie della stessa card non servono più
    for (const old of fs.readdirSync(CACHE)) if (old.startsWith(`${lang}-${slug}-`) && old !== path.basename(cached)) fs.rmSync(path.join(CACHE, old));
    fs.copyFileSync(cached, target);
    made++;
  } catch (error) {
    failed.push(`${lang}/${slug}: ${error.message.split('\n')[0]}`);
    // senza card propria si usa quella generale del sito
    fs.copyFileSync(path.join(DIST, 'og', `home-${lang}.jpg`), target);
  } finally {
    await page.close();
  }
}

const queue = [...jobs];
await Promise.all(Array.from({ length: PARALLEL }, async () => {
  while (queue.length) await card(queue.shift());
}));

await browser.close();
server.close();
fs.rmSync(CARDS, { recursive: true });
console.log(`Anteprime: ${made} nuove, ${reused} dalla cache${failed.length ? `, ${failed.length} sostituite con quella generale` : ''}.`);
for (const line of failed.slice(0, 20)) console.log('  ' + line);
