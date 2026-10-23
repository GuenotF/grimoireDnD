// Données de jeu, importées des fichiers JSON (esbuild les intègre à l'assemblage).
import SPELLS from "../data/spells.json";
import BEASTS from "../data/beasts.json";
import FEAT_LIST from "../data/feats.json";   // 42 dons du Manuel des joueurs (texte AideDD) : id, n, pre (condition), d (paragraphes)
import EQUIPMENT from "../data/equipment.json"; // armes et armures du Manuel des joueurs (outils/equipement_xlsx.py)   // bêtes du Manuel des monstres (Forme sauvage) : fp, ca, pv, v (vitesses), st (FOR, DEX, CON), cp (compétences), tr (capacités), ac (actions)

export { SPELLS, BEASTS, FEAT_LIST };
export const WEAPONS = EQUIPMENT.weapons, ARMORS = EQUIPMENT.armors;
/** Arme ou armure du catalogue par identifiant ; kind : "weapon" ou "armor". */
export const GEAR = Object.fromEntries([...WEAPONS.map(w => [w.id, { ...w, kind: "weapon" }]), ...ARMORS.map(a => [a.id, { ...a, kind: "armor" }])]);
export const BY_ID = Object.fromEntries(SPELLS.map(s => [s.id, s]));   // sort par identifiant
export const BEAST = Object.fromEntries(BEASTS.map(b => [b.id, b]));   // bête par identifiant
