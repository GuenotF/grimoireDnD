// Section « Dons » de l'onglet d'action (En jeu) : dons qui servent en partie, avec leur rappel et leurs
// ressources à cocher (Chanceux, Adepte martial, Initié à la magie). Les dons purement chiffrés n'y figurent pas.
import { onClick } from "../core/actions.js";
import { esc } from "../core/format.js";
import { mutate } from "../core/store.js";
import { FEATS, featLeft, featPlay, featPlayText } from "../rules/feats.js";
import { foldHead, isFold } from "../ui/components.js";

function featsPlayHTML(g) {
  const ids = featPlay(g); if (!ids.length) return "";
  let h = foldHead("act-dons", "", "Dons", `${ids.length} don${ids.length > 1 ? "s" : ""}`, ids.map(id => esc(FEATS[id].n)).join(", "));
  if (isFold("act-dons")) return h;
  return h + `<div class="fpplay">${ids.map(id => {
    const f = FEATS[id], r = f.res, used = r ? r.n - featLeft(g, id) : 0;
    const pips = r ? `<span class="fpres"><small>${r.rest === "court" ? "repos court" : "repos long"}</small>${Array.from({ length: r.n }, (_, k) => `<button class="pip${k < used ? " used" : ""}" data-a="feat-pip" data-v="${id}" data-k="${k}" aria-label="${esc(f.n)} : ${esc(r.label)} ${k + 1}, ${k < used ? "dépensé" : "disponible"}"></button>`).join("")}</span>` : `<span class="fptag">rappel</span>`;
    return `<div class="fpcard"><div class="h"><b>${esc(f.n)}</b>${pips}</div><p>${esc(featPlayText(g, id))}${r ? ` <b>${featLeft(g, id)} ${esc(r.label)}</b> restant${featLeft(g, id) > 1 ? "s" : ""}.` : ""}</p></div>`;
  }).join("")}</div>`;
}
// Toucher un cercle : dépenser jusqu'à lui, ou rendre (comme les emplacements)
onClick("feat-pip", (b) => { mutate(g => { const id = b.dataset.v, k = +b.dataset.k, u = (g.featU || {})[id] || 0; g.featU = { ...(g.featU || {}), [id]: k < u ? k : k + 1 }; }); });

export { featsPlayHTML };
