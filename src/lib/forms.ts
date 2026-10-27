// Megaevoluzioni: quali esistono nel gioco scelto e come diventa la scheda con la forma Mega.
import { type Lang, type Mega, type Pokemon, isPresent, text } from './data';
import { t } from './i18n';
import { esc } from './render';

const ITEM_SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items';

/** Le Megaevoluzioni del Pokémon disponibili in un gruppo di giochi. */
export function megasIn(pokemon: Pokemon, group: string): Mega[] {
  if (!isPresent(pokemon, group)) return [];
  return (pokemon.megas ?? []).filter((m) => m.groups.includes(group));
}

/**
 * Il Pokémon nella forma Mega: tipi, statistiche e abilità della Mega in ogni generazione,
 * sprite della forma. Nome, Pokédex, catena, mosse e luoghi restano quelli della specie.
 */
export function asMega(pokemon: Pokemon, mega: Mega): Pokemon {
  const gens = Object.keys(pokemon.typesByGen);
  const every = <T>(value: T) => Object.fromEntries(gens.map((g) => [g, value]));
  return {
    ...pokemon,
    typesByGen: every(mega.types),
    statsByGen: every(mega.stats),
    abilitiesByGen: every(mega.abilities),
    spriteId: mega.id,
  };
}

/** Pulsanti sul palco: "Mega", oppure "Mega X" e "Mega Y". `active` è lo slug della Mega mostrata. */
export function renderMegaButtons(megas: Mega[], lang: Lang, active: string | null): string {
  if (!megas.length) return '';
  const ui = t(lang);
  return megas
    .map((m) => {
      const label = m.suffix ? `Mega ${m.suffix.toUpperCase()}` : 'Mega';
      return `<button class="mega-toggle" type="button" data-mega="${m.slug}" aria-pressed="${m.slug === active}" title="${esc(ui.showMega(text(m.name, lang)))}">${label}</button>`;
    })
    .join('');
}

/** Come si megaevolve: Megapietra con la sua icona, oppure la mossa (Rayquaza). */
export function renderMegaHow(mega: Mega, lang: Lang): string {
  const ui = t(lang);
  if (mega.stone) {
    return `<img class="mega-stone" src="${ITEM_SPRITES}/${mega.stone.slug}.png" alt="" width="30" height="30" loading="lazy" />${esc(text(mega.stone.name, lang))}`;
  }
  if (mega.move) return esc(ui.megaKnowing(text(mega.move, lang)));
  return '';
}
