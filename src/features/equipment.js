// Onglet Personnage : équipement (bourse et objets). Gérer : saisie complète ; En jeu : bourse, ajout, Équiper / Ranger, Retirer.
// Objet : { n: nom, q: quantité, eq: équipé / porté sur soi, c: à décompter en jeu, note, ref : arme ou armure du catalogue,
// objet magique : bonus, xdmg (dégâts en plus), att / attuned (harmonisation), chMax / chU / rec (charges) }.
import { C } from "../classes/index.js";
import { onClick, onInput, onSubmit } from "../core/actions.js";
import { esc } from "../core/format.js";
import { G, S } from "../core/state.js";
import { mutate } from "../core/store.js";
import { render, toast } from "../core/ui.js";
import { GEAR } from "../data.js";
import { armorProf, gearOf, weaponProf } from "../rules/equipment.js";
import { hasFeat } from "../rules/feats.js";
import { MAX_ATT, REC, attunedCount, isMagic, recLabel } from "../rules/magic.js";
import { COINS, purseText, spend } from "../rules/money.js";
import { foldHead, isFold } from "../ui/components.js";

/** Ordre d'affichage : objets équipés d'abord, puis l'ordre de la liste (indices du tableau d'origine, réglable avec ▲ ▼). */
const order = g => g.items.map((x, i) => i).sort((a, b) => (g.items[b].eq - g.items[a].eq) || a - b);
/** Deux sections, Équipé puis Autres objets : row(i, pos, n) dessine un objet (pos et n : place dans sa section, pour ▲ ▼). */
// Recherche de l'inventaire (nom ou note, accents ignorés) : ▲ ▼ masqués pendant la recherche (les voisins cachés fausseraient le rangement)
const finding = () => !!(S.itFind || "").trim();
const found = x => !finding() || norm(x.n + " " + (x.note || "")).includes(norm(S.itFind.trim()));
function grouped(g, row) {
  const ids = order(g).filter(i => found(g.items[i])), eq = ids.filter(i => g.items[i].eq), rest = ids.filter(i => !g.items[i].eq);
  if (!ids.length && finding()) return `<div class="empty">Aucun objet ne correspond à « ${esc(S.itFind.trim())} ».</div>`;
  const sec = (l, list) => list.length ? `<div class="itgrp">${l} <span>${list.length}</span></div>` + list.map((i, p) => row(i, p, list.length)).join("") : "";
  return sec("Équipé", eq) + sec(eq.length ? "Autres objets" : "Objets", rest);
}
const findHTML = g => g.items.length > 1 ? `<input id="it-find" class="itfind" type="search" value="${esc(S.itFind || "")}" placeholder="🔍 Chercher un objet" aria-label="Chercher un objet" autocomplete="off">` : "";
const moveBtns = (x, i, p, n) => finding() ? "" : `<span class="itmv"><button class="btn ghost sm" data-a="it-mv" data-i="${i}" data-v="-1" aria-label="Monter ${esc(x.n)}"${p ? "" : " disabled"}>▲</button><button class="btn ghost sm" data-a="it-mv" data-i="${i}" data-v="1" aria-label="Descendre ${esc(x.n)}"${p < n - 1 ? "" : " disabled"}>▼</button></span>`;

function purseHTML(g) {
  const coin = S.mCoin || "po";
  let h = `<button class="purse" data-a="m-open" aria-expanded="${!!S.purseOpen}" aria-label="Bourse : ${purseText(g.money)}. Gagner ou dépenser">${COINS.map(([k, n]) => `<span class="${g.money[k] ? "" : "zero"}${k === "po" ? " or" : ""}" title="${n}"><b>${g.money[k]}</b><i>${k}</i></span>`).join("")}</button>`;
  if (S.purseOpen) h += `<form class="pursebox" data-a="m-form"><div class="row"><input id="m-n" type="number" inputmode="numeric" min="1" placeholder="0" aria-label="Montant">
    ${COINS.map(([k, n]) => `<button type="button" class="chip" data-a="m-coin" data-v="${k}" aria-pressed="${k === coin}" title="${n}">${k}</button>`).join("")}</div>
    <div class="row"><button type="button" class="btn gain" data-a="m-gain">+ Gagner</button><button type="submit" class="btn cast-go" data-a="m-spend">− Dépenser</button><button type="button" class="btn ghost" data-a="m-open" style="margin-left:auto">Fermer</button></div>
    <p>Pas assez de cette pièce ? L'atelier fait la monnaie (1 po = 10 pa = 100 pc) ; tout est annulable.</p></form>`;
  return h;
}
/** Ajout d'un objet (Gérer et En jeu) : nom libre, ou arme / armure du Manuel proposée pendant la saisie. */
// ＋ : ajout rapide ; ✎ Détails : le formulaire de Modifier (quantité, note, objet magique…), ouvert juste dessous
const addFormHTML = g => `<form class="itadd" data-a="it-add"><input id="it-new" type="text" placeholder="Nom de l'objet" aria-label="Nouvel objet (ex. épée, cuir, rations)" autocomplete="off" value="${esc(S.itQ || "")}"><button class="btn cast-go itplus" type="submit" aria-label="Ajouter tout de suite" title="Ajouter tout de suite">＋</button><button class="btn" type="button" data-a="it-det" aria-expanded="${!!S.itNew}">✎ Détails</button></form>${S.itNew ? itemForm(g, S.itNew, "new") : suggestHTML(g)}`;
// Arme pouvant aller en main secondaire : corps à corps légère, ou à une main avec le don Combattant à deux armes
const offhandOk = (g, x) => { const w = gearOf(x); return !!w && w.kind === "weapon" && w.rng === "melee" && !w.two && (w.light || hasFeat(g, "dual-wielder")); };
function itemForm(g, x, i) { // i : indice de l'objet, ou "new" (ajout avec détails : rien n'est créé avant Ajouter)
  return `<form class="itform${i === "new" ? " itnew" : ""}" data-a="it-save" data-i="${i}">${i === "new" ? `<div class="itnewh">Nouvel objet · détails</div>` : ""}<div class="frow2"><input id="it-name" type="text" value="${esc(x.n)}" aria-label="Nom" required><input id="it-q" type="number" inputmode="numeric" min="0" value="${x.q}" aria-label="Quantité"></div>
    <input id="it-note" type="text" value="${esc(x.note)}" placeholder="Note (effet, contenu, valeur…)" aria-label="Note">
    <label class="itref"><span>Arme ou armure du Manuel</span><select id="it-ref" aria-label="Arme ou armure du Manuel"><option value="">Aucune (objet libre)</option>${REF_GROUPS.map(([l, list]) => `<optgroup label="${l}">${list.map(r => `<option value="${r.id}"${r.id === x.ref ? " selected" : ""}>${esc(r.n)}</option>`).join("")}</optgroup>`).join("")}</select></label>
    <fieldset class="itmagic"><legend>✦ Objet magique</legend>
      <label><span>Bonus</span><select id="it-bonus" aria-label="Bonus magique">${[0, 1, 2, 3].map(b => `<option value="${b}"${(x.bonus || 0) === b ? " selected" : ""}>${b ? "+" + b : "aucun"}</option>`).join("")}</select></label>
      <label class="wide"><span>Dégâts en plus</span><input id="it-xdmg" type="text" value="${esc(x.xdmg || "")}" placeholder="ex. 1d4 nécrotique" aria-label="Dégâts en plus"></label>
      <label><span>Charges</span><input id="it-ch" type="number" inputmode="numeric" min="0" max="50" value="${x.chMax || ""}" placeholder="0" aria-label="Nombre de charges"></label>
      <label class="wide"><span>Recharge</span><select id="it-rec" aria-label="Recharge des charges">${REC.map(([k, l]) => `<option value="${k}"${(x.chMax ? x.rec : "aube") === k ? " selected" : ""}>${l}</option>`).join("")}</select></label>
      <div class="row wide"><label class="check"><input type="checkbox" id="it-att"${x.att ? " checked" : ""}> Harmonisation requise</label><label class="check"><input type="checkbox" id="it-attuned"${x.attuned ? " checked" : ""}> Harmonisé</label></div>
      <p class="wide">Le bonus s'applique au toucher et aux dégâts d'une arme du Manuel, ou à la CA d'une armure ou d'un bouclier. Un objet à harmonisation n'a d'effet qu'harmonisé (${MAX_ATT} au plus).</p>
    </fieldset>
    <div class="row"><label class="check"><input type="checkbox" id="it-eq"${x.eq ? " checked" : ""}> Équipé</label><label class="check"><input type="checkbox" id="it-c"${x.c ? " checked" : ""}> À décompter en jeu</label>${offhandOk(g, x) ? `<label class="check" title="Combat à deux armes : cette arme pour l'attaque en action bonus"><input type="checkbox" id="it-oh"${x.oh ? " checked" : ""}> Main secondaire</label>` : ""}
    <span style="flex:1"></span>${i === "new" ? "" : `<button type="button" class="btn ghost" data-a="it-del" data-i="${i}">Retirer</button>`}<button type="button" class="btn ghost" data-a="it-cancel">Annuler</button><button class="btn primary" type="submit">${i === "new" ? "Ajouter" : "Enregistrer"}</button></div></form>`;
}
// ---------- Catalogue (armes et armures du Manuel) : suggestions à l'ajout, résumé, étiquette
const norm = t => String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[’']/g, "'");
const CATN = { simple: "arme courante", martial: "arme de guerre", light: "armure légère", medium: "armure intermédiaire", heavy: "armure lourde", shield: "bouclier" };
function gearLine(x) {
  if (x.kind === "weapon") return `${CATN[x.cat]} · ${x.dmg ? `${x.dmg} ${x.dt}` : "sans dégâts"}${x.props ? ` · ${x.props.toLowerCase()}` : ""}`;
  if (x.cat === "shield") return "bouclier · +2 CA";
  return `${CATN[x.cat]} · CA ${x.ac}${x.dex ? (x.dexMax != null ? " + DEX (max +2)" : " + DEX") : ""}${x.str ? ` · Force ${x.str}` : ""}${x.stealth ? " · Discrétion désav." : ""}`;
}
/** Fiche détaillée d'une arme ou d'une armure du Manuel (objet déplié dans l'équipement). */
function gearDetail(g, x, item) {
  const row = (l, v) => v ? `<div><span>${l}</span><b>${esc(v)}</b></div>` : "";
  const prof = x.kind === "weapon" ? weaponProf(g, x) : armorProf(g, x), f = x.kind === "armor" && x.cat !== "shield" ? "e" : "";
  let h = row("Catégorie", `${CATN[x.cat]} · ${prof ? `maîtrisé${f}` : `non maîtrisé${f}`}`);
  if (x.kind === "weapon") h += row("Dégâts", x.dmg ? `${x.dmg} ${x.dt}${x.vers ? ` (${x.vers} à deux mains)` : ""}` : "aucun") + row("Propriétés", x.props) + row("Portée", x.range) + row("Spécial", x.special);
  else if (x.cat === "shield") h += row("CA", "+2");
  else h += row("CA", `${x.ac}${x.dex ? (x.dexMax != null ? " + DEX (max +2)" : " + DEX") : ""}`) + row("Force requise", x.str ? `${x.str} (sinon −3 m de vitesse)` : "") + row("Discrétion", x.stealth ? "désavantage" : "") + row("Métal", C(g).noMetal && x.metal ? "oui (refusé par les druides)" : "");
  h += row("Poids · prix", [x.w, x.p].filter(Boolean).join(" · "));
  if (x.kind === "weapon" && x.rng === "melee" && !x.two) h += row("Main secondaire", item && item.oh && (x.light || hasFeat(g, "dual-wielder")) ? "oui (attaque en action bonus)" : x.light ? "possible (arme légère)" : hasFeat(g, "dual-wielder") ? "possible (Combattant à deux armes)" : "arme légère requise (ou don Combattant à deux armes)");
  return `<div class="itdet">${h}</div>`;
}
const openBtn = (x, i, inner) => gearOf(x) ? `<button class="itn itopen" data-a="it-open" data-i="${i}" aria-expanded="${S.itOpen === i}">${inner}</button>` : `<div class="itn">${inner}</div>`;
const chev = (x, i) => gearOf(x) ? `<span class="chev" aria-hidden="true">${S.itOpen === i ? "▾" : "▸"}</span> ` : "";
// Choix du lien dans le formulaire, par catégorie
const REF_GROUPS = [["simple", "Armes courantes"], ["martial", "Armes de guerre"], ["light", "Armures légères"], ["medium", "Armures intermédiaires"], ["heavy", "Armures lourdes"], ["shield", "Bouclier"]]
  .map(([k, l]) => [l, Object.values(GEAR).filter(x => x.cat === k)]);
const gearTag = x => `<span class="gtag ${x.kind === "weapon" ? "w" : "a"}">${x.kind === "weapon" ? "arme" : x.cat === "shield" ? "bouclier" : "armure"}</span>`;
function suggestHTML(g) {
  const q = norm((S.itQ || "").trim()); if (q.length < 2) return "";
  const exact = Object.values(GEAR).find(x => norm(x.n) === q); // nom du Manuel complet : l'objet sera relié au catalogue
  if (exact) return `<div class="sugok"><span>✓ <b>${esc(exact.n)}</b> du Manuel · ${esc(gearLine(exact))}</span><small><b>＋</b> pour l'ajouter, <b>✎ Détails</b> pour un bonus (+1…) ou une quantité</small></div>`;
  const hits = Object.values(GEAR).filter(x => norm(x.n).includes(q) || norm(x.vo).includes(q)).slice(0, 6);
  if (!hits.length) return "";
  const prof = x => x.kind === "weapon" ? weaponProf(g, x) : armorProf(g, x);
  return `<div class="sugbox" role="listbox" aria-label="Armes et armures du Manuel">${hits.map(x => `<button type="button" class="sug" data-a="it-pick" data-id="${x.id}" role="option"><span class="sh"><b>${esc(x.n)}</b>${prof(x) ? `<i class="ok">maîtrisé${x.kind === "armor" && x.cat !== "shield" ? "e" : ""}</i>` : `<i class="no">non maîtrisé${x.kind === "armor" && x.cat !== "shield" ? "e" : ""}</i>`}${C(g).noMetal && x.metal ? `<i class="no">métal</i>` : ""}</span><small>${esc(gearLine(x))}</small></button>`).join("")}
    <div class="sugfree">Entrée : ajouter « ${esc((S.itQ || "").trim())} » comme objet libre</div></div>`;
}
// Marques d'un objet magique : bonus, harmonisation, charges
const magicMarks = x => !isMagic(x) ? "" : ` <i class="mg">✦${x.inf && G() && C(G()).itemMagic ? ` ${esc((C(G()).itemMagic(G(), x) || {}).label || "")}` : ""}${x.bonus ? ` +${x.bonus}` : ""}${x.att ? (x.attuned ? " · harmonisé" : " · à harmoniser") : ""}${x.chMax ? ` · ${x.chMax - (x.chU || 0)}/${x.chMax} charge${x.chMax > 1 ? "s" : ""}` : ""}</i>`;
const attAside = g => g.items.some(x => x.att) ? ` · harmonisation ${attunedCount(g)}/${MAX_ATT}` : "";
// Cercles de charges (En jeu) : toucher un cercle pour dépenser ou rendre une charge
const chargePips = (x, i) => `<div class="itch">${Array.from({ length: x.chMax }, (_, k) => `<button class="pip${k < (x.chU || 0) ? " used" : ""}" data-a="it-chg" data-i="${i}" data-k="${k}" aria-label="${esc(x.n)} : charge ${k + 1}, ${k < (x.chU || 0) ? "utilisée" : "disponible"}"></button>`).join("")}<small>${recLabel(x.rec)}</small></div>`;
function equipmentGerer(g) {
  let h = foldHead("ch-eq", "", "Sac", `${g.items.length} objet${g.items.length > 1 ? "s" : ""}${attAside(g)}`, purseText(g.money));
  if (isFold("ch-eq")) return h;
  h += findHTML(g) + purseHTML(g) + (S.purseOpen ? "" : `<p class="chhelp" style="margin:4px 0 8px">Touche la bourse pour gagner ou dépenser.</p>`);
  h += `<div class="chbox itbox">${grouped(g, (i, p, n) => { const x = g.items[i]; return S.itEdit === i ? itemForm(g, x, i)
    : `<div class="it${x.c && !x.q ? " out" : ""}"><button class="itck" data-a="it-eq" data-i="${i}" aria-pressed="${x.eq}" aria-label="${esc(x.n)} : ${x.eq ? "équipé" : "non équipé"}"></button>${openBtn(x, i, `<span>${chev(x, i)}${esc(x.n)}${x.q !== 1 ? ` <b>×${x.q}</b>` : ""}${x.c ? ` <i class="ct">à décompter</i>` : ""}${x.oh ? ` <i class="ct">main secondaire</i>` : ""}${magicMarks(x)}</span>${x.note || gearOf(x) ? `<small>${esc(x.note || gearLine(gearOf(x)))}</small>` : ""}`)}${gearOf(x) ? gearTag(gearOf(x)) : ""}${moveBtns(x, i, p, n)}<button class="btn ghost sm" data-a="it-edit" data-i="${i}" aria-label="Modifier ${esc(x.n)}">✎</button></div>${S.itOpen === i && gearOf(x) ? gearDetail(g, gearOf(x), x) : ""}`; })}
    ${addFormHTML(g)}</div>`;
  return h;
}
// Objets qui servent en action : charges (objets magiques) ou à décompter (potions, munitions)
const actionable = x => x.chMax || x.c;
/** Section « Objets » de l'onglet d'action (Sorts, Capacités), en jeu : cercles de charges et − / +. */
function itemsActionHTML(g) {
  const list = order(g).filter(i => actionable(g.items[i])); if (!list.length) return "";
  let h = foldHead("act-it", "", "Objets", "potions, munitions, charges", list.map(i => esc(g.items[i].n)).join(", "));
  if (isFold("act-it")) return h;
  return h + `<div class="chbox itbox">${list.map(i => { const x = g.items[i];
    return `<div class="it j${x.eq ? " eq" : ""}${x.c && !x.q ? " out" : ""}"><div class="itn"><span>${esc(x.n)}${magicMarks(x)}</span>${x.note ? `<small>${esc(x.note)}</small>` : ""}${x.chMax ? chargePips(x, i) : ""}</div>${x.c ? `<div class="qty"><button class="btn sm" data-a="it-dec" data-i="${i}" aria-label="${esc(x.n)} : un de moins"${x.q ? "" : " disabled"}>−</button><b>${x.q}</b><button class="btn sm" data-a="it-inc" data-i="${i}" aria-label="${esc(x.n)} : un de plus">+</button></div>` : ""}</div>`; }).join("")}</div>`;
}
/** Onglet Inventaire : Gérer (rangement ▲ ▼, fiche complète) ou En jeu (Équiper / Ranger, Retirer). */
const inventoryHTML = g => `<div class="viewsw" role="group" aria-label="Affichage de l'inventaire"><button data-a="view" data-v="gerer" aria-pressed="${S.view !== "jeu"}">✎ Gérer</button><button data-a="view" data-v="jeu" aria-pressed="${S.view === "jeu"}">En jeu</button></div>` + (S.view === "jeu" ? equipmentJeu(g) : equipmentGerer(g));
// En jeu : bourse, objets (toucher un objet : sa fiche, Équiper / Ranger, Retirer) et ajout, comme à la table
function equipmentJeu(g) {
  let h = foldHead("ch-eqj", "", "Sac", `${g.items.length} objet${g.items.length > 1 ? "s" : ""}${attAside(g)}`, purseText(g.money)); // comme en Gérer
  if (isFold("ch-eqj")) return h;
  h += findHTML(g) + purseHTML(g);
  h += `<div class="chbox itbox">${grouped(g, i => { const x = g.items[i], open = S.itOpen === i;
    return `<div class="it j${x.eq ? " eq" : ""}${x.c && !x.q ? " out" : ""}"><button class="itn itopen" data-a="it-open" data-i="${i}" aria-expanded="${open}"><span><span class="chev" aria-hidden="true">${open ? "▾" : "▸"}</span> ${esc(x.n)}${magicMarks(x)}${x.eq ? ` <i class="eqtag">${gearOf(x) && gearOf(x).kind === "armor" && gearOf(x).cat !== "shield" ? "portée" : "équipé"}</i>` : ""}</span>${x.note ? `<small>${esc(x.note)}</small>` : ""}</button>${x.q !== 1 || x.c ? `<b class="q">×${x.q}</b>` : ""}</div>${open ? itemPlay(g, x, i) : ""}`; })}
    ${addFormHTML(g)}
    ${g.items.some(actionable) ? `<p class="chhelp" style="margin:6px 0 0">Potions, munitions et charges s'utilisent depuis l'onglet ${C(g).tabs(g)[0][1]}.</p>` : ""}</div>`;
  return h;
}
/** Fiche d'un objet en jeu : détail de l'arme ou de l'armure, puis les gestes de la partie (le reste se règle dans ✎ Gérer). */
function itemPlay(g, x, i) {
  const gear = gearOf(x), lbl = x.eq ? "Ranger" : gear && gear.kind === "armor" && gear.cat !== "shield" ? "Porter" : "Équiper";
  return `${gear ? gearDetail(g, gear, x) : ""}<div class="itplay"><button class="btn sm${x.eq ? "" : " cast-go"}" data-a="it-eq" data-i="${i}" aria-pressed="${!!x.eq}">${lbl}</button><span class="muted">${x.eq ? "sur toi, utilisé" : "dans le sac"}</span><span style="flex:1"></span><button class="btn ghost sm" data-a="it-del" data-i="${i}">Retirer</button></div>`;
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

onInput("#it-new", t => { S.itQ = t.value; render(); });
onInput("#it-find", t => { S.itFind = t.value; render(); });
// Toucher une suggestion la recopie dans le champ (sans ajouter) : ＋ l'ajoute, ✎ Détails permet un bonus (+1) ou une quantité
onClick("it-pick", (b) => { const x = GEAR[b.dataset.id]; if (!x) return; S.itQ = x.n; render(); const el = document.getElementById("it-new"); if (el) { el.focus({ preventScroll: true }); el.setSelectionRange(el.value.length, el.value.length); } });
onSubmit("it-add", () => { const el = document.getElementById("it-new"), n = el.value.trim(); if (!n) return; S.itQ = ""; const same = Object.values(GEAR).find(x => norm(x.n) === norm(n)); // nom exact du Manuel : relié au catalogue
  mutate(g => { g.items.push({ n, q: 1, eq: false, c: false, note: "", ...(same ? { ref: same.id } : {}) }); });
  toast(`Ajouté : <b>${esc(n)}</b>${same ? ` · ${S.view === "jeu" ? "touche-le puis Équiper" : "coche « équipé »"} pour ${same.kind === "weapon" ? "l'utiliser dans tes attaques" : "le compter dans ta CA"}` : ""}`, () => { mutate(g => { g.items.pop(); }); return "Ajout annulé"; }); const nx = document.getElementById("it-new"); if (nx) nx.focus({ preventScroll: true }); });
onClick("it-det", () => {
  const el = document.getElementById("it-new"), n = (el && el.value || "").trim(), same = n && Object.values(GEAR).find(x => norm(x.n) === norm(n)); // nom du Manuel : arme ou armure déjà liée
  S.itNew = S.itNew ? null : { n, q: 1, eq: false, c: false, note: "", ...(same ? { ref: same.id } : {}) }; S.itQ = ""; S.itEdit = null; render();
  const f = document.getElementById(n ? "it-q" : "it-name"); if (f) { f.focus(); if (f.select) f.select(); }
});
// ▲ ▼ (Gérer) : échange avec l'objet voisin de la même section
onClick("it-mv", (b) => { mutate(g => { const i = +b.dataset.i, x = g.items[i]; if (!x) return; const list = order(g).filter(k => !!g.items[k].eq === !!x.eq), p = list.indexOf(i), j = list[p + +b.dataset.v];
  if (j == null) return; [g.items[i], g.items[j]] = [g.items[j], g.items[i]]; S.itOpen = null; S.itEdit = null; });
  const el = document.querySelector(`[data-a="it-mv"][data-v="${b.dataset.v}"][aria-label="${CSS.escape(b.getAttribute("aria-label"))}"]`); if (el && !el.disabled) el.focus({ preventScroll: true }); });
onClick("it-eq", (b) => { mutate(g => { const x = g.items[+b.dataset.i]; if (x) x.eq = !x.eq; }); });
onClick("it-edit", (b) => { S.itEdit = +b.dataset.i; S.itNew = null; render(); const el = document.getElementById("it-name"); if (el) el.focus(); });
onClick("it-cancel", () => { S.itEdit = null; S.itNew = null; render(); });
onClick("it-open", (b) => { const i = +b.dataset.i; S.itOpen = S.itOpen === i ? null : i; render(); });
onSubmit("it-save", f => {
  const add = f.dataset.i === "new", i = add ? G().items.length : +f.dataset.i, n = document.getElementById("it-name").value.trim(); if (!n) return;
  const ref = document.getElementById("it-ref").value; // le lien avec le catalogue est conservé (attaques, CA)
  const x = { n, q: Math.max(0, Math.floor(+document.getElementById("it-q").value || 0)), eq: document.getElementById("it-eq").checked, c: document.getElementById("it-c").checked, note: document.getElementById("it-note").value.trim(), ...(GEAR[ref] ? { ref } : {}) };
  const v = id => document.getElementById(id), prev = G().items[i] || {}, bonus = +v("it-bonus").value, ch = Math.max(0, Math.min(50, Math.floor(+v("it-ch").value) || 0));
  if (bonus) x.bonus = bonus; if (v("it-xdmg").value.trim()) x.xdmg = v("it-xdmg").value.trim();
  if (v("it-att").checked) { x.att = true; x.attuned = v("it-attuned").checked; }
  if (ch) { x.chMax = ch; x.chU = Math.min(ch, prev.chU || 0); x.rec = v("it-rec").value; }
  const oh = !!(v("it-oh") && v("it-oh").checked && GEAR[ref] && offhandOk(G(), x)); if (oh) x.oh = true; // une seule arme en main secondaire
  if (x.attuned && !prev.attuned && attunedCount(G()) >= MAX_ATT) { x.attuned = false; toast(`Déjà ${MAX_ATT} objets harmonisés : défais d'abord une harmonisation`); }
  else if (!add) toast("Modification enregistrée");
  S.itEdit = null; S.itNew = null; mutate(g => { if (oh) g.items.forEach(y => { delete y.oh; }); g.items[i] = x; });
  if (add) toast(`Ajouté : <b>${esc(x.n)}</b>${x.q !== 1 ? ` ×${x.q}` : ""}${isMagic(x) ? " ✦" : ""}${x.eq ? " · équipé" : ""}`, () => { mutate(g => { g.items.splice(i, 1); }); return "Ajout annulé"; });
});
onClick("it-del", (b) => { const i = +b.dataset.i, prev = G().items[i]; if (!prev) return; S.itEdit = null; S.itOpen = null; mutate(g => { g.items.splice(i, 1); }); toast(`Retiré : <b>${esc(prev.n)}</b>`, () => { mutate(g => { g.items.splice(i, 0, prev); }); return "Rétabli"; }); });
onClick("it-chg", (b) => { mutate(g => { const x = g.items[+b.dataset.i]; if (!x) return; const k = +b.dataset.k, u = x.chU || 0; x.chU = k < u ? k : k + 1; }); });
onClick(["it-dec", "it-inc"], (b, a) => { mutate(g => { const x = g.items[+b.dataset.i]; if (x) x.q = Math.max(0, x.q + (a === "it-inc" ? 1 : -1)); }); });

export { inventoryHTML, itemsActionHTML };
