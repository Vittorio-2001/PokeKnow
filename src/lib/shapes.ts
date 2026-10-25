// Forme del corpo, come nella ricerca per forma del Pokédex dei giochi.
// Le categorie vengono da PokéAPI; i pittogrammi 16×16 sono disegnati apposta per PokéKnow.

export const SHAPES = [
  'ball', 'squiggle', 'fish', 'arms', 'blob', 'upright', 'legs',
  'quadruped', 'wings', 'tentacles', 'heads', 'humanoid', 'bug-wings', 'armor',
] as const;

export type Shape = (typeof SHAPES)[number];

/** Pittogrammi in pixel art: percorsi SVG su una griglia 16×16. */
export const SHAPE_PATHS: Record<Shape, string> = {
  'ball': 'M5 1h6v1h-6zM3 2h10v1h-10zM2 3h12v1h-12zM2 4h12v1h-12zM1 5h4v1h-4zM7 5h2v1h-2zM11 5h4v1h-4zM1 6h4v1h-4zM7 6h2v1h-2zM11 6h4v1h-4zM1 7h14v1h-14zM1 8h14v1h-14zM1 9h5v1h-5zM10 9h5v1h-5zM2 10h5v1h-5zM9 10h5v1h-5zM2 11h12v1h-12zM3 12h10v1h-10zM5 13h6v1h-6z',
  'squiggle': 'M10 1h4v1h-4zM9 2h6v1h-6zM9 3h2v1h-2zM12 3h3v1h-3zM9 4h6v1h-6zM10 5h4v1h-4zM11 6h2v1h-2zM4 7h5v1h-5zM11 7h2v1h-2zM3 8h7v1h-7zM11 8h2v1h-2zM2 9h3v1h-3zM8 9h5v1h-5zM2 10h2v1h-2zM9 10h3v1h-3zM2 11h2v1h-2zM2 12h3v1h-3zM12 12h1v1h-1zM3 13h9v1h-9zM4 14h7v1h-7z',
  'fish': 'M6 2h5v1h-5zM4 3h9v1h-9zM3 4h11v1h-11zM15 4h1v1h-1zM2 5h2v1h-2zM5 5h9v1h-9zM15 5h1v1h-1zM1 6h13v1h-13zM15 6h1v1h-1zM0 7h16v1h-16zM0 8h16v1h-16zM1 9h13v1h-13zM15 9h1v1h-1zM2 10h11v1h-11zM15 10h1v1h-1zM3 11h9v1h-9zM15 11h1v1h-1zM4 12h7v1h-7zM6 13h3v1h-3z',
  'arms': 'M6 1h4v1h-4zM5 2h6v1h-6zM4 3h3v1h-3zM9 3h3v1h-3zM4 4h8v1h-8zM0 5h1v1h-1zM4 5h3v1h-3zM9 5h3v1h-3zM15 5h1v1h-1zM0 6h2v1h-2zM4 6h8v1h-8zM14 6h2v1h-2zM1 7h2v1h-2zM4 7h8v1h-8zM13 7h2v1h-2zM2 8h12v1h-12zM3 9h10v1h-10zM4 10h8v1h-8zM5 11h6v1h-6zM6 12h4v1h-4z',
  'blob': 'M6 1h4v1h-4zM5 2h6v1h-6zM5 3h1v1h-1zM7 3h2v1h-2zM10 3h1v1h-1zM5 4h6v1h-6zM6 5h4v1h-4zM5 6h6v1h-6zM4 7h8v1h-8zM3 8h10v1h-10zM2 9h12v1h-12zM2 10h12v1h-12zM1 11h14v1h-14zM1 12h14v1h-14zM0 13h16v1h-16zM0 14h16v1h-16z',
  'upright': 'M4 1h4v1h-4zM3 2h6v1h-6zM3 3h1v1h-1zM5 3h2v1h-2zM8 3h1v1h-1zM3 4h6v1h-6zM4 5h4v1h-4zM3 6h6v1h-6zM2 7h8v1h-8zM14 7h2v1h-2zM2 8h8v1h-8zM13 8h2v1h-2zM3 9h6v1h-6zM12 9h2v1h-2zM3 10h7v1h-7zM11 10h2v1h-2zM3 11h2v1h-2zM7 11h6v1h-6zM3 12h2v1h-2zM7 12h2v1h-2zM2 13h3v1h-3zM7 13h3v1h-3z',
  'legs': 'M5 1h6v1h-6zM4 2h8v1h-8zM3 3h10v1h-10zM3 4h3v1h-3zM7 4h2v1h-2zM10 4h3v1h-3zM3 5h10v1h-10zM3 6h10v1h-10zM4 7h8v1h-8zM5 8h6v1h-6zM5 9h2v1h-2zM9 9h2v1h-2zM5 10h2v1h-2zM9 10h2v1h-2zM5 11h2v1h-2zM9 11h2v1h-2zM4 12h3v1h-3zM9 12h3v1h-3zM3 13h4v1h-4zM9 13h4v1h-4z',
  'quadruped': 'M2 2h2v1h-2zM1 3h4v1h-4zM0 4h6v1h-6zM1 5h5v1h-5zM15 5h1v1h-1zM2 6h14v1h-14zM2 7h13v1h-13zM2 8h13v1h-13zM2 9h13v1h-13zM2 10h2v1h-2zM5 10h2v1h-2zM11 10h2v1h-2zM14 10h2v1h-2zM2 11h2v1h-2zM5 11h2v1h-2zM11 11h2v1h-2zM14 11h2v1h-2zM2 12h2v1h-2zM5 12h2v1h-2zM11 12h2v1h-2zM14 12h2v1h-2zM1 13h3v1h-3zM5 13h3v1h-3zM10 13h3v1h-3zM14 13h2v1h-2z',
  'wings': 'M6 1h4v1h-4zM5 2h6v1h-6zM5 3h1v1h-1zM7 3h2v1h-2zM10 3h1v1h-1zM0 4h1v1h-1zM5 4h6v1h-6zM15 4h1v1h-1zM0 5h2v1h-2zM6 5h4v1h-4zM14 5h2v1h-2zM0 6h3v1h-3zM5 6h6v1h-6zM13 6h3v1h-3zM0 7h4v1h-4zM5 7h6v1h-6zM12 7h4v1h-4zM1 8h14v1h-14zM2 9h12v1h-12zM3 10h10v1h-10zM5 11h6v1h-6zM5 12h2v1h-2zM9 12h2v1h-2zM4 13h3v1h-3zM9 13h3v1h-3z',
  'tentacles': 'M5 1h6v1h-6zM3 2h10v1h-10zM2 3h12v1h-12zM2 4h3v1h-3zM6 4h4v1h-4zM11 4h3v1h-3zM2 5h12v1h-12zM2 6h12v1h-12zM3 7h10v1h-10zM3 8h1v1h-1zM5 8h1v1h-1zM7 8h2v1h-2zM10 8h1v1h-1zM12 8h1v1h-1zM2 9h1v1h-1zM5 9h1v1h-1zM7 9h2v1h-2zM10 9h1v1h-1zM13 9h1v1h-1zM2 10h1v1h-1zM4 10h1v1h-1zM7 10h2v1h-2zM11 10h1v1h-1zM13 10h1v1h-1zM3 11h1v1h-1zM6 11h1v1h-1zM9 11h1v1h-1zM12 11h1v1h-1zM3 12h1v1h-1zM6 12h1v1h-1zM9 12h1v1h-1zM12 12h1v1h-1zM2 13h1v1h-1zM5 13h1v1h-1zM10 13h1v1h-1zM13 13h1v1h-1z',
  'heads': 'M6 2h4v1h-4zM5 3h6v1h-6zM5 4h1v1h-1zM7 4h2v1h-2zM10 4h1v1h-1zM5 5h6v1h-6zM6 6h4v1h-4zM2 7h4v1h-4zM10 7h4v1h-4zM1 8h6v1h-6zM9 8h6v1h-6zM1 9h1v1h-1zM3 9h2v1h-2zM6 9h1v1h-1zM9 9h1v1h-1zM11 9h2v1h-2zM14 9h1v1h-1zM1 10h6v1h-6zM9 10h6v1h-6zM2 11h4v1h-4zM10 11h4v1h-4z',
  'humanoid': 'M6 1h4v1h-4zM5 2h6v1h-6zM5 3h1v1h-1zM7 3h2v1h-2zM10 3h1v1h-1zM5 4h6v1h-6zM6 5h4v1h-4zM4 6h8v1h-8zM3 7h10v1h-10zM2 8h2v1h-2zM5 8h6v1h-6zM12 8h2v1h-2zM2 9h2v1h-2zM5 9h6v1h-6zM12 9h2v1h-2zM2 10h1v1h-1zM5 10h6v1h-6zM13 10h1v1h-1zM5 11h2v1h-2zM9 11h2v1h-2zM5 12h2v1h-2zM9 12h2v1h-2zM4 13h3v1h-3zM9 13h3v1h-3z',
  'bug-wings': 'M4 1h2v1h-2zM10 1h2v1h-2zM2 2h4v1h-4zM10 2h4v1h-4zM1 3h6v1h-6zM9 3h6v1h-6zM0 4h8v1h-8zM9 4h7v1h-7zM0 5h8v1h-8zM9 5h7v1h-7zM1 6h7v1h-7zM9 6h6v1h-6zM2 7h6v1h-6zM9 7h5v1h-5zM3 8h5v1h-5zM9 8h4v1h-4zM2 9h6v1h-6zM9 9h5v1h-5zM1 10h7v1h-7zM9 10h6v1h-6zM1 11h6v1h-6zM9 11h6v1h-6zM2 12h4v1h-4zM10 12h4v1h-4z',
  'armor': 'M4 1h1v1h-1zM11 1h1v1h-1zM5 2h1v1h-1zM10 2h1v1h-1zM6 3h4v1h-4zM5 4h6v1h-6zM1 5h1v1h-1zM5 5h6v1h-6zM14 5h1v1h-1zM2 6h1v1h-1zM4 6h8v1h-8zM13 6h1v1h-1zM3 7h10v1h-10zM1 8h1v1h-1zM3 8h10v1h-10zM14 8h1v1h-1zM0 9h1v1h-1zM3 9h10v1h-10zM15 9h1v1h-1zM3 10h10v1h-10zM2 11h1v1h-1zM4 11h8v1h-8zM13 11h1v1h-1zM1 12h1v1h-1zM5 12h6v1h-6zM14 12h1v1h-1zM6 13h4v1h-4z',
};

export function shapeIcon(shape: string, label: string, className = 'shape-icon'): string {
  const d = SHAPE_PATHS[shape as Shape];
  if (!d) return '';
  return `<svg class="${className}" viewBox="0 0 16 16" role="img" aria-label="${label.replaceAll('"', '&quot;')}" shape-rendering="crispEdges"><path d="${d}" fill="currentColor"/></svg>`;
}
