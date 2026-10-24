// Link interni che funzionano sia alla radice di un dominio (pokeknow.com/)
// sia in una sottocartella (utente.github.io/pokeknow/).
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export function href(path = ''): string {
  return `${BASE}/${path.replace(/^\//, '')}`;
}
