// Dons du Manuel des joueurs 2014 : catalogue (data/feats.json, texte d'AideDD) et effets pris en compte par l'atelier.
// Un don est relié à un trait par trait.feat ; trait.ch garde le choix fait en prenant le don (caractéristique,
// compétences, langues) et trait.ap ce que l'atelier a ajouté à la fiche (retiré avec le don).
//
// Effets (EFFECTS[id]) :
//   pill       : effet en quelques mots (liste des dons) ; calc : l'atelier l'applique (sinon : rappel)
//   abil       : caractéristiques possibles pour le +1 (« any » : au choix) ; save : maîtrise du JdS de la caractéristique choisie
//   skills / langs : nombre de compétences / langues à choisir ; hpLv : PV par niveau (Robuste)
//   init, speed, passive : bonus d'initiative, de vitesse (m), de Perception passive
//   armor      : maîtrises d'armure gagnées ; dexMax : plafond de DEX en armure intermédiaire ; dualAC : +1 CA à deux armes
//   unarmed    : dé des attaques à mains nues ; opt : option d'attaque à cocher (S.opt[id]) ; note : rappel sous les attaques
//   pre        : condition { abil: {dex: 13} } (toutes), { any: {int: 13, wis: 13} } (l'une), { spell: true }, { armor: "medium" }
import { C } from "../classes/index.js";
import { S } from "../core/state.js";
import { FEAT_LIST } from "../data.js";

const EFFECTS = {
  "actor": { abil: ["cha"], pill: "+1 CHA · imitation", calc: true },
  "alert": { init: 5, pill: "+5 initiative", calc: true },
  "athlete": { abil: ["str", "dex"], pill: "+1 FOR ou DEX · escalade, saut", calc: true },
  "charger": { pill: "attaque après Foncer, +5 dégâts" },
  "crossbow-expert": { pill: "pas de chargement, arbalète de poing en action bonus", note: "<b>Maître-arbalétrier</b> : pas de désavantage au contact pour tirer ; arbalète de poing en action bonus après une attaque à une main." },
  "defensive-duelist": { pre: { abil: { dex: 13 } }, pill: "réaction : + maîtrise à la CA" },
  "dual-wielder": { dualAC: true, pill: "+1 CA à deux armes, armes non légères", calc: true },
  "dungeon-delver": { pill: "avantage contre les pièges" },
  "durable": { abil: ["con"], pill: "+1 CON · dés de vie", calc: true },
  "elemental-adept": { pre: { spell: true }, pill: "ignore une résistance", again: true },
  "grappler": { pre: { abil: { str: 13 } }, pill: "avantage contre la cible agrippée" },
  "gwm": { pill: "−5 / +10, attaque bonus", calc: true, aka: ["Maître d'armes lourdes"],
    opt: { label: "Maître des armes à deux mains −5 / +10", test: (w, ab, prof) => w.heavy && w.rng === "melee" && prof, hit: -5, dmg: 10, pill: "−5 / +10" },
    note: "<b>Maître des armes à deux mains</b> : après un critique au corps à corps ou une créature réduite à 0 PV, attaque au corps à corps en action bonus." },
  "healer": { pill: "trousse de soins : 1d6 + 4 PV" },
  "heavily-armored": { pre: { armor: "medium" }, abil: ["str"], armor: ["heavy"], pill: "+1 FOR · armures lourdes", calc: true },
  "heavy-armor-master": { pre: { armor: "heavy" }, abil: ["str"], pill: "+1 FOR · −3 dégâts en armure lourde", calc: true },
  "inspiring-leader": { pre: { abil: { cha: 13 } }, pill: "PV temporaires au groupe" },
  "keen-mind": { abil: ["int"], pill: "+1 INT · mémoire, orientation", calc: true },
  "lightly-armored": { abil: ["str", "dex"], armor: ["light"], pill: "+1 FOR ou DEX · armures légères", calc: true },
  "linguist": { abil: ["int"], langs: 3, pill: "+1 INT · 3 langues", calc: true },
  "lucky": { pill: "3 points de chance" },
  "mage-slayer": { pill: "contre les lanceurs de sorts au contact" },
  "magic-initiate": { pill: "2 sorts mineurs et 1 sort de niveau 1" },
  "martial-adept": { pill: "2 manœuvres, 1 dé de supériorité" },
  "medium-armor-master": { pre: { armor: "medium" }, dexMax: 3, pill: "DEX +3 en armure intermédiaire", calc: true },
  "mobile": { speed: 3, pill: "+3 m de vitesse", calc: true },
  "moderately-armored": { pre: { armor: "light" }, abil: ["str", "dex"], armor: ["medium", "shield"], pill: "+1 FOR ou DEX · armures intermédiaires, bouclier", calc: true },
  "mounted-combatant": { pill: "avantage en selle" },
  "observant": { abil: ["int", "wis"], passive: 5, pill: "+1 INT ou SAG · +5 passif", calc: true },
  "polearm-master": { pill: "attaque bonus avec le talon (1d4)", calc: true },
  "resilient": { abil: "any", save: true, pill: "+1 carac. · JdS maîtrisé", calc: true },
  "ritual-caster": { pre: { any: { int: 13, wis: 13 } }, pill: "livre de rituels" },
  "savage-attacker": { pill: "relance les dégâts" },
  "sentinel": { pill: "attaques d'opportunité renforcées" },
  "sharpshooter": { pill: "−5 / +10, pas de désavantage à longue portée", calc: true,
    opt: { label: "Tireur d'élite −5 / +10", test: (w, ab, prof) => w.rng === "ranged" && prof, hit: -5, dmg: 10, pill: "TE −5 / +10" },
    note: "<b>Tireur d'élite</b> : pas de désavantage à longue portée, abris partiels et importants ignorés." },
  "shield-master": { pill: "bousculade au bouclier, JdS DEX" },
  "skilled": { skills: 3, pill: "3 compétences", calc: true },
  "skulker": { pre: { abil: { dex: 13 } }, pill: "se cacher dans la pénombre" },
  "spell-sniper": { pre: { spell: true }, pill: "portée doublée, 1 sort mineur" },
  "tavern-brawler": { abil: ["str", "con"], unarmed: "1d4", pill: "+1 FOR ou CON · mains nues 1d4", calc: true },
  "tough": { hpLv: 2, pill: "+2 PV par niveau", calc: true },
  "war-caster": { pre: { spell: true }, pill: "avantage en concentration" },
  "weapon-master": { abil: ["str", "dex"], pill: "+1 FOR ou DEX · 4 armes maîtrisées", calc: true },
};
/** Catalogue : texte du Manuel + effets, par identifiant. */
const FEATS = Object.fromEntries(FEAT_LIST.map(f => [f.id, { ...f, ...(EFFECTS[f.id] || { pill: "" }) }]));
const ABN = { str: "FOR", dex: "DEX", con: "CON", int: "INT", wis: "SAG", cha: "CHA" };
const ARMOR_N = { light: "légères", medium: "intermédiaires", heavy: "lourdes", shield: "boucliers" };

/** Don du catalogue dont le nom correspond exactement (casse et accents ignorés), alias compris. */
const simple = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, "'").trim().toLowerCase();
const featByName = n => Object.values(FEATS).find(f => [f.n, ...(f.aka || [])].some(x => simple(x) === simple(n)));

/** Dons du personnage reliés au catalogue, avec le trait qui les porte. */
const featTraits = g => (g.traits || []).filter(t => FEATS[t.feat]);
const featsOf = g => featTraits(g).map(t => t.feat);
const hasFeat = (g, id) => featsOf(g).includes(id);
const sum = (g, k) => featsOf(g).reduce((t, id) => t + (FEATS[id][k] || 0), 0);
/** Bonus d'initiative (Vigilant), de vitesse (Mobile), de Perception passive (Observateur). */
const featInit = g => sum(g, "init");
const featSpeed = g => sum(g, "speed");
const featPassive = g => sum(g, "passive");
/** JdS maîtrisés par un don (Résilient). */
const featSaves = g => featTraits(g).filter(t => FEATS[t.feat].save && t.ch && t.ch.abil).map(t => t.ch.abil);
/** Maîtrises d'armure données par les dons. */
const featArmor = g => featsOf(g).flatMap(id => FEATS[id].armor || []);
/** Dé des attaques à mains nues (Bagarreur de tavernes), ou null. */
const featUnarmed = g => (featsOf(g).map(id => FEATS[id].unarmed).find(Boolean)) || null;
/** PV gagnés par niveau grâce aux dons (Robuste). */
const featHpLv = g => sum(g, "hpLv");
/** Options d'attaque des dons : modificateurs pour une arme, selon les cases cochées. */
function featAttack(g, w, ab, prof) {
  const x = { hit: 0, dmg: 0, pills: [] };
  for (const id of featsOf(g)) { const o = FEATS[id].opt; if (o && S.opt && S.opt[id] && o.test(w, ab, prof)) { x.hit += o.hit; x.dmg += o.dmg; x.pills.push(o.pill); } }
  return x;
}

/** Condition du don : null si remplie, sinon la raison (« DEX 13 requise »). armorProf(cat) : maîtrise actuelle. */
function featBlock(g, id, armorProf) {
  const p = FEATS[id].pre; if (!p) return null;
  if (p.abil) { const k = Object.keys(p.abil).find(k => g.abil[k] < p.abil[k]); if (k) return `${ABN[k]} ${p.abil[k]} requise (tu as ${g.abil[k]})`; }
  if (p.any && !Object.entries(p.any).some(([k, v]) => g.abil[k] >= v)) return `${Object.entries(p.any).map(([k, v]) => `${ABN[k]} ${v}`).join(" ou ")} requise`;
  if (p.spell && C(g).noSpells) return "il faut pouvoir lancer au moins un sort";
  if (p.armor && !armorProf(p.armor)) return `maîtrise des armures ${ARMOR_N[p.armor]} requise`;
  return null;
}
/** Le don peut-il être pris (pas déjà pris, sauf Adepte élémentaire) ? */
const featTaken = (g, id) => hasFeat(g, id) && !FEATS[id].again;
/** Le choix est-il complet ? (caractéristique, compétences, langues) */
function featChoiceOk(id, ch = {}) {
  const f = FEATS[id];
  if (f.abil && (f.abil === "any" || f.abil.length > 1) && !ch.abil) return false;
  if (f.skills && (ch.skills || []).length !== f.skills) return false;
  if (f.langs && (ch.langs || []).filter(Boolean).length !== f.langs) return false;
  return true;
}
/** Caractéristique augmentée de 1 par le don (choisie, ou imposée), ou null. */
const featAbil = (id, ch = {}) => { const a = FEATS[id].abil; return !a ? null : a !== "any" && a.length === 1 ? a[0] : ch.abil || null; };

/**
 * Ajoute le don à la fiche : trait (texte du Manuel), +1 à la caractéristique, compétences, langues, PV (Robuste).
 * ap garde ce qui a été ajouté, pour le retirer avec le don. Renvoie le trait.
 */
function featApply(g, id, ch = {}, level = g.level) {
  const f = FEATS[id], ap = {}, k = featAbil(id, ch);
  if (k && g.abil[k] < 20) { g.abil[k] += 1; ap.abil = k; }
  if (f.skills) { ap.skills = (ch.skills || []).filter(s => !g.skills[s]); ap.skills.forEach(s => { g.skills[s] = 1; }); }
  if (f.langs) { ap.langs = (ch.langs || []).map(l => l.trim()).filter(l => l && !g.langs.includes(l)); g.langs.push(...ap.langs); }
  if (f.hpLv && g.hpMax != null) { ap.hp = f.hpLv * level; g.hpMax += ap.hp; if (g.hp != null) g.hp += ap.hp; }
  const t = { n: f.n, o: "don", d: f.d.join("\n"), feat: id, ...(Object.keys(ch).length ? { ch } : {}), ap };
  g.traits.push(t);
  return t;
}
/** Retire ce que le don avait ajouté à la fiche (dons ajoutés par l'atelier seulement). */
function featUnapply(g, t) {
  const ap = t.ap; if (!ap) return;
  if (ap.abil) g.abil[ap.abil] = Math.max(1, g.abil[ap.abil] - 1);
  (ap.skills || []).forEach(s => { if (g.skills[s] === 1) delete g.skills[s]; });
  if (ap.langs) g.langs = g.langs.filter(l => !ap.langs.includes(l));
  if (ap.hp && g.hpMax != null) { g.hpMax = Math.max(1, g.hpMax - ap.hp); if (g.hp != null) g.hp = Math.min(g.hp, g.hpMax); }
}

export { FEATS, ABN, featByName, featTraits, featsOf, hasFeat, featInit, featSpeed, featPassive, featSaves, featArmor, featUnarmed, featHpLv, featAttack,
  featBlock, featTaken, featChoiceOk, featAbil, featApply, featUnapply };
