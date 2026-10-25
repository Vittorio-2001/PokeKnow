// Le mosse di ogni Pokémon in tutti i giochi, in un file JSON per Pokémon (/data/moves/94.json).
// La pagina mostra subito quelle del gioco predefinito; le altre le scarica solo se cambi gioco.
import type { APIRoute } from 'astro';
import pokemonJson from '../../../data/generated/pokemon.json';
import { movesFor } from '../../../lib/paths';

export function getStaticPaths() {
  return (pokemonJson as { id: number }[]).map((p) => ({ params: { id: String(p.id) } }));
}

export const GET: APIRoute = ({ params }) => new Response(JSON.stringify(movesFor(Number(params.id))));
