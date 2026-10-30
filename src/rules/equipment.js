// Armes et armures (Manuel des joueurs 2014, ch. 5) : maîtrises, classe d'armure, attaques. Calculs purs.
// La classe déclare weaponProf (catégories « simple », « martial » ou identifiants d'armes), armorProf (« light »,
// « medium », « heavy », « shield »), noMetal (druide) ; crochets acBase(g, bouclier) (sans armure), acBonus(g, armure),
// attackMods(g, arme) et extraAttacks(g, liste).
import { C } from "../classes/index.js";
import { GEAR } from "../data.js";
import { R } from "./common.js";
import { FEATS, featArmor, featAttack, featUnarmed, hasFeat } from "./feats.js";
import { usable } from "./magic.js";

const gearOf = x => x && x.ref ? GEAR[x.ref] : null;
const equipped = (g, kind) => g.items.filter(x => x.eq && gearOf(x) && gearOf(x).kind === kind).map(x => ({ item: x, gear: gearOf(x) }));
const listOf = (x, g) => typeof x === "function" ? x(g) : x || []; // maîtrises fixes, ou selon le personnage (domaine du clerc)
const weaponProf = (g, w) => listOf(C(g).weaponProf, g).some(p => p === w.cat || p === w.id) || ((g.race || {}).weapons || []).includes(w.id); // classe ou race (armes naines, elfiques…)
const armorProf = (g, a) => listOf(C(g).armorProf, g).includes(a.cat) || featArmor(g).includes(a.cat) || ((g.race || {}).armor || []).includes(a.cat); // classe, don ou race

/**
 * Classe d'armure calculée : armure portée (base + DEX, plafonnée en intermédiaire, aucune en lourde), sinon 10 + DEX ;
 * bouclier ; bonus de classe. Renvoie { total, parts: [[libellé, valeur]], warn: [textes], armor, shield }.
 */
function acCalc(g) {
  const dex = R.ab(g, "dex"), worn = equipped(g, "armor");
  const aw = worn.find(x => x.gear.cat !== "shield") || {}, sw = worn.find(x => x.gear.cat === "shield") || {};
  const armor = aw.gear, shield = sw.gear, mb = it => (it && usable(it) ? it.bonus || 0 : 0) + infB(g, it).ac; // bonus magique (+1…) de l'objet, imprégnation comprise
  const parts = [], warn = [];
  if (armor) {
    const dexMax = armor.dexMax != null && armor.cat === "medium" && hasFeat(g, "medium-armor-master") ? FEATS["medium-armor-master"].dexMax : armor.dexMax; // Maître des armures intermédiaires
    const d = !armor.dex ? 0 : dexMax != null ? Math.min(dex, dexMax) : dex;
    parts.push([`${armor.n}${mb(aw.item) ? ` +${mb(aw.item)}` : ""} (${{ light: "légère", medium: "intermédiaire", heavy: "lourde" }[armor.cat]})`, armor.ac + mb(aw.item)]);
    parts.push([armor.dex ? `DEX${dexMax != null && dex > dexMax ? ` (plafonnée à +${dexMax})` : ""}` : "DEX (aucune en armure lourde)", armor.dex ? d : null]);
    if (armor.stealth && !(armor.cat === "medium" && hasFeat(g, "medium-armor-master"))) warn.push(`${armor.n} : <b>désavantage en Discrétion</b>.`);
    if (armor.str && g.abil.str < armor.str) warn.push(`${armor.n} : Force ${armor.str} requise (tu as ${g.abil.str}) : <b>−3 m de vitesse</b>.`);
  } else {
    // Sans armure : la meilleure base entre celle de la classe (Défense sans armure…), 10 + DEX et Armure de mage en cours (13 + DEX) ; ces bases ne se cumulent pas
    const own = C(g).acBase ? C(g).acBase(g, !!shield) : [];
    const bases = [own.length ? own : [["Sans armure : 10 + DEX", 10 + dex]]];
    if ((g.effects || []).some(e => e.id === "mage-armor")) bases.push([["Armure de mage (sort en cours) : 13 + DEX", 13 + dex]]);
    const sum = b => b.reduce((t, [, n]) => t + (n || 0), 0);
    bases.reduce((a, b) => sum(b) > sum(a) ? b : a).forEach(p => parts.push(p));
  }
  if (shield) parts.push([`Bouclier${mb(sw.item) ? ` +${mb(sw.item)}` : ""}`, shield.ac + mb(sw.item)]);
  for (const [l, n] of (C(g).acBonus ? C(g).acBonus(g, armor) : [])) parts.push([l, n]);
  if (hasFeat(g, "dual-wielder") && !shield && twoWeapons(g)) parts.push(["Combattant à deux armes", 1]);
  // Sorts en cours qui changent la CA (lancés sur soi) : bonus, puis plancher de Peau d'écorce
  const on = id => (g.effects || []).some(e => e.id === id);
  for (const [id, l, n] of [["shield-of-faith", "Bouclier de la foi (sort en cours)", 2], ["haste", "Hâte (sort en cours)", 2], ["shield", "Bouclier (sort, jusqu'au début de ton prochain tour)", 5]]) if (on(id)) parts.push([l, n]);
  const sub = parts.reduce((t, [, n]) => t + (n || 0), 0);
  if (on("barkskin") && sub < 16) parts.push(["Peau d'écorce (sort en cours) : CA 16 minimum", 16 - sub]);
  [armor, shield].filter(Boolean).forEach(a => {
    if (!armorProf(g, a)) warn.push(`${a.n} : <b>non maîtrisé${a.cat === "shield" ? "" : "e"}</b> par ta classe : désavantage aux jets de FOR et DEX (caractéristique, sauvegarde, attaque), et pas de sorts.`);
    if (C(g).noMetal && a.metal) warn.push(`${a.n} : armure métallique. Les druides refusent de porter du métal (armure et bouclier) ; peaux, cuir, cuir clouté ou matelassée conviennent.`);
  });
  return { total: parts.reduce((t, [, n]) => t + (n || 0), 0), parts, warn, armor, shield };
}
/** CA affichée : calculée ou saisie (acMode). Sans choix : la saisie si elle existe (anciennes fiches), sinon le calcul (10 + DEX sans armure). */
const acMode = g => g.acMode || (g.ac == null ? "calc" : "manual");
const acOf = g => acMode(g) === "calc" ? acCalc(g).total : g.ac;

/**
 * Attaque avec une arme : caractéristique (finesse : la meilleure de FOR et DEX ; distance : DEX ; sinon FOR),
 * maîtrise si la classe maîtrise l'arme, bonus de classe (attackMods). Renvoie { hit, ab, dmg (texte), pills, notes }.
 */
/** Imprégnation d'artificier portée par l'objet (C(g).itemMagic) : { atk, ac }. */
const infB = (g, it) => (it && it.inf && C(g).itemMagic && C(g).itemMagic(g, it)) || { atk: 0, ac: 0 };
function attackOf(g, w, off = false, item = null) { // off : main secondaire (pas de modificateur positif aux dégâts) ; item : objet porté (bonus magique)
  if (C(g).weaponAdjust) w = C(g).weaponAdjust(g, w); // ex. moine : arme de moine (DEX, dé d'arts martiaux)
  const str = R.ab(g, "str"), dex = R.ab(g, "dex");
  let ab = w.finesse ? (dex > str ? "dex" : "str") : w.rng === "ranged" ? "dex" : "str", mod = ab === "dex" ? dex : str;
  const ov = C(g).attackAb ? C(g).attackAb(g, w, item) : null; // ex. Apte au combat (forgeron de guerre) : Intelligence avec une arme magique
  if (ov && R.ab(g, ov) > mod) { ab = ov; mod = R.ab(g, ov); }
  const prof = weaponProf(g, w) ? R.prof(g.level) : 0, x = C(g).attackMods ? C(g).attackMods(g, w, ab, off) : {};
  const f = featAttack(g, w, ab, !!prof); // options des dons cochées (Maître d'armes lourdes…)
  const ib = infB(g, item), mg = (item && usable(item) ? item.bonus || 0 : 0) + ib.atk, xd = item && usable(item) && item.xdmg ? ` + ${item.xdmg}` : ""; // objet magique
  f.hit += mg; f.dmg += mg; if (mg) f.pills.unshift(`+${mg} magique`); if (ib.label && item.inf === "boomerang") f.pills.push("revient en main"); if (item && item.att && !item.attuned) f.pills.push("non harmonisée : pas d'effet magique");
  const hit = mod + prof + (x.hit || 0) + f.hit, dmod = (off && !x.offMod ? Math.min(0, mod) : mod) + (x.dmg || 0) + f.dmg, plus = n => n ? ` ${n > 0 ? "+" : "−"} ${Math.abs(n)}` : "";
  const pills = [];
  if (w.vers) pills.push(`à deux mains : ${w.vers}${plus(mod + (x.dmg2 != null ? x.dmg2 : x.dmg || 0))}`);
  if (w.reach) pills.push("allonge 3 m");
  if (w.thrown && w.rng === "melee") pills.push(`lancer ${w.range}`);
  if (w.ammo) pills.push(`portée ${w.range}${w.loading ? " · chargement" : ""}`);
  else if (w.thrown && w.rng === "ranged") pills.push(`lancer ${w.range}`);
  if (w.two) pills.push("à deux mains"); if (w.heavy) pills.push("lourde"); if (w.light) pills.push("légère");
  (x.pills || []).forEach(p => pills.push(p)); f.pills.forEach(p => pills.push(p));
  if ((g.effects || []).some(e => e.id === "hunters-mark")) pills.push("+1d6 Marque du chasseur"); // contre la cible marquée (rôdeur, paladin de la vengeance)
  if ((g.effects || []).some(e => e.id === "hex")) pills.push("+1d6 nécrotique Maléfice"); // contre la cible maudite (occultiste)
  return { hit, ab, melee: w.rng === "melee", prof: !!prof, dmg: w.dmg ? `${w.dmg}${plus(dmod)} ${w.dt}${xd}` : "aucun dégât", pills, notes: [w.special, ...(x.notes || [])].filter(Boolean) };
}
const POLE = ["glaive", "halberd", "quarterstaff", "spear"]; // Maître d'hast (la pique n'a pas de talon)
/** Deux armes de corps à corps tenues (deux objets, ou un objet en 2 exemplaires), aucune à deux mains. */
const twoWeapons = g => { const m = equipped(g, "weapon").filter(({ gear }) => gear.rng === "melee" && !gear.two); return (m.length >= 2 || (m.length === 1 && m[0].item.q >= 2)) && !equipped(g, "weapon").some(({ gear }) => gear.two); };
/** Attaques du personnage : armes équipées du catalogue, puis mains nues (1 + FOR, maîtrisée par tous). */
function attacks(g) {
  const list = equipped(g, "weapon").map(({ item, gear }) => { const a = attackOf(g, gear, false, item); return { n: item.n, q: item.q, ...a, notes: [item.note, ...a.notes].filter(Boolean) }; }); // la note de l'objet (ex. +1d4 nécrotique) suit l'attaque
  const str = R.ab(g, "str");
  // Combat à deux armes : deux armes légères de corps à corps équipées (deux objets, ou un objet en 2 exemplaires),
  // aucune arme à deux mains : attaque de la main secondaire en action bonus, sans modificateur positif aux dégâts.
  // Combattant à deux armes (don) : armes de corps à corps à une main, même non légères.
  const light = equipped(g, "weapon").filter(({ gear }) => gear.rng === "melee" && (gear.light || (hasFeat(g, "dual-wielder") && !gear.two)));
  if (light.reduce((n, { item }) => n + Math.max(1, item.q), 0) >= 2 && !equipped(g, "weapon").some(({ gear }) => gear.two)) {
    // main secondaire : l'arme cochée « main secondaire » (formulaire ✎), sinon la deuxième arme légère de l'inventaire
    const { item, gear } = light.find(x => x.item.oh) || (light.length > 1 ? light[1] : light[0]), a = attackOf(g, gear, true, item);
    list.splice(list.findIndex(x => x.n === item.n) + 1, 0, { ...a, n: `${item.n} (main secondaire)`, q: 1, pills: ["action bonus", ...a.pills.filter(p => !p.startsWith("lancer") && p !== "légère")], offhand: true });
  }
  // Maître d'hast : attaque en action bonus avec le talon de l'arme (1d4 contondant, même caractéristique)
  const pole = hasFeat(g, "polearm-master") && equipped(g, "weapon").find(({ gear }) => POLE.includes(gear.id));
  if (pole) {
    const a = attackOf(g, { ...pole.gear, dmg: "1d4", dt: "contondant", vers: null, reach: pole.gear.reach }, false, pole.item);
    list.splice(list.findIndex(x => x.n === pole.item.n) + 1, 0, { ...a, n: `${pole.item.n} (talon)`, q: 1, pills: ["action bonus", "Maître d'hast"], notes: [] });
  }
  if (C(g).extraAttacks) C(g).extraAttacks(g, list); // ex. Frénésie du berserker
  // Mains nues ; moine (C(g).unarmed) : dé d'arts martiaux, DEX si meilleure, attaque en action bonus
  const ma = C(g).unarmed ? C(g).unarmed(g) : null, dex = R.ab(g, "dex"), uab = ma && dex > str ? "dex" : "str", umod = uab === "dex" ? dex : str;
  const x = C(g).attackMods ? C(g).attackMods(g, { id: "unarmed", rng: "melee", cat: "simple" }, uab) : {}; // attaque d'arme au corps à corps (Rage…)
  const ud = (ma && ma.die) || featUnarmed(g), um = umod + (x.dmg || 0); // Bagarreur de tavernes : 1d4 + FOR
  const un = { n: "Mains nues", q: 1, hit: umod + R.prof(g.level) + (x.hit || 0), ab: uab, melee: true, prof: true, dmg: ud ? `${ud}${um ? ` ${um > 0 ? "+" : "−"} ${Math.abs(um)}` : ""} ${(ma && ma.dt) || "contondant"}` : `${Math.max(1, 1 + um)} contondant`, pills: [...((ma && ma.pills) || []), ...(x.pills || [])], notes: [] };
  list.push(un);
  if (ma && ma.bonus) list.push({ ...un, n: "Mains nues (action bonus)", pills: ["action bonus", "Arts martiaux", ...(x.pills || [])] });
  return list;
}

export { gearOf, weaponProf, armorProf, acCalc, acMode, acOf, attackOf, attacks, twoWeapons };
