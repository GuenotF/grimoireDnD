// Éléments d'interface réutilisables : sections repliables, capacités dépliables avec pastilles, bouton Retirer.
import { DRU } from "../classes/druide.js";
import { OATHS, PAL } from "../classes/paladin.js";
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
// Capacité dépliable (Perception divine, Conduit divin) : cercles à droite, détail et boutons au toucher du nom
const pillsRaw = list => `<div class="pills">${list.map(([k, l, v, sub]) => `<div class="pill ${k}"><span class="pl">${l}</span><span class="pv">${esc(v)}</span>${sub ? `<span class="ps">${esc(sub)}</span>` : ""}</div>`).join("")}</div>`;
function capRow(g, r, name, rest, pipsHTML, sep) {
  const key = "res:" + r, open = S.open.has(key);
  let body = "";
  if (open && r === "ds") {
    const left = PAL.ds(g) - Math.min(PAL.ds(g), g.dsU);
    body = `${pillsRaw([["n", "Incantation", "1 action"], ["n", "Zone", "18 m"], ["n", "Durée", "jusqu'à ton prochain tour"]])}
    <div class="eff">Tu sais où sont les célestes, fiélons et morts-vivants (leur type, pas leur identité) et les lieux ou objets consacrés ou profanés, hors abri total.</div>
    <div class="cast"><button class="btn cast-go sm" data-a="ds-use"${left ? "" : " disabled"}>${left ? `Utiliser · ${left} restante${left > 1 ? "s" : ""}` : "Plus d'utilisation"}</button></div>`;
  }
  if (open && r === "ws") {
    const fp = DRU.fp(g), lim = g.level < 4 ? "ni nage ni vol" : g.level < 8 ? "nage autorisée, pas de vol" : "nage et vol autorisés";
    body = `${pillsRaw([["n", "Incantation", "1 action bonus"], ["n", "Durée", `${DRU.hours(g)} h maximum`], ["f", "Bêtes", `FP ${fp} maximum`, lim]])}
    <div class="eff">Tu prends la forme d'une bête déjà vue : ses statistiques physiques et ses PV remplacent les tiens (tu gardes INT, SAG, CHA, tes compétences et ta concentration). À 0 PV, tu reprends ta forme et l'excédent de dégâts passe sur tes PV. Pas de sort dans cette forme.</div>
    <div class="cast"><button class="btn cast-go sm wsbtn" data-a="ws-open">${g.wsForm ? "Changer de forme" : "Choisir une forme"}</button></div>`;
  }
  if (open && r === "cd") {
    const o = OATHS[g.oath], left = PAL.cd(g) - Math.min(PAL.cd(g), g.cdU);
    body = (o.cd || []).map(x => `<div class="capopt"><b>${x.n}</b>${x.pills ? pillsRaw(x.pills(g)) : ""}<div class="eff">${x.e}</div><div class="cast"><button class="btn cast-go sm" data-a="cd-use" data-v="${x.k}"${left ? "" : " disabled"}>${x.btn || x.n}</button></div></div>`).join("")
      + `<span class="muted" style="font-size:12.5px">${left ? "Une seule utilisation par repos : choisir l'une ou l'autre." : "Conduit divin utilisé : il revient au prochain repos court ou long."}</span>`;
  }
  return `<div class="resrow${sep ? " sep" : ""}"><span class="rn"><button class="capname" data-a="row" data-id="${key}" aria-expanded="${open}">${name}<span class="chev">${open ? "▴" : "▾"}</span></button><small>${rest}</small></span><span class="pips">${pipsHTML}</span></div>${body ? `<div class="capbody">${body}</div>` : ""}`;
}
function removeBtn(key) {
  return S.confirm === key ? `<button class="btn confirm" data-a="rm" data-k="${esc(key)}">Retirer ?</button>` : `<button class="btn ghost" data-a="rm" data-k="${esc(key)}" aria-label="Retirer">Retirer</button>`;
}
onClick("res-pip", (b) => { mutate(g => { const r = b.dataset.r, f = r + "U", mx = r === "ds" ? PAL.ds(g) : r === "cd" ? PAL.cd(g) : DRU.ws(g), k = +b.dataset.k, u = Math.min(g[f], mx); g[f] = k < u ? k : k + 1; }); });
onClick("fold", (b, a) => {
  const k = foldKey(b.dataset.k); if (S.fold[k]) delete S.fold[k]; else S.fold[k] = 1;
  try { localStorage.setItem("grimoire.fold", JSON.stringify(S.fold)); } catch (e) {}
  render();
  const el = document.querySelector(`[data-a="fold"][data-k="${b.dataset.k}"]`); if (el) el.focus({ preventScroll: true });
});

export { foldKey, isFold, foldHead, pillsRaw, capRow, removeBtn };
