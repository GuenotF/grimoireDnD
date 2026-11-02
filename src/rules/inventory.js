// Inventaire : dossiers, classement proposé à l'ajout, poids et valeur d'un objet. Calculs purs.
// Dossier : { id, n } ; objet : f (identifiant du dossier), w (poids en kg), v (valeur en po), rar (rareté), unid (non identifié), desc (description).
import { GEAR, MAT } from "../data.js";

/** Dossiers proposés à la création ; « divers » reçoit les objets d'un dossier supprimé, il ne se supprime pas. */
const DEF_FOLDERS = [["armes", "Armes"], ["conso", "Consommables"], ["magie", "Magie"], ["quete", "Quête"], ["butin", "Butin"], ["divers", "Divers"]].map(([id, n]) => ({ id, n }));
const RARITIES = ["commune", "peu commune", "rare", "très rare", "légendaire", "artefact"];
/** Dossier proposé : arme du Manuel → Armes, objet magique → Magie, à décompter (potions, munitions) → Consommables, sinon Divers. */
function classify(x) {
  const gear = GEAR[x.ref];
  if (gear && gear.kind === "weapon") return "armes";
  if (x.bonus || x.xdmg || x.att || x.chMax || x.inf || x.rar || x.unid) return "magie";
  if (x.c) return "conso";
  return MAT[x.mat] ? MAT[x.mat].f : "divers";
}
/** Dossier d'un objet : le sien s'il existe encore, sinon Divers (ou le dernier dossier). */
const folderOf = (g, x) => g.folders.some(f => f.id === x.f) ? x.f : g.folders.some(f => f.id === "divers") ? "divers" : (g.folders[g.folders.length - 1] || {}).id;
const kgOf = t => { const m = /([\d,.]+)\s*kg/.exec(t || ""); return m ? +m[1].replace(",", ".") : null; };
/** Poids unitaire en kg : saisi, sinon celui du Manuel (arme, armure, équipement d'aventurier, outil, paquetage). */
const weightOf = x => x.w != null ? x.w : GEAR[x.ref] ? kgOf(GEAR[x.ref].w) : MAT[x.mat] ? MAT[x.mat].w : null;
const fmtKg = n => `${String(Math.round(n * 100) / 100).replace(".", ",")} kg`;
const fmtPo = n => `${String(Math.round(n * 100) / 100).replace(".", ",")} po`;

/**
 * Charge portée (Manuel, chapitre 7, Force) : objets équipés, et ceux des dossiers portés (pas « non porté » : monture, coffre…),
 * poids à l'unité × quantité ; pièces : 100 pour 1 kg si g.coinW. Capacité : FOR × 7,5 kg. Variante encombrement :
 * au-delà de FOR × 2,5 kg encombré (vitesse −3 m), au-delà de FOR × 5 kg lourdement encombré (−6 m, désavantage FOR, DEX, CON).
 * Renvoie { kg, cap, enc, heavy, level (0 rien, 1 encombré, 2 lourdement, 3 au-delà de la capacité), unknown (objets sans poids) }.
 */
function loadOf(g) {
  const off = new Set(g.folders.filter(f => f.np).map(f => f.id));
  let kg = 0, unknown = 0;
  g.items.forEach(x => { if (!x.eq && off.has(folderOf(g, x))) return; const w = weightOf(x); if (w == null) unknown++; else kg += w * x.q; });
  if (g.coinW) kg += ["pp", "po", "pe", "pa", "pc"].reduce((t, k) => t + (g.money[k] || 0), 0) / 100;
  const str = g.abil.str, cap = str * 7.5, enc = str * 2.5, heavy = str * 5;
  kg = Math.round(kg * 100) / 100;
  const level = kg > cap ? 3 : g.load === "enc" ? (kg > heavy ? 2 : kg > enc ? 1 : 0) : 0;
  return { kg, cap, enc, heavy, level, unknown };
}
/** Vitesse perdue (variante encombrement) : 3 m encombré, 6 m lourdement encombré ou au-delà. */
const loadSpeed = g => g.load !== "enc" ? 0 : [0, 3, 6, 6][loadOf(g).level];

export { DEF_FOLDERS, RARITIES, classify, folderOf, weightOf, fmtKg, fmtPo, loadOf, loadSpeed };
