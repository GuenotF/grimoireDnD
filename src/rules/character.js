// Règles de la fiche de personnage : sauvegardes, initiative, PV moyens, compétences. Calculs purs, sans affichage.
import { C } from "../classes/index.js";
import { R } from "./common.js";
import { acOf } from "./equipment.js";
import { SKILLS } from "./tables.js";

/** Le personnage maîtrise-t-il les jets de sauvegarde de cette caractéristique ? (classe, ou ajout comme le don Résilience) */
const saveFromClass = (g, k) => (typeof C(g).saves === "function" ? C(g).saves(g) : C(g).saves || []).includes(k); // liste, ou fonction du niveau
const saveProf = (g, k) => saveFromClass(g, k) || (g.saveX || []).includes(k);
const saveBonus = (g, k) => R.ab(g, k) + (saveProf(g, k) ? R.prof(g.level) : 0);
/** Initiative : modificateur de DEX + bonus divers saisi (don Vigilant…). */
const initiative = g => R.ab(g, "dex") + (g.initX || 0);
/** Vitesse en mètres : saisie + bonus de classe (Déplacement rapide du barbare…). */
const speedOf = g => g.speed + (C(g).speedBonus ? C(g).speedBonus(g) : 0);
/** Taille du dé de vie de la classe (8 pour « 1d8 »). */
const hitDieSize = g => +String(C(g).hitDie || "1d8").split("d")[1] || 8;
/** PV maximum à la moyenne : dé plein au niveau 1, puis moyenne arrondie au-dessus ; + mod. de CON à chaque niveau. */
const hpAverage = g => { const d = hitDieSize(g), con = R.ab(g, "con"); return Math.max(g.level, d + (g.level - 1) * (d / 2 + 1) + g.level * con); };
/** Compétence : mod. de la caractéristique + maîtrise (×1) ou expertise (×2). g.skills = { code: 1 | 2 }. */
const skillLevel = (g, k) => (g.skills || {})[k] || 0;
const skillBonus = (g, k) => { const s = SKILLS.find(x => x[0] === k); return R.ab(g, s[2]) + skillLevel(g, k) * R.prof(g.level); };
/** Perception passive : 10 + bonus de Perception. */
const passivePerception = g => 10 + skillBonus(g, "perception");
/** Niveaux d'amélioration de caractéristiques (classes actuelles ; une classe peut fournir les siens). */
const asiLevels = g => C(g).asiLevels || [4, 8, 12, 16, 19];
/**
 * PV gagnés en passant au niveau suivant : moyenne du dé (d/2 + 1) ou jet saisi, + mod. de CON (au moins 1).
 * Si l'amélioration augmente le mod. de CON, les PV max gagnent aussi 1 par niveau déjà atteint.
 */
function hpGain(g, hp, asi = {}) {
  const d = hitDieSize(g), abil = { ...g.abil }; Object.entries(asi).forEach(([k, n]) => { abil[k] = Math.min(20, abil[k] + n); });
  const con0 = R.ab(g, "con"), con1 = R.mod(abil.con), roll = hp.mode === "roll" ? Math.min(d, Math.max(1, Math.floor(+hp.roll) || 0)) : d / 2 + 1;
  const die = hp.mode === "roll" && !(+hp.roll >= 1) ? null : Math.max(1, roll + con1);
  return { die, d, roll, con: con1, retro: (con1 - con0) * g.level, total: die == null ? null : die + (con1 - con0) * g.level };
}
/** Fiche à compléter : la CA ou les PV maximum n'ont jamais été saisis. */
const sheetIncomplete = g => acOf(g) == null || g.hpMax == null;

export { speedOf, asiLevels, hpGain, skillLevel, skillBonus, passivePerception, saveFromClass, saveProf, saveBonus, initiative, hitDieSize, hpAverage, sheetIncomplete };
