// Onglet du grimoire : modes Gérer et En jeu, préparation, autres sorts, capacités de classe, repos.
import { wsActiveHTML, wsConcHTML } from "../classes/druide-wildshape.js";
import { DRU_FEATS, druResHTML } from "../classes/druide.js";
import { shortHTML } from "../classes/magicien.js";
import { OATHS, PAL_FEATS, STYLES, isOath, oathSpells, palResHTML, smiteHTML } from "../classes/paladin.js";
import { NEXT, onChange, onClick, onInput, onSubmit } from "../core/actions.js";
import { byName, esc, fmt, fr, plural } from "../core/format.js";
import { G, S } from "../core/state.js";
import { mutate } from "../core/store.js";
import { render, toast } from "../core/ui.js";
import { BY_ID } from "../data.js";
import { castHTML, concWarnHTML, firstFree, liveMark, slotsLeft } from "./cast.js";
import { keyPills, noteBox, noteGerer, noteMark, noteOf, notePen, pillsHTML, spellBody, tags } from "./spells.js";
import { C, R, castable, classSpells, isDru, isPal, isWiz } from "../rules/common.js";
import { foldHead, isFold, removeBtn } from "../ui/components.js";

const classFeats = g => isDru(g) ? DRU_FEATS.filter(f => !f.circle || f.circle === g.circle) : PAL_FEATS.filter(f => !f.oath || f.oath === g.oath);
function palFeatsHTML(g) {
  const feats = classFeats(g), have = feats.filter(f => f.lv <= g.level), next = feats.filter(f => f.lv > g.level).slice(0, 2);
  if (!have.length && !next.length) return "";
  const gerer = S.view !== "jeu";
  let h = foldHead("k", "", "Capacités de classe", `${esc(g.name)} · niveau ${g.level}`, plural(have.length, "capacité"));
  if (isFold("k")) return h;
  if (!have.length) h += `<div class="empty">Première capacité au niveau ${next[0].lv}.</div>`;
  have.forEach(f => {
    const key = "feat:" + f.id, open = S.open.has(key);
    const right = f.id === "style" && gerer
      ? `<select id="f-style" aria-label="Style de combat"><option value="">À choisir</option>${Object.entries(STYLES).map(([k, s]) => `<option value="${k}"${g.style === k ? " selected" : ""}>${s.n}</option>`).join("")}</select>`
      : `<span class="kp ${f.k}">${esc(f.pill(g))}</span>`;
    h += `<div class="jrow feat"><div class="jline"><span class="flv">niv. ${f.lv}</span><div class="jmain"><button class="jname" data-a="row" data-id="${key}" aria-expanded="${open}">${f.n}<span class="chev">${open ? "▴" : "▾"}</span></button></div>${right}</div>${open ? `<div class="jbody"><div class="eff">${esc(f.d(g))}</div></div>` : ""}</div>`;
  });
  if (gerer && next.length) {
    h += `<div class="featnext">À venir</div>`;
    next.forEach(f => { h += `<div class="jrow feat dim"><div class="jline"><span class="flv">niv. ${f.lv}</span><div class="jmain"><span class="jname">${f.n}</span></div><span class="fsum">${esc(f.pill({ ...g, level: f.lv }))}</span></div></div>`; });
  }
  return h;
}
function palGererHTML(g) {
  const max = R.maxLevel(g), pMax = R.prepMax(g), prepared = new Set(g.prepared), oath = oathSpells(g);
  let h = "";
  if (oath.length) {
    const list = oath.map(id => BY_ID[id]).sort(byName);
    h += foldHead("o", "oath", "Sorts de serment", `toujours préparés · ${esc(OATHS[g.oath].n)}`, plural(list.length, "sort"));
    if (!isFold("o")) list.forEach(s => { h += gererRow(g, s, null, s.l > max, true, false, true); });
  }
  if (C(g).cantrips(20) > 0) {
    const cMax = R.cantrips(g), cans = g.cantrips.map(id => BY_ID[id]).filter(Boolean).sort(byName);
    h += foldHead("c", "", "Sorts mineurs", `${cans.length} sur ${cMax} connus · à volonté, jamais préparés`, plural(cans.length, "sort"));
    if (!isFold("c")) { if (!cans.length) h += `<div class="empty">Aucun sort mineur. Choisis-en ${cMax} dans la bibliothèque (filtre « Mineurs »).</div>`; cans.forEach(s => { h += gererRow(g, s, null, false, false, true); }); }
  }
  const conc = castable(g).filter(s => s.c);
  h += `<div class="rubric"><h2>Sorts préparés</h2><span class="aside">${g.prepared.length > pMax ? `<span class="lim">Trop de sorts préparés : ${g.prepared.length} / ${pMax}</span> · décoche-en ${g.prepared.length - pMax}` : g.prepared.length === pMax ? `<span class="lim">Limite atteinte : ${pMax} / ${pMax}</span> · décoche un sort pour en préparer un autre` : `${g.prepared.length} préparé${g.prepared.length > 1 ? "s" : ""} sur ${pMax} · toute la liste du ${C(g).n.toLowerCase()}, à changer après un repos long`}</span></div>`;
  if (!max) h += `<div class="empty">Le ${C(g).n.toLowerCase()} prépare ses sorts à partir du niveau ${R.unlockAt(g, 1)}.</div>`;
  if (conc.length > 1) h += `<div class="note">Sorts de concentration préparés : ${conc.map(s => esc(s.n)).join(", ")}. Un seul peut être actif à la fois.</div>`;
  const all = classSpells(g).filter(s => !oath.includes(s.id));
  for (let lv = 1; lv <= Math.min(C(g).top, max + 1); lv++) {
    if (lv > max) { h += `<div class="rubric locked"><h3>Niveau ${lv}</h3><span class="aside">s'ouvre au niveau ${R.unlockAt(g, lv)} de ${C(g).n.toLowerCase()}</span></div>`; break; }
    const list = all.filter(s => s.l === lv).sort(byName), nP = list.filter(s => prepared.has(s.id)).length;
    const ns = R.slots(g)[lv - 1];
    h += foldHead("l" + lv, "", `Niveau ${lv}`, `${ns} emplacement${ns > 1 ? "s" : ""}`, plural(list.length, "sort") + ` · ${nP} préparé${nP > 1 ? "s" : ""}`);
    if (!isFold("l" + lv)) list.forEach(s => { h += gererRow(g, s, null, false, prepared.has(s.id), false); });
  }
  return h + extrasNotesHTML(g);
}
function extrasNotesHTML(g) {
  let h = "";
  // Autres sorts
  h += foldHead("x", "", "Autres sorts", "race, dons, objets magiques", plural(g.extras.length, "sort"));
  if (!isFold("x")) { h += `<div class="extras">`;
  if (!g.extras.length) h += `<div class="empty">Rien pour l'instant. Exemple : « Représailles infernales », 1 fois par repos long (héritage tieffelin).</div>`;
  g.extras.forEach((x, i) => {
    if (S.editX === i) {
      const d = S.xdraft || { name: x.name, note: x.note || "" };
      h += `<form class="extra edit" data-a="editx" data-i="${i}">
      <div class="fields"><div class="field"><label for="x-ename">Nom</label><input type="text" id="x-ename" value="${esc(d.name)}" required></div>
      <div class="field"><label for="x-enote">Usage et effet</label><textarea id="x-enote" rows="2">${esc(d.note)}</textarea></div></div>
      <div class="bar"><button class="btn ghost" type="button" data-a="xcancel">Annuler</button><button class="btn primary" type="submit">Enregistrer</button></div></form>`;
      return;
    }
    h += extraRow(x, i, true);
  });
  h += `</div><form class="addrow" data-a="addx"><input type="text" id="x-name" placeholder="Nom du sort" required aria-label="Nom du sort"><input type="text" id="x-note" placeholder="Usage et effet (ex. 1/repos long, 3d10 feu)" aria-label="Usage et effet"><button class="btn" type="submit">Ajouter</button></form>`; }

  h += `<div class="rubric"><h3>Notes</h3></div><textarea id="f-notes" placeholder="Grimoires trouvés, sorts à copier, idées…">${esc(g.notes)}</textarea>`;
  return h;
}
function grimoireHTML(g) {
  const slots = R.slots(g), max = slots.length, pMax = R.prepMax(g);
  let h = `<div class="viewsw" role="group" aria-label="Affichage du grimoire"><button data-a="view" data-v="gerer" aria-pressed="${S.view !== "jeu"}">Gérer</button><button data-a="view" data-v="jeu" aria-pressed="${S.view === "jeu"}">En jeu</button></div>`;
  if (isDru(g) && g.wsForm) h += wsActiveHTML(g);
  else if (isDru(g)) h += wsConcHTML(g);   // forme terminée par des dégâts : le rappel de concentration reste visible
  h += `<div class="rubric" id="slots-top" style="margin-top:4px"><h2>Emplacements de sorts</h2><span class="aside">touche un cercle quand tu lances un sort</span></div><div class="slots">`;
  if (!slots.length) h += `<p class="muted" style="margin:0 0 6px">Pas encore d'emplacement : les sorts arrivent au niveau ${R.unlockAt(g, 1)}.</p>`;
  slots.forEach((n, i) => {
    const lv = i + 1, used = Math.min(n, +(g.used[lv] || 0));
    h += `<div class="slotrow"><span class="lv">Niveau ${lv}</span><span class="pips">${Array.from({length:n},(_, k)=>`<button class="pip${k < used ? " used" : ""}" data-a="pip" data-l="${lv}" data-k="${k}" aria-label="Emplacement de niveau ${lv}, ${k < used ? "dépensé" : "disponible"}"></button>`).join("")}</span><span class="left">${n - used} / ${n}</span></div>`;
  });
  h += `<div class="restbar"><button class="btn" data-a="longrest">Repos long</button>${isWiz(g) ? `<button class="btn" data-a="short-open" aria-expanded="${S.shortOpen}">Repos court ${S.shortOpen ? "▴" : "▾"}</button>
    <label class="check"><input type="checkbox" data-a="arcane"${g.arcane ? " checked" : ""}> Restauration arcanique utilisée</label>
    <span class="muted">Au repos court, 1 fois par jour : récupère des emplacements pour un total de <b>${R.arcane(g.level)}</b> niveau${R.arcane(g.level) > 1 ? "x" : ""} (aucun de niveau 6 ou plus).</span>`
    : `<button class="btn" data-a="short-pal">Repos court</button><span class="muted">Repos court : ${isDru(g) ? "Forme sauvage" : "Conduit divin"}. Repos long : tout.</span>`}</div></div>`;
  if (S.shortOpen && isWiz(g)) h += shortHTML(g);
  if (!isWiz(g)) { h += (isPal(g) ? palResHTML(g) : druResHTML(g)) + palFeatsHTML(g); return h + (S.view === "jeu" ? jeuHTML(g) : palGererHTML(g)); }
  if (S.view === "jeu") return h + jeuHTML(g);

  // Sorts mineurs
  const cMax = R.cantrips(g);
  h += foldHead("c", "", "Sorts mineurs", `${g.cantrips.length} sur ${cMax} connus · à volonté, jamais préparés`, plural(g.cantrips.length, "sort"));
  if (!isFold("c")) {
    if (!g.cantrips.length) h += `<div class="empty">Aucun sort mineur. Choisis-en ${cMax} dans la bibliothèque (filtre « Mineurs »).</div>`;
    g.cantrips.map(id => BY_ID[id]).sort(byName).forEach(s => { h += gererRow(g, s, null, false, false, true); });
  }

  // Sorts de niveau 1+
  const prepared = new Set(g.prepared);
  const conc = g.spells.map(x => BY_ID[x.id]).filter(s => s.c && prepared.has(s.id));
  h += `<div class="rubric"><h2>Le grimoire</h2><span class="aside">${g.prepared.length > pMax ? `<span class="lim">Trop de sorts préparés : ${g.prepared.length} / ${pMax}</span> · décoche-en ${g.prepared.length - pMax}` : g.prepared.length === pMax ? `<span class="lim">Limite atteinte : ${pMax} / ${pMax}</span> · décoche un sort pour en préparer un autre` : `${g.prepared.length} préparé${g.prepared.length > 1 ? "s" : ""} sur ${pMax} · coche les sorts préparés après un repos long`}</span></div>`;
  if (g.prepared.length > pMax) h += `<div class="note warn">Trop de sorts préparés : ${g.prepared.length} pour ${pMax} autorisés (modificateur d'Intelligence + niveau).</div>`;
  if (conc.length > 1) h += `<div class="note">Sorts de concentration préparés : ${conc.map(s => esc(s.n)).join(", ")}. Un seul peut être actif à la fois.</div>`;
  const top = Math.min(9, max + 1);
  for (let lv = 1; lv <= top; lv++) {
    const list = g.spells.filter(x => BY_ID[x.id].l === lv).map(x => [x, BY_ID[x.id]]).sort((a, b) => byName(a[1], b[1]));
    const locked = lv > max;
    if (locked && !list.length) { h += `<div class="rubric locked"><h3>Niveau ${lv}</h3><span class="aside">s'ouvre au niveau ${R.unlockAt(g, lv)} de magicien</span></div>`; continue; }
    const nP = list.filter(([x]) => prepared.has(x.id)).length;
    h += foldHead("l" + lv, locked ? "locked" : "", `Niveau ${lv}`, slots[lv - 1] ? `${slots[lv - 1]} emplacement${slots[lv - 1] > 1 ? "s" : ""}` : `s'ouvre au niveau ${R.unlockAt(g, lv)}`, plural(list.length, "sort") + (locked ? "" : ` · ${nP} préparé${nP > 1 ? "s" : ""}`));
    if (isFold("l" + lv)) continue;
    if (!list.length) h += `<div class="empty">Aucun sort de niveau ${lv}. Ajoute-en depuis la bibliothèque.</div>`;
    list.forEach(([x, s]) => { h += gererRow(g, s, x, locked, prepared.has(s.id), false); });
  }
  const copies = g.spells.filter(x => x.how === "copie");
  if (copies.length) h += `<p class="found">Total des copies : ${copies.length} sort${copies.length > 1 ? "s" : ""}, ${fmt(copies.reduce((a, x) => a + x.h, 0))} h et ${fr(copies.reduce((a, x) => a + x.po, 0))} po.</p>`;

  h += extrasNotesHTML(g);
  return h;
}
// Mode Gérer : une ligne par sort (case Préparer, nom, pastilles clés), détail complet au toucher du nom
function gererRow(g, s, x, locked, p, cantrip, oath) {
  const open = S.open.has(s.id), wiz = isWiz(g);
  const full = !p && !locked && g.prepared.length >= R.prepMax(g); // limite atteinte : on ne peut plus que décocher
  const box = cantrip ? "" : oath ? `<span class="gstar" title="Sort de serment : toujours préparé, hors limite" aria-label="Sort de serment, toujours préparé">★</span>` : `<input type="checkbox" class="gprep${full ? " full" : ""}" data-a="prep" data-id="${s.id}" aria-label="Préparer ${esc(s.n)}"${p ? " checked" : ""}${locked ? " disabled" : full ? ' aria-disabled="true"' : ""}>`;
  let body = "";
  if (open) {
    const origin = !wiz ? (oath ? `Sort de serment · ${esc(OATHS[g.oath].full)}` : cantrip ? "Sort mineur" : `Liste du ${C(g).n.toLowerCase()}`) : cantrip ? "Sort mineur" : x && x.how === "copie" ? `Copié · ${fmt(x.h)} h · ${fr(x.po)} po` : "Montée de niveau";
    body = `<div class="jbody"><span class="vo">${esc(s.en)}</span>${spellBody(s, g)}
    ${isDru(g) && !cantrip && s.ri && !p ? `<div class="meta">Rituel : prépare-le pour pouvoir le lancer en rituel (+10 min, sans emplacement).</div>` : ""}
    ${wiz && !cantrip && s.ri && !p ? `<div class="meta">Rituel : se lance depuis le grimoire sans être préparé (+10 min, sans emplacement).</div>` : ""}
    ${noteOf(g, s) && S.noteEdit !== s.id ? noteBox(g, s) : ""}
    ${(!cantrip || s.c) && !locked ? castHTML(g, s, p) : ""}
    <div class="rowact"><span class="origin">${origin}</span>${wiz || cantrip ? removeBtn((cantrip ? "c:" : "s:") + s.id) : ""}</div></div>`;
  }
  return `<div class="jrow${p ? (oath ? " on oath" : " on") : ""}"><div class="jline">${box}<div class="jmain"><button class="jname" data-a="row" data-id="${s.id}" aria-expanded="${open}">${esc(s.n)}${tags(s)}<span class="chev">${open ? "▴" : "▾"}</span></button>${liveMark(g, s)}<span class="kps">${keyPills(s, g)}</span></div>${notePen(g, s)}</div>${noteGerer(g, s)}${body}${concWarnHTML(g, s)}</div>`;
}
// Autres sorts : une ligne (nom + « utilisé »), usage et actions au toucher du nom
function extraRow(x, i, manage) {
  const key = "x:" + i, open = S.open.has(key);
  const body = open ? `<div class="jbody">${x.note ? `<div class="eff">${esc(x.note)}</div>` : `<div class="meta">Aucune description.${manage ? " Utilise « Modifier » pour en ajouter une." : ""}</div>`}
    ${manage ? `<div class="rowact"><button class="btn ghost" data-a="xedit" data-i="${i}" aria-label="Modifier ${esc(x.name)}">Modifier</button>${removeBtn(key)}</div>` : ""}</div>` : "";
  return `<div class="jrow"><div class="jline"><div class="jmain"><button class="jname" data-a="row" data-id="${key}" aria-expanded="${open}">${esc(x.name)}<span class="chev">${open ? "▴" : "▾"}</span></button></div><label class="check"><input type="checkbox" data-a="xused" data-i="${i}"${x.used ? " checked" : ""}> utilisé</label></div>${body}</div>`;
}
function jeuRow(g, s, kind) {
  const open = S.open.has(s.id);
  let act = "";
  if (!open) {
    if (kind === "prep") { const lv = firstFree(g, s); act = lv ? `<button class="btn cast-go sm" data-a="cast" data-id="${s.id}" data-l="${lv}">${lv === s.l ? "Lancer" : "Lancer · niv. " + lv}</button>` : `<button class="btn cast-none sm" disabled>Épuisé</button>`; }
    else if (kind === "rit") act = `<button class="btn cast-rit sm" data-a="cast-rit" data-id="${s.id}">Rituel</button>`;
    else if (kind === "cantrip" && s.c) act = `<button class="btn cast-go sm" data-a="cast" data-id="${s.id}" data-l="0">Lancer</button>`;
  }
  return `<div class="jrow"><div class="jline"><div class="jmain"><button class="jname" data-a="row" data-id="${s.id}" aria-expanded="${open}">${esc(s.n)}${tags(s)}<span class="chev">${open ? "▴" : "▾"}</span></button>${noteMark(g, s)}${liveMark(g, s)}<span class="kps">${keyPills(s, g)}</span></div>${act}</div>
  ${open ? `<div class="jbody">${pillsHTML(s, g)}<div class="eff">${esc(s.e)}</div>${s.up ? `<div class="up">${s.l === 0 ? "Progression" : "Emplacement plus élevé"} : ${esc(s.up)}</div>` : ""}${noteOf(g, s) ? noteBox(g, s) : ""}${(kind !== "cantrip" || s.c) ? castHTML(g, s, kind === "prep") : ""}</div>` : ""}${concWarnHTML(g, s)}</div>`;
}
function jeuHTML(g) {
  const prepared = new Set(g.prepared), max = R.maxLevel(g), slots = R.slots(g), ready = castable(g);
  let h = isPal(g) ? smiteHTML(g) : "";
  // Paladin : sorts de serment dans leur propre section, comme dans Gérer
  const oath = isWiz(g) ? [] : ready.filter(s => isOath(g, s)).sort((a, b) => a.l - b.l || byName(a, b));
  if (oath.length) { h += foldHead("o", "oath", "Sorts de serment", `toujours préparés · ${esc(OATHS[g.oath].n)}`, plural(oath.length, "sort")); if (!isFold("o")) oath.forEach(s => { h += jeuRow(g, s, "prep"); }); }
  const cans = g.cantrips.map(id => BY_ID[id]).sort(byName);
  if (cans.length) {
    // Sorts mineurs : un par ligne, ceux qui ont un jet (attaque, sauvegarde) d'abord
    const combat = cans.filter(s => s.j), util = cans.filter(s => !s.j);
    h += foldHead("c", "", "Sorts mineurs", "à volonté", plural(cans.length, "sort"));
    if (!isFold("c")) [...combat, ...util].forEach(s => { h += jeuRow(g, s, "cantrip"); });
  }
  for (let lv = 1; lv <= max; lv++) {
    const list = ready.filter(s => s.l === lv && !isOath(g, s)).sort(byName);
    if (!list.length) continue;
    h += foldHead("l" + lv, "", `Niveau ${lv}`, `${slotsLeft(g, lv)} / ${slots[lv - 1]} restant${slotsLeft(g, lv) > 1 ? "s" : ""}`, plural(list.length, "sort"));
    if (!isFold("l" + lv)) list.forEach(s => { h += jeuRow(g, s, "prep"); });
  }
  if (!ready.length && max) h += `<div class="empty">Aucun sort préparé. Passe en mode « Gérer » pour cocher les sorts du jour.</div>`;
  const rits = g.spells.map(x => BY_ID[x.id]).filter(s => s.ri && !prepared.has(s.id) && s.l <= max).sort(byName);
  if (rits.length) { h += foldHead("r", "rit", "Rituels", "depuis le grimoire, +10 min, sans emplacement", plural(rits.length, "sort")); if (!isFold("r")) rits.forEach(s => { h += jeuRow(g, s, "rit"); }); }
  if (g.extras.length) {
    h += foldHead("x", "", "Autres sorts", "", plural(g.extras.length, "sort"));
    if (!isFold("x")) g.extras.forEach((x, i) => { h += extraRow(x, i, false); });
  }
  return h;
}
onClick("pip", (b) => { mutate(g => { const lv = +b.dataset.l, k = +b.dataset.k, u = +(g.used[lv] || 0); g.used[lv] = k < u ? k : k + 1; }); });
onClick("longrest", () => { S.concPanel = false; S.shortOpen = false; S.sr = {}; mutate(g => { g.used = {}; g.arcane = false; g.effects = []; g.loh = 0; g.dsU = 0; g.cdU = 0; g.wsU = 0; g.wsForm = null; S.wsDice = ""; S.wsConc = null; g.extras.forEach(x => x.used = false); toast("Repos long : emplacements et capacités récupérés, sorts en cours terminés"); }); });
onClick("rm", (b) => {
  const k = b.dataset.k;
  if (S.confirm !== k) { S.confirm = k; render(); return; }
  S.confirm = null;
  mutate(g => {
    const [t, v] = [k.slice(0, 1), k.slice(2)];
    if (t === "c") { g.cantrips = g.cantrips.filter(id => id !== v); delete g.snotes[v]; }
    if (t === "s") { g.spells = g.spells.filter(x => x.id !== v); g.prepared = g.prepared.filter(id => id !== v); delete g.snotes[v]; }
    if (t === "x") { g.extras.splice(+v, 1); S.editX = null; S.xdraft = null; [...S.open].forEach(k => { if (k.startsWith("x:")) S.open.delete(k); }); }
  });
});
onClick("view", (b) => { S.view = b.dataset.v; S.open.clear(); S.concWarn = null; try { localStorage.setItem("grimoire.view", S.view); } catch (e) {} render(); });
onClick("row", (b) => { const k = b.dataset.id; if (S.open.has(k)) S.open.delete(k); else S.open.add(k); S.castOpen = null; render(); });
onClick("short-pal", () => {
  const g = G(); if (!g) return; const f = isDru(g) ? "wsU" : "cdU", prev = g[f];
  mutate(g => { g[f] = 0; }); toast(`Repos court : ${isDru(g) ? "Forme sauvage" : "Conduit divin"} récupéré${isDru(g) ? "e" : ""}`, () => { mutate(g => { g[f] = prev; }); return "Repos court annulé"; });
});
onClick("xedit", (b) => { S.open.delete("x:" + b.dataset.i); S.editX = +b.dataset.i; S.xdraft = null; render(); const el = document.getElementById("x-ename"); if (el) { el.focus(); el.select(); } });
onClick("xcancel", () => { S.editX = null; S.xdraft = null; render(); });
// Limite de préparation (grimoire et assistant du magicien) : refus, sinon on passe au gestionnaire suivant
onChange(t => (t.dataset.a === "prep" || t.dataset.a === "lu-prep") && t.checked, t => {
  const a = t.dataset.a, g = G(), lu = a === "lu-prep" && S.lu, max = lu ? R.prepMax({ ...g, level: S.lu.to }) : R.prepMax(g), n = g.prepared.length + (lu ? S.lu.prep.length : 0);
  if (n >= max) { t.checked = false; toast(`Limite atteinte (${n}/${max}) : décoche d'abord un sort`); return; }
  return NEXT;
});
onChange("prep", t => { mutate(g => { const id = t.dataset.id; g.prepared = t.checked ? [...g.prepared, id] : g.prepared.filter(x => x !== id); }); });
onChange("xused", t => { mutate(g => { g.extras[+t.dataset.i].used = t.checked; }); });
onInput("#f-notes", t => { mutate(g => { g.notes = t.value; }, false); });
onInput(t => ["x-ename", "x-enote"].includes(t.id), t => { S.xdraft = { name: document.getElementById("x-ename").value, note: document.getElementById("x-enote").value }; });
onSubmit("editx", f => {
  const i = +f.dataset.i, n = document.getElementById("x-ename").value.trim(), note = document.getElementById("x-enote").value.trim();
  if (!n) return; S.editX = null; S.xdraft = null;
  mutate(g => { if (g.extras[i]) { g.extras[i].name = n; g.extras[i].note = note; } }); toast("Modification enregistrée");
});
onSubmit("addx", () => {
  const n = document.getElementById("x-name").value.trim(), note = document.getElementById("x-note").value.trim();
  if (!n) return; mutate(g => g.extras.push({ name: n, note, used: false }));
});

export { classFeats, palFeatsHTML, palGererHTML, extrasNotesHTML, grimoireHTML, gererRow, extraRow, jeuRow, jeuHTML };
