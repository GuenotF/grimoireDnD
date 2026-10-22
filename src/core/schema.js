// Format d'un personnage : valeurs par défaut, contrôle à l'ouverture, version et migrations.
import { CLASSES } from "../classes/index.js";
import { BY_ID } from "../data.js";
import { ABILITIES } from "../rules/tables.js";

/** Version actuelle du format. Les fichiers sans numéro sont la version 1. */
export const VERSION = 3;
/** Migrations : MIGRATIONS[n] transforme un personnage de la version n en version n + 1. */
const MIGRATIONS = {
  1: o => o, // v1 → v2 : ajout du numéro de version, aucune donnée modifiée
  2: o => {   // v2 → v3 : les six caractéristiques (abil). Seule la caractéristique d'incantation était saisie : on la reprend, les autres valent 10.
    const ab = (CLASSES[o.cls] || CLASSES.magicien).ab;
    o.abil = Object.fromEntries(ABILITIES.map(([k]) => [k, 10]));
    if (o[ab] != null) o.abil[ab] = +o[ab] || 10;
    delete o.int; delete o.cha; delete o.wis;
    return o;
  },
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
  // Champs communs, puis champs propres à chaque classe (tous présents : un personnage peut changer de classe dans un fichier)
  return { v: VERSION, cls, name: name || "Nouveau " + CLASSES[cls].n.toLowerCase(), level: 1, cantrips: [],
    // Fiche du personnage : caractéristiques, CA (null = pas encore saisie), PV max, vitesse en mètres, bonus d'initiative en plus de DEX, sauvegardes maîtrisées en plus de la classe
    abil: Object.fromEntries(ABILITIES.map(([k]) => [k, 10])), ac: null, hpMax: null, speed: 9, initX: 0, saveX: [],
    // Points de vie : actuels (null = au maximum), temporaires, jets contre la mort, dés de vie dépensés
    hp: null, hpTemp: 0, death: { s: 0, f: 0, stable: false }, hdU: 0, spells: [],
    prepared: [], used: {}, extras: [], effects: [], notes: "", snotes: {}, ...Object.assign({}, ...Object.values(CLASSES).map(c => c.defaults ? c.defaults() : {})), updatedAt: Date.now() };
}
const fxKey = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
function norm(g) {
  // Copie profonde, migrée vers la version actuelle, complétée par les valeurs par défaut.
  const b = blank(); const o = Object.assign(b, migrate(JSON.parse(JSON.stringify(g || {}))));
  if (!CLASSES[o.cls]) o.cls = "magicien"; // anciens fichiers : magicien
  o.level = Math.min(20, Math.max(1, +o.level || 1));
  const abil = o.abil && typeof o.abil === "object" ? o.abil : {};
  o.abil = Object.fromEntries(ABILITIES.map(([k]) => [k, Math.min(30, Math.max(1, Math.round(+abil[k]) || 10))]));
  const num = (v, lo, hi) => v == null || v === "" || !isFinite(+v) ? null : Math.min(hi, Math.max(lo, Math.round(+v)));
  o.ac = num(o.ac, 0, 40); o.hpMax = num(o.hpMax, 1, 999); o.initX = num(o.initX, -20, 20) || 0;
  o.speed = isFinite(+o.speed) && o.speed !== null && o.speed !== "" ? Math.min(60, Math.max(0, +o.speed)) : 9;
  o.hp = o.hp == null ? null : Math.max(0, Math.round(+o.hp) || 0); if (o.hpMax != null && o.hp != null && o.hp >= o.hpMax) o.hp = null;
  o.hpTemp = Math.max(0, Math.round(+o.hpTemp) || 0); o.hdU = Math.min(o.level, Math.max(0, Math.round(+o.hdU) || 0));
  const d = o.death && typeof o.death === "object" ? o.death : {};
  o.death = { s: Math.min(3, Math.max(0, +d.s || 0)), f: Math.min(3, Math.max(0, +d.f || 0)), stable: !!d.stable };
  o.saveX = Array.isArray(o.saveX) ? [...new Set(o.saveX)].filter(k => ABILITIES.some(a => a[0] === k)) : [];
  Object.values(CLASSES).forEach(c => { if (c.normalize) c.normalize(o); }); // champs propres à chaque classe
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
