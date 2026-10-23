// Format d'un personnage : valeurs par défaut, contrôle à l'ouverture, version et migrations.
import { CLASSES } from "../classes/index.js";
import { BY_ID, GEAR } from "../data.js";
import { FEATS, featByName } from "../rules/feats.js";
import { COINS, blankPurse } from "../rules/money.js";
import { ABILITIES, SKILLS } from "../rules/tables.js";

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

// Objet libre portant exactement le nom d'une arme ou armure du Manuel (accents et majuscules ignorés) : relié au catalogue
const plain = t => String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[’']/g, "'").trim();
const gearByName = n => Object.values(GEAR).find(x => plain(x.n) === plain(n));
// Objet magique : bonus 0 à 3, dégâts en plus, harmonisation, charges (max, utilisées, recharge) ; champs absents si non magique
function magicOf(x) {
  const m = {}, b = Math.max(0, Math.min(3, Math.floor(+x.bonus) || 0)), ch = Math.max(0, Math.min(50, Math.floor(+x.chMax) || 0));
  if (b) m.bonus = b; if (typeof x.xdmg === "string" && x.xdmg.trim()) m.xdmg = x.xdmg.trim();
  if (x.att) { m.att = true; m.attuned = !!x.attuned; }
  if (ch) { m.chMax = ch; m.chU = Math.max(0, Math.min(ch, Math.floor(+x.chU) || 0)); m.rec = ["aube", "long", "court", ""].includes(x.rec) ? x.rec : "aube"; }
  return m;
}
function blank(name, cls) {
  cls = CLASSES[cls] ? cls : "magicien";
  // Champs communs, puis champs propres à chaque classe (tous présents : un personnage peut changer de classe dans un fichier)
  return { v: VERSION, cls, name: name || "Nouveau " + CLASSES[cls].n.toLowerCase(), level: 1, cantrips: [],
    // Fiche du personnage : caractéristiques, CA (null = pas encore saisie), PV max, vitesse en mètres, bonus d'initiative en plus de DEX, sauvegardes maîtrisées en plus de la classe
    abil: Object.fromEntries(ABILITIES.map(([k]) => [k, 10])), ac: null, hpMax: null, speed: 9, initX: 0, saveX: [],
    // Points de vie : actuels (null = au maximum), temporaires, jets contre la mort, dés de vie dépensés
    skills: {}, tools: {}, langs: [], // outils { nom: 1 maîtrise | 2 expertise }, langues
    // Bas de fiche : défenses [{t: res|imm|vul|adv, v}], dons et traits [{n, o (origine), d}], historique, notes du personnage
    defs: [], traits: [], bg: { n: "", d: "" }, pnotes: "",
    // Équipement : objets [{n, q, eq, c (à décompter), note}] et bourse {pp, po, pe, pa, pc}
    items: [], money: blankPurse(), acMode: null,
    hp: null, hpTemp: 0, death: { s: 0, f: 0, stable: false }, hdU: 0, exh: 0, spells: [],
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
  o.exh = Math.min(6, Math.max(0, Math.round(+o.exh) || 0)); // niveaux d'épuisement
  o.hpTemp = Math.max(0, Math.round(+o.hpTemp) || 0); o.hdU = Math.min(o.level, Math.max(0, Math.round(+o.hdU) || 0));
  const d = o.death && typeof o.death === "object" ? o.death : {};
  o.death = { s: Math.min(3, Math.max(0, +d.s || 0)), f: Math.min(3, Math.max(0, +d.f || 0)), stable: !!d.stable };
  const tl = o.tools && typeof o.tools === "object" && !Array.isArray(o.tools) ? o.tools : {};
  o.tools = Object.fromEntries(Object.entries(tl).filter(([n, l]) => n.trim() && (l === 1 || l === 2)));
  o.langs = Array.isArray(o.langs) ? o.langs.filter(l => typeof l === "string" && l.trim()) : [];
  const sk = o.skills && typeof o.skills === "object" && !Array.isArray(o.skills) ? o.skills : {};
  o.skills = Object.fromEntries(SKILLS.filter(([k]) => sk[k] === 1 || sk[k] === 2).map(([k]) => [k, sk[k]]));
  const str = v => typeof v === "string" ? v : "";
  o.defs = (Array.isArray(o.defs) ? o.defs : []).filter(d => d && ["res", "imm", "vul", "adv"].includes(d.t) && str(d.v).trim()).map(d => ({ t: d.t, v: str(d.v).trim() }));
  // Dons : reliés au catalogue (feat), choix fait en le prenant (ch), ajouts de l'atelier à retirer avec lui (ap).
  // Un trait libre au nom exact d'un don est relié au catalogue (sans ap : ses effets sont déjà dans la fiche).
  const arr = v => Array.isArray(v) ? v.filter(x => typeof x === "string") : undefined, abk = k => ABILITIES.some(a => a[0] === k) ? k : undefined;
  const chOf = c => { if (!c || typeof c !== "object") return null; const r = { abil: abk(c.abil), skills: arr(c.skills), langs: arr(c.langs) }; Object.keys(r).forEach(k => r[k] === undefined && delete r[k]); return Object.keys(r).length ? r : null; };
  const apOf = a => { if (!a || typeof a !== "object") return null; const r = { abil: abk(a.abil), skills: arr(a.skills), langs: arr(a.langs), hp: +a.hp > 0 ? Math.round(+a.hp) : undefined }; Object.keys(r).forEach(k => r[k] === undefined && delete r[k]); return r; };
  o.traits = (Array.isArray(o.traits) ? o.traits : []).filter(t => t && str(t.n).trim()).map(t => {
    const feat = FEATS[t.feat] ? t.feat : t.o !== "race" && featByName(t.n) ? featByName(t.n).id : null, ch = feat && chOf(t.ch), ap = feat && apOf(t.ap);
    if (feat && !t.feat) { // relié à l'ouverture : le bonus déjà saisi à la main ne doit pas compter deux fois
      if (feat === "alert" && o.initX >= 5) o.initX -= 5;
      if (feat === "mobile" && o.speed >= 10.5) o.speed -= 3;
    }
    return { n: str(t.n).trim(), o: feat ? "don" : str(t.o) || "autre", d: str(t.d), ...(feat ? { feat } : {}), ...(ch ? { ch } : {}), ...(ap ? { ap } : {}) };
  });
  o.bg = { n: str((o.bg || {}).n), d: str((o.bg || {}).d) }; o.pnotes = str(o.pnotes);
  o.items = (Array.isArray(o.items) ? o.items : []).filter(x => x && str(x.n).trim()).map(x => ({ n: str(x.n).trim(), q: Math.max(0, Math.floor(+x.q) || 0), eq: !!x.eq, c: !!x.c, note: str(x.note), ...(x.oh ? { oh: true } : {}), ...magicOf(x), ...(GEAR[x.ref] ? { ref: x.ref } : gearByName(x.n) ? { ref: gearByName(x.n).id } : {}) }));
  o.acMode = ["calc", "manual"].includes(o.acMode) ? o.acMode : null; // null : saisie si elle existe, sinon calcul
  const mo = o.money && typeof o.money === "object" ? o.money : {};
  o.money = Object.fromEntries(COINS.map(([k]) => [k, Math.max(0, Math.floor(+mo[k]) || 0)]));
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
