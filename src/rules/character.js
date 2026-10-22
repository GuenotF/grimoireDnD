// Règles de la fiche de personnage : sauvegardes, initiative, PV moyens. Calculs purs, sans affichage.
import { C } from "../classes/index.js";
import { R } from "./common.js";

/** Le personnage maîtrise-t-il les jets de sauvegarde de cette caractéristique ? (classe, ou ajout comme le don Résilience) */
const saveFromClass = (g, k) => (C(g).saves || []).includes(k);
const saveProf = (g, k) => saveFromClass(g, k) || (g.saveX || []).includes(k);
const saveBonus = (g, k) => R.ab(g, k) + (saveProf(g, k) ? R.prof(g.level) : 0);
/** Initiative : modificateur de DEX + bonus divers saisi (don Vigilant…). */
const initiative = g => R.ab(g, "dex") + (g.initX || 0);
/** Taille du dé de vie de la classe (8 pour « 1d8 »). */
const hitDieSize = g => +String(C(g).hitDie || "1d8").split("d")[1] || 8;
/** PV maximum à la moyenne : dé plein au niveau 1, puis moyenne arrondie au-dessus ; + mod. de CON à chaque niveau. */
const hpAverage = g => { const d = hitDieSize(g), con = R.ab(g, "con"); return Math.max(g.level, d + (g.level - 1) * (d / 2 + 1) + g.level * con); };
/** Fiche à compléter : la CA ou les PV maximum n'ont jamais été saisis. */
const sheetIncomplete = g => g.ac == null || g.hpMax == null;

export { saveFromClass, saveProf, saveBonus, initiative, hitDieSize, hpAverage, sheetIncomplete };
