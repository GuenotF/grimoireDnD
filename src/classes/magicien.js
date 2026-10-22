// Magicien : Restauration arcanique (repos court), onglet Règles, étapes de son passage de niveau.
import { onChange, onClick } from "../core/actions.js";
import { byName, esc, plural, signed } from "../core/format.js";
import { G, S } from "../core/state.js";
import { mutate } from "../core/store.js";
import { render, toast } from "../core/ui.js";
import { BY_ID, SPELLS } from "../data.js";
import { firstName, luNeed } from "../features/levelup.js";
import { pCantrips, pConc, pExtras, pFoot, pHeader, pNotes, pSlots, pSpellRow, printHTML } from "../features/print.js";
import { castingRules, concentrationRules } from "../features/rules.js";
import { keyPills, metaLine, pText, pillsHTML, tags, tier } from "../features/spells.js";
import { R, classSpells } from "../rules/common.js";
import { SCHOOLS, SLOTS } from "../rules/tables.js";
import { statLabel } from "../ui/components.js";

// Emplacements récupérables : niveaux 1 à 5, dans la limite de ceux dépensés ; budget = moitié du niveau de magicien (arrondi au supérieur).
function arcaneLevels(g) { const out = []; for (let lv = 1; lv <= Math.min(5, R.maxLevel(g)); lv++) { const sp = +(g.used[lv] || 0); if (sp > 0) out.push([lv, sp]); } return out; }
const srTotal = sr => Object.entries(sr).reduce((a, [lv, n]) => a + lv * n, 0);
function arcaneCombos(g) {
  const B = R.arcane(g.level), lv = arcaneLevels(g).reverse(), res = [];
  (function walk(i, left, cur) {
    if (i === lv.length) { if (Object.keys(cur).length) res.push({ ...cur }); return; }
    const [l, sp] = lv[i];
    for (let n = Math.min(sp, Math.floor(left / l)); n >= 0; n--) { if (n) cur[l] = n; else delete cur[l]; walk(i + 1, left - n * l, cur); }
    delete cur[l];
  })(0, B, {});
  const best = Math.max(0, ...res.map(srTotal));
  return res.filter(c => srTotal(c) === best).slice(0, 4);
}
function srLabel(sr) {
  const parts = Object.entries(sr).filter(([, n]) => n > 0).sort((a, b) => b[0] - a[0]).map(([lv, n]) => `${n} emplacement${n > 1 ? "s" : ""} de niv. ${lv}`);
  return parts.join(" + ");
}
function shortHTML(g) {
  const B = R.arcane(g.level), lvls = arcaneLevels(g);
  let h = `<div class="short"><div><h3>Restauration arcanique</h3><p>Une fois par jour, après un repos court : jusqu'à <b>${B} niveau${B > 1 ? "x" : ""}</b> d'emplacements au total, aucun de niveau 6 ou plus.</p></div>`;
  if (g.arcane) return h + `<p>Déjà utilisée aujourd'hui : elle revient au prochain repos long.</p><button class="btn ghost" data-a="short-close" style="justify-self:start">Fermer</button></div>`;
  if (!lvls.length) return h + `<p>Aucun emplacement dépensé : rien à récupérer pour l'instant.</p><button class="btn ghost" data-a="short-close" style="justify-self:start">Fermer</button></div>`;
  const sr = S.sr, tot = srTotal(sr), combos = arcaneCombos(g), key = c => JSON.stringify(Object.entries(c).filter(([, n]) => n).sort());
  if (combos.length) h += `<div><span class="lbl">Choix rapides</span><div class="quick">${combos.map(c => `<button class="btn" data-a="sr-pick" data-c='${esc(JSON.stringify(c))}' aria-pressed="${key(c) === key(sr)}">${srLabel(c)}</button>`).join("")}</div></div>`;
  h += `<div>${lvls.map(([lv, sp]) => { const n = sr[lv] || 0; return `<div class="step"><span><b>Niveau ${lv}</b> <span class="muted" style="font-size:13px">· ${sp} dépensé${sp > 1 ? "s" : ""}</span></span><button class="btn" data-a="sr-dec" data-l="${lv}" aria-label="Un emplacement de niveau ${lv} en moins"${n ? "" : " disabled"}>−</button><b class="n">${n}</b><button class="btn" data-a="sr-inc" data-l="${lv}" aria-label="Un emplacement de niveau ${lv} en plus"${n < sp && tot + lv <= B ? "" : " disabled"}>+</button></div>`; }).join("")}</div>`;
  h += `<div class="meter"><div class="track"><div class="fill" style="width:${Math.round(100 * tot / B)}%"></div></div><b>${tot} / ${B} niveau${B > 1 ? "x" : ""}</b></div>
  <div class="cast"><button class="btn cast-go" data-a="sr-go"${tot ? "" : " disabled"}>${tot ? "Récupérer " + srLabel(sr) : "Choisis les emplacements à récupérer"}</button><button class="btn ghost" data-a="short-close">Annuler</button></div></div>`;
  return h;
}
function rulesHTML(g) {
  return `<div class="cols rules">
  <div><div class="rubric" style="margin-top:4px"><h3>Apprendre</h3></div>
  <p><b>Montée de niveau.</b> À chaque niveau de magicien, 2 sorts gratuits de niveau accessible. Au niveau 1, le grimoire contient 6 sorts de niveau 1.</p>
  <p><b>Copie.</b> Un sort de magicien trouvé (parchemin, autre grimoire), d'un niveau que tu peux préparer : <b>2 h et 50 po par niveau</b> du sort.</p>
  <p><b>Savant (niveau 2).</b> Pour les sorts de ton école (${esc(g.school)}), temps et or divisés par deux.</p>
  <p><b>Parchemin de sort.</b> Test d'Intelligence (Arcanes), DD 10 + niveau du sort. Réussi ou raté, le parchemin est détruit (Guide du maître).</p>
  <div class="rubric"><h3>Protéger</h3></div>
  <p><b>Copie de secours.</b> 1 h et 10 po par niveau de sort. Un grimoire perdu ne se reconstitue qu'avec les sorts préparés à ce moment-là.</p></div>
  <div><div class="rubric" style="margin-top:4px"><h3>Préparer</h3></div>
  <p>Après un repos long, choisis <b>${R.prepMax(g)} sorts</b> du grimoire (modificateur d'Intelligence + niveau). Les sorts mineurs ne comptent pas.</p>
  <p>Le préparer ne coûte rien.</p>
  ${castingRules(g)}
  ${concentrationRules()}
  <div class="rubric"><h3>Rituels</h3></div>
  <p>Un sort marqué <span class="tag r">R</span> se lance depuis le grimoire sans être préparé, en 10 minutes de plus, sans dépenser d'emplacement.</p>
  <div class="rubric"><h3>Récupérer</h3></div>
  <p><b>Repos long :</b> tous les emplacements. <b>Repos court :</b> Restauration arcanique, une fois par jour (${R.arcane(g.level)} niveau${R.arcane(g.level) > 1 ? "x" : ""} d'emplacements).</p>
  <p class="muted">Source des sorts : liste du magicien du Manuel des joueurs 2014 (le Guide du maître et le Manuel des monstres n'en ajoutent pas). Noms français officiels ; résumés rédigés pour la table, à vérifier dans le livre en cas de doute.</p></div></div>`;
}
function luStep1(g, b) {
  const from = g.level, to = b.level, a0 = R.slots(g, from), a1 = R.slots(g, to), mod = R.am(g);
  let h = "";
  if (a1.length > a0.length) {
    const lv = a1.length, n = a1[lv - 1];
    h += `<div class="lunew"><span class="k">Nouveau</span><b class="h">Sorts de niveau ${lv} accessibles</b><div class="sl"><b>Niveau ${lv}</b>${Array.from({ length: n }, () => `<span class="o"></span>`).join("")}<span>${plural(n, "emplacement")}</span></div></div>`;
  }
  const more = a1.map((n, i) => [i + 1, n - (a0[i] || 0)]).filter(([lv, d]) => d > 0 && lv <= a0.length);
  if (more.length) h += `<div class="lunew"><span class="k">${a1.length > a0.length ? "Et aussi" : "Nouveau"}</span><div class="sl">${more.map(([lv, d]) => `<span>+${d} emplacement${d > 1 ? "s" : ""} de niveau ${lv}</span>`).join(" · ")}</div></div>`;
  const row = (l, o, n, cls) => `<div class="${o === n ? "same" : ""}"><span>${l}</span><span class="old">${o}</span><span class="ar">→</span><b${cls && o !== n ? ` style="color:var(${cls})"` : ""}>${n}</b></div>`;
  const need = luNeed(g, to);
  h += `<div class="lutab"><div class="hd"><span></span><span>Niv. ${from}</span><span></span><span>Niv. ${to}</span></div>
  ${row("DD des sorts", 8 + R.prof(from) + mod, 8 + R.prof(to) + mod, "--ps-fg")}
  ${row("Attaque de sort", signed(R.prof(from) + mod), signed(R.prof(to) + mod), "--pa-fg")}
  ${row("Sorts préparés", R.prepMax(g), R.prepMax(b))}
  ${row("Restauration arcanique", R.arcane(from) + " niv.", R.arcane(to) + " niv.")}
  <div><span>Sorts gratuits à choisir</span><span></span><span></span><b style="color:var(--rubric)">+${need.s}</b></div>
  ${row("Sorts mineurs connus", R.cantrips(g, from), R.cantrips(g, to), "--rubric")}</div>`;
  if (tier(to) > tier(from)) {
    const up = g.cantrips.map(id => BY_ID[id]).filter(s => s && s.p && s.p.startsWith("d:") && s.up);
    if (up.length) h += `<div style="display:grid;gap:6px"><span class="lusub">Tes sorts mineurs gagnent un dé</span>${up.map(s => `<div class="lucan"><span class="n">${esc(s.n)}</span><s>${esc(pText(s, from).split(" ")[0])}</s><span class="kp d">${esc(pText(s, to))}</span></div>`).join("")}</div>`;
  }
  const notes = [];
  if (need.c) notes.push(`<span><b>Un sort mineur de plus</b> : tu le choisis à l'étape suivante.</span>`);
  if ([2, 6, 10, 14].includes(to)) notes.push(`<span><b>Capacité de tradition arcanique</b> (${esc(g.school)}) : voir le Manuel des joueurs.</span>`);
  if ([4, 8, 12, 16, 19].includes(to)) notes.push(`<span><b>Amélioration de caractéristiques</b> : si tu augmentes l'Intelligence, change sa valeur dans l'onglet Personnage, le DD et l'attaque suivront.</span>`);
  if (to === 18) notes.push(`<span><b>Maîtrise des sorts</b> : un sort de niveau 1 et un de niveau 2 lancés à volonté.</span>`);
  if (to === 20) notes.push(`<span><b>Sorts de prédilection</b> : deux sorts de niveau 3, une fois chacun par repos court sans emplacement.</span>`);
  notes.push(`<span>Hors grimoire, à vérifier sur ta fiche : points de vie, capacités de race${g.extras.length ? " et autres sorts (certains se débloquent avec le niveau)" : ""}.</span>`);
  return h + `<div class="lunote">${notes.join("")}</div>`;
}
function luStep2(g, b) {
  const L = S.lu, to = b.level, max = R.maxLevel(g, to), need = luNeed(g, to), maxOld = R.maxLevel(g);
  const owned = new Set([...g.spells.map(x => x.id), ...g.cantrips]);
  const chips = (arr, n, word) => `<div class="lupicks"><b>${arr.length} / ${n}</b>${arr.map(id => `<button class="lupick" data-a="lu-pick" data-id="${id}" aria-label="Retirer ${esc(BY_ID[id].n)}">${esc(BY_ID[id].n)}<span aria-hidden="true">✕</span></button>`).join("")}${arr.length < n ? `<span class="luempty">${arr.length ? (arr.length + 1) + "e" : n > 1 ? "1er" : ""} ${word}…</span>` : ""}</div>`;
  let h = `<div style="font-size:14px;line-height:1.4">Choisis <b>${plural(need.s, "sort")} de magicien</b> de niveau 1${max > 1 ? " à " + max : ""}, gratuits${need.c ? `, et <b>${plural(need.c, "sort mineur", "sorts mineurs")}</b>` : ""}. Ceux déjà dans ton grimoire n'apparaissent pas.</div>`;
  h += chips(L.picks, need.s, "sort");
  if (need.c) h += chips(L.cpicks, need.c, "sort mineur");
  const lvls = []; for (let lv = max; lv >= 1; lv--) lvls.push(lv); if (need.c) lvls.push(0);
  h += `<div class="chips">${lvls.map(lv => `<button class="chip" data-a="lu-flt" data-v="${lv}" aria-pressed="${L.flt === lv}">${lv === 0 ? "Sorts mineurs" : `Niv. ${lv}${lv > maxOld ? " · nouveau" : ""}`}</button>`).join("")}</div>`;
  const list = SPELLS.filter(s => s.l === L.flt && !owned.has(s.id)).sort((x, y) => x.n.localeCompare(y.n, "fr"));
  const arr = L.flt === 0 ? L.cpicks : L.picks, full = arr.length >= (L.flt === 0 ? need.c : need.s);
  h += `<div>${list.map(s => {
    const on = arr.includes(s.id), open = L.open === s.id;
    return `<div class="jrow lurow${on ? " on" : ""}"><div class="jline"><div class="jmain"><button class="jname" data-a="lu-row" data-id="${s.id}" aria-expanded="${open}">${esc(s.n)}${tags(s)}<span class="chev">${open ? "▴" : "▾"}</span></button><span class="kps">${keyPills(s, b)}</span></div>
    <button class="btn sm pick" data-a="lu-pick" data-id="${s.id}" aria-pressed="${on}"${!on && full ? " disabled" : ""}>${on ? "✓ Choisi" : "Choisir"}</button></div>
    ${open ? `<div class="jbody"><div class="meta">${metaLine(s)}</div>${pillsHTML(s, b)}<div class="eff">${esc(s.e)}</div>${s.up ? `<div class="up">${s.l === 0 ? "Progression" : "Emplacement plus élevé"} : ${esc(s.up)}</div>` : ""}</div>` : ""}</div>`;
  }).join("") || `<p class="muted">Tous les sorts de ce niveau sont déjà dans ton grimoire.</p>`}</div>`;
  return h;
}
function luStep3(g, b) {
  const L = S.lu, to = b.level, need = luNeed(g, to), pOld = R.prepMax(g), pNew = R.prepMax(b);
  const all = [...L.picks, ...L.cpicks];
  let h = `<div style="display:grid;gap:6px"><span class="lusub">Ajoutés au grimoire · montée de niveau</span>`;
  h += all.length ? `<div class="luadd">${all.map(id => { const s = BY_ID[id]; return `<div><span class="n">${esc(s.n)}</span><small>${s.l ? "niveau " + s.l : "sort mineur"}</small></div>`; }).join("")}</div>` : `<p class="muted" style="margin:0">Aucun sort choisi.</p>`;
  const miss = need.s - L.picks.length + need.c - L.cpicks.length;
  if (miss > 0) h += `<span class="muted" style="font-size:13.5px">${miss > 1 ? miss + " sorts non choisis : tu pourras les ajouter" : "1 sort non choisi : tu pourras l'ajouter"} plus tard depuis la Bibliothèque (Montée de niveau).</span>`;
  h += `<button class="linkbtn" data-a="lu-edit">Modifier le choix</button></div>`;
  const n = g.prepared.length + L.prep.length;
  h += `<div class="luprep"><h3>Préparation</h3><span>Tu peux maintenant préparer <b>${plural(pNew, "sort")}</b>${pNew > pOld ? ` (${pNew - pOld} de plus)` : ""}. En principe, la liste change au prochain repos long : vois avec ton MJ si tu peux préparer un nouveau sort tout de suite.</span>
  ${L.picks.map(id => { const on = L.prep.includes(id), full = !on && n >= pNew; return `<label><input type="checkbox" data-a="lu-prep" data-id="${id}"${on ? " checked" : ""}${full ? ' class="full" aria-disabled="true"' : ""}> Préparer <b>${esc(BY_ID[id].n)}</b></label>`; }).join("")}
  <span class="${n > pNew ? "" : "muted"}" style="font-size:13px${n > pNew ? ";color:var(--warn);font-weight:700" : ""}">Préparés après validation : ${n} / ${pNew}</span></div>`;
  const a0 = R.slots(g), a1 = R.slots(g, to), gained = a1.some((x, i) => x > (a0[i] || 0));
  h += `<div style="display:grid;gap:4px;font-size:13.5px;color:var(--muted);line-height:1.45">
  ${gained ? `<span>• Les nouveaux emplacements sont disponibles tout de suite.</span>` : ""}
  <span>• DD, attaque${tier(to) > tier(g.level) ? " et dés des sorts mineurs" : ""} sont mis à jour partout, fiche imprimable comprise.</span>
  <span>• Tu peux revenir au niveau ${g.level} avec le sélecteur de niveau : les sorts ajoutés restent au grimoire.</span></div>`;
  return h;
}
onClick("sr-pick", (b) => { S.sr = JSON.parse(b.dataset.c); render(); });
onClick(["sr-inc", "sr-dec"], (b, a) => { const lv = +b.dataset.l; S.sr[lv] = Math.max(0, (S.sr[lv] || 0) + (a === "sr-inc" ? 1 : -1)); if (!S.sr[lv]) delete S.sr[lv]; render(); });
onClick("sr-go", () => {
  const g = G(), sr = S.sr; if (!g || !srTotal(sr) || srTotal(sr) > R.arcane(g.level)) return;
  const prev = JSON.parse(JSON.stringify({ used: g.used, arcane: g.arcane })), label = srLabel(sr);
  S.shortOpen = false; S.sr = {};
  mutate(g => { Object.entries(sr).forEach(([lv, n]) => { g.used[lv] = Math.max(0, (+(g.used[lv] || 0)) - n); }); g.arcane = true; });
  toast(`Restauration arcanique : ${label} récupéré${/s de/.test(label) || label.includes("+") ? "s" : ""}`, () => mutate(g => { g.used = prev.used; g.arcane = prev.arcane; }));
});
onClick("lu-flt", (b) => { if (!S.lu) return; S.lu.flt = +b.dataset.v; S.lu.open = null; render(); });
onClick("lu-row", (b) => { if (!S.lu) return; S.lu.open = S.lu.open === b.dataset.id ? null : b.dataset.id; S.luKeep = true; render(); });
onClick("lu-pick", (b) => {
  if (!S.lu) return;
  const L = S.lu, g = G(), s = BY_ID[b.dataset.id]; if (!g || !s) return;
  const need = luNeed(g, L.to), k = s.l === 0 ? "cpicks" : "picks", lim = s.l === 0 ? need.c : need.s;
  if (L[k].includes(s.id)) { L[k] = L[k].filter(x => x !== s.id); L.prep = L.prep.filter(x => x !== s.id); }
  else if (L[k].length < lim) L[k].push(s.id);
  S.luKeep = true; render();
});
onChange("arcane", t => { mutate(g => { g.arcane = t.checked; }); });
onChange("#f-school", t => { mutate(g => { g.school = t.value; }); });

export { arcaneLevels, srTotal, arcaneCombos, srLabel, shortHTML, rulesHTML, luStep1, luStep2, luStep3 };

// ---------- Fiche imprimable ----------
function printSheet(g) {
  const prof = R.prof(g.level), mod = R.am(g), slots = R.slots(g), max = slots.length, pMax = R.prepMax(g), next = Math.min(9, max + 1);
  const sp = lv => g.spells.map(x => BY_ID[x.id]).filter(s => s.l === lv).sort(byName);
  let rows = "";
  for (let lv = 1; lv <= next; lv++) {
    const locked = lv > max;
    rows += `<tr class="lvl"><td colspan="4">Niveau ${lv}<span>${locked ? `s'ouvre au niveau ${R.unlockAt(g, lv)}` : `${slots[lv - 1]} emplacement${slots[lv - 1] > 1 ? "s" : ""}`}</span></td></tr>`;
    sp(lv).forEach(s => { rows += pSpellRow(g, s, true); });
    for (let i = 0; i < (locked ? 3 : 2); i++) rows += `<tr class="blank"><td class="c"><span class="box"></span></td><td></td><td></td><td></td></tr>`;
  }
  return `${pHeader(g, `Magicien, niveau ${g.level} · École ${/^[AÉEIO]/.test(g.school) ? "d'" : "de "}${esc(g.school)}`, [[signed(mod), "MOD. INTELLIGENCE"], [8 + prof + mod, "DD DES SORTS"], [signed(prof + mod), "ATTAQUE DE SORT"], [pMax, "SORTS PRÉPARÉS"], [R.cantrips(g), "SORTS MINEURS"]])}
${pSlots(g)}
<div class="callout"><span class="box"></span> <b>Restauration arcanique</b> : une fois par jour, après un repos court, récupère des emplacements pour un total de <b>${R.arcane(g.level)}</b> niveau${R.arcane(g.level) > 1 ? "x" : ""} (aucun de niveau 6 ou plus).</div>
${pCantrips(g)}
${pExtras(g)}
${pConc()}
<div class="brk"></div>
<h2 style="margin-top:0">Le grimoire <small>sorts préparés aujourd'hui : ____ / ${pMax}</small></h2>
<table><tr><th>Prép.</th><th>Sort</th><th>Incantation · composantes</th><th>Effet</th></tr>${rows}</table>
<div class="callout"><span class="tag">C</span> concentration · <span class="tag r">R</span> rituel : se lance depuis le grimoire sans être préparé, en 10 minutes de plus, sans emplacement.</div>
<div class="brk"></div>
<h2 style="margin-top:0">Journal de copie <small>sorts trouvés en aventure</small></h2>
<table><tr><th>Sort</th><th>Niv.</th><th>Source</th><th>Temps · coût</th><th>Réussi</th></tr>${Array.from({length: 6}, () => `<tr class="blank"><td></td><td></td><td></td><td></td><td class="c"><span class="box"></span></td></tr>`).join("")}</table>
<h2>Règles du grimoire</h2><div class="cols"><div>
<h3>Apprendre</h3><p><b>Montée de niveau :</b> 2 sorts gratuits par niveau, d'un niveau accessible.</p><p><b>Copie :</b> 2 h et 50 po par niveau du sort.</p>
${g.level >= 2 ? `<p><b>Savant en ${esc(g.school)} :</b> temps et or divisés par deux pour ton école.</p>` : ""}<p><b>Parchemin :</b> test d'Intelligence (Arcanes) DD 10 + niveau du sort ; le parchemin est détruit.</p>
<h3>Protéger</h3><p><b>Copie de secours :</b> 1 h et 10 po par niveau de sort.</p></div><div>
<h3>Préparer</h3><p>Après un repos long, ${pMax} sorts du grimoire (mod. d'Intelligence + niveau). Un sort se lance avec un emplacement de son niveau ou supérieur.</p>
<h3>Rituels</h3><p>Un sort <span class="tag r">R</span> se lance depuis le grimoire sans préparation, +10 minutes, sans emplacement.</p>
<h3>Récupérer</h3><p><b>Repos long :</b> tous les emplacements. <b>Repos court :</b> Restauration arcanique (1 fois par jour).</p></div></div>
${pNotes(g)}
${pFoot("GRIMOIRE")}
`;
}

// ---------- Définition de la classe (contrat : voir docs/ARCHITECTURE.md) ----------
export default {
  n: "Magicien", ab: "int", abN: "Intelligence", slots: SLOTS, top: 9,
  saves: ["int", "wis"],             // jets de sauvegarde maîtrisés par la classe
  book: true,                 // grimoire : apprend des sorts (montée de niveau, copie), prépare parmi eux
  fileLabel: "Grimoire",      // nom des fichiers de sauvegarde
  cantrips: lv => lv >= 10 ? 5 : lv >= 4 ? 4 : 3,
  prep: (g, m) => Math.max(1, m + g.level),
  defaults: () => ({ school: "Évocation", arcane: false }),
  subline: g => `Niveau ${g.level} · École ${/^[AÉEIO]/.test(g.school) ? "d'" : "de "}${esc(g.school)}`,
  subclassField: g => `<div class="field"><label for="f-school">Tradition arcanique</label><select id="f-school">${SCHOOLS.map(s=>`<option${s===g.school?" selected":""}>${s}</option>`).join("")}</select></div>`,
  heroStats: g => {
    const exp = R.expected(g.level), nSp = g.spells.length, cMax = R.cantrips(g);
    return `<div class="stat ${nSp < exp ? "alert" : ""}" role="listitem"><div class="v">${nSp}<small>/${exp}</small></div>${statLabel("Grimoire (min.)", "Grimoire")}</div>
    <div class="stat ${g.cantrips.length > cMax ? "alert" : ""}" role="listitem"><div class="v">${g.cantrips.length}<small>/${cMax}</small></div>${statLabel("Sorts mineurs", "Mineurs")}</div>`;
  },
  tabs: g => [["grimoire","Grimoire", g.spells.length + g.cantrips.length],["biblio","Bibliothèque", classSpells(g).length]],
  moreTabs: () => [["regles","Règles"],["imprimer","Imprimer"]],
  panels: { imprimer: g => printHTML(g), regles: g => rulesHTML(g) },
  print: g => printSheet(g),
  printTitle: g => `Grimoire de ${g.name}`,
  printDesc: "Elle contient le tableau de bord avec les cercles d'emplacements, le grimoire par niveau avec des cases « préparé » et des lignes vides à remplir au crayon, le journal de copie et le rappel des règles.",
  canRitual: () => true,      // rituel depuis le grimoire, sans le préparer
  restBar: g => `<label class="check"><input type="checkbox" data-a="arcane"${g.arcane ? " checked" : ""}> Restauration arcanique utilisée</label>
    <span class="muted">Au repos court, 1 fois par jour : récupère des emplacements pour un total de <b>${R.arcane(g.level)}</b> niveau${R.arcane(g.level) > 1 ? "x" : ""} (aucun de niveau 6 ou plus).</span>`,
  shortPanel: g => shortHTML(g),
  longRest: g => { g.arcane = false; },
  levelUp: {
    step2: "Sorts gratuits",
    init: g => ({ step: 1, to: g.level + 1, picks: [], cpicks: [], prep: [], flt: R.maxLevel(g, g.level + 1), open: null }),
    steps: [luStep1, luStep2, luStep3],
    nextLabel: (g, to) => luNeed(g, to).c ? "Choisir les sorts" : "Choisir les 2 sorts",
    apply(L, g) {
      const prev = JSON.parse(JSON.stringify({ level: g.level, spells: g.spells, cantrips: g.cantrips, prepared: g.prepared })), to = L.to, fn = firstName(g);
      mutate(g => {
        g.level = to;
        L.picks.forEach(id => { if (!g.spells.some(x => x.id === id)) g.spells.push({ id, how: "niv" }); });
        L.cpicks.forEach(id => { if (!g.cantrips.includes(id)) g.cantrips.push(id); });
        L.prep.forEach(id => { if (!g.prepared.includes(id)) g.prepared.push(id); });
      });
      toast(`<b>${esc(fn)}</b> passe au niveau ${to}${L.picks.length + L.cpicks.length ? ` · ${plural(L.picks.length + L.cpicks.length, "sort ajouté", "sorts ajoutés")}` : ""}`,
        () => { mutate(g => Object.assign(g, prev)); return "Passage de niveau annulé"; });
    },
  },
};
