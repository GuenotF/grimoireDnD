// Récupération d'emplacements au repos court, une fois par jour : Restauration arcanique (magicien),
// Récupération naturelle (druide du Cercle de la Terre). La classe déclare recovery(g) : { name, budget, field }.
import { C } from "../classes/index.js";
import { onClick } from "../core/actions.js";
import { esc } from "../core/format.js";
import { G, S } from "../core/state.js";
import { mutate } from "../core/store.js";
import { render, toast } from "../core/ui.js";
import { R } from "../rules/common.js";

// Emplacements récupérables : niveaux 1 à 5, dans la limite de ceux dépensés ; budget = moitié du niveau de magicien (arrondi au supérieur).
function recLevels(g) { const out = []; for (let lv = 1; lv <= Math.min(5, R.maxLevel(g)); lv++) { const sp = +(g.used[lv] || 0); if (sp > 0) out.push([lv, sp]); } return out; }
const srTotal = sr => Object.entries(sr).reduce((a, [lv, n]) => a + lv * n, 0);
function recCombos(g) {
  const B = C(g).recovery(g).budget, lv = recLevels(g).reverse(), res = [];
  (function walk(i, left, cur) {
    if (i === lv.length) { if (Object.keys(cur).length) res.push({ ...cur }); return; }
    const [l, sp] = lv[i];
    for (let n = Math.min(sp, Math.floor(left / l)); n >= 0; n--) { if (n) cur[l] = n; else delete cur[l]; walk(i + 1, left - n * l, cur); }
    delete cur[l];
  })(0, B, {});
  const best = Math.max(0, ...res.map(srTotal));
  return res.filter(c => srTotal(c) === best).slice(0, 4);
}
function srLabel(sr) {
  const parts = Object.entries(sr).filter(([, n]) => n > 0).sort((a, b) => b[0] - a[0]).map(([lv, n]) => `${n} emplacement${n > 1 ? "s" : ""} de niv. ${lv}`);
  return parts.join(" + ");
}
/** Bloc de récupération d'emplacements. inline : dans le panneau du repos court (druide), sans bouton Fermer. */
function recoveryHTML(g, inline = false) {
  const rc = C(g).recovery(g), B = rc.budget, lvls = recLevels(g), close = inline ? "" : `<button class="btn ghost" data-a="short-close" style="justify-self:start">Fermer</button>`;
  let h = `<div class="short${inline ? " inl" : ""}"><div><h3>${rc.name}</h3><p>Une fois par jour, après un repos court : jusqu'à <b>${B} niveau${B > 1 ? "x" : ""}</b> d'emplacements au total, aucun de niveau 6 ou plus.</p></div>`;
  if (g[rc.field]) return h + `<p>Déjà utilisée aujourd'hui : elle revient au prochain repos long.</p>${close}</div>`;
  if (!lvls.length) return h + `<p>Aucun emplacement dépensé : rien à récupérer pour l'instant.</p>${close}</div>`;
  const sr = S.sr, tot = srTotal(sr), combos = recCombos(g), key = c => JSON.stringify(Object.entries(c).filter(([, n]) => n).sort());
  if (combos.length) h += `<div><span class="lbl">Choix rapides</span><div class="quick">${combos.map(c => `<button class="btn" data-a="sr-pick" data-c='${esc(JSON.stringify(c))}' aria-pressed="${key(c) === key(sr)}">${srLabel(c)}</button>`).join("")}</div></div>`;
  h += `<div>${lvls.map(([lv, sp]) => { const n = sr[lv] || 0; return `<div class="step"><span><b>Niveau ${lv}</b> <span class="muted" style="font-size:13px">· ${sp} dépensé${sp > 1 ? "s" : ""}</span></span><button class="btn" data-a="sr-dec" data-l="${lv}" aria-label="Un emplacement de niveau ${lv} en moins"${n ? "" : " disabled"}>−</button><b class="n">${n}</b><button class="btn" data-a="sr-inc" data-l="${lv}" aria-label="Un emplacement de niveau ${lv} en plus"${n < sp && tot + lv <= B ? "" : " disabled"}>+</button></div>`; }).join("")}</div>`;
  h += `<div class="meter"><div class="track"><div class="fill" style="width:${Math.round(100 * tot / B)}%"></div></div><b>${tot} / ${B} niveau${B > 1 ? "x" : ""}</b></div>
  <div class="cast"><button class="btn cast-go" data-a="sr-go"${tot ? "" : " disabled"}>${tot ? "Récupérer " + srLabel(sr) : "Choisis les emplacements à récupérer"}</button>${inline ? "" : `<button class="btn ghost" data-a="short-close">Annuler</button>`}</div></div>`;
  return h;
}

onClick("sr-pick", (b) => { S.sr = JSON.parse(b.dataset.c); render(); });
onClick(["sr-inc", "sr-dec"], (b, a) => { const lv = +b.dataset.l; S.sr[lv] = Math.max(0, (S.sr[lv] || 0) + (a === "sr-inc" ? 1 : -1)); if (!S.sr[lv]) delete S.sr[lv]; render(); });
onClick("sr-go", () => {
  const g = G(), sr = S.sr; if (!g || !C(g).recovery) return; const rc = C(g).recovery(g); if (!srTotal(sr) || srTotal(sr) > rc.budget) return;
  const prev = JSON.parse(JSON.stringify({ used: g.used, [rc.field]: g[rc.field] })), label = srLabel(sr);
  if (!C(g).shortRest) S.shortOpen = false; S.sr = {}; // druide : le panneau reste ouvert pour la Forme sauvage
  mutate(g => { Object.entries(sr).forEach(([lv, n]) => { g.used[lv] = Math.max(0, (+(g.used[lv] || 0)) - n); }); g[rc.field] = true; });
  toast(`${rc.name} : ${label} récupéré${/s de/.test(label) || label.includes("+") ? "s" : ""}`, () => mutate(g => { g.used = prev.used; g[rc.field] = prev[rc.field]; }));
});

export { recLevels, srTotal, recCombos, srLabel, recoveryHTML };
