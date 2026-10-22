// Onglet Personnage : équipement (bourse et objets). Gérer : saisie ; En jeu : bourse et objets à décompter.
// Objet : { n: nom, q: quantité, eq: équipé / porté sur soi, c: à décompter en jeu, note }.
import { onClick, onSubmit } from "../core/actions.js";
import { esc } from "../core/format.js";
import { G, S } from "../core/state.js";
import { mutate } from "../core/store.js";
import { render, toast } from "../core/ui.js";
import { COINS, purseText, spend } from "../rules/money.js";
import { foldHead, isFold } from "../ui/components.js";

/** Ordre d'affichage : objets équipés d'abord, puis l'ordre d'ajout (indices du tableau d'origine). */
const order = g => g.items.map((x, i) => i).sort((a, b) => (g.items[b].eq - g.items[a].eq) || a - b);

function purseHTML(g) {
  const coin = S.mCoin || "po";
  let h = `<button class="purse" data-a="m-open" aria-expanded="${!!S.purseOpen}" aria-label="Bourse : ${purseText(g.money)}. Gagner ou dépenser">${COINS.map(([k, n]) => `<span class="${g.money[k] ? "" : "zero"}${k === "po" ? " or" : ""}" title="${n}"><b>${g.money[k]}</b><i>${k}</i></span>`).join("")}</button>`;
  if (S.purseOpen) h += `<form class="pursebox" data-a="m-form"><div class="row"><input id="m-n" type="number" inputmode="numeric" min="1" placeholder="0" aria-label="Montant">
    ${COINS.map(([k, n]) => `<button type="button" class="chip" data-a="m-coin" data-v="${k}" aria-pressed="${k === coin}" title="${n}">${k}</button>`).join("")}</div>
    <div class="row"><button type="button" class="btn gain" data-a="m-gain">+ Gagner</button><button type="submit" class="btn cast-go" data-a="m-spend">− Dépenser</button><button type="button" class="btn ghost" data-a="m-open" style="margin-left:auto">Fermer</button></div>
    <p>Pas assez de cette pièce ? L'atelier fait la monnaie (1 po = 10 pa = 100 pc) ; tout est annulable.</p></form>`;
  return h;
}
function itemForm(x, i) {
  return `<form class="itform" data-a="it-save" data-i="${i}"><div class="frow2"><input id="it-name" type="text" value="${esc(x.n)}" aria-label="Nom" required><input id="it-q" type="number" inputmode="numeric" min="0" value="${x.q}" aria-label="Quantité"></div>
    <input id="it-note" type="text" value="${esc(x.note)}" placeholder="Note (effet, contenu, valeur…)" aria-label="Note">
    <div class="row"><label class="check"><input type="checkbox" id="it-eq"${x.eq ? " checked" : ""}> Équipé</label><label class="check"><input type="checkbox" id="it-c"${x.c ? " checked" : ""}> À décompter en jeu</label>
    <span style="flex:1"></span><button type="button" class="btn ghost" data-a="it-del" data-i="${i}">Retirer</button><button type="button" class="btn ghost" data-a="it-cancel">Annuler</button><button class="btn primary" type="submit">Enregistrer</button></div></form>`;
}
function equipmentGerer(g) {
  let h = foldHead("ch-eq", "", "Équipement", `${g.items.length} objet${g.items.length > 1 ? "s" : ""}`, purseText(g.money));
  if (isFold("ch-eq")) return h;
  h += purseHTML(g) + (S.purseOpen ? "" : `<p class="chhelp" style="margin:4px 0 8px">Touche la bourse pour gagner ou dépenser.</p>`);
  h += `<div class="chbox itbox">${order(g).map(i => { const x = g.items[i]; return S.itEdit === i ? itemForm(x, i)
    : `<div class="it${x.c && !x.q ? " out" : ""}"><button class="itck" data-a="it-eq" data-i="${i}" aria-pressed="${x.eq}" aria-label="${esc(x.n)} : ${x.eq ? "équipé" : "non équipé"}"></button><div class="itn"><span>${esc(x.n)}${x.q !== 1 ? ` <b>×${x.q}</b>` : ""}${x.c ? ` <i class="ct">à décompter</i>` : ""}</span>${x.note ? `<small>${esc(x.note)}</small>` : ""}</div><button class="btn ghost sm" data-a="it-edit" data-i="${i}" aria-label="Modifier ${esc(x.n)}">✎</button></div>`; }).join("")}
    <form class="itadd" data-a="it-add"><input id="it-new" type="text" placeholder="Nom de l'objet" aria-label="Nouvel objet" autocomplete="off"><button class="btn" type="submit">Ajouter</button></form></div>`;
  return h;
}
function equipmentJeu(g) {
  if (!g.items.length && !Object.values(g.money).some(Boolean)) return "";
  let h = foldHead("ch-eqj", "", "Équipement", purseText(g.money), purseText(g.money));
  if (isFold("ch-eqj")) return h;
  h += purseHTML(g);
  if (g.items.length) h += `<div class="chbox itbox">${order(g).map(i => { const x = g.items[i];
    return `<div class="it j${x.eq ? " eq" : ""}${x.c && !x.q ? " out" : ""}"><div class="itn"><span>${esc(x.n)}</span>${x.note ? `<small>${esc(x.note)}</small>` : ""}</div>${x.c ? `<div class="qty"><button class="btn sm" data-a="it-dec" data-i="${i}" aria-label="${esc(x.n)} : un de moins"${x.q ? "" : " disabled"}>−</button><b>${x.q}</b><button class="btn sm" data-a="it-inc" data-i="${i}" aria-label="${esc(x.n)} : un de plus">+</button></div>` : x.q !== 1 ? `<b class="q">×${x.q}</b>` : ""}</div>`; }).join("")}</div>`;
  return h;
}

// ---------- Actions
const snapM = g => ({ ...g.money });
onClick("m-open", () => { S.purseOpen = !S.purseOpen; render(); const el = document.getElementById("m-n"); if (el) el.focus({ preventScroll: true }); });
onClick("m-coin", (b) => { S.mCoin = b.dataset.v; const v = document.getElementById("m-n").value; render(); const el = document.getElementById("m-n"); if (el) { el.value = v; el.focus({ preventScroll: true }); } });
const amount = () => { const el = document.getElementById("m-n"), n = Math.floor(+(el && el.value) || 0); if (n < 1 && el) el.focus(); return n; };
onClick("m-gain", () => {
  const g = G(), n = amount(), k = S.mCoin || "po"; if (!g || n < 1) return; const prev = snapM(g);
  mutate(g => { g.money[k] += n; }); toast(`<b>+${n} ${k}</b> · ${purseText(G().money)}`, () => { mutate(g => { g.money = prev; }); return "Annulé"; });
});
function doSpend() {
  const g = G(), n = amount(), k = S.mCoin || "po"; if (!g || n < 1) return; const prev = snapM(g), m = { ...g.money }, r = spend(m, k, n);
  if (!r.ok) { toast(`Pas assez dans la bourse pour ${n} ${k} (${purseText(g.money)})`); return; }
  mutate(g => { g.money = m; });
  toast(`<b>−${n} ${k}</b>${r.change.length ? ` · monnaie : ${r.change.join(", ")}` : ""} · ${purseText(m)}`, () => { mutate(g => { g.money = prev; }); return "Dépense annulée"; });
}
onClick("m-spend", (b, a, e) => { e.preventDefault(); doSpend(); });
onSubmit("m-form", () => doSpend()); // Entrée dans le montant : dépenser

onSubmit("it-add", () => { const el = document.getElementById("it-new"), n = el.value.trim(); if (!n) return; mutate(g => { g.items.push({ n, q: 1, eq: false, c: false, note: "" }); }); const nx = document.getElementById("it-new"); if (nx) nx.focus({ preventScroll: true }); });
onClick("it-eq", (b) => { mutate(g => { const x = g.items[+b.dataset.i]; if (x) x.eq = !x.eq; }); });
onClick("it-edit", (b) => { S.itEdit = +b.dataset.i; render(); const el = document.getElementById("it-name"); if (el) el.focus(); });
onClick("it-cancel", () => { S.itEdit = null; render(); });
onSubmit("it-save", f => {
  const i = +f.dataset.i, n = document.getElementById("it-name").value.trim(); if (!n) return;
  const x = { n, q: Math.max(0, Math.floor(+document.getElementById("it-q").value || 0)), eq: document.getElementById("it-eq").checked, c: document.getElementById("it-c").checked, note: document.getElementById("it-note").value.trim() };
  S.itEdit = null; mutate(g => { g.items[i] = x; }); toast("Modification enregistrée");
});
onClick("it-del", (b) => { const i = +b.dataset.i, prev = G().items[i]; if (!prev) return; S.itEdit = null; mutate(g => { g.items.splice(i, 1); }); toast(`Retiré : <b>${esc(prev.n)}</b>`, () => { mutate(g => { g.items.splice(i, 0, prev); }); return "Rétabli"; }); });
onClick(["it-dec", "it-inc"], (b, a) => { mutate(g => { const x = g.items[+b.dataset.i]; if (x) x.q = Math.max(0, x.q + (a === "it-inc" ? 1 : -1)); }); });

export { equipmentGerer, equipmentJeu };
