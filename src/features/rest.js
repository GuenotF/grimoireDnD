// Repos court et repos long, communs aux onglets Personnage et Sorts.
// Repos court : un panneau qui regroupe les dés de vie et la récupération propre à la classe
// (Restauration arcanique du magicien via C(g).shortPanel, sinon la ressource C(g).shortRest : Conduit divin, Forme sauvage).
import { C } from "../classes/index.js";
import { onClick } from "../core/actions.js";
import { signed } from "../core/format.js";
import { G, S } from "../core/state.js";
import { mutate } from "../core/store.js";
import { render, toast } from "../core/ui.js";
import { hitDieSize } from "../rules/character.js";
import { R } from "../rules/common.js";
import { hdLeft, hpCur, isDown, longRestHP, spendHitDie } from "../rules/hp.js";

/** Boutons de repos ; C(g).restBar ajoute ce qui est propre à la classe (case Restauration arcanique…). */
function restBarHTML(g) {
  return `<div class="restbar"><button class="btn" data-a="short-open" aria-expanded="${S.shortOpen}">Repos court ${S.shortOpen ? "▴" : "▾"}</button><button class="btn" data-a="longrest">Repos long</button>${C(g).restBar ? C(g).restBar(g)
    : `<span class="muted">Repos court : dés de vie, ${C(g).shortRest.label}. Repos long : tout.</span>`}</div>${S.shortOpen ? shortRestHTML(g) : ""}`;
}

function diceHTML(g) {
  if (g.hpMax == null) return `<p>Saisis tes PV maximum (onglet Personnage, Gérer) pour dépenser des dés de vie.</p>`;
  const left = hdLeft(g), d = hitDieSize(g), full = hpCur(g) >= g.hpMax;
  let h = `<p><b>Dés de vie : ${left}/${g.level} d${d}</b> · PV ${hpCur(g)}/${g.hpMax}. Pour chaque dé : lance 1d${d}, tape le résultat ; ta CON (${signed(R.ab(g, "con"))}) s'ajoute.</p>`;
  if (isDown(g)) return h + `<p>À 0 PV, pas de repos : il faut d'abord être soigné ou stabilisé et revenu à 1 PV.</p>`;
  if (!left) return h + `<p>Plus de dé de vie : la moitié revient au repos long.</p>`;
  if (full) return h + `<p>Tes PV sont au maximum.</p>`;
  return h + `<div class="hpin"><input id="hd-n" type="number" inputmode="numeric" min="1" max="${d}" placeholder="1d${d}" aria-label="Résultat du dé de vie"><button class="btn cast-go sm" data-a="hp-hd">Dépenser 1 dé</button></div>`;
}
function shortRestHTML(g) {
  const sr = C(g).shortRest;
  let h = `<div class="short" id="short-panel"><div><h3>Repos court</h3>${diceHTML(g)}</div>`;
  if (C(g).shortPanel) return h + `<button class="btn ghost" data-a="short-close" style="justify-self:start">Fermer</button></div>` + C(g).shortPanel(g); // magicien : Restauration arcanique
  return h + `<p><b>${sr.label.charAt(0).toUpperCase() + sr.label.slice(1)}</b> : ${sr.done} en terminant le repos.</p>
  <div class="cast"><button class="btn cast-go" data-a="short-done">Terminer le repos court</button><button class="btn ghost" data-a="short-close">Fermer</button></div></div>`;
}

const snapHP = g => JSON.parse(JSON.stringify({ hp: g.hp, hdU: g.hdU }));
onClick("short-open", () => { S.shortOpen = !S.shortOpen; S.sr = {}; render(); });
onClick("short-close", () => { S.shortOpen = false; S.sr = {}; render(); });
onClick("short-done", () => {
  const g = G(); if (!g) return; const sr = C(g).shortRest, f = sr.field, prev = g[f]; S.shortOpen = false;
  mutate(g => { g[f] = 0; }); toast(`Repos court : ${sr.label} ${sr.done}`, () => { mutate(g => { g[f] = prev; }); return "Repos court annulé"; });
});
onClick("hp-hd", () => {
  const g = G(), el = document.getElementById("hd-n"), n = Math.floor(+(el && el.value) || 0); if (!g) return;
  if (n < 1) { if (el) el.focus(); return; }
  if (n > hitDieSize(g)) { toast(`Un d${hitDieSize(g)} donne au plus ${hitDieSize(g)} : tape le résultat du dé`); return; }
  const prev = snapHP(g); let got = null; mutate(g => { got = spendHitDie(g, n); });
  if (got != null) toast(`Dé de vie : ${n} ${signed(R.ab(g, "con"))} CON → <b>+${got} PV</b> · ${hpCur(G())}/${g.hpMax} · reste ${hdLeft(G())}`, () => { mutate(g => Object.assign(g, prev)); return "Dé de vie annulé"; });
  const nx = document.getElementById("hd-n"); if (nx) nx.focus({ preventScroll: true });
});
onClick("longrest", () => { S.concPanel = false; S.shortOpen = false; S.sr = {}; mutate(g => { g.used = {}; g.effects = []; if (C(g).longRest) C(g).longRest(g); g.extras.forEach(x => x.used = false); longRestHP(g); toast(`Repos long : ${g.hpMax != null ? "PV au maximum, " : ""}emplacements et capacités récupérés, sorts en cours terminés`); }); });

export { restBarHTML };
