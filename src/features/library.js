// Onglet Bibliothèque : liste de la classe, filtres, apprentissage.
import { onChange, onClick, onInput } from "../core/actions.js";
import { byName, esc, fmt, fr } from "../core/format.js";
import { G, S } from "../core/state.js";
import { mutate } from "../core/store.js";
import { render, toast } from "../core/ui.js";
import { BY_ID } from "../data.js";
import { keyPills, spellBody, tags } from "./spells.js";
import { C, R, classSpells, isWiz } from "../rules/common.js";
import { LVL_NAME, SCHOOLS } from "../rules/tables.js";

function biblioHTML(g) {
  const f = S.f, max = R.maxLevel(g), wiz = isWiz(g), top = C(g).top;
  const hasC = C(g).cantrips(20) > 0;
  if ((!hasC && f.lvl === "0") || +f.lvl > top) f.lvl = "all";
  const owned = new Set(wiz ? [...g.spells.map(x => x.id), ...g.cantrips] : g.cantrips);
  const q = f.q.trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  const list = classSpells(g).filter(s => (f.lvl === "all" || s.l === +f.lvl) && (!f.school || s.s === f.school) && (!f.conc || s.c) && (!f.rit || s.ri)
    && (!f.hideOwned || !owned.has(s.id)) && (!f.reachable || s.l <= max)
    && (!q || (s.n + " " + s.en + " " + s.e + " " + (s.p || "").slice(2)).toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").includes(q))).sort((a, b) => a.l - b.l || byName(a, b)); // une section par niveau, sorts dans l'ordre alphabétique
  let h = `<div class="filters">
    <div class="chips" role="group" aria-label="Niveau de sort">
      <button class="chip" data-a="flvl" data-v="all" aria-pressed="${f.lvl === "all"}">Tous</button>
      ${LVL_NAME.map((n, i) => (i === 0 && !hasC) || i > top ? "" : `<button class="chip${i > max ? " dim" : ""}" data-a="flvl" data-v="${i}" aria-pressed="${f.lvl === String(i)}">${i === 0 ? "Mineurs" : i}</button>`).join("")}
    </div>
    <div class="frow">
      <div class="field"><label for="f-q">Recherche</label><input id="f-q" type="search" value="${esc(f.q)}" placeholder="Nom français, anglais ou effet (ex. « feu »)"></div>
      <div class="field" style="flex:0 1 200px"><label for="f-sch">École</label><select id="f-sch"><option value="">Toutes les écoles</option>${SCHOOLS.map(s => `<option${s === f.school ? " selected" : ""}>${s}</option>`).join("")}</select></div>
    </div>
    <div class="frow">
      <label class="check"><input type="checkbox" data-a="ftog" data-v="conc"${f.conc ? " checked" : ""}> Concentration</label>
      <label class="check"><input type="checkbox" data-a="ftog" data-v="rit"${f.rit ? " checked" : ""}> Rituel</label>
      <label class="check"><input type="checkbox" data-a="ftog" data-v="reachable"${f.reachable ? " checked" : ""}> Accessibles à son niveau</label>
      ${wiz ? `<label class="check"><input type="checkbox" data-a="ftog" data-v="hideOwned"${f.hideOwned ? " checked" : ""}> Masquer les sorts déjà appris</label>` : ""}
    </div></div>
    <p class="found">${list.length} sort${list.length > 1 ? "s" : ""}${wiz && R.savant(g, {s: g.school}) ? ` · ${esc(g.school)} : copie à moitié prix (Savant en ${esc(g.school)})` : ""}${q ? "" : " · touche un sort pour voir sa description, ou fais une recherche pour tout afficher"}</p>`;
  let cur = -1;
  list.forEach(s => {
    if (f.lvl === "all" && s.l !== cur) { cur = s.l; h += `<div class="rubric${s.l > max ? " locked" : ""}"><h3>${LVL_NAME[s.l]}</h3><span class="aside">${s.l === 0 ? `${g.cantrips.length} sur ${R.cantrips(g)} connus` : s.l > max ? `s'ouvre au niveau ${R.unlockAt(g, s.l)} de ${C(g).n.toLowerCase()}` : `accessible`}</span></div>`; }
    // Sans recherche : une ligne par sort, dépliable. Avec une recherche : résultats affichés en entier.
    if (!q) { h += libRow(g, s, owned, max, f.lvl === "all" ? "" : LVL_NAME[s.l] + " · "); return; }
    h += `<div class="spell noprep"><div><div class="name">${esc(s.n)}${tags(s)}<span class="vo">${esc(s.en)}</span></div>${spellBody(s, g, f.lvl === "all" ? "" : LVL_NAME[s.l] + " · ")}</div>
    <div class="actions">${addBtns(g, s, owned, max)}</div></div>`;
  });
  if (!list.length) h += `<div class="empty">Aucun sort ne correspond à ces filtres.</div>`;
  return h;
}
function libRow(g, s, owned, max, prefix) {
  const key = "lib:" + s.id, open = S.open.has(key);
  const mark = owned.has(s.id) && (isWiz(g) || s.l === 0) ? `<span class="libmark ok">Déjà appris</span>` : s.l > max ? `<span class="libmark">Niveau ${R.unlockAt(g, s.l)} requis</span>` : "";
  return `<div class="jrow"><div class="jline"><div class="jmain"><button class="jname" data-a="row" data-id="${key}" aria-expanded="${open}">${esc(s.n)}${tags(s)}<span class="chev">${open ? "▴" : "▾"}</span></button><span class="kps">${keyPills(s, g)}</span></div>${mark}</div>
  ${open ? `<div class="jbody"><span class="vo">${esc(s.en)}</span>${spellBody(s, g, prefix)}<div class="rowact">${addBtns(g, s, owned, max)}</div></div>` : ""}</div>`;
}
function addBtns(g, s, owned, max) {
  if (!isWiz(g) && s.l === 0) return owned.has(s.id) ? `<span class="origin">Déjà appris</span>` : `<button class="btn" data-a="add" data-id="${s.id}" data-how="mineur">Apprendre</button>`;
  if (!isWiz(g)) return s.l > max ? `<span class="origin">Niveau ${R.unlockAt(g, s.l)} requis</span>` : `<span class="origin">Liste du ${C(g).n.toLowerCase()}</span>`;
  if (owned.has(s.id)) return `<span class="origin">Déjà appris</span>`;
  if (s.l === 0) return `<button class="btn" data-a="add" data-id="${s.id}" data-how="mineur">Apprendre</button>`;
  if (s.l > max) return `<span class="origin">Niveau ${R.unlockAt(g, s.l)} requis</span>`;
  const c = R.copy(g, s);
  return `<button class="btn" data-a="add" data-id="${s.id}" data-how="niv" title="Un des 2 sorts gratuits gagnés à chaque niveau">Montée de niveau</button>
    <button class="btn" data-a="add" data-id="${s.id}" data-how="copie" title="Copié depuis un parchemin ou un autre grimoire">Copier · ${fmt(c.h)} h · ${fr(c.po)} po</button>`;
}
onClick("flvl", (b) => { S.f.lvl = b.dataset.v; render(); });
onClick("add", (b) => {
  mutate(g => {
    const s = BY_ID[b.dataset.id];
    if (b.dataset.how === "mineur") { g.cantrips.push(s.id); if (g.cantrips.length > R.cantrips(g)) toast(`Attention : ${g.cantrips.length} sorts mineurs pour ${R.cantrips(g)} connus à ce niveau.`); else toast(`${esc(s.n)} appris`); }
    else { const c = R.copy(g, s); g.spells.push(b.dataset.how === "copie" ? { id: s.id, how: "copie", h: c.h, po: c.po } : { id: s.id, how: "niv" }); toast(`${esc(s.n)} ajouté au grimoire`); }
  });
});
onChange("ftog", t => { S.f[t.dataset.v] = t.checked; render(); });
onChange("#f-sch", t => { S.f.school = t.value; render(); });
onInput("#f-q", t => { S.f.q = t.value; const p = document.getElementById("panel"); if (p) { p.innerHTML = biblioHTML(G()); const q = document.getElementById("f-q"); q.focus(); q.setSelectionRange(t.value.length, t.value.length); }; });

export { biblioHTML, libRow, addBtns };
