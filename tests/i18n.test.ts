import { describe, expect, it } from 'vitest';
import { LANGS, UI, localePath } from '../src/lib/i18n';

describe('testi dell’interfaccia', () => {
  it('ogni lingua ha esattamente le stesse chiavi', () => {
    const keys = (lang: (typeof LANGS)[number]) => Object.keys(UI[lang]).sort();
    for (const lang of LANGS) expect(keys(lang)).toEqual(keys('it'));
  });

  it('le funzioni di testo esistono in tutte le lingue', () => {
    for (const lang of LANGS) {
      expect(UI[lang].count(3)).toContain('3');
      expect(UI[lang].statLabels).toHaveLength(6);
      expect(Object.keys(UI[lang].defenseLabels).sort()).toEqual(['0', '0.25', '0.5', '2', '4']);
    }
  });

  it('l’italiano sta alla radice, le altre lingue nella loro cartella', () => {
    expect(localePath('it', 'pokemon/gengar/')).toBe('pokemon/gengar/');
    expect(localePath('en', 'pokemon/gengar/')).toBe('en/pokemon/gengar/');
    expect(localePath('en')).toBe('en/');
  });
});
