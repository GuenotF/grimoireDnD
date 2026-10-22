// Bourse : pièces du Manuel des joueurs et dépenses avec monnaie. Calculs purs.

/** Pièces, de la plus précieuse à la moins précieuse : [code, nom, valeur en pc]. */
const COINS = [["pp", "platine", 1000], ["po", "or", 100], ["pe", "électrum", 50], ["pa", "argent", 10], ["pc", "cuivre", 1]];
const VAL = Object.fromEntries(COINS.map(([k, , v]) => [k, v]));
const blankPurse = () => Object.fromEntries(COINS.map(([k]) => [k, 0]));
const purseValue = m => COINS.reduce((t, [k, , v]) => t + (m[k] || 0) * v, 0);
/** Résumé : « 47 po · 12 pa · 30 pc » (pièces non nulles), ou « bourse vide ». */
const purseText = m => COINS.filter(([k]) => m[k]).map(([k]) => `${m[k]} ${k}`).join(" · ") || "bourse vide";

/**
 * Dépense n pièces de type coin. Si elles manquent : on casse d'abord les pièces plus précieuses
 * (la plus petite d'abord, 1 po → 10 pa), puis on paie avec les pièces moins précieuses, la monnaie rendue en pc.
 * Renvoie { ok, change: [textes des échanges] } ; ne modifie rien si la bourse ne suffit pas.
 */
function spend(m, coin, n) {
  if (purseValue(m) < n * VAL[coin]) return { ok: false, change: [] };
  const change = [];
  const higher = COINS.filter(([k]) => VAL[k] > VAL[coin]).reverse(); // du plus petit au plus grand
  while ((m[coin] || 0) < n) {
    const h = higher.find(([k]) => m[k] > 0); if (!h) break;
    const r = VAL[h[0]] / VAL[coin]; m[h[0]]--; m[coin] = (m[coin] || 0) + r; change.push(`1 ${h[0]} → ${r} ${coin}`);
  }
  const take = Math.min(m[coin] || 0, n); m[coin] -= take;
  let due = (n - take) * VAL[coin]; // reste à payer en valeur pc, avec les pièces moins précieuses
  for (const [k, , v] of COINS.filter(([k]) => VAL[k] < VAL[coin])) {
    if (due <= 0) break;
    const used = Math.min(m[k], Math.ceil(due / v)); if (!used) continue;
    m[k] -= used; due -= used * v; change.push(`${used} ${k} donnés`);
  }
  if (due < 0) { m.pc += -due; change.push(`${-due} pc rendus`); }
  return { ok: true, change };
}

export { COINS, VAL, blankPurse, purseValue, purseText, spend };
