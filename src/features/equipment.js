// Onglet Inventaire : recherche et ＋, filtres, résumé (bourse, harmonisation), sections Équipé puis dossiers (rules/inventory.js).
// Gérer : saisie complète, rangement ▲ ▼, dossiers ; En jeu : − / + des consommables, fiche d'un objet (Équiper, Utiliser, Déplacer, Retirer).
// Objet : { n: nom, q: quantité, eq: équipé / porté sur soi, c: à décompter en jeu, note, ref : arme ou armure du catalogue, f : dossier,
// w (kg) / v (po) saisis, rar : rareté, unid : non identifié, desc : description,
// objet magique : bonus, xdmg (dégâts en plus), att / attuned (harmonisation), chMax / chU / rec (charges) }.
import { C } from "../classes/index.js";
import { onChange, onClick, onInput, onSubmit } from "../core/actions.js";
import { esc } from "../core/format.js";
import { G, S } from "../core/state.js";
import { mutate } from "../core/store.js";
import { render, toast } from "../core/ui.js";
import { GEAR, MAT, matByName } from "../data.js";
import { armorProf, gearOf, weaponProf } from "../rules/equipment.js";
import { hasFeat } from "../rules/feats.js";
import { MAX_ATT, REC, attunedCount, isMagic, recLabel } from "../rules/magic.js";
import { RARITIES, classify, coinsOf, fmtKg, fmtPo, folderOf, loadOf, pcText, saleOf, unitPc, weightOf } from "../rules/inventory.js";
import { COINS, purseText, purseValue, spend } from "../rules/money.js";
import { foldHead, foldKey, isFold } from "../ui/components.js";

/** Ordre d'affichage : objets équipés d'abord, puis l'ordre de la liste (indices du tableau d'origine, réglable avec ▲ ▼). */
const order = g => g.items.map((x, i) => i).sort((a, b) => (g.items[b].eq - g.items[a].eq) || a - b);
// Recherche (nom, note ou description, accents ignorés) : ▲ ▼ masqués pendant la recherche (les voisins cachés fausseraient le rangement)
const finding = () => !!(S.itFind || "").trim();
const found = x => !finding() || norm(`${x.n} ${x.note || ""} ${x.desc || ""}`).includes(norm(S.itFind.trim()));
// Filtre (puces) : "" tout, "eq" équipé, ou un dossier (ses objets, équipés compris)
const filterOf = g => S.itFilter === "eq" || g.folders.some(f => f.id === S.itFilter) ? S.itFilter : "";
/** Sections affichées : Équipé, puis chaque dossier dans l'ordre choisi (objets non équipés) ; ou la seule section du filtre. */
function sectionsOf(g) {
  const flt = filterOf(g), ids = order(g).filter(i => found(g.items[i]));
  const inF = id => i => folderOf(g, g.items[i]) === id;
  if (flt && flt !== "eq") { const f = g.folders.find(y => y.id === flt); return [{ id: f.id, n: f.n, list: ids.filter(inF(f.id)) }]; }
  const eq = { id: "eq", n: "Équipé", list: ids.filter(i => g.items[i].eq) };
  return flt === "eq" ? [eq] : [eq, ...g.folders.map(f => ({ id: f.id, n: f.n, list: ids.filter(i => !g.items[i].eq && inF(f.id)(i)) }))];
}
/** Sections repliables : row(i, pos, n) dessine un objet (pos et n : place dans sa section, pour ▲ ▼). */
function grouped(g, row) {
  const secs = sectionsOf(g).filter(x => x.list.length);
  if (!secs.length) return finding() ? `<div class="empty">Aucun objet ne correspond à « ${esc(S.itFind.trim())} ».</div>` : `<div class="empty">${filterOf(g) ? "Rien ici pour l'instant." : "Sac vide : touche <b>＋</b> pour ajouter un objet."}</div>`;
  return secs.map(x => { const k = "inv-" + x.id, np = (g.folders.find(f => f.id === x.id) || {}).np, loot = x.id === "butin" ? lootOf(g, x.list) : null;
    const h = foldHead(k, "invsec", esc(x.n), `${x.list.length}${np ? " · non porté" : ""}${loot && loot.pc ? ` · ≈ ${pcText(loot.pc)}` : ""}`, x.list.map(i => esc(g.items[i].n)).join(", "));
    return isFold(k) && !finding() ? h : h + `<div class="chbox itbox">${loot && S.view === "jeu" && !S.sell ? `<div class="sellbar"><span>Revente ≈ <b>${pcText(loot.sale)}</b>${loot.none ? ` · ${loot.none} sans valeur` : ""}</span><button class="btn sm" data-a="sell-open" data-v="butin">Vendre…</button></div>` : ""}${x.list.map((i, p) => row(i, p, x.list.length)).join("")}</div>`; }).join("");
}
// Charge (si suivie) : barre de poids, seuils de la variante, avertissement
function loadBarHTML(g) {
  const L = loadOf(g), top = Math.max(L.cap, L.kg), pct = x => Math.min(100, x / top * 100).toFixed(1);
  const tag = ["", "encombré · −3 m", "lourdement encombré · −6 m", "au-delà de la capacité"][L.level];
  return `<div class="invsum load"><div class="ln"><span class="k">Charge</span><b>${fmtKg(L.kg).replace(" kg", "")} <small>/ ${fmtKg(L.cap)}</small></b><span class="r">${tag ? `<i class="ld l${L.level}">${tag}</i>` : g.load === "cap" ? "capacité FOR × 7,5" : "non encombré"}</span></div>
    <div class="bar" role="img" aria-label="Charge ${fmtKg(L.kg)} sur ${fmtKg(L.cap)}"><span class="fill l${L.level}" style="width:${pct(L.kg)}%"></span>${g.load === "enc" ? `<i style="left:${pct(L.enc)}%"></i><i style="left:${pct(L.heavy)}%"></i>` : ""}</div>
    <small>${g.load === "enc" ? `encombré au-delà de ${fmtKg(L.enc)}, lourdement au-delà de ${fmtKg(L.heavy)}${L.level >= 2 ? " : désavantage aux tests, attaques et JdS de FOR, DEX et CON" : ""}` : L.level ? "au-delà, tu peux seulement pousser ou tirer (vitesse 1,50 m)" : ""}${L.unknown ? `${g.load === "enc" || L.level ? " · " : ""}${L.unknown} objet${L.unknown > 1 ? "s" : ""} sans poids` : ""}</small></div>`;
}
// Butin : valeur (pleine) et revente (moitié prix pour l'équipement du Manuel) des objets d'une section
function lootOf(g, list) {
  let pc = 0, sale = 0, none = 0;
  list.forEach(i => { const s = saleOf(g.items[i]); if (!s) { none++; return; } pc += Math.floor(s.unit * g.items[i].q); sale += s.total; });
  return { pc, sale, none };
}
// Vendre (S.sell : sel, indices cochés ; cand, objets proposés ; n, joueurs pour le partage) : total, part de chacun, dans la bourse
// Nombre vendu d'un objet : choisi pour un objet en plusieurs exemplaires (ex. vendre 3 perles, en garder 7), tous par défaut
const sellQ = (x, i) => Math.min(x.q, Math.max(1, (S.sell.qty || {})[i] ?? x.q));
const sellPc = (x, i) => { const s = saleOf(x); return s ? Math.floor(s.unit * (s.half ? 0.5 : 1) * sellQ(x, i)) : 0; };
function sellHTML(g) {
  const V = S.sell, rows = V.cand.filter(i => g.items[i]).map(i => { const x = g.items[i], s = saleOf(x), on = !!s && V.sel.includes(i), n = sellQ(x, i);
    return `<div class="sellrow"><button class="pkrow" data-a="sell-tog" data-i="${i}" aria-pressed="${on}"${s ? "" : " disabled"}><span class="ck" aria-hidden="true"></span><span>${x.q > 1 && !on ? x.q + " × " : ""}${esc(x.n)}</span><small>${s ? `${pcText(on ? sellPc(x, i) : s.total)}${s.half ? " · moitié prix" : ""}` : "sans valeur : ✎ Gérer"}</small></button>${on && x.q > 1 ? `<div class="sellq"><button class="btn sm" data-a="sell-q" data-i="${i}" data-v="-1" aria-label="${esc(x.n)} : en vendre un de moins"${n > 1 ? "" : " disabled"}>−</button><b>${n}</b><span>/ ${x.q}</span><button class="btn sm" data-a="sell-q" data-i="${i}" data-v="1" aria-label="${esc(x.n)} : en vendre un de plus"${n < x.q ? "" : " disabled"}>+</button><small>${n < x.q ? `tu en gardes ${x.q - n}` : "tout"}</small></div>` : ""}</div>`; }).join("");
  const tot = V.sel.reduce((t, i) => t + (g.items[i] ? sellPc(g.items[i], i) : 0), 0), part = Math.floor(tot / V.n);
  return `<div class="pkbox sellbox"><b class="sh">Vendre</b>${rows}<div class="selltot"><span>Total</span><b>${pcText(tot)}</b></div>
    <div class="sellsplit"><span>Partager entre</span><button class="btn sm" data-a="sell-n" data-v="-1" aria-label="Un joueur de moins"${V.n > 1 ? "" : " disabled"}>−</button><b>${V.n}</b><button class="btn sm" data-a="sell-n" data-v="1" aria-label="Un joueur de plus">+</button><span>joueur${V.n > 1 ? "s" : ""}</span>${V.n > 1 ? `<b class="part">${pcText(part)} chacun</b>` : ""}</div>
    <div class="pkgo"><button class="btn sm cast-go" data-a="sell-go"${tot ? "" : " disabled"}>Vendre · ${V.n > 1 ? `ma part (${pcText(part)})` : pcText(tot)} dans la bourse</button><button class="btn ghost sm" data-a="sell-cancel">Annuler</button></div>
    <small>Manuel : armes, armures et équipement se revendent à moitié prix ; gemmes, bijoux, objets d'art et objets magiques à la valeur saisie. Les objets vendus quittent le sac ; annulable.</small></div>`;
}
// En tête : recherche, ＋ (formulaire d'ajout juste dessous), puces de filtre, résumé (bourse, harmonisation)
function topHTML(g) {
  let h = `<div class="invtop"><input id="it-find" class="itfind" type="search" value="${esc(S.itFind || "")}" placeholder="🔍 Chercher un objet" aria-label="Chercher un objet" autocomplete="off"><button class="btn cast-go invplus" data-a="it-plus" aria-haspopup="dialog" aria-label="Ajouter un objet" title="Ajouter un objet">＋</button></div>`;
  const flt = filterOf(g), n = id => g.items.filter(x => folderOf(g, x) === id).length, chip = (v, l) => `<button class="chip" data-a="it-flt" data-v="${v}" aria-pressed="${flt === v}">${l}</button>`;
  if (g.items.length) h += `<div class="invf" role="group" aria-label="Filtrer l'inventaire">${chip("", "Tout")}${g.items.some(x => x.eq) ? chip("eq", "Équipé") : ""}${g.folders.filter(f => n(f.id) || flt === f.id).map(f => chip(f.id, esc(f.n))).join("")}</div>`;
  const val = purseValue(g.money) / 100;
  h += `<button class="invsum" data-a="m-open" aria-expanded="${!!S.purseOpen}" aria-label="Bourse : ${purseText(g.money)}. Gagner ou dépenser"><span class="k">Bourse</span><b>${purseText(g.money)}</b><span class="r">${val ? `≈ ${fmtPo(val)}` : ""} ${S.purseOpen ? "▴" : "›"}</span></button>`;
  if (S.purseOpen) h += purseHTML(g);
  if (g.load) h += loadBarHTML(g);
  if (S.sell) h += sellHTML(g);
  if (g.items.some(x => x.att)) { const on = g.items.filter(x => x.att && x.attuned), c = on.length;
    h += `<div class="invsum att"><span class="k">Harmonisation</span><span class="pips">${Array.from({ length: MAX_ATT }, (_, k) => `<span class="pip${k < c ? " used" : ""}" aria-hidden="true"></span>`).join("")}</span><b>${c} / ${MAX_ATT}</b><span class="r">${esc(on.map(x => x.n).join(", "))}</span></div>`; }
  return h;
}
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
// Arme pouvant aller en main secondaire : corps à corps légère, ou à une main avec le don Combattant à deux armes
const offhandOk = (g, x) => { const w = gearOf(x); return !!w && w.kind === "weapon" && w.rng === "melee" && !w.two && (w.light || hasFeat(g, "dual-wielder")); };
function itemForm(g, x, i) { // i : indice de l'objet (modification dans ✎ Gérer ; l'ajout passe par le volet « Ajouter un objet »)
  return `<form class="itform" data-a="it-save" data-i="${i}"><div class="frow2"><input id="it-name" type="text" value="${esc(x.n)}" aria-label="Nom" required><input id="it-q" type="number" inputmode="numeric" min="0" value="${x.q}" aria-label="Quantité"></div>
    <input id="it-note" type="text" value="${esc(x.note)}" placeholder="Note courte (effet, contenu…)" aria-label="Note">
    <div class="frow3${g.load ? "" : " nw"}"><label><span>Dossier</span><select id="it-f" aria-label="Dossier">${g.folders.map(f => `<option value="${esc(f.id)}"${f.id === folderOf(g, x) ? " selected" : ""}>${esc(f.n)}</option>`).join("")}</select></label>
${g.load ? `<label><span>Poids (kg)</span><input id="it-w" type="text" inputmode="decimal" value="${x.w != null ? String(x.w).replace(".", ",") : ""}" placeholder="${weightOf({ ref: x.ref, mat: x.mat }) != null ? String(weightOf({ ref: x.ref, mat: x.mat })).replace(".", ",") : "—"}" aria-label="Poids en kg, à l'unité"></label>` : ""}
      <label><span>Valeur</span><span class="vrow"><input id="it-v" type="text" inputmode="decimal" value="${x.v != null ? String(+(x.v / VC[vcOf(x)]).toFixed(4)).replace(".", ",") : ""}" placeholder="—" aria-label="Valeur à l'unité"><select id="it-vc" aria-label="Pièce">${Object.keys(VC).map(k => `<option${k === vcOf(x) ? " selected" : ""}>${k}</option>`).join("")}</select></span></label></div>
    <textarea id="it-desc" rows="2" placeholder="Description (texte de l'objet, ce qu'en dit le MJ…)" aria-label="Description">${esc(x.desc || "")}</textarea>
    <label class="itref"><span>Arme ou armure du Manuel</span><select id="it-ref" aria-label="Arme ou armure du Manuel"><option value="">Aucune (objet libre)</option>${REF_GROUPS.map(([l, list]) => `<optgroup label="${l}">${list.map(r => `<option value="${r.id}"${r.id === x.ref ? " selected" : ""}>${esc(r.n)}</option>`).join("")}</optgroup>`).join("")}</select></label>
    <fieldset class="itmagic"><legend>✦ Objet magique</legend>
      <label><span>Bonus</span><select id="it-bonus" aria-label="Bonus magique">${[0, 1, 2, 3].map(b => `<option value="${b}"${(x.bonus || 0) === b ? " selected" : ""}>${b ? "+" + b : "aucun"}</option>`).join("")}</select></label>
      <label class="wide"><span>Dégâts en plus</span><input id="it-xdmg" type="text" value="${esc(x.xdmg || "")}" placeholder="ex. 1d4 nécrotique" aria-label="Dégâts en plus"></label>
      <label><span>Charges</span><input id="it-ch" type="number" inputmode="numeric" min="0" max="50" value="${x.chMax || ""}" placeholder="0" aria-label="Nombre de charges"></label>
      <label class="wide"><span>Recharge</span><select id="it-rec" aria-label="Recharge des charges">${REC.map(([k, l]) => `<option value="${k}"${(x.chMax ? x.rec : "aube") === k ? " selected" : ""}>${l}</option>`).join("")}</select></label>
      <div class="row wide"><label class="check"><input type="checkbox" id="it-att"${x.att ? " checked" : ""}> Harmonisation requise</label><label class="check"><input type="checkbox" id="it-attuned"${x.attuned ? " checked" : ""}> Harmonisé</label></div>
      <label><span>Rareté</span><select id="it-rar" aria-label="Rareté"><option value="">—</option>${RARITIES.map(r => `<option${x.rar === r ? " selected" : ""}>${r}</option>`).join("")}</select></label>
      <div class="row wide"><label class="check"><input type="checkbox" id="it-unid"${x.unid ? " checked" : ""}> Non identifié (effet encore inconnu)</label></div>
      <p class="wide">Le bonus s'applique au toucher et aux dégâts d'une arme du Manuel, ou à la CA d'une armure ou d'un bouclier. Un objet à harmonisation n'a d'effet qu'harmonisé (${MAX_ATT} au plus).</p>
    </fieldset>
    <div class="row"><label class="check"><input type="checkbox" id="it-eq"${x.eq ? " checked" : ""}> Équipé</label><label class="check"><input type="checkbox" id="it-c"${x.c ? " checked" : ""}> À décompter en jeu</label>${offhandOk(g, x) ? `<label class="check" title="Combat à deux armes : cette arme pour l'attaque en action bonus"><input type="checkbox" id="it-oh"${x.oh ? " checked" : ""}> Main secondaire</label>` : ""}
    <span style="flex:1"></span><button type="button" class="btn ghost" data-a="it-del" data-i="${i}">Retirer</button><button type="button" class="btn ghost" data-a="it-cancel">Annuler</button><button class="btn primary" type="submit">Enregistrer</button></div></form>`;
}
// Valeur d'un objet : saisie dans une pièce au choix (pp, po, pe, pa, pc), gardée en po (x.v) avec la pièce saisie (x.vc)
const VC = { pp: 10, po: 1, pe: 0.5, pa: 0.1, pc: 0.01 };
const vcOf = x => VC[x.vc] ? x.vc : "po";
const valText = x => `${String(+(x.v / VC[vcOf(x)]).toFixed(4)).replace(".", ",")} ${vcOf(x)}`;
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
const hasDetail = x => !!(gearOf(x) || MAT[x.mat] || x.desc || x.v != null || x.w != null || x.rar);
const openBtn = (x, i, inner) => hasDetail(x) ? `<button class="itn itopen" data-a="it-open" data-i="${i}" aria-expanded="${S.itOpen === i}">${inner}</button>` : `<div class="itn">${inner}</div>`;
const chev = (x, i) => hasDetail(x) ? `<span class="chev" aria-hidden="true">${S.itOpen === i ? "▾" : "▸"}</span> ` : "";
// Choix du lien dans le formulaire, par catégorie
const REF_GROUPS = [["simple", "Armes courantes"], ["martial", "Armes de guerre"], ["light", "Armures légères"], ["medium", "Armures intermédiaires"], ["heavy", "Armures lourdes"], ["shield", "Bouclier"]]
  .map(([k, l]) => [l, Object.values(GEAR).filter(x => x.cat === k)]);
const gearTag = x => `<span class="gtag ${x.kind === "weapon" ? "w" : "a"}">${x.kind === "weapon" ? "arme" : x.cat === "shield" ? "bouclier" : "armure"}</span>`;
// Équipement d'aventurier, outils, paquetages (data/materiel.json) : poids, prix et dossier proposé
const matLine = (g, m) => [m.g, m.u ? `lot de ${m.u.q} · ${m.p}` : m.p, m.w != null ? fmtKg(m.u ? m.w * m.u.q : m.w) : "", (g.folders.find(f => f.id === m.f) || {}).n].filter(Boolean).join(" · ");
// ---------- Volet « Ajouter un objet » (S.add : q, recherche ; d, objet en préparation ; more, plus d'options ; loot, valeur visible)
// Chercher → choisir (dans ton sac, Manuel, objet libre) → ajuster (quantité, dossier, équipé…) → Ajouter. Le volet se ferme après l'ajout.
const plural2 = (n, x) => n > 1 && !/s$/i.test(x) ? x.replace(/^(\S+)/, "$1s") : x;
function addSheetHTML(g) {
  const A = S.add, head = (t, back) => `<div class="grab"></div><div class="head adhead">${back ? `<button class="btn ghost sm" data-a="ad-back" aria-label="Retour à la recherche">‹</button>` : ""}<h2>${t}</h2><button class="btn ghost sm" data-a="ad-close" aria-label="Fermer">✕</button></div>`;
  if (!A.d) {
    const q = (A.q || "").trim();
    return head("Ajouter un objet") + `<form class="adfind" data-a="ad-find"><input id="ad-q" type="search" value="${esc(A.q || "")}" placeholder="🔍 Nom de l'objet" aria-label="Nom de l'objet" autocomplete="off" enterkeyhint="go"></form>`
      + (q.length >= 2 ? addResultsHTML(g, q) : `<p class="help">Le Manuel est proposé pendant la saisie : armes, armures, équipement d'aventurier, outils, paquetages. Sinon, l'objet est créé à ton nom.</p>
        <div class="adshort"><button class="btn mg" data-a="ad-new" data-v="magie">✦ Objet magique</button><button class="btn gd" data-a="ad-new" data-v="butin">◆ Butin (avec valeur)</button></div>`);
  }
  return head("Ajouter un objet", true) + addCfgHTML(g);
}
function addResultsHTML(g, q) {
  const k = norm(q), mine = g.items.map((x, i) => i).filter(i => norm(g.items[i].n).includes(k)).slice(0, 4);
  const gear = Object.values(GEAR).filter(x => norm(x.n).includes(k) || norm(x.vo).includes(k)).slice(0, 4);
  const mat = Object.values(MAT).filter(x => [x.n, ...(x.al || [])].some(n => norm(n).includes(k))).slice(0, 7 - gear.length);
  const prof = x => x.kind === "weapon" ? weaponProf(g, x) : armorProf(g, x), fe = x => x.kind === "armor" && x.cat !== "shield" ? "e" : "";
  const row = (attrs, n, sub, tag = "") => `<button class="adres" ${attrs}><span><b>${n}</b>${tag}<small>${sub}</small></span><i aria-hidden="true">›</i></button>`;
  let h = "";
  if (mine.length) h += `<div class="adcap">Dans ton sac</div>` + mine.map(i => { const x = g.items[i], fn = (g.folders.find(f => f.id === folderOf(g, x)) || {}).n || "";
    return `<div class="admine">${row(`data-a="ad-pick" data-i="${i}"`, esc(x.n), `${esc(fn)} · tu en as ${x.q}`)}<button class="btn sm" data-a="ad-inc" data-i="${i}" aria-label="${esc(x.n)} : un de plus">+1 → ${x.q + 1}</button></div>`; }).join("");
  if (gear.length || mat.length) h += `<div class="adcap">Manuel</div>` + gear.map(x => row(`data-a="ad-pick" data-g="${x.id}"`, esc(x.n), esc(gearLine(x)), `<i class="${prof(x) ? "ok" : "no"}">${prof(x) ? "maîtrisé" : "non maîtrisé"}${fe(x)}</i>`)).join("")
    + mat.map(x => row(`data-a="ad-pick" data-m="${x.id}"`, esc(x.n), esc(matLine(g, x)))).join("");
  return h + `<div class="adcap">Libre</div>` + row(`data-a="ad-pick" data-n="1"`, `Créer « ${esc(q)} »`, "objet libre, à ton nom");
}
// Champ du volet : data-k (champ de S.add.d), data-t (texte, nombre, case)
const adf = (k, attrs = "") => `class="adf" data-k="${k}" ${attrs}`;
function addCfgHTML(g) {
  const A = S.add, d = A.d, into = d.into != null ? g.items[d.into] : null, gear = GEAR[d.ref], m = MAT[d.mat], loot = d.f === "butin";
  const pills = gear ? `<span class="kp n">${esc(gearLine(gear))}</span>${gear.p ? `<span class="kp n">${esc(gear.p)}</span>` : ""}` : m ? `<span class="kp n">${esc(m.g)}</span><span class="kp n">${esc(m.u ? `${m.p} les ${m.u.q}` : m.p)}</span>${m.w != null ? `<span class="kp n">${fmtKg(m.w)}</span>` : ""}` : `<span class="kp f">objet libre</span>`;
  const sw = (k, l, sub = "") => `<label class="adsw"><span>${l}${sub ? `<small>${sub}</small>` : ""}</span><input type="checkbox" ${adf(k, 'data-t="b"')}${d[k] ? " checked" : ""}><i aria-hidden="true"></i></label>`;
  const coin = `<span class="adcoin" role="group" aria-label="Pièce">${Object.keys(VC).map(k => `<button type="button" data-a="ad-vc" data-v="${k}" aria-pressed="${(d.vc || "po") === k}">${k}</button>`).join("")}</span>`;
  const sale = loot && (gear || m) && !A.mag ? " · revente à moitié prix" : loot && A.mag ? " · objet magique : pleine valeur à la vente" : "";
  const value = `<div class="adblk"><span class="adcap">Valeur à l'unité</span><div class="adval"><input id="ad-v" type="text" inputmode="decimal" ${adf("v", 'data-t="n"')} value="${esc(d.v ?? "")}" placeholder="—" aria-label="Valeur à l'unité">${coin}</div>${loot ? `<small class="adhint">${gear || m ? "prix du Manuel, modifiable si le MJ annonce autre chose" : "valeur annoncée par le MJ"}${sale}</small>` : ""}</div>`;
  const magic = `<fieldset class="admagic"><legend>✦ Objet magique</legend>
        <label><span>Bonus</span><select id="ad-bonus" ${adf("bonus", 'data-t="i"')}>${[0, 1, 2, 3].map(b => `<option value="${b}"${(d.bonus || 0) === b ? " selected" : ""}>${b ? "+" + b : "aucun"}</option>`).join("")}</select></label>
        <label><span>Rareté</span><select id="ad-rar" ${adf("rar")}><option value="">—</option>${RARITIES.map(r => `<option${d.rar === r ? " selected" : ""}>${r}</option>`).join("")}</select></label>
        <label><span>Dégâts en plus</span><input id="ad-xdmg" type="text" ${adf("xdmg")} value="${esc(d.xdmg || "")}" placeholder="ex. 1d4 feu"></label>
        <label><span>Charges</span><input id="ad-ch" type="text" inputmode="numeric" ${adf("chMax", 'data-t="i"')} value="${d.chMax || ""}" placeholder="0"></label>
        <label class="wide"><span>Recharge des charges</span><select id="ad-rec" ${adf("rec")}>${REC.map(([k, l]) => `<option value="${k}"${(d.rec ?? "aube") === k ? " selected" : ""}>${l}</option>`).join("")}</select></label>
        <div class="wide row"><label class="check"><input type="checkbox" ${adf("att", 'data-t="b"')}${d.att ? " checked" : ""}> Harmonisation requise</label><label class="check"><input type="checkbox" ${adf("unid", 'data-t="b"')}${d.unid ? " checked" : ""}> Non identifié</label></div>
      </fieldset>`;
  let h = `<input id="ad-n" class="adf adname" data-k="n" type="text" value="${esc(d.n)}" placeholder="Nom de l'objet" aria-label="Nom de l'objet" required>
    <div class="pills">${pills}</div>${m && m.fx ? `<p class="adfx">${esc(m.fx)}</p>` : ""}${m && m.pack ? `<p class="adfx">Paquetage : tu pourras le déballer ensuite (touche-le dans l'inventaire).</p>` : ""}
    ${into ? `<p class="adinto">Tu en as déjà <b>${into.q}</b> : la quantité s'ajoute (${into.q} → ${into.q + (+d.q || 1)}).</p>` : ""}`;
  // ✦ Magique et ◆ Butin : précisent l'objet choisi (lien avec le Manuel gardé)
  if (!into) h += `<div class="admodes"><button type="button" class="btn mg" data-a="ad-mode" data-v="mag" aria-pressed="${!!A.mag}">✦ Magique${A.mag ? " ✓" : ""}</button><button type="button" class="btn gd" data-a="ad-mode" data-v="loot" aria-pressed="${loot}">◆ Butin${loot ? " ✓" : ""}</button></div>${A.mag ? magic : ""}${loot ? value : ""}`;
  h += `<div class="adqty"><span>Quantité${m && m.u ? ` <small>lot de ${m.u.q}</small>` : ""}</span><button type="button" class="btn" data-a="ad-qty" data-v="-1" aria-label="Un de moins"${+d.q > 1 ? "" : " disabled"}>−</button><input id="ad-qn" type="text" inputmode="numeric" ${adf("q", 'data-t="i"')} value="${d.q}" aria-label="Quantité"><button type="button" class="btn" data-a="ad-qty" data-v="1" aria-label="Un de plus">+</button></div>`;
  if (!into) {
    h += `<div class="adblk"><span class="adcap">Dossier</span><div class="adfold">${g.folders.map(f => `<button type="button" class="chip" data-a="ad-f" data-v="${esc(f.id)}" aria-pressed="${d.f === f.id}">${esc(f.n)}</button>`).join("")}</div></div>
      ${sw("eq", "Équipé", gear ? (gear.kind === "weapon" ? "attaques mises à jour" : "CA mise à jour") : "sur toi, utilisé")}${sw("c", "À décompter en jeu", "− / + sur la ligne, et dans l'onglet d'action")}
      <button type="button" class="admore" data-a="ad-more" aria-expanded="${!!A.more}">${A.more ? "▾" : "▸"} Plus d'options <small>note, description${g.load ? ", poids" : ""}${loot ? "" : ", valeur"}</small></button>`;
    if (A.more) h += `<div class="adopts"><input id="ad-note" type="text" ${adf("note")} value="${esc(d.note || "")}" placeholder="Note courte (effet, contenu…)" aria-label="Note">
      <textarea id="ad-desc" rows="2" ${adf("desc")} placeholder="Description (texte de l'objet, ce qu'en dit le MJ…)" aria-label="Description">${esc(d.desc || "")}</textarea>
      ${g.load ? `<label class="adline"><span>Poids à l'unité (kg)</span><input id="ad-w" type="text" inputmode="decimal" ${adf("w", 'data-t="n"')} value="${esc(d.w ?? "")}" placeholder="${weightOf({ ref: d.ref, mat: d.mat }) != null ? String(weightOf({ ref: d.ref, mat: d.mat })).replace(".", ",") : "—"}"></label>` : ""}${loot ? "" : value}</div>`;
  }
  const q = Math.max(1, Math.floor(+d.q) || 1), fn = into ? "" : ((g.folders.find(f => f.id === d.f) || {}).n || "");
  const label = `Ajouter · ${q > 1 ? q + " " : ""}${esc(plural2(q, d.n.trim() || "objet"))}${A.mag && +d.bonus ? ` +${d.bonus}` : ""}${A.mag ? " ✦" : ""}${!into && d.f === "butin" ? " au butin" : ""}`;
  return h + `<div class="adfoot"><button class="btn primary adgo" data-a="ad-go"${d.n.trim() ? "" : " disabled"}>${label}</button><div class="row"><small>${into ? "au stock existant" : `dans ${esc(fn)}${d.eq ? " · équipé" : ""}`}</small><button class="btn ghost sm" data-a="ad-go" data-v="more"${d.n.trim() ? "" : " disabled"}>Ajouter et continuer</button></div></div>`;
}
/** Nouvel objet d'après son nom : arme ou armure du Manuel (lien ref), objet du catalogue (lien mat : lot, à décompter, dossier), sinon libre. */
function newItem(g, n) {
  const gear = Object.values(GEAR).find(x => norm(x.n) === norm(n)), m = !gear && matByName(n);
  const x = { n: m && m.u && norm(n) === norm(m.n) ? m.u.n : n, q: m && m.u ? m.u.q : 1, /* nom tapé gardé (« Potion de soins ») ; lot : nom de l'objet */ eq: false, c: !!(m && m.c), note: "", ...(gear ? { ref: gear.id } : m ? { mat: m.id } : {}) };
  x.f = newFolder(g, x); return x;
}
// Marques d'un objet magique : bonus, harmonisation, charges
const magicMarks = x => !isMagic(x) ? "" : ` <i class="mg">✦${x.inf && G() && C(G()).itemMagic ? ` ${esc((C(G()).itemMagic(G(), x) || {}).label || "")}` : ""}${x.bonus ? ` +${x.bonus}` : ""}${x.att ? (x.attuned ? " · harmonisé" : " · à harmoniser") : ""}${x.chMax ? ` · ${x.chMax - (x.chU || 0)}/${x.chMax} charge${x.chMax > 1 ? "s" : ""}` : ""}</i>`;
// Cercles de charges (En jeu) : toucher un cercle pour dépenser ou rendre une charge
const chargePips = (x, i) => `<div class="itch">${Array.from({ length: x.chMax }, (_, k) => `<button class="pip${k < (x.chU || 0) ? " used" : ""}" data-a="it-chg" data-i="${i}" data-k="${k}" aria-label="${esc(x.n)} : charge ${k + 1}, ${k < (x.chU || 0) ? "utilisée" : "disponible"}"></button>`).join("")}<small>${recLabel(x.rec)}</small></div>`;
function equipmentGerer(g) {
  const row = (i, p, n) => { const x = g.items[i]; return S.itEdit === i ? itemForm(g, x, i)
    : `<div class="it${x.c && !x.q ? " out" : ""}${fresh(i)}"><button class="itck" data-a="it-eq" data-i="${i}" aria-pressed="${x.eq}" aria-label="${esc(x.n)} : ${x.eq ? "équipé" : "non équipé"}"></button>${openBtn(x, i, `<span>${chev(x, i)}${esc(x.n)}${freshTag(i)}${lootVal(g, x)}${x.q !== 1 ? ` <b>×${x.q}</b>` : ""}${x.c ? ` <i class="ct">à décompter</i>` : ""}${x.oh ? ` <i class="ct">main secondaire</i>` : ""}${magicMarks(x)}${unidTag(x)}</span>${x.note || gearOf(x) ? `<small>${esc(x.note || gearLine(gearOf(x)))}</small>` : ""}`)}${gearOf(x) ? gearTag(gearOf(x)) : ""}${moveBtns(x, i, p, n)}<button class="btn ghost sm" data-a="it-edit" data-i="${i}" aria-label="Modifier ${esc(x.n)}">✎</button></div>${S.itOpen === i ? itemDetail(g, x, i) : ""}`; };
  return topHTML(g) + grouped(g, row) + loadSetHTML(g) + foldersHTML(g);
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
/** Onglet Inventaire : Gérer (rangement ▲ ▼, fiche complète, dossiers) ou En jeu (− / +, fiche d'un objet et ses gestes). */
const inventoryHTML = g => `<div class="viewsw" role="group" aria-label="Affichage de l'inventaire"><button data-a="view" data-v="gerer" aria-pressed="${S.view !== "jeu"}">✎ Gérer</button><button data-a="view" data-v="jeu" aria-pressed="${S.view === "jeu"}">En jeu</button></div>` + (S.view === "jeu" ? equipmentJeu(g) : equipmentGerer(g));
// Objet tout juste ajouté : ligne surlignée et « nouveau » (jusqu'au prochain ajout ou au changement d'onglet)
// Butin : valeur estimée de la ligne (quantité comprise), visible sans déplier
const lootVal = (g, x) => { if (x.eq || folderOf(g, x) !== "butin") return ""; const u = unitPc(x); return ` <i class="lootv${u == null ? " none" : ""}">${u == null ? "valeur ?" : `≈ ${pcText(Math.floor(u * x.q))}`}</i>`; };
const fresh = i => (S.fresh || []).includes(i) ? " fresh" : "";
const freshTag = i => (S.fresh || []).includes(i) ? ` <i class="newtag">nouveau</i>` : "";
const unidTag = x => x.unid ? ` <i class="unid">non identifié</i>` : "";
const qtyBtns = (x, i) => `<div class="qty"><button class="btn sm" data-a="it-dec" data-i="${i}" aria-label="${esc(x.n)} : un de moins"${x.q ? "" : " disabled"}>−</button><b>${x.q}</b><button class="btn sm" data-a="it-inc" data-i="${i}" aria-label="${esc(x.n)} : un de plus">+</button></div>`;
// En jeu : toucher un objet ouvre sa fiche ; les consommables (à décompter) ont − / + sur la ligne
function equipmentJeu(g) {
  const row = i => { const x = g.items[i], open = S.itOpen === i;
    return `<div class="it j${x.eq ? " eq" : ""}${x.c && !x.q ? " out" : ""}${fresh(i)}"><button class="itn itopen" data-a="it-open" data-i="${i}" aria-expanded="${open}"><span><span class="chev" aria-hidden="true">${open ? "▾" : "▸"}</span> ${esc(x.n)}${freshTag(i)}${lootVal(g, x)}${magicMarks(x)}${x.eq ? ` <i class="eqtag">${gearOf(x) && gearOf(x).kind === "armor" && gearOf(x).cat !== "shield" ? "portée" : "équipé"}</i>` : ""}${unidTag(x)}</span>${x.note ? `<small>${esc(x.note)}</small>` : ""}</button>${x.c ? qtyBtns(x, i) : x.q !== 1 ? `<b class="q">×${x.q}</b>` : ""}</div>${open ? itemPlay(g, x, i) : ""}`; };
  return topHTML(g) + grouped(g, row);
}
/** Détail d'un objet : arme ou armure du Manuel, poids, valeur, rareté, description ; objet du catalogue : groupe, prix, effet, contenu d'un paquetage. */
function itemDetail(g, x, i) {
  const m = MAT[x.mat];
  const mat = m ? `<div class="itinfo"><div class="pills"><span class="kp n">${esc(m.g)}</span><span class="kp n">${esc(m.u ? `${m.p} les ${m.u.q}` : m.p)}</span>${m.w != null && x.w == null ? `<span class="kp n">${fmtKg(m.w)}${x.q > 1 ? " pièce" : ""}</span>` : ""}${resale(x)}</div>${m.fx ? `<p>${esc(m.fx)}</p>` : ""}${m.pack ? packHTML(g, x, i, m) : ""}</div>` : "";
  return mat + itemOwn(g, x);
}
// Paquetage : contenu ; « Déballer… » ouvre la liste à cocher (ce qui manque se décoche), puis le remplace par ses objets
function packHTML(g, x, i, m) {
  const U = S.unpack && S.unpack.i === i ? S.unpack : null, kgOf = ([, q, id]) => MAT[id] && MAT[id].w != null ? fmtKg(MAT[id].w * q) : "";
  if (!U) return `<p class="pkin">Contient : ${m.pack.map(([n, q]) => `${q > 1 ? q + " × " : ""}${esc(n.toLowerCase())}`).join(", ")}.</p><div class="pkgo"><button class="btn sm" data-a="up-open" data-i="${i}">Déballer…</button><small>pour suivre chaque objet (torches, rations…)</small></div>`;
  const n = m.pack.length - U.off.length;
  return `<div class="pkbox"><p>Décoche ce que tu n'as plus.${x.q > 1 ? ` Un seul des ${x.q} sacs est déballé.` : ""}</p>${m.pack.map((c, k) => `<button class="pkrow" data-a="up-tog" data-k="${k}" aria-pressed="${!U.off.includes(k)}"><span class="ck" aria-hidden="true"></span><span>${c[1] > 1 ? c[1] + " × " : ""}${esc(c[0])}</span><small>${kgOf(c)}</small></button>`).join("")}
    <div class="pkgo"><button class="btn sm cast-go" data-a="up-go" data-i="${i}"${n ? "" : " disabled"}>Déballer · ${n} objet${n > 1 ? "s" : ""}</button><button class="btn ghost sm" data-a="up-cancel">Garder en un seul objet</button></div><small>Les objets vont dans leur dossier (torches, rations : Consommables). Annulable.</small></div>`;
}
function itemOwn(g, x) {
  const w = weightOf(x), pills = [w != null && (x.w != null || (!gearOf(x) && !MAT[x.mat])) ? fmtKg(w) + (x.q > 1 ? " pièce" : "") : "", x.v != null ? valText(x) + (x.q > 1 ? " pièce" : "") : "", x.rar || ""].filter(Boolean), rs = MAT[x.mat] ? "" : resale(x); // poids du Manuel : déjà dans le détail de l'arme
  return `${gearOf(x) ? gearDetail(g, gearOf(x), x) : ""}${pills.length || rs || x.desc ? `<div class="itinfo">${pills.length || rs ? `<div class="pills">${pills.map(t => `<span class="kp n">${esc(t)}</span>`).join("")}${rs}</div>` : ""}${x.desc ? `<p>${esc(x.desc)}</p>` : ""}</div>` : ""}`;
}
// Prix de revente d'un équipement du Manuel (moitié prix)
const resale = x => { const s = saleOf(x); return s && s.half ? `<span class="kp n">revente ${pcText(s.total)}${x.q > 1 ? " les " + x.q : ""} (moitié prix)</span>` : ""; };
/** Fiche d'un objet en jeu : détail, puis les gestes de la partie (le reste se règle dans ✎ Gérer). */
function itemPlay(g, x, i) {
  const gear = gearOf(x), lbl = x.eq ? "Ranger" : gear && gear.kind === "armor" && gear.cat !== "shield" ? "Porter" : "Équiper";
  return `${itemDetail(g, x, i)}${x.unid ? `<p class="itunid">Effet inconnu : une étude pendant un repos court (ou le sort <i>identification</i>) le révèle. Complète la fiche (✎ Gérer) avec ce que dit le MJ.</p>` : ""}<div class="itplay">${x.c ? `<button class="btn sm cast-go" data-a="it-dec" data-i="${i}"${x.q ? "" : " disabled"}>Utiliser · −1</button>` : ""}<button class="btn sm${x.eq || x.c ? "" : " cast-go"}" data-a="it-eq" data-i="${i}" aria-pressed="${!!x.eq}">${lbl}</button>${x.unid ? `<button class="btn sm" data-a="it-idf" data-i="${i}">Identifié ✓</button>` : ""}<select class="itmvf" data-a="it-fold" data-i="${i}" aria-label="Déplacer ${esc(x.n)} vers un dossier"><option value="" selected>Déplacer…</option>${g.folders.filter(f => f.id !== folderOf(g, x)).map(f => `<option value="${esc(f.id)}">${esc(f.n)}</option>`).join("")}</select><span style="flex:1"></span>${saleOf(x) && !x.eq ? `<button class="btn ghost sm" data-a="sell-open" data-i="${i}">Vendre</button>` : ""}<button class="btn ghost sm" data-a="it-del" data-i="${i}">Retirer</button></div>`;
}
/** Gérer : charge suivie ou non (au choix du MJ), poids des pièces. */
function loadSetHTML(g) {
  let h = foldHead("inv-load", "", "Charge", g.load === "enc" ? "variante d'encombrement" : g.load === "cap" ? "capacité de charge" : "pas suivie");
  if (isFold("inv-load")) return h;
  const s = g.abil.str, opt = (v, l) => `<button data-a="load-set" data-v="${v}" aria-pressed="${g.load === v}">${l}</button>`;
  return h + `<div class="chbox ldbox"><div class="viewsw ld3" role="group" aria-label="Charge">${opt("", "Pas suivie")}${opt("cap", "Capacité")}${opt("enc", "Encombrement")}</div>
    <p><b>Capacité de charge</b> (règle de base) : FOR × 7,5 kg = <b>${fmtKg(s * 7.5)}</b>. Au-delà, tu peux pousser ou tirer jusqu'au double (vitesse 1,50 m).</p>
    <p><b>Encombrement</b> (variante du Manuel, au choix du MJ) : au-delà de FOR × 2,5 kg = <b>${fmtKg(s * 2.5)}</b>, encombré : vitesse −3 m ; au-delà de FOR × 5 kg = <b>${fmtKg(s * 5)}</b>, lourdement encombré : vitesse −6 m et désavantage aux tests, jets d'attaque et JdS de FOR, DEX et CON. La Force requise des armures ne s'applique plus.</p>
    <label class="check"><input type="checkbox" data-a="coin-w"${g.coinW ? " checked" : ""}> Compter le poids des pièces (100 pièces = 1 kg)</label>
    <small>Comptent : les objets équipés et ceux des dossiers portés. Un dossier <b>non porté</b> (monture, coffre) se règle dans Dossiers. Taille TP : capacité divisée par deux ; G : doublée (à ajuster par le MJ).</small></div>`;
}
/** Gérer : dossiers (ordre des sections, nom, création, suppression ; Divers reçoit les objets d'un dossier supprimé). */
function foldersHTML(g) {
  let h = foldHead("inv-dirs", "", "Dossiers", "ordre des sections", g.folders.map(f => esc(f.n)).join(", "));
  if (isFold("inv-dirs")) return h;
  const n = id => g.items.filter(x => folderOf(g, x) === id).length;
  h += `<div class="chbox fdbox"><div class="fdrow lock"><b>Équipé</b><small>toujours en premier</small></div>${g.folders.map((f, p) => S.fdEdit === f.id
    ? `<form class="fdrow" data-a="fd-save" data-v="${esc(f.id)}"><input id="fd-name" type="text" value="${esc(f.n)}" maxlength="40" aria-label="Nom du dossier" required><button class="btn primary sm" type="submit">OK</button></form>`
    : `<div class="fdrow"><b>${esc(f.n)} <span>${n(f.id)}</span></b><button class="btn ghost sm fdnp" data-a="fd-np" data-v="${esc(f.id)}" aria-pressed="${!!f.np}" title="Un dossier non porté (monture, coffre) ne compte pas dans la charge">${f.np ? "non porté" : "porté"}</button><span class="itmv"><button class="btn ghost sm" data-a="fd-mv" data-v="${esc(f.id)}" data-d="-1" aria-label="Monter ${esc(f.n)}"${p ? "" : " disabled"}>▲</button><button class="btn ghost sm" data-a="fd-mv" data-v="${esc(f.id)}" data-d="1" aria-label="Descendre ${esc(f.n)}"${p < g.folders.length - 1 ? "" : " disabled"}>▼</button></span><button class="btn ghost sm" data-a="fd-edit" data-v="${esc(f.id)}" aria-label="Renommer ${esc(f.n)}">✎</button>${f.id === "divers" ? "" : `<button class="btn ghost sm" data-a="fd-del" data-v="${esc(f.id)}" aria-label="Supprimer ${esc(f.n)}">✕</button>`}</div>`).join("")}
    <button class="btn" data-a="fd-new">＋ Nouveau dossier</button></div>`;
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

onInput("#it-find", t => { S.itFind = t.value; render(); });
onClick("it-flt", (b) => { S.itFilter = b.dataset.v; S.itOpen = null; render(); });
// Dossier où va un nouvel objet : celui du filtre en cours, sinon celui proposé par son type
const autoFolder = (g, x) => g.folders.some(y => y.id === classify(x)) ? classify(x) : folderOf(g, {});
const newFolder = (g, x) => { const f = filterOf(g); return f && f !== "eq" ? f : autoFolder(g, x); };
onChange("it-fold", t => { const i = +t.dataset.i, g = G(), x = g && g.items[i], f = t.value; if (!x || !f) return; const prev = x.f, fn = (g.folders.find(y => y.id === f) || {}).n;
  S.itOpen = null; mutate(g => { g.items[i].f = f; }); toast(`<b>${esc(x.n)}</b> → ${esc(fn)}`, () => { mutate(g => { g.items[i].f = prev; }); return "Rétabli"; }); });
// Vendre : depuis la section Butin (tous ses objets cochés) ou la fiche d'un objet ; partage, puis la part dans la bourse
onClick("sell-open", (b) => { const g = G(), i = b.dataset.i != null ? +b.dataset.i : null;
  const cand = i != null ? [i, ...g.items.map((x, k) => k).filter(k => k !== i && folderOf(g, g.items[k]) === "butin" && !g.items[k].eq)] : g.items.map((x, k) => k).filter(k => folderOf(g, g.items[k]) === "butin" && !g.items[k].eq);
  S.sell = { cand, sel: (i != null ? [i] : cand).filter(k => saleOf(g.items[k])), n: (S.sell && S.sell.n) || S.sellN || 1 }; S.itOpen = null; render(); window.scrollTo({ top: Math.min(window.scrollY, (document.querySelector(".sellbox") || {}).offsetTop || 0), behavior: "instant" }); });
onClick("sell-tog", (b) => { const V = S.sell, i = +b.dataset.i; if (!V) return; V.sel = V.sel.includes(i) ? V.sel.filter(k => k !== i) : [...V.sel, i]; render(); });
onClick("sell-n", (b) => { const V = S.sell; if (!V) return; V.n = Math.max(1, Math.min(12, V.n + +b.dataset.v)); S.sellN = V.n; render(); });
onClick("sell-cancel", () => { S.sell = null; render(); });
onClick("sell-q", (b) => { const V = S.sell, i = +b.dataset.i, x = G() && G().items[i]; if (!V || !x) return; V.qty = { ...(V.qty || {}), [i]: Math.min(x.q, Math.max(1, sellQ(x, i) + +b.dataset.v)) }; render(); });
onClick("sell-go", () => {
  const g = G(), V = S.sell; if (!g || !V) return; const sel = V.sel.filter(i => g.items[i] && saleOf(g.items[i])), qs = Object.fromEntries(sel.map(i => [i, sellQ(g.items[i], i)]));
  const tot = sel.reduce((t, i) => t + sellPc(g.items[i], i), 0), part = Math.floor(tot / V.n); if (!tot) return;
  const prevI = g.items.map(y => ({ ...y })), prevM = { ...g.money }, names = sel.map(i => `${qs[i] > 1 ? qs[i] + " × " : ""}${g.items[i].n}`), c = coinsOf(part);
  mutate(g => { sel.forEach(i => { g.items[i].q -= qs[i]; }); g.items = g.items.filter((y, k) => !sel.includes(k) || y.q > 0); g.money.po += c.po; g.money.pa += c.pa; g.money.pc += c.pc; }); // ce qui n'est pas vendu reste dans le sac
  S.sell = null; S.itOpen = null;
  toast(`Vendu : ${esc(names.join(", "))} · <b>+${pcText(part)}</b>${V.n > 1 ? ` (ta part sur ${pcText(tot)})` : ""}`, () => { mutate(g => { g.items = prevI; g.money = prevM; }); return "Vente annulée"; });
});
// Volet « Ajouter un objet »
const adFocus = id => { const el = document.getElementById(id); if (el) { el.focus(); if (el.select && id === "ad-n" && !el.value) el.select(); } };
const adOpen = () => { S.add = { q: "", d: null }; S.itOpen = null; render(); adFocus("ad-q"); };
onClick("it-plus", adOpen);
onClick("ad-close", () => { S.add = null; render(); });
onClick("ad-back", () => { S.add.d = null; S.add.more = false; S.add.mag = false; render(); adFocus("ad-q"); });
onInput("#ad-q", t => { S.add.q = t.value; render(); });
// Choix : objet du sac (ajout au stock), du Manuel (lien ref / mat, lot, dossier proposé) ou libre
function adPick(g, b) {
  const A = S.add, q = (A.q || "").trim();
  if (b.dataset.i != null) { const x = g.items[+b.dataset.i]; return { ...x, q: 1, into: +b.dataset.i }; }
  const gr = GEAR[b.dataset.g], m = MAT[b.dataset.m];
  return newItem(g, gr ? gr.n : m ? m.n : q);
}
onClick("ad-pick", (b) => { const g = G(); S.add.d = adPick(g, b); S.add.mag = isMagic(S.add.d); S.add.more = false; render(); adFocus(S.add.d.n ? "ad-qn" : "ad-n"); });
onSubmit("ad-find", () => { const g = G(), q = (S.add.q || "").trim(); if (!q) return; S.add.d = newItem(g, q); render(); adFocus("ad-qn"); }); // Entrée : objet du Manuel de ce nom, sinon libre
onClick("ad-new", (b) => { const g = G(), f = b.dataset.v; S.add.d = { n: (S.add.q || "").trim(), q: 1, eq: false, c: false, note: "", f: g.folders.some(y => y.id === f) ? f : folderOf(g, {}) }; S.add.mag = f === "magie"; S.add.more = false; render(); adFocus("ad-n"); });
// ✦ Magique : bloc objet magique (un objet libre rangé dans Divers passe dans Magie) ; ◆ Butin : dossier Butin et valeur (prix du Manuel proposé)
onClick("ad-mode", (b) => {
  const g = G(), A = S.add, d = A && A.d; if (!d) return; const has = id => g.folders.some(f => f.id === id);
  if (b.dataset.v === "mag") { A.mag = !A.mag; if (!d.ref && !d.mat && has("magie") && d.f === (A.mag ? "divers" : "magie")) d.f = A.mag ? "magie" : "divers"; }
  else if (d.f === "butin") { d.f = A.prevF && has(A.prevF) && A.prevF !== "butin" ? A.prevF : autoFolder(g, d); if (A.autoV && String(d.v) === A.autoV) { d.v = ""; delete d.vc; } } // valeur proposée et pas touchée : retirée
  else if (has("butin")) { A.prevF = d.f; d.f = "butin"; if (d.v == null || d.v === "") { const pc = unitPc({ ref: d.ref, mat: d.mat }); if (pc) { const c = pc % 100 === 0 ? "po" : pc % 10 === 0 ? "pa" : "pc"; d.vc = c; d.v = String(pc / { po: 100, pa: 10, pc: 1 }[c]); A.autoV = d.v; } } }
  render();
});
onClick("ad-inc", (b) => { const i = +b.dataset.i, g = G(), x = g && g.items[i]; if (!x) return; mutate(g => { g.items[i].q++; }); S.add = null; S.fresh = [i]; adShow(G(), i);
  toast(`<b>${esc(x.n)}</b> : ${x.q}`, () => { mutate(g => { g.items[i].q--; }); return "Annulé"; }); });
onClick("ad-qty", (b) => { const d = S.add.d; d.q = Math.max(1, (Math.floor(+d.q) || 1) + +b.dataset.v); render(); });
onClick("ad-f", (b) => { S.add.d.f = b.dataset.v; render(); });
onClick("ad-vc", (b) => { S.add.d.vc = b.dataset.v; render(); });
onClick("ad-more", () => { S.add.more = !S.add.more; render(); });
// Saisie dans le volet : gardée dans l'objet en préparation (le volet est redessiné à chaque geste)
onInput(t => t.classList && t.classList.contains("adf"), t => { const d = S.add && S.add.d; if (!d) return; d[t.dataset.k] = t.value; if (t.dataset.k === "n" || t.dataset.k === "q") { const b = document.querySelector(".adgo"); if (b) render(); } });
onChange(t => t.classList && t.classList.contains("adf") && (t.type === "checkbox" || t.tagName === "SELECT"), t => { const d = S.add && S.add.d; if (!d) return; d[t.dataset.k] = t.type === "checkbox" ? t.checked : t.dataset.t === "i" ? +t.value : t.value; render(); });
// Montre l'objet ajouté : son dossier déplié, le filtre retiré s'il le cache, la ligne surlignée (« nouveau ») et amenée à l'écran
function adShow(g, i) {
  const x = g.items[i]; if (!x) return; const sec = x.eq ? "eq" : folderOf(g, x);
  if (S.itFilter && S.itFilter !== sec && !(S.itFilter !== "eq" && folderOf(g, x) === S.itFilter)) S.itFilter = "";
  delete S.fold[foldKey("inv-" + (filterOf(g) && filterOf(g) !== "eq" ? filterOf(g) : sec))]; S.itFind = "";
  render(); const el = document.querySelector(`.it.fresh`); if (el) el.scrollIntoView({ block: "center", behavior: "instant" });
}
onClick("ad-go", (b) => {
  const g = G(), A = S.add, d = A && A.d; if (!d || !d.n.trim()) return; const q = Math.max(1, Math.floor(+d.q) || 1), num = v => { const t = String(v ?? "").trim().replace(",", "."); return t === "" || !isFinite(+t) || +t < 0 ? null : +t; };
  let i;
  if (d.into != null && g.items[d.into]) { i = d.into; mutate(g => { g.items[i].q += q; }); }
  else {
    const x = { n: d.n.trim(), q, eq: !!d.eq, c: !!d.c, note: (d.note || "").trim(), f: d.f, ...(d.ref ? { ref: d.ref } : {}), ...(d.mat ? { mat: d.mat } : {}) };
    if (num(d.w) != null) x.w = num(d.w); if (num(d.v) != null) { x.v = Math.round(num(d.v) * VC[d.vc || "po"] * 10000) / 10000; if (d.vc && d.vc !== "po") x.vc = d.vc; }
    if ((d.desc || "").trim()) x.desc = d.desc.trim();
    if (A.mag) { // champs magiques : seulement si ✦ Magique est actif
      if (+d.bonus) x.bonus = +d.bonus; if ((d.xdmg || "").trim()) x.xdmg = d.xdmg.trim();
      const ch = Math.min(50, Math.floor(+d.chMax) || 0); if (ch) { x.chMax = ch; x.chU = 0; x.rec = d.rec ?? "aube"; }
      if (d.att) { x.att = true; x.attuned = false; } if (d.rar) x.rar = d.rar; if (d.unid) x.unid = true;
    }
    i = g.items.length; mutate(g => { g.items.push(x); });
  }
  const it = G().items[i], into = d.into != null;
  toast(`Ajouté : <b>${esc(it.n)}</b>${into ? ` (${it.q - q} → ${it.q})` : q > 1 ? ` ×${q}` : ""}${MAT[it.mat] && MAT[it.mat].pack ? " · touche-le pour le déballer" : ""}`, () => { mutate(g => { if (into) g.items[i].q -= q; else g.items.splice(i, 1); }); S.fresh = []; return "Ajout annulé"; });
  S.fresh = [...(b.dataset.v === "more" ? S.fresh || [] : []), i];
  if (b.dataset.v === "more") { S.add = { q: "", d: null }; render(); adFocus("ad-q"); } else { S.add = null; adShow(G(), i); }
});
onClick("up-open", (b) => { S.unpack = { i: +b.dataset.i, off: [] }; render(); });
onClick("up-cancel", () => { S.unpack = null; render(); });
onClick("up-tog", (b) => { if (!S.unpack) return; const k = +b.dataset.k, o = S.unpack.off; S.unpack.off = o.includes(k) ? o.filter(y => y !== k) : [...o, k]; render(); });
onClick("up-go", (b) => {
  const g = G(), i = +b.dataset.i, x = g && g.items[i], m = x && MAT[x.mat], U = S.unpack; if (!m || !m.pack || !U) return;
  const prev = g.items.map(y => ({ ...y })), list = m.pack.filter((c, k) => !U.off.includes(k));
  mutate(g => {
    if (g.items[i].q > 1) g.items[i].q--; else g.items.splice(i, 1); // un sac de moins
    list.forEach(([n, q, id]) => { const y = { n, q, eq: false, c: !!(MAT[id] && MAT[id].c), note: "", ...(MAT[id] ? { mat: id } : {}) }; y.f = autoFolder(g, y);
      const same = g.items.find(z => !z.eq && z.n === y.n && folderOf(g, z) === y.f); if (same) same.q += q; else g.items.push(y); }); // même objet déjà dans le sac : quantités ajoutées
  });
  S.unpack = null; S.itOpen = null;
  toast(`<b>${esc(m.n)}</b> déballé : ${list.length} objet${list.length > 1 ? "s" : ""}`, () => { mutate(g => { g.items = prev; }); return "Déballage annulé"; });
});
onClick("it-idf", (b) => { mutate(g => { const x = g.items[+b.dataset.i]; if (x) delete x.unid; }); toast("Objet identifié : complète sa fiche dans ✎ Gérer"); });
// Dossiers (Gérer) : ordre, nom, création, suppression (objets envoyés dans Divers, annulable)
onClick("fd-mv", (b) => { mutate(g => { const i = g.folders.findIndex(f => f.id === b.dataset.v), j = i + +b.dataset.d; if (i < 0 || !g.folders[j]) return; [g.folders[i], g.folders[j]] = [g.folders[j], g.folders[i]]; }); });
onClick("fd-np", (b) => { mutate(g => { const f = g.folders.find(y => y.id === b.dataset.v); if (f) { if (f.np) delete f.np; else f.np = true; } }); });
onClick("load-set", (b) => { mutate(g => { g.load = b.dataset.v; }); });
onChange("coin-w", t => { mutate(g => { g.coinW = t.checked; }); });
onClick("fd-edit", (b) => { S.fdEdit = b.dataset.v; render(); const el = document.getElementById("fd-name"); if (el) { el.focus(); el.select(); } });
onSubmit("fd-save", f => { const n = document.getElementById("fd-name").value.trim(); S.fdEdit = null; if (!n) { render(); return; } mutate(g => { const d = g.folders.find(y => y.id === f.dataset.v); if (d) d.n = n.slice(0, 40); }); });
onClick("fd-new", () => { const id = "f-" + Date.now().toString(36); mutate(g => { g.folders.push({ id, n: "Nouveau dossier" }); }); S.fdEdit = id; render(); const el = document.getElementById("fd-name"); if (el) { el.focus(); el.select(); } });
onClick("fd-del", (b) => { const g = G(), id = b.dataset.v, k = g.folders.findIndex(f => f.id === id); if (k < 0 || id === "divers") return;
  const prev = g.folders.map(f => ({ ...f })), moved = g.items.map((x, i) => x.f === id ? i : -1).filter(i => i >= 0), d = g.folders[k];
  mutate(g => { g.folders.splice(k, 1); g.items.forEach(x => { if (x.f === id) x.f = folderOf(g, x); }); }); if (S.itFilter === id) S.itFilter = "";
  toast(`Dossier <b>${esc(d.n)}</b> supprimé${moved.length ? ` · ${moved.length} objet${moved.length > 1 ? "s" : ""} dans ${esc((G().folders.find(f => f.id === folderOf(G(), {})) || {}).n || "")}` : ""}`, () => { mutate(g => { g.folders = prev; moved.forEach(i => { if (g.items[i]) g.items[i].f = id; }); }); return "Rétabli"; }); });
// ▲ ▼ (Gérer) : échange avec l'objet voisin de la même section (Équipé, ou le dossier)
onClick("it-mv", (b) => { mutate(g => { const i = +b.dataset.i; if (!g.items[i]) return; const list = (sectionsOf(g).find(x => x.list.includes(i)) || { list: [] }).list, p = list.indexOf(i), j = list[p + +b.dataset.v];
  if (j == null) return; [g.items[i], g.items[j]] = [g.items[j], g.items[i]]; S.itOpen = null; S.itEdit = null; });
  const el = document.querySelector(`[data-a="it-mv"][data-v="${b.dataset.v}"][aria-label="${CSS.escape(b.getAttribute("aria-label"))}"]`); if (el && !el.disabled) el.focus({ preventScroll: true }); });
onClick("it-eq", (b) => { mutate(g => { const x = g.items[+b.dataset.i]; if (x) x.eq = !x.eq; }); });
onClick("it-edit", (b) => { S.itEdit = +b.dataset.i; render(); const el = document.getElementById("it-name"); if (el) el.focus(); });
onClick("it-cancel", () => { S.itEdit = null; render(); });
onClick("it-open", (b) => { const i = +b.dataset.i; S.itOpen = S.itOpen === i ? null : i; S.unpack = null; render(); });
onSubmit("it-save", f => {
  const i = +f.dataset.i, n = document.getElementById("it-name").value.trim(); if (!n) return;
  const ref = document.getElementById("it-ref").value; // le lien avec le catalogue est conservé (attaques, CA)
  const x = { n, q: Math.max(0, Math.floor(+document.getElementById("it-q").value || 0)), eq: document.getElementById("it-eq").checked, c: document.getElementById("it-c").checked, note: document.getElementById("it-note").value.trim(), ...(GEAR[ref] ? { ref } : {}) };
  const v = id => document.getElementById(id), prev = G().items[i] || {}, bonus = +v("it-bonus").value, ch = Math.max(0, Math.min(50, Math.floor(+v("it-ch").value) || 0));
  ["inf", "infAt", "infOpt", "infCh", "shot"].forEach(k => { if (prev[k] != null) x[k] = prev[k]; }); // imprégnation d'artificier : gardée
  if (!x.ref && MAT[prev.mat]) x.mat = prev.mat; // lien avec le catalogue (poids, effet, paquetage)
  const num = id => { const t = v(id).value.trim().replace(",", "."); return t === "" || !isFinite(+t) || +t < 0 ? null : Math.round(+t * 100) / 100; };
  x.f = v("it-f").value; if (v("it-w") ? num("it-w") != null : prev.w != null) x.w = v("it-w") ? num("it-w") : prev.w; // charge pas suivie : poids gardé, sans champ
  if (num("it-v") != null) { const c = v("it-vc").value; x.v = Math.round(num("it-v") * VC[c] * 10000) / 10000; if (c !== "po") x.vc = c; } // valeur gardée en po, pièce saisie retenue
  if (v("it-rar").value) x.rar = v("it-rar").value; if (v("it-unid").checked) x.unid = true; if (v("it-desc").value.trim()) x.desc = v("it-desc").value.trim();
  if (bonus) x.bonus = bonus; if (v("it-xdmg").value.trim()) x.xdmg = v("it-xdmg").value.trim();
  if (v("it-att").checked) { x.att = true; x.attuned = v("it-attuned").checked; }
  if (ch) { x.chMax = ch; x.chU = Math.min(ch, prev.chU || 0); x.rec = v("it-rec").value; }
  const oh = !!(v("it-oh") && v("it-oh").checked && GEAR[ref] && offhandOk(G(), x)); if (oh) x.oh = true; // une seule arme en main secondaire
  if (x.attuned && !prev.attuned && attunedCount(G()) >= MAX_ATT) { x.attuned = false; toast(`Déjà ${MAX_ATT} objets harmonisés : défais d'abord une harmonisation`); }
  else toast("Modification enregistrée");
  S.itEdit = null; mutate(g => { if (oh) g.items.forEach(y => { delete y.oh; }); g.items[i] = x; });
});
onClick("it-del", (b) => { const i = +b.dataset.i, prev = G().items[i]; if (!prev) return; S.itEdit = null; S.itOpen = null; mutate(g => { g.items.splice(i, 1); }); toast(`Retiré : <b>${esc(prev.n)}</b>`, () => { mutate(g => { g.items.splice(i, 0, prev); }); return "Rétabli"; }); });
onClick("it-chg", (b) => { mutate(g => { const x = g.items[+b.dataset.i]; if (!x) return; const k = +b.dataset.k, u = x.chU || 0; x.chU = k < u ? k : k + 1; }); });
onClick(["it-dec", "it-inc"], (b, a) => { mutate(g => { const x = g.items[+b.dataset.i]; if (x) x.q = Math.max(0, x.q + (a === "it-inc" ? 1 : -1)); }); });

export { addSheetHTML, inventoryHTML, itemsActionHTML };
