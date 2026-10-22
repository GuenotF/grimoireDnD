// Atelier du Grimoire : point d'entrée. Écran principal (en-tête, onglets), démarrage.
// Les modules importés déclarent leurs actions (boutons, champs) en se chargeant.
import { C, CLASSES } from "./classes/index.js";
import { beforeEachClick, onChange, onClick, onInput, onKey, startActions } from "./core/actions.js";
import { esc, signed } from "./core/format.js";
import { showIosTip } from "./core/pwa.js";
import { G, S } from "./core/state.js";
import { loadLocal, mutate, pickCurrent, setCur } from "./core/store.js";
import { render, setRenderer, setStatus, toast } from "./core/ui.js";
import { BEAST, BEASTS, BY_ID, SPELLS } from "./data.js";
import { concOf, concPanelHTML, fxSheetHTML, slotbarHTML } from "./features/cast.js";
import { characterHTML, heroAbilities } from "./features/character.js";
import { grimoireHTML } from "./features/grimoire.js";
import { hpChipHTML } from "./features/hp.js";
import { luHTML } from "./features/levelup.js";
import { biblioHTML } from "./features/library.js";
import { newHTML } from "./features/newchar.js";
import { saveHTML } from "./features/save.js";
import { sheetIncomplete } from "./rules/character.js";
import { R, inClass } from "./rules/common.js";
import { ABILITIES } from "./rules/tables.js";
import { statLabel } from "./ui/components.js";
import "./ui/components.js";
import "./features/spells.js";

function boot() {
  loadLocal(); pickCurrent(); setStatus("Enregistré sur cet appareil"); render();
}
function renderApp() {
  // Élément qui a le focus, retrouvé après le dessin : par son id, sinon par son action (data-a, data-k, data-v)
  const a = document.activeElement, d = a && a.dataset || {};
  const sel = !a || a === document.body ? null : a.id ? "#" + CSS.escape(a.id) : d.a ? `[data-a="${CSS.escape(d.a)}"]` + (d.k ? `[data-k="${CSS.escape(d.k)}"]` : "") + (d.v ? `[data-v="${CSS.escape(d.v)}"]` : "") + (d.id ? `[data-id="${CSS.escape(d.id)}"]` : "") : null;
  const keep = sel ? { sel, s: a.selectionStart, e: a.selectionEnd } : null;
  renderPicker();
  const g = G(); const main = document.getElementById("main");
  if (!g) { main.innerHTML = welcomeHTML(); }
  else {
    main.innerHTML = heroHTML(g) + tabsHTML(g) + `<div class="panel" id="panel">${panelHTML(g)}</div>`;
  }
  setStatus(S.statusText || "", S.statusErr);
  // Barre du bas : dans l'onglet principal de la classe, s'il y a des emplacements de sorts ou des puces (PV, Rage…)
  const barChips = g ? hpChipHTML(g) : "", mainTab = g ? C(g).tabs(g)[0][0] : "";
  const showBar = !!g && S.tab === mainTab && (R.slots(g).length > 0 || !!barChips || !!(C(g).slotbarChips && C(g).slotbarChips(g)));
  const bar = document.getElementById("slotbar");
  bar.hidden = !showBar; if (showBar) bar.innerHTML = slotbarHTML(g, barChips);
  document.body.classList.toggle("has-slotbar", showBar);
  document.documentElement.style.setProperty("--barh", (showBar ? bar.offsetHeight : 0) + "px");
  document.getElementById("toast").classList.toggle("above-bar", showBar);
  const cp = document.getElementById("concpanel"), cur = g && concOf(g), showCp = showBar && S.concPanel && !!cur;
  cp.hidden = !showCp; if (showCp) cp.innerHTML = concPanelHTML(cur);
  const showFx = showBar && S.fxOpen && g.effects.length > 0, fs = document.getElementById("fxsheet");
  fs.hidden = !showFx; document.getElementById("fxback").hidden = !showFx; if (showFx) fs.innerHTML = fxSheetHTML(g);
  if (!showFx) S.fxOpen = false;
  const nw = document.getElementById("nwsheet"), showNw = !!S.newOpen;
  nw.hidden = !showNw; document.getElementById("nwback").hidden = !showNw; if (showNw) nw.innerHTML = newHTML();
  const lu = document.getElementById("lvlup"), showLu = !!g && !!S.lu;
  if (!showLu) S.lu = null;
  lu.hidden = !showLu; document.body.classList.toggle("lu-on", showLu);
  if (showLu) { const sc = lu.querySelector(".lubody"), top = sc ? sc.scrollTop : 0; lu.innerHTML = luHTML(g); const nb = lu.querySelector(".lubody"); if (nb && S.luKeep) nb.scrollTop = top; S.luKeep = false; }
  // Volets propres aux classes (Imposition des mains, formes possibles) : chaque classe gère les siens, refermés si le personnage affiché est d'une autre classe
  const showSheet = Object.values(CLASSES).map(c => c.renderSheets ? c.renderSheets(g && C(g) === c ? g : null, showLu) : false).some(Boolean);
  document.getElementById("toast").classList.toggle("on-top", showFx || showLu || showNw || showSheet);
  // Focus retrouvé en dernier : les volets (assistant de niveau…) sont redessinés juste avant
  if (keep) { const el = document.querySelector(keep.sel); if (el) { el.focus({ preventScroll: true }); try { if (keep.s != null) el.setSelectionRange(keep.s, keep.e); } catch (e) {} } }
}
function renderPicker() {
  const ids = Object.keys(S.list).sort((a, b) => S.list[a].name.localeCompare(S.list[b].name, "fr"));
  const p = document.getElementById("picker");
  p.innerHTML = (ids.length ? `<select id="cur" aria-label="Grimoire affiché">${ids.map(id => `<option value="${esc(id)}"${id === S.cur ? " selected" : ""}>${esc(S.list[id].name)} · ${C(S.list[id]).n} ${S.list[id].level}</option>`).join("")}</select>` : "")
    + (ids.length ? `<button class="btn newbtn" data-a="new" aria-label="Nouveau personnage" title="Nouveau personnage"><span aria-hidden="true">＋</span><span class="lbl"> Nouveau personnage</span></button>` : "") + `<span class="status" id="status"></span>`;
}
function welcomeHTML() {
  return `<div class="welcome"><h1><span class="initial">G</span>rimoires</h1>
  <p>Aucun personnage pour l'instant. Crée un magicien, un paladin ou un druide : l'atelier calcule ses emplacements, ses sorts préparés et ses ressources d'après le Manuel des joueurs. Tu as déjà une sauvegarde (fichier .json ou .txt) ? Importe-la.</p>
  <div class="frow"><button class="btn primary" data-a="new">Créer un personnage</button><label class="btn" for="f-import">Importer une sauvegarde</label><input id="f-import" type="file" accept=".json,.txt,application/json,text/plain" hidden></div></div>`;
}
// En-tête : nom, sous-titre, ↑ Niveau et ✎ Modifier (nom, niveau, sous-classe repliés), puis six cases selon l'onglet :
// caractéristiques dans Personnage, statistiques de sorts ailleurs. Intitulés courts sur téléphone (statLabel).
function heroHTML(g) {
  const prof = R.prof(g.level), mod = R.am(g), max = R.maxLevel(g);
  const nPrep = g.prepared.length, pMax = R.prepMax(g), abShort = (ABILITIES.find(a => a[0] === C(g).ab) || [])[1];
  const first = esc(g.name.charAt(0)), rest = esc(g.name.slice(1));
  const spells = `<div class="statcap">Sorts</div><div class="stats" role="list" aria-label="Sorts">
    <div class="stat" role="listitem"><div class="v">${signed(mod)}</div>${statLabel(`Mod. ${C(g).abN}`, `Mod. ${abShort}`)}</div>
    <div class="stat" role="listitem"><div class="v">${8 + prof + mod}</div>${statLabel("DD des sorts", "DD")}</div>
    <div class="stat" role="listitem"><div class="v">${signed(prof + mod)}</div>${statLabel("Attaque de sort", "Attaque")}</div>
    <div class="stat ${nPrep > pMax ? "alert" : nPrep === pMax ? "good" : ""}" role="listitem"><div class="v">${nPrep}<small>/${pMax}</small></div>${statLabel("Sorts préparés", "Préparés")}</div>
    ${C(g).heroStats(g)}
  </div>`;
  return `<section class="hero">
  <div class="herohead">
    <div class="ht"><h1 class="title" id="title"><span class="initial">${first}</span>${rest}</h1>
    <div class="subline">${C(g).subline(g)}${C(g).noSpells ? "" : ` · ${max ? `sorts jusqu'au niveau ${max}` : `sorts au niveau ${R.unlockAt(g, 1)}`}`}</div></div>
    <div class="hbtns">${g.level < 20 ? `<button class="btn lvup" data-a="lu-open" title="Assistant de passage de niveau">↑ Niveau ${g.level + 1}</button>` : ""}<button class="btn edit" data-a="hero-edit" aria-expanded="${S.heroEdit}">✎ ${S.heroEdit ? "Fermer" : "Modifier"}</button></div>
  </div>
  ${S.heroEdit ? `<div class="setup">
    <div class="field"><label for="f-full">Nom complet</label><input id="f-full" type="text" value="${esc(g.name)}"></div>
    <div class="field"><label for="f-level">Niveau de ${C(g).n.toLowerCase()}</label><select id="f-level">${Array.from({length:20},(_, i)=>`<option${i+1===g.level?" selected":""}>${i+1}</option>`).join("")}</select></div>
    ${C(g).subclassField(g)}
    <p class="help">Le niveau se change ici sans assistant (création, correction).${g.level < 20 ? ` Pour monter de niveau, utilise ↑ Niveau ${g.level + 1}.` : ""}</p>
  </div>` : ""}
  ${S.tab === "perso" ? `<div class="statcap">Caractéristiques</div><div class="stats" role="list" aria-label="Caractéristiques">${heroAbilities(g)}</div>`
    : C(g).noSpells ? `<div class="statcap">${C(g).n}</div><div class="stats" role="list" aria-label="${C(g).n}">${C(g).heroStats(g)}</div>` : spells}
  ${showIosTip() ? `<div class="banner">Sur iPhone ou iPad, installe l'atelier : bouton <b>Partager</b>, puis <b>Sur l'écran d'accueil</b>. Ouvre-le ensuite toujours depuis cette icône : c'est là que tes grimoires sont le mieux conservés. <button class="btn ghost" data-a="hide-ios">Masquer</button></div>` : ""}
  </section>`;
}
// Onglets : [identifiant, libellé, compteur facultatif]. Rangée principale : Personnage, puis les onglets de la classe
// (Sorts ou Grimoire en premier, Bibliothèque, Bestiaire…). Menu Plus : onglets secondaires de la classe (Règles, Imprimer), puis Sauvegarde.
const PLAY_TABS = 2; // Personnage et Sorts : les écrans de jeu, mis en avant
function tabsHTML(g) {
  const main = [["perso", "Personnage"], ...C(g).tabs(g)], more = [...(C(g).moreTabs ? C(g).moreTabs(g) : []), ["sauvegarde", "Sauvegarde"]];
  if (![...main, ...more].some(x => x[0] === S.tab)) S.tab = main[1][0]; // onglet principal de la classe (Sorts, Capacités…)
  const inMore = more.some(x => x[0] === S.tab);
  const tab = ([k, l, c], i) => `<button class="tab${i < PLAY_TABS ? " play" : ""}" role="tab" data-a="tab" data-v="${k}" aria-selected="${S.tab === k}">${l}${k === "perso" && sheetIncomplete(g) ? `<span class="todo" title="Fiche à compléter"></span>` : ""}${c != null ? `<span class="count">${c}</span>` : ""}</button>${i === PLAY_TABS - 1 ? `<span class="tabsep" aria-hidden="true"></span>` : ""}`;
  return `<div class="tabs" role="tablist">${main.map(tab).join("")}
    <div class="tabmore"><button class="tab" data-a="more" aria-haspopup="menu" aria-expanded="${!!S.moreOpen}" aria-selected="${inMore}">Plus <span aria-hidden="true">${S.moreOpen ? "▴" : "▾"}</span></button>
    ${S.moreOpen ? `<div class="moreback" data-a="more"></div><div class="moremenu" role="menu">${more.map(([k, l]) => `<button role="menuitem" data-a="tab" data-v="${k}" aria-current="${S.tab === k}">${l}</button>`).join("")}</div>` : ""}</div></div>`;
}
function panelHTML(g) {
  if (S.tab === "perso") return characterHTML(g);
  if (S.tab === "biblio") return biblioHTML(g);
  if (S.tab === "sauvegarde") return saveHTML(g);
  const own = C(g).panels && C(g).panels[S.tab]; // onglets propres à la classe (Règles, Bestiaire…)
  return own ? own(g) : grimoireHTML(g);
}
beforeEachClick(a => { if (a !== "rm" && a !== "del" && S.confirm) S.confirm = null; if (a !== "more" && a !== "tab") S.moreOpen = false; }); // un autre clic annule une confirmation en attente
onClick("hero-edit", () => { S.heroEdit = !S.heroEdit; try { localStorage.setItem("grimoire.edit", S.heroEdit ? "1" : "0"); } catch (e) {} render(); });
onClick("more", () => { S.moreOpen = !S.moreOpen; render(); });
onClick("tab", (b) => { S.tab = b.dataset.v; S.moreOpen = false; try { localStorage.setItem("grimoire.tab", S.tab); } catch (e) {} render(); });
onClick("undo", () => { const u = S.undo; S.undo = null; document.getElementById("toast").hidden = true; if (u) { const m = u(); toast(typeof m === "string" ? m : "Lancement annulé"); } });
onChange("#cur", t => { setCur(t.value); });
onChange("#f-level", t => { mutate(g => { g.level = +t.value; }); });
onChange("#f-full", () => { renderPicker(); });
onInput("#f-full", t => { mutate(g => { g.name = t.value || "Sans nom"; }, false); const g = G(), h = document.getElementById("title"); if (h && g) h.innerHTML = `<span class="initial">${esc(g.name.charAt(0))}</span>${esc(g.name.slice(1))}`; });
onKey(e => {
  if (e.key === "Escape" && S.moreOpen) { S.moreOpen = false; render(); return true; }
  if (e.key === "Escape" && S.lu) { S.lu = null; render(); return true; }
  if (e.key === "Escape" && S.newOpen) { S.newOpen = false; render(); return true; }
  if (e.key === "Enter" && S.newOpen && e.target.id === "nw-name" && S.newCls) { document.querySelector('[data-a="nw-go"]').click(); return true; }
});
setRenderer(renderApp);
startActions();
boot();
// Accès réservé aux tests automatiques (tests/helpers.py) : le code assemblé n'expose pas ses variables.
window.__t = { S, G, R, mutate, concOf, inClass, BY_ID, BEAST, BEASTS, SPELLS };