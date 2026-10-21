// Données de jeu, importées des fichiers JSON (esbuild les intègre à l'assemblage).
import SPELLS from "../data/spells.json";   // sorts : voir le format dans README.md
import BEASTS from "../data/beasts.json";   // bêtes du Manuel des monstres (Forme sauvage) : fp, ca, pv, v (vitesses), st (FOR, DEX, CON), cp (compétences), tr (capacités), ac (actions)

export { SPELLS, BEASTS };
export const BY_ID = Object.fromEntries(SPELLS.map(s => [s.id, s]));   // sort par identifiant
export const BEAST = Object.fromEntries(BEASTS.map(b => [b.id, b]));   // bête par identifiant
