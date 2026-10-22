// Règles de la fiche de personnage : sauvegardes, initiative, PV moyens, compétences. Calculs purs, sans affichage.
import { C } from "../classes/index.js";
import { R } from "./common.js";
import { SKILLS } from "./tables.js";

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
/** Compétence : mod. de la caractéristique + maîtrise (×1) ou expertise (×2). g.skills = { code: 1 | 2 }. */
const skillLevel = (g, k) => (g.skills || {})[k] || 0;
const skillBonus = (g, k) => { const s = SKILLS.find(x => x[0] === k); return R.ab(g, s[2]) + skillLevel(g, k) * R.prof(g.level); };
/** Perception passive : 10 + bonus de Perception. */
const passivePerception = g => 10 + skillBonus(g, "perception");
/** Fiche à compléter : la CA ou les PV maximum n'ont jamais été saisis. */
const sheetIncomplete = g => g.ac == null || g.hpMax == null;

export { skillLevel, skillBonus, passivePerception, saveFromClass, saveProf, saveBonus, initiative, hitDieSize, hpAverage, sheetIncomplete };
