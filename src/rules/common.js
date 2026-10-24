// Règles communes à toutes les classes : maîtrise, modificateurs, emplacements, préparation, sorts lançables.
import { C, alwaysPrepared } from "../classes/index.js";
import { BY_ID, SPELLS } from "../data.js";

const inClass = (g, s) => (s.cl || ["magicien"]).includes(g.cls || "magicien");
const classSpells = g => SPELLS.filter(s => inClass(g, s));
// Sorts lançables en jeu : préparés (+ sorts toujours préparés, comme ceux du serment du paladin)
function castable(g) {
  if (C(g).book) { const pr = new Set(g.prepared); return g.spells.map(x => BY_ID[x.id]).filter(s => s && pr.has(s.id)); }
  const ids = [...new Set([...alwaysPrepared(g), ...g.prepared])];
  return ids.map(id => BY_ID[id]).filter(s => s && s.l <= R.maxLevel(g));
}
const R = {
  prof: lv => 2 + Math.floor((lv - 1) / 4),
  mod: sc => Math.floor((sc - 10) / 2),
  ab: (g, k) => R.mod(+(g.abil || {})[k] || 10),  // modificateur d'une caractéristique (str, dex…)
  am: g => R.ab(g, C(g).ab),                       // modificateur de la caractéristique d'incantation
  // Emplacements du niveau ; au niveau actuel (lv omis), + ceux créés par la classe (ensorceleur : Source de magie, perdus au repos long)
  slots: (g, lv) => { const b = C(g).slots[lv == null ? g.level : lv] || []; if (lv != null || !C(g).extraSlots) return b; const x = C(g).extraSlots(g); return b.map((n, i) => n + (x[i + 1] || 0)); },
  maxLevel: (g, lv = g.level) => (C(g).slots[lv] || []).length,
  unlockAt: (g, sl) => { for (let lv = 1; lv <= 20; lv++) if ((C(g).slots[lv] || []).length >= sl) return lv; return 21; },
  cantrips: (g, lv = g.level) => C(g).cantrips(lv) + (C(g).cantripBonus ? C(g).cantripBonus({ ...g, level: lv }) : 0), // + sort mineur de sous-classe
  prepMax: g => C(g).known ? C(g).known(g.level) : C(g).prep(g, R.am(g)), // sorts connus (rôdeur…) : nombre fixe par niveau, rangés dans g.prepared
  expected: lv => 6 + 2 * (lv - 1),
  arcane: lv => Math.ceil(lv / 2),
  savant: (g, s) => g.level >= 2 && s.s === g.school,
  copy: (g, s) => { const k = R.savant(g, s) ? 0.5 : 1; return { h: 2 * s.l * k, po: 50 * s.l * k }; },
};

export { inClass, classSpells, castable, R };
