// Format d'un personnage : valeurs par défaut, contrôle à l'ouverture, version et migrations.
import { BY_ID, BEAST } from "../data.js";
import { CLASSES, OATHS, CIRCLES } from "../rules/common.js";

/** Version actuelle du format. Les fichiers sans numéro sont la version 1. */
export const VERSION = 2;
/** Migrations : MIGRATIONS[n] transforme un personnage de la version n en version n + 1. */
const MIGRATIONS = {
  1: o => o, // v1 → v2 : ajout du numéro de version, aucune donnée modifiée
};
/** Applique les migrations nécessaires à un personnage brut (copie déjà faite). */
export function migrate(o) {
  let v = Number.isInteger(o.v) && o.v > 0 ? o.v : 1;
  while (v < VERSION) { o = MIGRATIONS[v](o); v++; }
  o.v = VERSION;
  return o;
}

function blank(name, cls) {
  cls = CLASSES[cls] ? cls : "magicien";
  return { v: VERSION, cls, name: name || "Nouveau " + CLASSES[cls].n.toLowerCase(), level: 1, int: 16, cha: 14, wis: 16, school: "Évocation", oath: "conquete", circle: "lune", cantrips: [], spells: [],
    prepared: [], used: {}, arcane: false, extras: [], effects: [], notes: "", snotes: {}, favs: [], wsForm: null, loh: 0, dsU: 0, cdU: 0, wsU: 0, updatedAt: Date.now() };
}
const fxKey = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
function norm(g) {
  // Copie profonde, migrée vers la version actuelle, complétée par les valeurs par défaut.
  const b = blank(); const o = Object.assign(b, migrate(JSON.parse(JSON.stringify(g || {}))));
  if (!CLASSES[o.cls]) o.cls = "magicien"; // anciens fichiers : magicien
  o.level = Math.min(20, Math.max(1, +o.level || 1)); o.int = Math.min(30, Math.max(1, +o.int || 10)); o.cha = Math.min(30, Math.max(1, +o.cha || 10)); o.wis = Math.min(30, Math.max(1, +o.wis || 10));
  if (!CIRCLES[o.circle]) o.circle = "lune";
  if (!Array.isArray(o.favs)) o.favs = []; o.favs = o.favs.filter(id => BEAST[id]);            // druide : formes favorites
  if (!o.wsForm || !BEAST[o.wsForm.id]) o.wsForm = null;                                         // druide : forme active {id, hp, max}
  if (!OATHS[o.oath]) o.oath = "conquete";
  if (typeof o.style !== "string") o.style = ""; // paladin : style de combat
  ["loh", "dsU", "cdU", "wsU"].forEach(k => { o[k] = Math.max(0, +o[k] || 0); }); // paladin : PV d'Imposition dépensés, Perception divine et Conduit divin utilisés
  ["cantrips","spells","prepared","extras"].forEach(k => { if (!Array.isArray(o[k])) o[k] = []; });
  o.spells = o.spells.filter(x => x && BY_ID[x.id]); o.cantrips = o.cantrips.filter(id => BY_ID[id]);
  // Magicien : un sort préparé doit être dans le grimoire. Paladin : dans la liste de sa classe.
  o.prepared = [...new Set(o.prepared)].filter(id => o.cls === "magicien" ? o.spells.some(x => x.id === id) : BY_ID[id] && (BY_ID[id].cl || []).includes(o.cls));
  if (!o.used || typeof o.used !== "object") o.used = {};
  if (!o.snotes || typeof o.snotes !== "object" || Array.isArray(o.snotes)) o.snotes = {}; // notes personnelles par sort : {id: texte}
  if (!Array.isArray(o.effects)) o.effects = []; // sorts en cours : {k, id, name, d, c (concentration), note}
  o.effects.forEach(e => { if (!e.k) e.k = fxKey(); });
  return o;
}

export { blank, fxKey, norm };
