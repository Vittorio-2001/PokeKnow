// Ogni gioco ha un tema ispirato all'interfaccia della sua epoca.
// Il tema decide anche che sprite mostrare: pixel art fino alla Gen V, render 3D dopo.

export type ThemeKey = 'gba' | 'ds' | 'unova' | 'kalos' | 'alola' | 'galar' | 'hisui' | 'paldea' | 'lumiose';

export interface Theme {
  key: ThemeKey;
  /** Riga breve mostrata sotto il selettore del gioco. */
  label: string;
  /** true = sprite in pixel art, da ingrandire senza sfocare. */
  pixel: boolean;
}

export const THEMES: Record<ThemeKey, Theme> = {
  gba: { key: 'gba', label: 'Tema Game Boy Advance', pixel: true },
  ds: { key: 'ds', label: 'Tema Nintendo DS', pixel: true },
  unova: { key: 'unova', label: 'Tema Unima', pixel: true },
  kalos: { key: 'kalos', label: 'Tema Kalos', pixel: false },
  alola: { key: 'alola', label: 'Tema Alola', pixel: false },
  galar: { key: 'galar', label: 'Tema Galar', pixel: false },
  hisui: { key: 'hisui', label: 'Tema Hisui', pixel: false },
  paldea: { key: 'paldea', label: 'Tema Paldea', pixel: false },
  lumiose: { key: 'lumiose', label: 'Tema Luminopoli', pixel: false },
};

const THEME_BY_GROUP: Record<string, ThemeKey> = {
  'ruby-sapphire': 'gba',
  emerald: 'gba',
  'firered-leafgreen': 'gba',
  'diamond-pearl': 'ds',
  platinum: 'ds',
  'heartgold-soulsilver': 'ds',
  'black-white': 'unova',
  'black-2-white-2': 'unova',
  'x-y': 'kalos',
  'omega-ruby-alpha-sapphire': 'kalos',
  'sun-moon': 'alola',
  'ultra-sun-ultra-moon': 'alola',
  'lets-go-pikachu-lets-go-eevee': 'alola',
  'sword-shield': 'galar',
  'brilliant-diamond-shining-pearl': 'galar',
  'legends-arceus': 'hisui',
  'scarlet-violet': 'paldea',
  'legends-za': 'lumiose',
};

export function themeFor(group: string): Theme {
  return THEMES[THEME_BY_GROUP[group] ?? 'paldea'];
}
