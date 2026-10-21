// Éléments d'interface réutilisables : sections repliables, capacités dépliables avec pastilles, bouton Retirer.
import { C } from "../classes/index.js";
import { onClick } from "../core/actions.js";
import { esc } from "../core/format.js";
import { S } from "../core/state.js";
import { mutate } from "../core/store.js";
import { render } from "../core/ui.js";

const foldKey = k => `${S.cur}|${S.view === "jeu" ? "jeu" : "gerer"}|${k}`;
const isFold = k => !!S.fold[foldKey(k)];
function foldHead(k, cls, title, aside, summary) {
  const shut = isFold(k);
  return `<button class="rubric fold${shut ? " shut" : ""}${cls ? " " + cls : ""}" data-a="fold" data-k="${k}" aria-expanded="${!shut}"><span class="chev" aria-hidden="true">${shut ? "▸" : "▾"}</span><span class="h">${title}</span>${shut && summary ? `<span class="sum">${summary}</span>` : ""}<span class="aside">${aside}</span></button>`;
}
// Capacité dépliable (Perception divine, Conduit divin, Forme sauvage) : cercles à droite, détail et boutons au toucher du nom.
// body(g) : contenu du détail, fourni par la classe ; calculé seulement quand la capacité est dépliée.
const pillsRaw = list => `<div class="pills">${list.map(([k, l, v, sub]) => `<div class="pill ${k}"><span class="pl">${l}</span><span class="pv">${esc(v)}</span>${sub ? `<span class="ps">${esc(sub)}</span>` : ""}</div>`).join("")}</div>`;
function capRow(g, r, name, rest, pipsHTML, sep, body) {
  const key = "res:" + r, open = S.open.has(key);
  if (open && body) body = body(g); else body = "";
  return `<div class="resrow${sep ? " sep" : ""}"><span class="rn"><button class="capname" data-a="row" data-id="${key}" aria-expanded="${open}">${name}<span class="chev">${open ? "▴" : "▾"}</span></button><small>${rest}</small></span><span class="pips">${pipsHTML}</span></div>${body ? `<div class="capbody">${body}</div>` : ""}`;
}
function removeBtn(key) {
  return S.confirm === key ? `<button class="btn confirm" data-a="rm" data-k="${esc(key)}">Retirer ?</button>` : `<button class="btn ghost" data-a="rm" data-k="${esc(key)}" aria-label="Retirer">Retirer</button>`;
}
// Cercle d'une ressource (data-r) : le maximum vient de la classe (C(g).resourceMax), l'utilisation est rangée dans le champ r + "U"
onClick("res-pip", (b) => { mutate(g => { const r = b.dataset.r, f = r + "U", mx = C(g).resourceMax[r](g), k = +b.dataset.k, u = Math.min(g[f], mx); g[f] = k < u ? k : k + 1; }); });
onClick("fold", (b, a) => {
  const k = foldKey(b.dataset.k); if (S.fold[k]) delete S.fold[k]; else S.fold[k] = 1;
  try { localStorage.setItem("grimoire.fold", JSON.stringify(S.fold)); } catch (e) {}
  render();
  const el = document.querySelector(`[data-a="fold"][data-k="${b.dataset.k}"]`); if (el) el.focus({ preventScroll: true });
});

export { foldKey, isFold, foldHead, pillsRaw, capRow, removeBtn };
