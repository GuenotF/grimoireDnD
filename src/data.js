// Données de jeu, importées des fichiers JSON (esbuild les intègre à l'assemblage).
import SPELLS from "../data/spells.json";
import BEASTS from "../data/beasts.json";
import FEAT_LIST from "../data/feats.json";   // 42 dons du Manuel des joueurs (texte AideDD) : id, n, pre (condition), d (paragraphes)
import MATERIEL from "../data/materiel.json"; // équipement d'aventurier, outils et paquetages du Manuel (outils/materiel_aidedd.py)
import EQUIPMENT from "../data/equipment.json"; // armes et armures du Manuel des joueurs (outils/equipement_xlsx.py)   // bêtes du Manuel des monstres (Forme sauvage) : fp, ca, pv, v (vitesses), st (FOR, DEX, CON), cp (compétences), tr (capacités), ac (actions)

export { SPELLS, BEASTS, FEAT_LIST };
export const WEAPONS = EQUIPMENT.weapons, ARMORS = EQUIPMENT.armors;
/** Arme ou armure du catalogue par identifiant ; kind : "weapon" ou "armor". */
export const GEAR = Object.fromEntries([...WEAPONS.map(w => [w.id, { ...w, kind: "weapon" }]), ...ARMORS.map(a => [a.id, { ...a, kind: "armor" }])]);
/** Équipement d'aventurier, outils, paquetages : id → { n, p, w (kg à l'unité), g, f (dossier proposé), c, u (lot), fx, al (autres noms), pack }. */
export const MAT = Object.fromEntries(MATERIEL.items.map(x => [x.id, x]));
const plainName = t => String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[’']/g, "'").trim();
const MAT_NAMES = new Map(MATERIEL.items.flatMap(x => [x.n, ...(x.u ? [x.u.n] : []), ...(x.al || [])].map(n => [plainName(n), x.id])));
/** Objet du catalogue portant ce nom (accents et majuscules ignorés), ou undefined. */
export const matByName = n => MAT[MAT_NAMES.get(plainName(n))];
export const BY_ID = Object.fromEntries(SPELLS.map(s => [s.id, s]));   // sort par identifiant
export const BEAST = Object.fromEntries(BEASTS.map(b => [b.id, b]));   // bête par identifiant
