// Atelier du Grimoire : point d'entrée. Écran principal (en-tête, onglets), démarrage.
// Les modules importés déclarent leurs actions (boutons, champs) en se chargeant.
import { bestiaryHTML, wsAllowed, wsSheetHTML } from "./classes/druide-wildshape.js";
import { CIRCLES, DRU } from "./classes/druide.js";
import { rulesHTML } from "./classes/magicien.js";
import { OATHS, lohHTML, oathSpells } from "./classes/paladin.js";
import { beforeEachClick, onChange, onClick, onInput, onKey, startActions } from "./core/actions.js";
import { esc, signed } from "./core/format.js";
import { showIosTip } from "./core/pwa.js";
import { G, S } from "./core/state.js";
import { loadLocal, mutate, pickCurrent, setCur } from "./core/store.js";
import { render, setRenderer, setStatus, toast } from "./core/ui.js";
import { BEAST, BEASTS, BY_ID, SPELLS } from "./data.js";
import { concOf, concPanelHTML, fxSheetHTML, slotbarHTML } from "./features/cast.js";
import { grimoireHTML } from "./features/grimoire.js";
import { luHTML } from "./features/levelup.js";
import { biblioHTML } from "./features/library.js";
import { newHTML } from "./features/newchar.js";
import { printHTML } from "./features/print.js";
import { saveHTML } from "./features/save.js";
import { C, R, classSpells, inClass, isDru, isPal, isWiz } from "./rules/common.js";
import { SCHOOLS } from "./rules/tables.js";
import "./ui/components.js";
import "./features/spells.js";

function boot() {
  loadLocal(); pickCurrent(); setStatus("Enregistré sur cet appareil"); render();
}
function renderApp() {
  const a = document.activeElement; const keep = a && a.id ? { id: a.id, s: a.selectionStart, e: a.selectionEnd } : null;
  renderPicker();
  const g = G(); const main = document.getElementById("main");
  if (!g) { main.innerHTML = welcomeHTML(); }
  else {
    main.innerHTML = heroHTML(g) + tabsHTML(g) + `<div class="panel" id="panel">${panelHTML(g)}</div>`;
  }
  if (keep) { const el = document.getElementById(keep.id); if (el) { el.focus({ preventScroll: true }); try { if (keep.s != null) el.setSelectionRange(keep.s, keep.e); } catch (e) {} } }
  setStatus(S.statusText || "", S.statusErr);
  const bar = document.getElementById("slotbar"), showBar = !!g && S.tab === "grimoire" && R.slots(g).length > 0;
  bar.hidden = !showBar; if (showBar) bar.innerHTML = slotbarHTML(g);
  document.body.classList.toggle("has-slotbar", showBar);
  document.documentElement.style.setProperty("--barh", (showBar ? bar.offsetHeight : 0) + "px");
  document.getElementById("toast").classList.toggle("above-bar", showBar);
  const cp = document.getElementById("concpanel"), cur = g && concOf(g), showCp = showBar && S.concPanel && !!cur;
  cp.hidden = !showCp; if (showCp) cp.innerHTML = concPanelHTML(cur);
  const showFx = showBar && S.fxOpen && g.effects.length > 0, fs = document.getElementById("fxsheet");
  fs.hidden = !showFx; document.getElementById("fxback").hidden = !showFx; if (showFx) fs.innerHTML = fxSheetHTML(g);
  if (!showFx) S.fxOpen = false;
  const lh = document.getElementById("lohsheet"), showLh = !!g && !!S.lohOpen && !isWiz(g);
  if (!showLh) S.lohOpen = false;
  lh.hidden = !showLh; document.getElementById("lohback").hidden = !showLh; if (showLh) lh.innerHTML = lohHTML(g);
  const nw = document.getElementById("nwsheet"), showNw = !!S.newOpen;
  nw.hidden = !showNw; document.getElementById("nwback").hidden = !showNw; if (showNw) nw.innerHTML = newHTML();
  const lu = document.getElementById("lvlup"), showLu = !!g && !!S.lu;
  if (!showLu) S.lu = null;
  lu.hidden = !showLu; document.body.classList.toggle("lu-on", showLu);
  if (showLu) { const sc = lu.querySelector(".lubody"), top = sc ? sc.scrollTop : 0; lu.innerHTML = luHTML(g); const nb = lu.querySelector(".lubody"); if (nb && S.luKeep) nb.scrollTop = top; S.luKeep = false; }
  const ws = document.getElementById("wssheet"), showWs = !!g && !!S.ws && isDru(g) && !showLu;
  if (!showWs) S.ws = null;
  ws.hidden = !showWs; document.body.classList.toggle("ws-on", showWs);
  if (showWs) { const sc = ws.querySelector(".lubody"), top = sc ? sc.scrollTop : 0; ws.innerHTML = wsSheetHTML(g); const nb = ws.querySelector(".lubody"); if (nb && !S.wsTop) nb.scrollTop = top; S.wsTop = false; } // la liste garde sa position (sauf changement de filtre)
  document.getElementById("toast").classList.toggle("on-top", showFx || showLu || showLh || showNw || showWs);
}
function renderPicker() {
  const ids = Object.keys(S.list).sort((a, b) => S.list[a].name.localeCompare(S.list[b].name, "fr"));
  const p = document.getElementById("picker");
  p.innerHTML = (ids.length ? `<select id="cur" aria-label="Grimoire affiché">${ids.map(id => `<option value="${esc(id)}"${id === S.cur ? " selected" : ""}>${esc(S.list[id].name)} · ${C(S.list[id]).n} ${S.list[id].level}</option>`).join("")}</select>` : "")
    + (ids.length ? `<button class="btn" data-a="new">Nouveau personnage</button>` : "") + `<span class="status" id="status"></span>`;
}
function welcomeHTML() {
  return `<div class="welcome"><h1><span class="initial">G</span>rimoires</h1>
  <p>Aucun personnage pour l'instant. Crée un magicien, un paladin ou un druide : l'atelier calcule ses emplacements, ses sorts préparés et ses ressources d'après le Manuel des joueurs. Tu as déjà une sauvegarde (fichier .json ou .txt) ? Importe-la.</p>
  <div class="frow"><button class="btn primary" data-a="new">Créer un personnage</button><label class="btn" for="f-import">Importer une sauvegarde</label><input id="f-import" type="file" accept=".json,.txt,application/json,text/plain" hidden></div></div>`;
}
function heroHTML(g) {
  const prof = R.prof(g.level), mod = R.am(g), max = R.maxLevel(g);
  const nPrep = g.prepared.length, pMax = R.prepMax(g), exp = R.expected(g.level), nSp = g.spells.length, cMax = R.cantrips(g);
  const first = esc(g.name.charAt(0)), rest = esc(g.name.slice(1));
  return `<section class="hero">
  <div>
    <h1 class="title" id="title"><span class="initial">${first}</span>${rest}</h1>
    <div class="subline">${isWiz(g) ? `Niveau ${g.level} · École ${/^[AÉEIO]/.test(g.school) ? "d'" : "de "}${esc(g.school)}` : `${C(g).n} niveau ${g.level}${isPal(g) && g.level >= 3 ? ` · ${esc(OATHS[g.oath].full)}` : isDru(g) && g.level >= 2 ? ` · ${esc(CIRCLES[g.circle].full)}` : ""}`} · ${max ? `sorts jusqu'au niveau ${max}` : `sorts au niveau ${R.unlockAt(g, 1)}`}</div>
  </div>
  <div class="setup">
    <div class="field"><label for="f-full">Nom complet</label><input id="f-full" type="text" value="${esc(g.name)}"></div>
    <div class="field"><label for="f-level">Niveau de ${C(g).n.toLowerCase()}</label><div class="lvrow"><select id="f-level">${Array.from({length:20},(_, i)=>`<option${i+1===g.level?" selected":""}>${i+1}</option>`).join("")}</select>${g.level < 20 ? `<button class="btn lvup" data-a="lu-open" title="Assistant de passage de niveau">↑ Niveau ${g.level + 1}</button>` : ""}</div></div>
    <div class="field"><label for="f-${C(g).ab}">${C(g).abN} (valeur)</label><input id="f-${C(g).ab}" data-ab="${C(g).ab}" type="number" min="1" max="30" value="${g[C(g).ab]}"></div>
    ${isWiz(g) ? `<div class="field"><label for="f-school">Tradition arcanique</label><select id="f-school">${SCHOOLS.map(s=>`<option${s===g.school?" selected":""}>${s}</option>`).join("")}</select></div>`
      : isDru(g) ? `<div class="field"><label for="f-circle">Cercle druidique</label><select id="f-circle">${Object.entries(CIRCLES).map(([k, o]) => `<option value="${k}"${k === g.circle ? " selected" : ""}>${o.n}</option>`).join("")}</select></div>`
      : `<div class="field"><label for="f-oath">Serment sacré</label><select id="f-oath">${Object.entries(OATHS).map(([k, o]) => `<option value="${k}"${k === g.oath ? " selected" : ""}>${o.n}</option>`).join("")}</select></div>`}
  </div>
  <div class="stats" role="list">
    <div class="stat" role="listitem"><div class="v">${signed(mod)}</div><div class="l">Mod. ${C(g).abN}</div></div>
    <div class="stat" role="listitem"><div class="v">${8 + prof + mod}</div><div class="l">DD des sorts</div></div>
    <div class="stat" role="listitem"><div class="v">${signed(prof + mod)}</div><div class="l">Attaque de sort</div></div>
    <div class="stat ${nPrep > pMax ? "alert" : nPrep === pMax ? "good" : ""}" role="listitem"><div class="v">${nPrep}<small>/${pMax}</small></div><div class="l">Sorts préparés</div></div>
    ${isWiz(g) ? `<div class="stat ${nSp < exp ? "alert" : ""}" role="listitem"><div class="v">${nSp}<small>/${exp}</small></div><div class="l">Grimoire (min.)</div></div>
    <div class="stat ${g.cantrips.length > cMax ? "alert" : ""}" role="listitem"><div class="v">${g.cantrips.length}<small>/${cMax}</small></div><div class="l">Sorts mineurs</div></div>`
    : isDru(g) ? `<div class="stat ${g.cantrips.length > cMax ? "alert" : ""}" role="listitem"><div class="v">${g.cantrips.length}<small>/${cMax}</small></div><div class="l">Sorts mineurs</div></div>
    <div class="stat" role="listitem"><div class="v">${DRU.ws(g) ? `FP ${DRU.fp(g)}` : "—"}</div><div class="l">Forme sauvage</div></div>`
    : `<div class="stat" role="listitem"><div class="v">${oathSpells(g).length}</div><div class="l">Sorts de serment</div></div>
    <div class="stat" role="listitem"><div class="v">${5 * g.level}</div><div class="l">Imposition (PV)</div></div>`}
  </div>
  <div class="banner">Tes personnages sont enregistrés sur cet appareil, dans ce navigateur. Exporte-les de temps en temps (onglet Sauvegarde) pour les sauvegarder ou les passer sur un autre appareil.</div>
  ${showIosTip() ? `<div class="banner">Sur iPhone ou iPad, installe l'atelier : bouton <b>Partager</b>, puis <b>Sur l'écran d'accueil</b>. Ouvre-le ensuite toujours depuis cette icône : c'est là que tes grimoires sont le mieux conservés. <button class="btn ghost" data-a="hide-ios">Masquer</button></div>` : ""}
  </section>`;
}
function tabsHTML(g) {
  // Imprimer et Règles : propres au magicien pour l'instant (les autres classes suivront)
  const t = isWiz(g) ? [["grimoire","Grimoire", g.spells.length + g.cantrips.length],["biblio","Bibliothèque", classSpells(g).length],["imprimer","Imprimer"],["sauvegarde","Sauvegarde"],["regles","Règles"]]
    : [["grimoire","Sorts"],["biblio","Bibliothèque", classSpells(g).length], ...(isDru(g) ? [["bestiaire","Bestiaire", BEASTS.filter(b => wsAllowed(g, b)).length]] : []),["sauvegarde","Sauvegarde"]];
  if (!t.some(x => x[0] === S.tab)) S.tab = "grimoire";
  return `<div class="tabs" role="tablist">${t.map(([k,l,c])=>`<button class="tab" role="tab" data-a="tab" data-v="${k}" aria-selected="${S.tab===k}">${l}${c!=null?`<span class="count">${c}</span>`:""}</button>`).join("")}</div>`;
}
function panelHTML(g) {
  if (S.tab === "biblio") return biblioHTML(g);
  if (S.tab === "bestiaire") return bestiaryHTML(g);
  if (S.tab === "imprimer") return printHTML(g);
  if (S.tab === "sauvegarde") return saveHTML(g);
  if (S.tab === "regles") return rulesHTML(g);
  return grimoireHTML(g);
}
beforeEachClick(a => { if (a !== "rm" && a !== "del" && S.confirm) S.confirm = null; }); // un autre clic annule une confirmation en attente
onClick("tab", (b) => { S.tab = b.dataset.v; try { localStorage.setItem("grimoire.tab", S.tab); } catch (e) {} render(); });
onClick("undo", () => { const u = S.undo; S.undo = null; document.getElementById("toast").hidden = true; if (u) { const m = u(); toast(typeof m === "string" ? m : "Lancement annulé"); } });
onChange("#cur", t => { setCur(t.value); });
onChange("#f-level", t => { mutate(g => { g.level = +t.value; }); });
onChange(t => !!t.dataset.ab, t => { mutate(g => { g[t.dataset.ab] = Math.min(30, Math.max(1, +t.value || 10)); }); });
onChange("#f-full", () => { renderPicker(); });
onInput("#f-full", t => { mutate(g => { g.name = t.value || "Sans nom"; }, false); const g = G(), h = document.getElementById("title"); if (h && g) h.innerHTML = `<span class="initial">${esc(g.name.charAt(0))}</span>${esc(g.name.slice(1))}`; });
onKey(e => {
  if (e.key === "Escape" && S.lu) { S.lu = null; render(); return true; }
  if (e.key === "Escape" && S.ws) { S.ws = null; render(); return true; }
  if (e.key === "Escape" && S.newOpen) { S.newOpen = false; render(); return true; }
  if (e.key === "Escape" && S.lohOpen) { S.lohOpen = false; render(); return true; }
  if (e.key === "Enter" && S.newOpen && e.target.id === "nw-name" && S.newCls) { document.querySelector('[data-a="nw-go"]').click(); return true; }
});
setRenderer(renderApp);
startActions();
boot();
// Accès réservé aux tests automatiques (tests/helpers.py) : le code assemblé n'expose pas ses variables.
window.__t = { S, G, R, mutate, concOf, inClass, BY_ID, BEAST, BEASTS, SPELLS };