// Création d'un personnage (règles 2014) : races, historiques (data/origins.json), compétences et équipement de départ
// des classes, caractéristiques (tableau standard, achat de points, dés). Calculs purs : la fiche est construite par build().
import { CLASSES } from "../classes/index.js";
import ORIGINS from "../../data/origins.json";
import { GEAR, WEAPONS } from "../data.js";
import { SKILLS } from "./tables.js";

const RACES = Object.fromEntries(ORIGINS.races.map(r => [r.id, r]));
const BGS = Object.fromEntries(ORIGINS.backgrounds.map(b => [b.id, b]));
const { toolLists: TOOL_LISTS, langs: LANGS, packs: PACKS } = ORIGINS;

// Classes : compétences au choix, Expertise au niveau 1, équipement (options a / b / c), équipement fixe, or de départ (×10 po)
const W = (ref, q = 1) => ({ ref, q }), O = (n, q = 1, c = false) => ({ n, q, c }), P = pick => ({ pick });
const CLASS_START = {
  barbare: { skills: { n: 2, list: ["athletics", "animal", "intimidation", "nature", "perception", "survival"] }, gold: "2d4",
    equip: [[["une hache à deux mains", [W("greataxe")]], ["une arme de guerre de corps à corps", [P("martial-melee")]]], [["deux hachettes", [W("handaxe", 2)]], ["une arme courante", [P("simple")]]]],
    fixed: [O("Sac d'explorateur"), W("javelin", 4)] },
  druide: { skills: { n: 2, list: ["arcana", "animal", "insight", "medicine", "nature", "perception", "religion", "survival"] }, gold: "2d4",
    equip: [[["un bouclier en bois", [W("shield")]], ["une arme courante", [P("simple")]]], [["un cimeterre", [W("scimitar")]], ["une arme courante de corps à corps", [P("simple-melee")]]]],
    fixed: [W("leather"), O("Sac d'explorateur"), O("Focaliseur druidique")] },
  magicien: { skills: { n: 2, list: ["arcana", "history", "insight", "investigation", "medicine", "religion"] }, gold: "4d4", book: 6,
    equip: [[["un bâton", [W("quarterstaff")]], ["une dague", [W("dagger")]]], [["une sacoche à composantes", [O("Sacoche à composantes")]], ["un focaliseur arcanique", [O("Focaliseur arcanique")]]], [["un sac d'érudit", [O("Sac d'érudit")]], ["un sac d'explorateur", [O("Sac d'explorateur")]]]],
    fixed: [O("Grimoire")] },
  paladin: { skills: { n: 2, list: ["athletics", "insight", "intimidation", "medicine", "persuasion", "religion"] }, gold: "5d4",
    equip: [[["une arme de guerre et un bouclier", [P("martial"), W("shield")]], ["deux armes de guerre", [P("martial"), P("martial")]]], [["cinq javelines", [W("javelin", 5)]], ["une arme courante de corps à corps", [P("simple-melee")]]], [["un sac d'ecclésiastique", [O("Sac d'ecclésiastique")]], ["un sac d'explorateur", [O("Sac d'explorateur")]]]],
    fixed: [W("chain-mail"), O("Symbole sacré")] },
  rodeur: { skills: { n: 3, list: ["athletics", "stealth", "animal", "insight", "investigation", "nature", "perception", "survival"] }, gold: "5d4",
    equip: [[["une armure d'écailles", [W("scale-mail")]], ["une armure de cuir", [W("leather")]]], [["deux épées courtes", [W("shortsword", 2)]], ["deux armes courantes de corps à corps", [P("simple-melee"), P("simple-melee")]]], [["un sac d'exploration souterraine", [O("Sac d'exploration souterraine")]], ["un sac d'explorateur", [O("Sac d'explorateur")]]]],
    fixed: [W("longbow"), O("Flèches", 20, true)] },
  roublard: { skills: { n: 4, list: ["acrobatics", "athletics", "stealth", "sleight", "intimidation", "insight", "investigation", "perception", "persuasion", "performance", "deception"] }, gold: "4d4", expertise: 2,
    equip: [[["une rapière", [W("rapier")]], ["une épée courte", [W("shortsword")]]], [["un arc court et un carquois de 20 flèches", [W("shortbow"), O("Flèches", 20, true)]], ["une épée courte", [W("shortsword")]]], [["un sac de cambrioleur", [O("Sac de cambrioleur")]], ["un sac d'exploration souterraine", [O("Sac d'exploration souterraine")]], ["un sac d'explorateur", [O("Sac d'explorateur")]]]],
    fixed: [W("leather"), W("dagger", 2), O("Outils de voleur")] },
};
/** Armes proposées pour « une arme … au choix ». */
const pickList = kind => WEAPONS.filter(w => (kind.startsWith("martial") ? w.cat === "martial" : w.cat === "simple") && (!kind.endsWith("melee") || w.rng === "melee"));

// ---------- Caractéristiques
const STD = [15, 14, 13, 12, 10, 8];
const PB_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 }, PB_BUDGET = 27;
const pbSpent = pb => Object.values(pb).reduce((t, v) => t + (PB_COST[v] ?? 99), 0);
/** 4d6, on garde les 3 meilleurs. Renvoie { dice, total }. */
function roll4d6() { const d = Array.from({ length: 4 }, () => 1 + Math.floor(Math.random() * 6)).sort((a, b) => b - a); return { dice: d, total: d[0] + d[1] + d[2] }; }
/** Valeurs de base selon la méthode (null si incomplètes). */
function baseScores(c) {
  const keys = ["str", "dex", "con", "int", "wis", "cha"];
  if (c.method === "pb") return Object.fromEntries(keys.map(k => [k, c.pb[k]]));
  if (c.method === "std") return keys.every(k => c.std[k]) ? Object.fromEntries(keys.map(k => [k, c.std[k]])) : null;
  return keys.every(k => c.dice[k] >= 3 && c.dice[k] <= 18) ? Object.fromEntries(keys.map(k => [k, +c.dice[k]])) : null;
}

// ---------- Race
const subOf = c => { const r = RACES[c.race]; return r && r.subs ? r.subs.find(s => s.id === c.sub) || null : null; };
/** Bonus de caractéristiques de la race (sous-race et choix compris). */
function raceAsi(c) {
  const r = RACES[c.race]; if (!r) return {}; const s = subOf(c) || {}, out = {};
  const add = o => Object.entries(o || {}).forEach(([k, n]) => { out[k] = (out[k] || 0) + n; });
  if (!s.asiReplace) add(r.asi); add(s.asi);
  const ch = s.asiChoice || r.asiChoice; if (ch) (c.rc.asi || []).slice(0, ch.n).forEach(k => add({ [k]: ch.v }));
  return out;
}
/** Ce que la race apporte : maîtrises, langues, vitesse, traits, défenses… */
function raceGives(c) {
  const r = RACES[c.race]; if (!r) return null; const s = subOf(c) || {}, cat = (k) => [...(r[k] || []), ...(s[k] || [])];
  const traits = [...(r.traits || []), ...(s.traits || [])].map(t => ({ ...t }));
  const defs = [...cat("defs")];
  if (r.ancestry && c.rc.anc != null) {
    const [dn, dt, zone, sv] = r.ancestry[c.rc.anc];
    defs.push({ t: "res", v: dt });
    traits.push({ n: `Ascendance draconique (dragon ${dn.toLowerCase()})`, d: `Résistance : ${dt}.` }, { n: "Souffle", d: `Action : ${zone}, JdS de ${sv === "con" ? "Constitution" : "Dextérité"} (DD 8 + CON + maîtrise), 2d6 ${dt} (3d6 au niveau 6, 4d6 au 11, 5d6 au 16), moitié si réussi. Une fois par repos court ou long.` });
  }
  if (c.rc.cantrip) { const t = traits.find(x => x.n === "Sort mineur"); if (t) t.d = `${c.rc.cantripName || c.rc.cantrip} (sort mineur de magicien, INT).`; }
  return { speed: s.speed || r.speed, size: r.size, langs: [...(r.langs || []), ...(c.rc.langs || []).filter(Boolean)], skills: [...cat("skills"), ...(c.rc.skills || [])],
    tools: [...cat("tools"), ...(c.rc.tool ? [c.rc.tool] : [])], weapons: cat("weapons"), armor: cat("armor"), defs, traits, hpLv: s.hpLv || r.hpLv || 0,
    name: s.n && s.id !== "standard" ? s.n : r.n };
}
/** Choix encore à faire pour la race (texte), ou "" si tout est complet. */
function raceMissing(c) {
  const r = RACES[c.race]; if (!r) return "choisis une race"; const s = subOf(c);
  if (r.subs && !s) return "choisis une sous-race";
  const sx = s || {}, ach = sx.asiChoice || r.asiChoice, need = (sx.skillChoice || r.skillChoice || 0), lc = (sx.langChoice || r.langChoice || 0);
  if (ach && (c.rc.asi || []).length < ach.n) return `choisis ${ach.n} caractéristique${ach.n > 1 ? "s" : ""} (+${ach.v})`;
  if ((c.rc.skills || []).length < need) return `choisis ${need} compétence${need > 1 ? "s" : ""}`;
  if ((c.rc.langs || []).filter(Boolean).length < lc) return `choisis ${lc} langue${lc > 1 ? "s" : ""}`;
  if ((sx.toolChoice || r.toolChoice) && !c.rc.tool) return "choisis un outil";
  if (r.ancestry && c.rc.anc == null) return "choisis une ascendance draconique";
  if (sx.cantripFrom && !c.rc.cantrip) return "choisis un sort mineur de magicien";
  if (sx.feat && !(c.fp && c.fp.sel)) return "choisis un don";
  return "";
}

// ---------- Historique
const BG_CUSTOM = { id: "perso", n: "Personnalisé", skills: [], gold: 10, equip: [], feat: ["Aptitude", "À définir avec ton MJ."] };
const bgOf = c => c.bg === "perso" ? { ...BG_CUSTOM, n: c.bc.name || "Personnalisé" } : BGS[c.bg] || null;
/** Compétences de l'historique, doublons de la race remplacés par le choix du joueur. */
function bgSkills(c) {
  const b = bgOf(c); if (!b) return [];
  const race = (raceGives(c) || { skills: [] }).skills;
  if (c.bg === "perso") return (c.bc.skills || []).slice(0, 2);
  return b.skills.map(k => race.includes(k) ? (c.bc.swap || {})[k] || null : k);
}
/** Outils de l'historique (choix et remplacement des doublons de la classe compris). */
function bgTools(c, clsTools) {
  const b = bgOf(c); if (!b) return [];
  const list = [...(b.tools || []), ...(c.bc.tools || []).filter(Boolean)];
  return list.map(t => clsTools.includes(t) ? (c.bc.swapTool || {})[t] || null : t);
}

// ---------- Fiche construite à partir des choix (aperçu et création)
const hitDie = cls => +String(CLASSES[cls].hitDie || "1d8").split("d")[1];
const mod = v => Math.floor((v - 10) / 2);
/** Objets de départ (paquetage) : [{n, q, ref?, c?, note?}]. */
function startItems(c) {
  if (c.eqMode === "gold") return [];
  const cs = CLASS_START[c.cls], out = [], b = bgOf(c);
  const push = it => {
    if (it.pick) { const id = c.picks[it.key]; if (!id) return; out.push({ n: GEAR[id].n, q: 1, ref: id }); return; }
    if (it.ref) { out.push({ n: GEAR[it.ref].n, q: it.q || 1, ref: it.ref }); return; }
    out.push({ n: it.n, q: it.q || 1, c: !!it.c, note: PACKS[it.n] || "" });
  };
  cs.equip.forEach((line, i) => { const o = line[c.eq[i] || 0]; o[1].forEach((it, j) => push({ ...it, key: `${i}-${c.eq[i] || 0}-${j}` })); });
  cs.fixed.forEach(push);
  (b ? b.equip : []).forEach(n => out.push({ n, q: 1, note: "" }));
  return out;
}
/** La fiche complète (format des sauvegardes), à partir de l'état de l'assistant. */
function build(c, blank) {
  const g = blank(c.name, c.cls), rg = raceGives(c) || { speed: 9, langs: [], skills: [], tools: [], weapons: [], armor: [], defs: [], traits: [], hpLv: 0, name: "" };
  const base = baseScores(c) || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, asi = raceAsi(c);
  g.abil = Object.fromEntries(Object.entries(base).map(([k, v]) => [k, Math.min(20, v + (asi[k] || 0))]));
  g.speed = rg.speed; g.race = { id: c.race, sub: c.sub || null, n: rg.name, hpLv: rg.hpLv, weapons: rg.weapons, armor: rg.armor, ...(c.rc.cantrip ? { cantrip: c.rc.cantrip } : {}) };
  g.hpMax = hitDie(c.cls) + mod(g.abil.con) + rg.hpLv; g.hp = null;
  const skills = new Set([...rg.skills, ...bgSkills(c).filter(Boolean), ...c.skills]);
  g.skills = Object.fromEntries([...skills].map(k => [k, (c.exp || []).includes(k) ? 2 : 1]));
  const clsTools = CLASSES[c.cls].tools ? CLASSES[c.cls].tools({ ...g, level: 1 }) : [];
  g.tools = Object.fromEntries([...rg.tools, ...bgTools(c, clsTools).filter(Boolean)].map(t => [t, 1]));
  if ((c.exp || []).includes("tools")) g.tools["Outils de voleur"] = 2;
  const b = bgOf(c);
  g.langs = [...new Set([...rg.langs, ...(c.bc.langs || []).filter(Boolean), ...((c.bc.swapLang || []).filter(Boolean))])];
  g.defs = rg.defs.map(d => ({ ...d }));
  g.traits = rg.traits.map(t => ({ n: t.n, o: "race", d: t.d }));
  if (b) { g.bg = { n: b.n, d: [`Aptitude · ${b.feat[0]} : ${b.feat[1]}`, ...["trait", "ideal", "bond", "flaw"].map(k => c.bc[k] ? `${{ trait: "Trait", ideal: "Idéal", bond: "Lien", flaw: "Défaut" }[k]} : ${c.bc[k]}` : "").filter(Boolean)].join("\n") }; }
  g.items = startItems(c).map(it => ({ eq: !!it.ref, c: !!it.c, note: "", ...it }));
  g.money = { pp: 0, po: c.eqMode === "gold" ? (+c.gold || 0) : (b ? b.gold : 0), pe: 0, pa: 0, pc: 0 };
  g.cantrips = [...(c.cantrips || [])];
  if (CLASS_START[c.cls].book) g.spells = (c.spells || []).map(id => ({ id, how: "niv" }));
  g.prepared = [...(c.prep || [])];
  if (CLASSES[c.cls].creation) CLASSES[c.cls].creation.apply(g, c); // choix propres à la classe (rôdeur : ennemi juré, terrain favori)
  return g;
}
/** Valeur affichée d'une compétence (nom). */
const skillName = k => k === "tools" ? "Outils de voleur" : (SKILLS.find(s => s[0] === k) || [k, k])[1];

export { RACES, BGS, BG_CUSTOM, TOOL_LISTS, LANGS, PACKS, CLASS_START, STD, PB_COST, PB_BUDGET, pbSpent, roll4d6, baseScores, subOf, raceAsi, raceGives, raceMissing,
  bgOf, bgSkills, bgTools, pickList, startItems, build, hitDie, mod, skillName };
