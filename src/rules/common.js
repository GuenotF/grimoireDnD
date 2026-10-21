// Règles communes à toutes les classes : maîtrise, modificateurs, emplacements, préparation, sorts lançables.
import { oathSpells } from "../classes/paladin.js";
import { BY_ID, SPELLS } from "../data.js";
import { HALF, SLOTS } from "./tables.js";

// Classes : caractéristique d'incantation, table d'emplacements, préparation, sous-classe
const CLASSES = {
  magicien: { n: "Magicien", ab: "int", abN: "Intelligence", slots: SLOTS, top: 9, book: true,
    cantrips: lv => lv >= 10 ? 5 : lv >= 4 ? 4 : 3, prep: (g, m) => Math.max(1, m + g.level) },
  paladin: { n: "Paladin", ab: "cha", abN: "Charisme", slots: HALF, top: 5, book: false,
    cantrips: () => 0, prep: (g, m) => Math.max(1, m + Math.floor(g.level / 2)) },
  druide: { n: "Druide", ab: "wis", abN: "Sagesse", slots: SLOTS, top: 9, book: false,
    cantrips: lv => lv >= 10 ? 4 : lv >= 4 ? 3 : 2, prep: (g, m) => Math.max(1, m + g.level) },
};
const isPal = g => !!g && g.cls === "paladin", isDru = g => !!g && g.cls === "druide";
const C = g => CLASSES[g && g.cls] || CLASSES.magicien;
const isWiz = g => C(g) === CLASSES.magicien;
const inClass = (g, s) => (s.cl || ["magicien"]).includes(g.cls || "magicien");
const classSpells = g => SPELLS.filter(s => inClass(g, s));
// Sorts lançables en jeu : préparés (+ sorts de serment pour le paladin)
function castable(g) {
  if (isWiz(g)) { const pr = new Set(g.prepared); return g.spells.map(x => BY_ID[x.id]).filter(s => s && pr.has(s.id)); }
  const ids = [...new Set([...oathSpells(g), ...g.prepared])];
  return ids.map(id => BY_ID[id]).filter(s => s && s.l <= R.maxLevel(g));
}
const R = {
  prof: lv => 2 + Math.floor((lv - 1) / 4),
  mod: sc => Math.floor((sc - 10) / 2),
  am: g => R.mod(+g[C(g).ab] || 10), // modificateur de la caractéristique d'incantation
  slots: (g, lv = g.level) => C(g).slots[lv] || [],
  maxLevel: (g, lv = g.level) => (C(g).slots[lv] || []).length,
  unlockAt: (g, sl) => { for (let lv = 1; lv <= 20; lv++) if ((C(g).slots[lv] || []).length >= sl) return lv; return 21; },
  cantrips: (g, lv = g.level) => C(g).cantrips(lv),
  prepMax: g => C(g).prep(g, R.am(g)),
  expected: lv => 6 + 2 * (lv - 1),
  arcane: lv => Math.ceil(lv / 2),
  savant: (g, s) => g.level >= 2 && s.s === g.school,
  copy: (g, s) => { const k = R.savant(g, s) ? 0.5 : 1; return { h: 2 * s.l * k, po: 50 * s.l * k }; },
};

export { CLASSES, isPal, isDru, C, isWiz, inClass, classSpells, castable, R };
