// Registre des classes. Chaque fichier de classe exporte une définition de même forme (le « contrat »,
// décrit dans docs/ARCHITECTURE.md) ; le reste de l'application ne teste jamais la classe d'un personnage,
// il appelle ce que la classe fournit.
import magicien from "./magicien.js";
import paladin from "./paladin.js";
import druide from "./druide.js";

export const CLASSES = { magicien, paladin, druide };
/** Définition de la classe d'un personnage (magicien pour les anciens fichiers sans classe). */
export const C = g => CLASSES[g && g.cls] || CLASSES.magicien;
/** Sorts toujours préparés, hors limite (sorts de serment du paladin). */
export const alwaysPrepared = g => (C(g).alwaysPrepared ? C(g).alwaysPrepared(g) : []);
export const isAlwaysPrepared = (g, s) => alwaysPrepared(g).includes(s.id);
/** Capacités de classe (sous-classe comprise), dans l'ordre des niveaux. */
export const classFeats = g => (C(g).features ? C(g).features(g) : []);
