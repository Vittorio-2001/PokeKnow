// Gli sprite hanno margini trasparenti diversi da Pokémon a Pokémon: senza correzione
// alcuni sembrano sospesi sopra la piattaforma. Qui si misura la parte visibile dell'immagine
// e la si sposta: "piedi" appoggiati alla piattaforma nei temi che ce l'hanno, centrata negli altri.
// Il tema dichiara cosa vuole con la variabile CSS --sprite-anchor sullo .stage:
//   center        -> parte visibile al centro
//   feet 0.86     -> bordo inferiore della parte visibile all'86% dell'altezza del riquadro

interface Bounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const cache = new Map<string, Bounds | null>();

/** Riquadro della parte non trasparente, in frazioni (0..1) della dimensione originale. */
function measure(src: string): Promise<Bounds | null> {
  if (cache.has(src)) return Promise.resolve(cache.get(src)!);
  return new Promise((resolve) => {
    const probe = new Image();
    probe.crossOrigin = 'anonymous';
    probe.decoding = 'async';
    probe.onload = () => {
      try {
        const w = probe.naturalWidth;
        const h = probe.naturalHeight;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        ctx.drawImage(probe, 0, 0); // per le GIF animate basta il primo fotogramma
        const { data } = ctx.getImageData(0, 0, w, h);
        let x0 = w;
        let y0 = h;
        let x1 = -1;
        let y1 = -1;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (data[(y * w + x) * 4 + 3] > 24) {
              if (x < x0) x0 = x;
              if (x > x1) x1 = x;
              if (y < y0) y0 = y;
              if (y > y1) y1 = y;
            }
          }
        }
        const bounds = x1 < 0 ? null : { x0: x0 / w, y0: y0 / h, x1: (x1 + 1) / w, y1: (y1 + 1) / h };
        cache.set(src, bounds);
        resolve(bounds);
      } catch {
        // immagine senza CORS: niente correzione, lo sprite resta com'è
        cache.set(src, null);
        resolve(null);
      }
    };
    probe.onerror = () => resolve(null);
    probe.src = src;
  });
}

export async function placeSprite(img: HTMLImageElement, stage: HTMLElement): Promise<void> {
  const src = img.currentSrc || img.src;
  const bounds = await measure(src);
  if ((img.currentSrc || img.src) !== src) return; // nel frattempo è cambiato gioco
  if (!bounds || !img.naturalWidth) {
    img.style.transform = '';
    return;
  }

  const bw = img.clientWidth;
  const bh = img.clientHeight;
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  // con object-fit: contain l'immagine è scalata e centrata nel riquadro
  const s = Math.min(bw / nw, bh / nh);
  const ox = (bw - nw * s) / 2;
  const oy = (bh - nh * s) / 2;

  const left = ox + bounds.x0 * nw * s;
  const right = ox + bounds.x1 * nw * s;
  const top = oy + bounds.y0 * nh * s;
  const bottom = oy + bounds.y1 * nh * s;

  const anchor = getComputedStyle(stage).getPropertyValue('--sprite-anchor').trim() || 'center';
  const dx = bw / 2 - (left + right) / 2;
  let dy: number;
  const feet = /^feet\s+([\d.]+)$/.exec(anchor);
  if (feet) dy = Number(feet[1]) * bh - bottom;
  else dy = bh / 2 - (top + bottom) / 2;

  // in percentuale del riquadro: resta giusto anche se la finestra cambia dimensione
  img.style.transform = `translate(${((dx / bw) * 100).toFixed(2)}%, ${((dy / bh) * 100).toFixed(2)}%)`;
}
