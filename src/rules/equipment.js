// Armes et armures (Manuel des joueurs 2014, ch. 5) : maîtrises, classe d'armure, attaques. Calculs purs.
// La classe déclare weaponProf (catégories « simple », « martial » ou identifiants d'armes), armorProf (« light »,
// « medium », « heavy », « shield »), noMetal (druide) ; crochets acBase(g, bouclier) (sans armure), acBonus(g, armure),
// attackMods(g, arme) et extraAttacks(g, liste).
import { C } from "../classes/index.js";
import { GEAR } from "../data.js";
import { R } from "./common.js";

const gearOf = x => x && x.ref ? GEAR[x.ref] : null;
const equipped = (g, kind) => g.items.filter(x => x.eq && gearOf(x) && gearOf(x).kind === kind).map(x => ({ item: x, gear: gearOf(x) }));
const weaponProf = (g, w) => (C(g).weaponProf || []).some(p => p === w.cat || p === w.id);
const armorProf = (g, a) => (C(g).armorProf || []).includes(a.cat);

/**
 * Classe d'armure calculée : armure portée (base + DEX, plafonnée en intermédiaire, aucune en lourde), sinon 10 + DEX ;
 * bouclier ; bonus de classe. Renvoie { total, parts: [[libellé, valeur]], warn: [textes], armor, shield }.
 */
function acCalc(g) {
  const dex = R.ab(g, "dex"), worn = equipped(g, "armor");
  const armor = (worn.find(x => x.gear.cat !== "shield") || {}).gear, shield = (worn.find(x => x.gear.cat === "shield") || {}).gear;
  const parts = [], warn = [];
  if (armor) {
    const d = !armor.dex ? 0 : armor.dexMax != null ? Math.min(dex, armor.dexMax) : dex;
    parts.push([`${armor.n} (${{ light: "légère", medium: "intermédiaire", heavy: "lourde" }[armor.cat]})`, armor.ac]);
    parts.push([armor.dex ? `DEX${armor.dexMax != null && dex > armor.dexMax ? ` (plafonnée à +${armor.dexMax})` : ""}` : "DEX (aucune en armure lourde)", armor.dex ? d : null]);
    if (armor.stealth) warn.push(`${armor.n} : <b>désavantage en Discrétion</b>.`);
    if (armor.str && g.abil.str < armor.str) warn.push(`${armor.n} : Force ${armor.str} requise (tu as ${g.abil.str}) : <b>−3 m de vitesse</b>.`);
  } else if (C(g).acBase) C(g).acBase(g, !!shield).forEach(p => parts.push(p)); // ex. barbare : Défense sans armure
  else parts.push(["Sans armure : 10 + DEX", 10 + dex]);
  if (shield) parts.push(["Bouclier", shield.ac]);
  for (const [l, n] of (C(g).acBonus ? C(g).acBonus(g, armor) : [])) parts.push([l, n]);
  [armor, shield].filter(Boolean).forEach(a => {
    if (!armorProf(g, a)) warn.push(`${a.n} : <b>non maîtrisé${a.cat === "shield" ? "" : "e"}</b> par ta classe : désavantage aux jets de FOR et DEX (caractéristique, sauvegarde, attaque), et pas de sorts.`);
    if (C(g).noMetal && a.metal) warn.push(`${a.n} : armure métallique. Les druides refusent de porter du métal (armure et bouclier) ; peaux, cuir, cuir clouté ou matelassée conviennent.`);
  });
  return { total: parts.reduce((t, [, n]) => t + (n || 0), 0), parts, warn, armor, shield };
}
/** CA affichée : calculée ou saisie (acMode). Sans choix : la saisie si elle existe, sinon le calcul dès qu'une armure ou un bouclier du Manuel est équipé (sinon : à saisir). */
const acMode = g => g.acMode || (g.ac == null && (equipped(g, "armor").length || C(g).acBase) ? "calc" : "manual"); // classe à Défense sans armure : calcul par défaut
const acOf = g => acMode(g) === "calc" ? acCalc(g).total : g.ac;

/**
 * Attaque avec une arme : caractéristique (finesse : la meilleure de FOR et DEX ; distance : DEX ; sinon FOR),
 * maîtrise si la classe maîtrise l'arme, bonus de classe (attackMods). Renvoie { hit, ab, dmg (texte), pills, notes }.
 */
function attackOf(g, w, off = false) { // off : main secondaire (pas de modificateur positif aux dégâts)
  const str = R.ab(g, "str"), dex = R.ab(g, "dex");
  const ab = w.finesse ? (dex > str ? "dex" : "str") : w.rng === "ranged" ? "dex" : "str", mod = ab === "dex" ? dex : str;
  const prof = weaponProf(g, w) ? R.prof(g.level) : 0, x = C(g).attackMods ? C(g).attackMods(g, w, ab) : {};
  const hit = mod + prof + (x.hit || 0), dmod = (off ? Math.min(0, mod) : mod) + (x.dmg || 0), plus = n => n ? ` ${n > 0 ? "+" : "−"} ${Math.abs(n)}` : "";
  const pills = [];
  if (w.vers) pills.push(`à deux mains : ${w.vers}${plus(mod + (x.dmg2 != null ? x.dmg2 : x.dmg || 0))}`);
  if (w.reach) pills.push("allonge 3 m");
  if (w.thrown && w.rng === "melee") pills.push(`lancer ${w.range}`);
  if (w.ammo) pills.push(`portée ${w.range}${w.loading ? " · chargement" : ""}`);
  else if (w.thrown && w.rng === "ranged") pills.push(`lancer ${w.range}`);
  if (w.two) pills.push("à deux mains"); if (w.heavy) pills.push("lourde"); if (w.light) pills.push("légère");
  (x.pills || []).forEach(p => pills.push(p));
  return { hit, ab, melee: w.rng === "melee", prof: !!prof, dmg: w.dmg ? `${w.dmg}${plus(dmod)} ${w.dt}` : "aucun dégât", pills, notes: [w.special, ...(x.notes || [])].filter(Boolean) };
}
/** Attaques du personnage : armes équipées du catalogue, puis mains nues (1 + FOR, maîtrisée par tous). */
function attacks(g) {
  const list = equipped(g, "weapon").map(({ item, gear }) => { const a = attackOf(g, gear); return { n: item.n, q: item.q, ...a, notes: [item.note, ...a.notes].filter(Boolean) }; }); // la note de l'objet (ex. +1d4 nécrotique) suit l'attaque
  const str = R.ab(g, "str");
  // Combat à deux armes : deux armes légères de corps à corps équipées (deux objets, ou un objet en 2 exemplaires),
  // aucune arme à deux mains : attaque de la main secondaire en action bonus, sans modificateur positif aux dégâts.
  const light = equipped(g, "weapon").filter(({ gear }) => gear.light && gear.rng === "melee");
  if (light.reduce((n, { item }) => n + Math.max(1, item.q), 0) >= 2 && !equipped(g, "weapon").some(({ gear }) => gear.two)) {
    const { item, gear } = light.length > 1 ? light[1] : light[0], a = attackOf(g, gear, true);
    list.splice(list.findIndex(x => x.n === item.n) + 1, 0, { ...a, n: `${item.n} (main secondaire)`, q: 1, pills: ["action bonus", ...a.pills.filter(p => !p.startsWith("lancer") && p !== "légère")], offhand: true });
  }
  if (C(g).extraAttacks) C(g).extraAttacks(g, list); // ex. Frénésie du berserker
  const x = C(g).attackMods ? C(g).attackMods(g, { id: "unarmed", rng: "melee", cat: "simple" }, "str") : {}; // attaque d'arme au corps à corps (Rage…)
  list.push({ n: "Mains nues", q: 1, hit: str + R.prof(g.level) + (x.hit || 0), ab: "str", melee: true, prof: true, dmg: `${Math.max(1, 1 + str + (x.dmg || 0))} contondant`, pills: x.pills || [], notes: [] });
  return list;
}

export { gearOf, weaponProf, armorProf, acCalc, acMode, acOf, attackOf, attacks };
