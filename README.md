# PokéKnow

Un Pokédex web che mostra ogni Pokémon **gioco per gioco**, dai titoli per Game Boy Advance a Leggende Pokémon: Z-A. Scegli un gioco e la scheda si adatta: tipi, debolezze e resistenze calcolate con la tabella dei tipi di quella generazione, statistiche e abilità di quel momento, voce del Pokédex di quella versione e numero nel Pokédex regionale.

Progetto amatoriale e senza scopo di lucro, non affiliato con Nintendo, Creatures Inc., GAME FREAK o The Pokémon Company.

## Avvio

Serve Node.js 22.23 o successivo.

```bash
npm install
npm run dev      # scarica i dati (solo la prima volta) e avvia il server di sviluppo
npm run build    # genera il sito statico in dist/
npm test         # test della logica dei tipi
```

Per riscaricare i dati aggiornati da PokéAPI: `npm run data -- --refresh`.

Il sito si pubblica da solo su **GitHub Pages** a ogni push su `main` (`.github/workflows/deploy.yml`): test, build e deploy. Indirizzo e sottocartella vengono impostati in automatico, anche dopo aver collegato un dominio personale. Il file `.nvmrc` fa usare Node 22 anche sul server.

Se sei dietro un proxy aziendale, Node non lo usa da solo: lancia lo script con `NODE_USE_ENV_PROXY=1`.

## Come funziona

**Dati.** `scripts/fetch-data.mjs` scarica i CSV ufficiali di PokéAPI da GitHub (una ventina di file, una volta sola, in `.cache/`) e genera i JSON in `src/data/generated/`. Niente chiamate all'API durante la navigazione: il sito è completamente statico e rispetta la fair use policy di PokéAPI.

**Le generazioni contano.** PokéAPI tiene lo storico nelle tabelle `*_past`: ogni riga vale *fino a* una certa generazione. Lo script le applica per ogni generazione dalla III alla IX, così:

- Clefable è di tipo Normale fino alla Gen V e Folletto dopo;
- Spettro e Buio sono poco efficaci contro Acciaio fino alla Gen V;
- le statistiche base cambiate nel tempo (per esempio la Difesa di Pikachu nella Gen VI) sono quelle giuste per il gioco;
- le abilità nascoste compaiono solo dalla Gen V, e nei giochi senza abilità (Let's Go, Leggende) la sezione lo dice.

**Un solo markup per server e browser.** `src/lib/render.ts` contiene funzioni pure che producono l'HTML delle sezioni. Astro le usa per generare la pagina statica, e lo script del browser le richiama quando cambi gioco. Nessuna duplicazione e nessun framework lato client.

**Un tema per ogni epoca.** La scheda cambia aspetto in base al gioco scelto, con nove temi ispirati alle interfacce della loro generazione:

| Giochi | Tema |
|---|---|
| Rubino, Zaffiro, Smeraldo, Rosso Fuoco, Verde Foglia | Game Boy Advance |
| Diamante, Perla, Platino, HeartGold, SoulSilver | Nintendo DS |
| Nero, Bianco, Nero 2, Bianco 2 | Unima |
| X, Y, Rubino Omega, Zaffiro Alpha | Kalos |
| Sole, Luna, Ultrasole, Ultraluna, Let's Go | Alola |
| Spada, Scudo, Diamante Lucente, Perla Splendente | Galar |
| Leggende: Arceus | Hisui |
| Scarlatto, Violetto (con accento diverso per versione) | Paldea |
| Leggende: Z-A | Luminopoli |

Ogni tema ridefinisce solo dei token CSS (colori, caratteri, forme, finestra di testo, palco dello sprite) in `src/styles/themes.css`; la struttura resta una sola. Anche gli sprite seguono l'epoca: pixel art originale fino alla Gen V (animata in Nero e Bianco), render 3D dopo. Uno script minuscolo nell'`<head>` applica il tema giusto prima del primo disegno, così non si vede mai il tema sbagliato per un istante. La home resta nel tema base in bianco e nero.

I caratteri sono ospitati sul sito con Fontsource (niente Google Fonts): il browser scarica solo quelli del tema che stai guardando.

**Il gioco scelto si ricorda.** Finisce nell'URL (`?gioco=emerald`, quindi i link sono condivisibili) e in `localStorage`, così passando da un Pokémon all'altro resti sullo stesso gioco.

## Struttura

```
scripts/fetch-data.mjs     download e trasformazione dei dati
src/lib/data.ts            tipi TypeScript e utilità sui dati
src/lib/typechart.ts       debolezze, resistenze e copertura per generazione
src/lib/render.ts          HTML delle sezioni, condiviso tra build e browser
src/pages/index.astro      ricerca per nome o numero e filtro per tipo
src/pages/pokemon/[slug].astro   scheda con selettore del gioco
src/lib/themes.ts          quale tema e quali sprite per ogni gioco
src/styles/global.css      struttura comune e tema base in bianco e nero
src/styles/themes.css      i nove temi per epoca
src/styles/fonts.css       caratteri ospitati in locale
tests/                     test Vitest della tabella dei tipi
```

## Limiti noti dei dati

- **Voci del Pokédex in italiano**: PokéAPI le ha solo da X e Y a Spada e Scudo. Per gli altri giochi si mostra il testo inglese, con una nota.
- **Scarlatto e Violetto** hanno poche voci; **Leggende: Z-A** ancora nessuna. La pagina lo dice invece di mostrare un vuoto.
- Le forme alternative (regionali, Mega, Gigamax) non ci sono ancora: per ora solo la forma base.
- Gli sprite sono caricati dal repository GitHub di PokéAPI.

## Prossimi passi

1. **Build consigliate per gioco**: mosse imparabili per gruppo di versioni (`pokemon_moves.csv`), natura consigliata dalle statistiche, copertura dei tipi; set competitivi di Smogon come fonte opzionale.
2. Forme regionali e Mega Evoluzioni.
3. Interfaccia in più lingue: PokéAPI ha nomi e testi in molte lingue, lo script per ora estrae italiano e inglese.
4. Sprite ospitati in locale, o in alternativa quelli di SpriteCollab (licenza CC BY-NC).

Dati: [PokéAPI](https://pokeapi.co). Pokémon e i nomi dei personaggi sono marchi dei rispettivi proprietari.
