// Repos court et repos long, communs aux onglets Personnage et Sorts.
// Repos court : un panneau qui regroupe les dés de vie et la récupération propre à la classe
// (ressource C(g).shortRest : Conduit divin, Forme sauvage… ; récupération d'emplacements C(g).recovery : Restauration arcanique, Récupération naturelle).
import { C } from "../classes/index.js";
import { onClick } from "../core/actions.js";
import { esc, signed } from "../core/format.js";
import { G, S } from "../core/state.js";
import { mutate } from "../core/store.js";
import { render, toast } from "../core/ui.js";
import { hitDieSize } from "../rules/character.js";
import { R } from "../rules/common.js";
import { hdLeft, hpCur, isDown, longRestHP, spendHitDie } from "../rules/hp.js";
import { FEATS, featPlay, featRecharge } from "../rules/feats.js";
import { innateRest } from "./innate.js";
import { recoveryHTML } from "./recovery.js";
import { rechargeItems } from "../rules/magic.js";

/** Ressource récupérée au repos court : objet, ou fonction du personnage (ex. Coup de chance du roublard au niveau 20). */
const SR = g => typeof C(g).shortRest === "function" ? C(g).shortRest(g) : C(g).shortRest;
/** Ressources dépensées qui ne reviennent pas au repos court (rappel dans le panneau et le message) : classe (C(g).longOnly) + emplacements de sorts. */
function longOnly(g) {
  const out = C(g).longOnly ? C(g).longOnly(g).filter(Boolean) : [];
  if (!(C(g).pact && C(g).pact(g)) && Object.values(g.used || {}).some(v => +v > 0)) out.push(`emplacements de sorts${C(g).recovery && C(g).recovery(g) ? " (sauf récupération ci-dessous)" : ""}`);
  return out;
}
/** Boutons de repos ; C(g).restBar ajoute ce qui est propre à la classe (case Restauration arcanique…). */
function restBarHTML(g) {
  return `<div class="restbar"><button class="btn" data-a="short-open" aria-expanded="${S.shortOpen}">Repos court ${S.shortOpen ? "▴" : "▾"}</button><button class="btn" data-a="longrest">Repos long</button>${C(g).restBar && C(g).restBar(g) != null ? C(g).restBar(g)
    : `<span class="muted">Repos court : dés de vie${SR(g) ? `, ${SR(g).label}` : ""}. Repos long : tout.</span>`}</div>${S.shortOpen ? shortRestHTML(g) : ""}`;
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
  const sr = SR(g);
  let h = `<div class="short" id="short-panel"><div><h3>Repos court</h3>${diceHTML(g)}</div>`;
  const items = g.items.filter(x => x.chMax && x.rec === "court" && x.chU); // objets magiques rechargés au repos court
  const feats = featPlay(g).filter(id => FEATS[id].res && FEATS[id].res.rest === "court" && (g.featU || {})[id]); // Adepte martial
  const lines = (sr ? `<p><b>${sr.label.charAt(0).toUpperCase() + sr.label.slice(1)}</b> : ${sr.done} en terminant le repos.</p>` : "") + (items.length ? `<p><b>Objets</b> : ${items.map(x => esc(x.n)).join(", ")}, charges récupérées en terminant le repos.</p>` : "")
    + (feats.length ? `<p><b>Dons</b> : ${feats.map(id => esc(FEATS[id].n)).join(", ")}, récupéré${feats.length > 1 ? "s" : ""} en terminant le repos.</p>` : "");
  const rec = C(g).recovery && C(g).recovery(g) ? recoveryHTML(g, true) : ""; // Restauration arcanique, Récupération naturelle
  const wait = longOnly(g);
  if (isDown(g)) return h + `<div class="cast"><button class="btn ghost" data-a="short-close">Fermer</button></div></div>`; // à 0 PV : pas de repos
  // Toujours un bouton pour terminer, même sans rien à récupérer : même geste pour toute la table
  return h + `${lines || `<p class="muted">Rien d'autre ne revient au repos court${wait.length ? "" : " pour l'instant"}.</p>`}${wait.length ? `<p class="muted"><b>Au repos long seulement</b> : ${wait.join(" ; ")}.</p>` : ""}${rec}
  <div class="cast"><button class="btn cast-go" data-a="short-done">Terminer le repos court</button><button class="btn ghost" data-a="short-close">Fermer</button></div></div>`;
}

const snapHP = g => JSON.parse(JSON.stringify({ hp: g.hp, hdU: g.hdU }));
onClick("short-open", () => { S.shortOpen = !S.shortOpen; S.sr = {}; render(); });
onClick("short-close", () => { S.shortOpen = false; S.sr = {}; render(); });
onClick("short-done", () => {
  const g = G(); if (!g) return; const sr = SR(g), fields = sr ? sr.fields || [sr.field] : [], prev = JSON.parse(JSON.stringify({ items: g.items, featU: g.featU, ...Object.fromEntries(fields.map(f => [f, g[f]])) })); S.shortOpen = false;
  let n = 0, fr = []; mutate(g => { if (sr) { if (sr.reset) sr.reset(g); else g[sr.field] = 0; } n = rechargeItems(g, "court"); fr = featRecharge(g, "court"); });
  const wait = longOnly(g);
  const got = [sr ? `${sr.label} ${sr.done}` : "", n ? `charges de ${n} objet${n > 1 ? "s" : ""}` : "", ...fr].filter(Boolean).join(", ");
  toast(`Repos court terminé${got ? ` : ${got}` : ""}${wait.length ? ` · au repos long : ${wait.join(", ")}` : ""}`, () => { mutate(g => Object.assign(g, prev)); return "Repos court annulé"; });
});
onClick("hp-hd", () => {
  const g = G(), el = document.getElementById("hd-n"), n = Math.floor(+(el && el.value) || 0); if (!g) return;
  if (n < 1) { if (el) el.focus(); return; }
  if (n > hitDieSize(g)) { toast(`Un d${hitDieSize(g)} donne au plus ${hitDieSize(g)} : tape le résultat du dé`); return; }
  const prev = snapHP(g); let got = null; mutate(g => { got = spendHitDie(g, n); });
  if (got != null) toast(`Dé de vie : ${n} ${signed(R.ab(g, "con"))} CON → <b>+${got} PV</b> · ${hpCur(G())}/${g.hpMax} · reste ${hdLeft(G())}`, () => { mutate(g => Object.assign(g, prev)); return "Dé de vie annulé"; });
  const nx = document.getElementById("hd-n"); if (nx) nx.focus({ preventScroll: true });
});
onClick("longrest", () => { S.concPanel = false; S.shortOpen = false; S.sr = {}; mutate(g => { g.used = {}; g.effects = []; if (C(g).longRest) C(g).longRest(g); g.extras.forEach(x => x.used = false); longRestHP(g); rechargeItems(g, "long"); featRecharge(g, "long"); innateRest(g); toast(`Repos long : ${g.hpMax != null ? "PV au maximum, " : ""}emplacements et capacités récupérés, sorts en cours terminés`); }); });

export { restBarHTML };
