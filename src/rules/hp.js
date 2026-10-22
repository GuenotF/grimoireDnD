// Points de vie : dégâts, soins, PV temporaires, jets contre la mort, dés de vie, repos long (Manuel des joueurs, chap. 9).
// Calculs purs : chaque fonction modifie le personnage reçu et renvoie ce qui s'est passé, pour le message affiché.
import { R } from "./common.js";

/** PV actuels : null veut dire « au maximum » (le maximum peut changer sans fausser les PV). */
const hpCur = g => g.hp == null ? (g.hpMax || 0) : Math.min(g.hp, g.hpMax || g.hp);
const isDown = g => g.hpMax != null && hpCur(g) === 0;
const isDead = g => (g.death || {}).f >= 3;
const freshDeath = () => ({ s: 0, f: 0, stable: false });

/**
 * Dégâts : les PV temporaires absorbent d'abord. À 0 PV : inconscient, jets contre la mort.
 * Mort instantanée si les dégâts restants après 0 atteignent les PV maximum. Dégâts à 0 PV : un échec (deux sur un critique, à cocher).
 */
function damage(g, n) {
  const out = { n, temp: 0, lost: 0, down: false, dead: false, fail: false, massive: false };
  if (g.hpMax == null || n < 1) return out;
  out.temp = Math.min(g.hpTemp || 0, n); g.hpTemp = (g.hpTemp || 0) - out.temp;
  let r = n - out.temp; if (!r) return out;
  const cur = hpCur(g);
  if (cur === 0) {
    g.death.stable = false;
    if (r >= g.hpMax) { g.death.f = 3; out.dead = out.massive = true; } else { g.death.f = Math.min(3, g.death.f + 1); out.fail = true; out.dead = g.death.f >= 3; }
    return out;
  }
  out.lost = Math.min(cur, r); g.hp = cur - out.lost; r -= out.lost;
  if (g.hp === 0) { out.down = true; g.death = freshDeath(); if (r >= g.hpMax) { g.death.f = 3; out.dead = out.massive = true; } }
  return out;
}
/** Soins : sans effet sur un mort ; à 0 PV, un soin relève le personnage et efface les jets contre la mort. */
function heal(g, n) {
  if (g.hpMax == null || n < 1 || isDead(g)) return 0;
  const cur = hpCur(g), hp = Math.min(g.hpMax, cur + n);
  g.hp = hp === g.hpMax ? null : hp; if (cur === 0) g.death = freshDeath();
  return hp - cur;
}
/** PV temporaires : ils ne se cumulent pas, on garde le plus élevé. */
function setTemp(g, n) { const before = g.hpTemp || 0; g.hpTemp = Math.max(before, n); return g.hpTemp > before; }
/** Jet de sauvegarde contre la mort : "s" réussite, "f" échec, "20" (1 PV), "stab" (stabilisé par un allié ou un sort). */
function deathSave(g, k) {
  const d = g.death;
  if (k === "20") { g.hp = 1; g.death = freshDeath(); return "up"; }
  if (k === "stab") { d.stable = true; return "stable"; }
  if (k === "s") { d.s = Math.min(3, d.s + 1); if (d.s >= 3) { d.stable = true; return "stable"; } return "s"; }
  d.f = Math.min(3, d.f + 1); return d.f >= 3 ? "dead" : "f";
}
/** Dés de vie disponibles (un par niveau) ; dépenser un dé : résultat du dé + mod. de CON (au moins 0). */
const hdLeft = g => Math.max(0, g.level - (g.hdU || 0));
function spendHitDie(g, roll) {
  if (!hdLeft(g) || g.hpMax == null || isDead(g)) return null;
  g.hdU = (g.hdU || 0) + 1;
  return heal(g, Math.max(0, roll + R.ab(g, "con")));
}
/** Repos long : PV au maximum, PV temporaires perdus, jets contre la mort effacés, moitié des dés de vie récupérés (au moins 1). */
function longRestHP(g) {
  if (isDead(g)) return;
  g.hp = null; g.hpTemp = 0; g.death = freshDeath(); if (g.exh) g.exh--; // un niveau d'épuisement en moins (avec nourriture et eau)
  g.hdU = Math.max(0, (g.hdU || 0) - Math.max(1, Math.floor(g.level / 2)));
}

export { hpCur, isDown, isDead, freshDeath, damage, heal, setTemp, deathSave, hdLeft, spendHitDie, longRestHP };
