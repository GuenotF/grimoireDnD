// Inventaire : dossiers, classement proposé à l'ajout, poids et valeur d'un objet. Calculs purs.
// Dossier : { id, n } ; objet : f (identifiant du dossier), w (poids en kg), v (valeur en po), rar (rareté), unid (non identifié), desc (description).
import { GEAR } from "../data.js";

/** Dossiers proposés à la création ; « divers » reçoit les objets d'un dossier supprimé, il ne se supprime pas. */
const DEF_FOLDERS = [["armes", "Armes"], ["conso", "Consommables"], ["magie", "Magie"], ["quete", "Quête"], ["butin", "Butin"], ["divers", "Divers"]].map(([id, n]) => ({ id, n }));
const RARITIES = ["commune", "peu commune", "rare", "très rare", "légendaire", "artefact"];
/** Dossier proposé : arme du Manuel → Armes, objet magique → Magie, à décompter (potions, munitions) → Consommables, sinon Divers. */
function classify(x) {
  const gear = GEAR[x.ref];
  if (gear && gear.kind === "weapon") return "armes";
  if (x.bonus || x.xdmg || x.att || x.chMax || x.inf || x.rar || x.unid) return "magie";
  if (x.c) return "conso";
  return "divers";
}
/** Dossier d'un objet : le sien s'il existe encore, sinon Divers (ou le dernier dossier). */
const folderOf = (g, x) => g.folders.some(f => f.id === x.f) ? x.f : g.folders.some(f => f.id === "divers") ? "divers" : (g.folders[g.folders.length - 1] || {}).id;
const kgOf = t => { const m = /([\d,.]+)\s*kg/.exec(t || ""); return m ? +m[1].replace(",", ".") : null; };
/** Poids unitaire en kg : saisi, sinon celui de l'arme ou de l'armure du Manuel. */
const weightOf = x => x.w != null ? x.w : GEAR[x.ref] ? kgOf(GEAR[x.ref].w) : null;
const fmtKg = n => `${String(Math.round(n * 100) / 100).replace(".", ",")} kg`;
const fmtPo = n => `${String(Math.round(n * 100) / 100).replace(".", ",")} po`;

export { DEF_FOLDERS, RARITIES, classify, folderOf, weightOf, fmtKg, fmtPo };
