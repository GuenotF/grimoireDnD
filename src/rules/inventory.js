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

// ---------- Valeur et revente (Manuel, chapitre 5 : armes, armures et équipement à moitié prix ; gemmes, bijoux, objets d'art, marchandises
// à pleine valeur ; objets magiques : prix fixé par le MJ, la valeur saisie compte en entier)
const PC = { pp: 1000, po: 100, pe: 50, pa: 10, pc: 1 };
/** Prix du Manuel en pc (« 25 po », « 5 pa ») ; null s'il n'y en a pas. */
const pcOf = t => { const m = /^([\d\s]+)\s*(pp|po|pe|pa|pc)$/.exec(String(t || "").trim()); return m ? +m[1].replace(/\s/g, "") * PC[m[2]] : null; };
const magic = x => !!(x.bonus || x.xdmg || x.att || x.chMax || x.inf || x.rar || x.unid);
/** Valeur d'un objet à l'unité, en pc : saisie (po), sinon le prix du Manuel (un lot de munitions : divisé par le lot). */
function unitPc(x) {
  if (x.v != null) return Math.round(x.v * 100);
  const m = MAT[x.mat], gr = GEAR[x.ref], p = gr ? pcOf(gr.p) : m ? pcOf(m.p) : null;
  return p == null ? null : m && m.u ? p / m.u.q : p;
}
/** Revente : { unit (pc), half (moitié prix ?), total (pc, quantité comprise, arrondi au pc inférieur) } ou null sans valeur. */
function saleOf(x) {
  const u = unitPc(x); if (u == null) return null;
  const half = !!(GEAR[x.ref] || MAT[x.mat]) && !magic(x);
  return { unit: u, half, total: Math.floor(u * (half ? 0.5 : 1) * x.q) };
}
/** Somme en pc écrite en pièces : « 15 po 2 pa 5 pc » ; et répartie dans une bourse (po, pa, pc). */
const coinsOf = pc => ({ po: Math.floor(pc / 100), pa: Math.floor(pc % 100 / 10), pc: pc % 10 });
const pcText = pc => { const c = coinsOf(pc); return ["po", "pa", "pc"].filter(k => c[k]).map(k => `${c[k]} ${k}`).join(" ") || "0 po"; };

// ---------- Munitions (propriété Munitions) : arme → objet de l'inventaire (lien au catalogue, sinon nom)
const AMMO = { longbow: ["fleches-20", "fleche"], shortbow: ["fleches-20", "fleche"], "crossbow-light": ["carreaux-d-arbalete-20", "carreau"], "crossbow-hand": ["carreaux-d-arbalete-20", "carreau"],
  "crossbow-heavy": ["carreaux-d-arbalete-20", "carreau"], sling: ["billes-de-fronde-20", "bille"], blowgun: ["aiguilles-de-sarbacane-50", "aiguille"] };
const plainN = t => String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
/** Indice de l'objet de munitions d'une arme (le premier qui en reste), -1 sans munitions, null si l'arme n'en utilise pas. */
function ammoOf(g, gid) {
  const a = AMMO[gid]; if (!a) return null;
  const ids = g.items.map((x, i) => i).filter(i => g.items[i].mat === a[0] || (!g.items[i].mat && plainN(g.items[i].n).startsWith(a[1])));
  return ids.length ? ids.find(i => g.items[i].q > 0) ?? ids[0] : -1;
}

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

export { DEF_FOLDERS, RARITIES, classify, folderOf, weightOf, fmtKg, fmtPo, loadOf, loadSpeed, unitPc, saleOf, coinsOf, pcText, ammoOf };
