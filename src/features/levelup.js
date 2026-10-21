// Assistant de passage de niveau (structure commune et étapes des classes à sorts préparés).
import { MV, fpLabel, newForms } from "../classes/druide-wildshape.js";
import { CIRCLES, DRU } from "../classes/druide.js";
import { luStep1, luStep2, luStep3 } from "../classes/magicien.js";
import { OATHS, PAL, STYLES, oathSpells } from "../classes/paladin.js";
import { onChange, onClick } from "../core/actions.js";
import { byName, cap, esc, plural, signed } from "../core/format.js";
import { G, S } from "../core/state.js";
import { mutate } from "../core/store.js";
import { render, toast } from "../core/ui.js";
import { BEAST, BY_ID } from "../data.js";
import { classFeats } from "./grimoire.js";
import { keyPills, tags } from "./spells.js";
import { R, classSpells, isDru, isPal, isWiz } from "../rules/common.js";

// Assistant ouvert par le bouton « ↑ Niveau N » : ce qui change, sorts gratuits, validation.
// Le sélecteur de niveau reste un réglage direct (création, correction), sans assistant.
function luOpen(g) { S.lu = isWiz(g) ? { step: 1, to: g.level + 1, picks: [], cpicks: [], prep: [], flt: R.maxLevel(g, g.level + 1), open: null }
    : { step: 1, to: g.level + 1, style: g.style || "", prep: [...g.prepared], cpicks: [], wsfav: [], open: null }; S.concPanel = false; S.fxOpen = false; S.shortOpen = false; }
const luNeed = (g, to) => ({ s: 2, c: Math.max(0, R.cantrips(g, to) - R.cantrips(g)) });
const firstName = g => g.name.trim() || g.name; // nom complet (« Ser Kael », pas « Ser »)
function luHTML(g) {
  const L = S.lu, to = L.to, b = { ...g, level: to }, step = L.step, fn = firstName(g);
  const wiz = isWiz(g), names = ["Ce qui change", wiz ? "Sorts gratuits" : "Préparation", "Valider"];
  const head = `<div class="luhead"><div class="t"><h2><span class="initial">${esc(fn.charAt(0))}</span>${esc(fn.slice(1))} passe au niveau ${to}</h2><button class="x" data-a="lu-close" aria-label="Fermer l'assistant">✕</button></div>
  <div class="lusteps">${names.map((n, i) => `<div class="${i + 1 < step ? "done" : i + 1 === step ? "cur" : ""}"${i + 1 === step ? ' aria-current="step"' : ""}>${i + 1} · ${n}</div>`).join("")}</div></div>`;
  const body = !wiz ? (step === 1 ? palLu1(g, b) : step === 2 ? palLu2(g, b) : palLu3(g, b)) : step === 1 ? luStep1(g, b) : step === 2 ? luStep2(g, b) : luStep3(g, b);
  const need = luNeed(g, to);
  const foot = step === 1 ? `<button class="btn" data-a="lu-close">Annuler</button><button class="btn primary" data-a="lu-next">${!wiz ? "Préparation" : need.c ? "Choisir les sorts" : "Choisir les 2 sorts"} →</button>`
    : step === 2 ? `<button class="btn" data-a="lu-back">← Retour</button><button class="btn primary" data-a="lu-next">Suivant →</button>`
    : `<button class="btn" data-a="lu-back">← Retour</button><button class="btn primary" data-a="lu-go" style="font-weight:700">Passer au niveau ${to}</button>`;
  return `<div class="lubox">${head}<div class="lubody">${body}</div><div class="lufoot">${foot}</div></div>`;
}
function palLu1(g, b) {
  const from = g.level, to = b.level, a0 = R.slots(g, from), a1 = R.slots(g, to);
  let h = "";
  if (a1.length > a0.length) {
    const lv = a1.length, n = a1[lv - 1], more = a0.map((x, i) => [i + 1, a1[i] - x]).filter(([, d]) => d > 0);
    h += `<div class="lunew"><span class="k">Nouveau</span><b class="h">${lv === 1 ? "Premiers sorts de paladin" : `Sorts de niveau ${lv} accessibles`}</b><div class="sl"><b>Niveau ${lv}</b>${Array.from({ length: n }, () => `<span class="o"></span>`).join("")}<span>${plural(n, "emplacement")}</span>${more.map(([l, d]) => `<span class="muted">· niveau ${l} : ${a0[l - 1]} → ${a1[l - 1]}</span>`).join("")}</div></div>`;
  } else {
    const more = a1.map((n, i) => [i + 1, n - (a0[i] || 0)]).filter(([, d]) => d > 0);
    if (more.length) h += `<div class="lunew"><span class="k">Nouveau</span><div class="sl">${more.map(([lv, d]) => `<span>+${d} emplacement${d > 1 ? "s" : ""} de niveau ${lv}</span>`).join(" · ")}</div></div>`;
  }
  const mod = R.am(g), row = (l, o, n, cls) => `<div class="${o === n ? "same" : ""}"><span>${l}</span><span class="old">${o}</span><span class="ar">→</span><b${cls && o !== n ? ` style="color:var(${cls})"` : ""}>${n}</b></div>`;
  h += `<div class="lutab"><div class="hd"><span></span><span>Niv. ${from}</span><span></span><span>Niv. ${to}</span></div>
  ${row("DD des sorts", 8 + R.prof(from) + mod, 8 + R.prof(to) + mod, "--ps-fg")}
  ${row("Attaque de sort", signed(R.prof(from) + mod), signed(R.prof(to) + mod), "--pa-fg")}
  ${isPal(g) ? row("Imposition des mains", PAL.loh(g) + " PV", PAL.loh(b) + " PV", "--ok") : ""}
  ${row("Sorts préparés", R.maxLevel(g) ? R.prepMax(g) : 0, R.maxLevel(b) ? R.prepMax(b) : 0)}
  ${isPal(g) ? row("Perception divine", PAL.ds(g), PAL.ds(b)) : ""}
  ${isPal(g) && PAL.cd(b) ? row("Conduit divin", PAL.cd(g), PAL.cd(b)) : ""}
  ${isDru(g) ? row("Sorts mineurs connus", R.cantrips(g), R.cantrips(b), "--rubric") : ""}
  ${isDru(g) && DRU.ws(b) ? row("Forme sauvage", DRU.ws(g) ? `FP ${DRU.fp(g)}` : "—", `FP ${DRU.fp(b)}`, "--ok") : ""}</div>`;
  const feats = classFeats(g).filter(f => f.lv === to);
  if (feats.length) h += `<div style="display:grid;gap:6px"><span class="lusub">Nouvelle capacité</span>${feats.map(f => `<div class="lucan"><span class="n">${f.n}</span><span class="kp ${f.k}">${esc(f.pill(b))}</span></div>`).join("")}</div>`;
  const newOath = oathSpells(b).filter(id => !oathSpells(g).includes(id));
  if (newOath.length) h += `<div style="display:grid;gap:6px"><span class="lusub" style="color:var(--gold)">Nouveaux sorts de serment · toujours préparés</span>${newOath.map(id => BY_ID[id]).map(s => `<div class="lucan"><span style="color:var(--gold)">★</span><span class="n">${esc(s.n)}</span><span class="kps">${keyPills(s, b)}</span></div>`).join("")}</div>`;
  const nf = isDru(g) ? newForms(g, b) : [];
  if (nf.length) {
    const why = to === 2 ? "Forme sauvage : premières transformations" : [DRU.fp(b) > DRU.fp(g) ? `bêtes de FP ${fpLabel(DRU.fp(b))}` : "", to === 4 ? "bêtes qui nagent" : "", to === 8 ? "bêtes qui volent" : ""].filter(Boolean).join(" et ");
    h += `<div class="lunew"><span class="k">Nouvelles formes</span><b class="h">${plural(nf.length, "bête")} de plus</b><span style="font-size:13.5px">${cap(why)}${to === 2 ? "" : " deviennent possibles"}.</span>
      <div class="lunames">${nf.map(x => esc(x.n)).join(" · ")}</div><span class="muted" style="font-size:12.5px">Tu pourras les ajouter à tes formes ★ à l'étape suivante.</span></div>`;
  }
  const notes = [`<span>Hors appli, à vérifier sur ta fiche : points de vie (${isDru(g) ? "1d8" : "1d10"} + mod. CON)${R.prof(to) > R.prof(from) ? ` et bonus de maîtrise (${signed(R.prof(to))}), qui monte aussi le toucher de tes armes` : ""}.</span>`];
  if ([4, 8, 12, 16, 19].includes(to)) notes.unshift(`<span><b>Amélioration de caractéristiques</b> : si tu augmentes ${isDru(g) ? "la Sagesse" : "le Charisme"}, change sa valeur dans la fiche, le DD et l'attaque suivront.</span>`);
  if (isDru(g) && to === 2) notes.unshift(`<span><b>Cercle druidique</b> : vérifie le cercle choisi dans la fiche (${esc(CIRCLES[g.circle].n)}).</span>`);
  if (isPal(g) && to === 3) notes.unshift(`<span><b>Serment sacré</b> : vérifie le serment choisi dans la fiche (${esc(OATHS[g.oath].n)}).</span>`);
  return h + `<div class="lunote">${notes.join("")}</div>`;
}
function palLu2(g, b) {
  const L = S.lu, max = R.maxLevel(b), pMax = max ? R.prepMax(b) : 0, oath = oathSpells(b);
  let h = "";
  const nf = isDru(g) ? newForms(g, b) : [];
  if (nf.length) {
    const fav = L.wsfav || [];
    h += `<div class="rubric"><h3>Nouvelles formes</h3><span class="aside">${fav.length ? `${fav.length} ★ ajoutée${fav.length > 1 ? "s" : ""}` : "touche ☆ pour l'ajouter à tes formes"}</span></div><div class="luplist">${nf.map(x => { const on = fav.includes(x.id);
      return `<div class="lurowp lufav${on ? " on" : ""}"><button class="wsfav${on ? " on" : ""}" data-a="lu-wsfav" data-id="${x.id}" aria-pressed="${on}" aria-label="${on ? "Retirer des" : "Ajouter aux"} formes favorites">${on ? "★" : "☆"}</button><span class="n">${esc(x.n)}</span><span class="flv">FP ${esc(x.fp)}</span><span class="wsmini">PV ${x.pv} · CA ${x.ca}${Object.keys(MV).filter(k => x.v[k]).map(k => ` · ${k} ${x.v[k]} m`).join("")}</span></div>`; }).join("")}</div>`;
  }
  const needC = Math.max(0, R.cantrips(b) - R.cantrips(g));
  if (needC) {
    const known = new Set(g.cantrips), list = classSpells(b).filter(s => s.l === 0 && !known.has(s.id)).sort(byName), fullC = L.cpicks.length >= needC;
    h += `<div class="rubric"><h3>Sort mineur à apprendre</h3><span class="aside">${L.cpicks.length} / ${needC}</span></div><div class="luplist">${list.map(s => { const on = L.cpicks.includes(s.id); return `<label class="lurowp${on ? " on" : ""}"><input type="checkbox" data-a="lu-cpick" data-id="${s.id}"${on ? " checked" : ""}${!on && fullC ? ' class="full" aria-disabled="true"' : ""}><span class="n">${esc(s.n)}${tags(s)}</span><span class="kps">${keyPills(s, b)}</span></label>`; }).join("")}</div>`;
  }
  if (isPal(g) && !g.style && b.level >= 2) h += `<div class="luprep"><h3>Style de combat</h3><span class="muted">Pas encore choisi : c'est le moment.</span>
    <div class="chips">${Object.entries(STYLES).map(([k, s]) => `<button class="chip" data-a="lu-style" data-v="${k}" aria-pressed="${L.style === k}">${s.n}</button>`).join("")}</div>
    ${L.style ? `<span class="muted" style="font-size:13px">${esc(STYLES[L.style].n)} : ${esc(STYLES[L.style].d)}</span>` : ""}</div>`;
  if (!max) return h + `<div class="empty">Le paladin prépare ses sorts à partir du niveau ${R.unlockAt(g, 1)}.</div>`;
  const prep = L.prep.filter(id => BY_ID[id] && BY_ID[id].l <= max && !oath.includes(id)), full = prep.length >= pMax;
  const box = (s, on) => `<label class="lurowp${on ? " on" : ""}"><input type="checkbox" data-a="lu-pprep" data-id="${s.id}"${on ? " checked" : ""}${!on && full ? ' class="full" aria-disabled="true"' : ""}><span class="n">${esc(s.n)}${tags(s)}</span><span class="kps">${keyPills(s, b)}</span></label>`;
  h += `<div style="font-size:14px;line-height:1.4">Tes sorts préparés au niveau ${b.level} : <b>${pMax}</b>${isPal(g) ? " (sans compter le serment)" : ""}.${!R.maxLevel(g) ? ` Choisis-les dans la liste du niveau 1.` : R.maxLevel(g) < max ? ` Tu peux en remplacer un par un sort de niveau ${max}.` : ""} <span class="muted">En principe au repos long : vois avec ton MJ.</span></div>`;
  // Liste stable : les sorts déjà préparés restent affichés, cochés ou non
  const newLv = R.maxLevel(g) < max ? max : 0;
  const base = [...new Set([...g.prepared, ...prep])].filter(id => BY_ID[id] && BY_ID[id].l <= max && BY_ID[id].l !== newLv && !oath.includes(id)).map(id => BY_ID[id]).sort((x, y) => x.l - y.l || byName(x, y));
  h += `<div class="rubric"><h3>Préparés</h3><span class="aside"${prep.length > pMax ? ' style="color:var(--warn);font-weight:700;font-style:normal"' : ""}>${prep.length} / ${pMax}</span></div><div class="luplist">${base.map(s => box(s, prep.includes(s.id))).join("") || `<div class="empty">Aucun sort préparé pour l'instant${newLv === 1 ? " : choisis-les ci-dessous" : ""}.</div>`}</div>`;
  // Ajouter : tous les sorts accessibles, filtrés par niveau (le nouveau niveau d'abord)
  const flt = L.flt && L.flt <= max ? L.flt : max, lvls = []; for (let lv = max; lv >= 1; lv--) lvls.push(lv);
  const shown = new Set(base.map(s => s.id)), more = classSpells(b).filter(s => s.l === flt && s.l > 0 && !oath.includes(s.id) && !shown.has(s.id)).sort(byName);
  h += `<div class="rubric"><h3>Ajouter un sort</h3><span class="aside">${full ? "décoche un sort pour en ajouter" : "coche pour préparer"}</span></div>
  <div class="chips">${lvls.map(lv => `<button class="chip" data-a="lu-pflt" data-v="${lv}" aria-pressed="${flt === lv}">Niv. ${lv}${lv === newLv ? " · nouveau" : ""}</button>`).join("")}</div>
  <div class="luplist">${more.map(s => box(s, prep.includes(s.id))).join("") || `<div class="empty">Tous les sorts de ce niveau sont déjà dans la liste.</div>`}</div>`;
  return h;
}
function palLu3(g, b) {
  const L = S.lu, max = R.maxLevel(b), oath = oathSpells(b), prep = L.prep.filter(id => BY_ID[id] && BY_ID[id].l <= max && !oath.includes(id));
  const same = prep.length === g.prepared.length && prep.every(id => g.prepared.includes(id)), nOath = oath.length - oathSpells(g).length;
  const a0 = R.slots(g), a1 = R.slots(b), gained = a1.map((n, i) => [i + 1, n - (a0[i] || 0)]).filter(([, d]) => d > 0);
  return `<div style="display:grid;gap:6px"><span class="lusub">Récapitulatif</span><div class="luadd">
    ${L.cpicks && L.cpicks.length ? `<div><span class="n">Sort${L.cpicks.length > 1 ? "s" : ""} mineur${L.cpicks.length > 1 ? "s" : ""}</span><small>${L.cpicks.map(id => esc(BY_ID[id].n)).join(", ")}</small></div>` : ""}
    ${isPal(g) && !g.style && b.level >= 2 ? `<div><span class="n">Style de combat</span><small>${L.style ? esc(STYLES[L.style].n) : "pas encore choisi"}</small></div>` : ""}
    ${max ? `<div><span class="n">Sorts préparés</span><small>${prep.length} / ${R.prepMax(b)}${same ? " · inchangés" : ""}</small></div>` : ""}
    ${nOath ? `<div><span class="n">Sorts de serment</span><small>+ ${nOath}</small></div>` : ""}
    ${isDru(g) && newForms(g, b).length ? `<div><span class="n">Nouvelles formes</span><small>${plural(newForms(g, b).length, "bête")}${L.wsfav && L.wsfav.length ? ` · ★ ${L.wsfav.map(id => esc(BEAST[id].n)).join(", ")}` : ""}</small></div>` : ""}</div>
    <button class="linkbtn" data-a="lu-edit">Modifier</button></div>
  <div style="display:grid;gap:4px;font-size:13.5px;color:var(--muted);line-height:1.45">
    ${gained.length ? `<span>• ${cap(gained.map(([lv, d]) => `${d > 1 ? `les ${d} emplacements` : "le nouvel emplacement"} de niveau ${lv}`).join(" et "))} ${gained.length > 1 || gained[0][1] > 1 ? "sont disponibles" : "est disponible"} tout de suite.</span>` : ""}
    ${isPal(g) ? `<span>• La réserve d'Imposition des mains passe à ${PAL.loh(b)} PV.</span>` : ""}
    ${isDru(g) && DRU.ws(b) ? `<span>• Forme sauvage : bêtes de FP ${DRU.fp(b)} maximum.</span>` : ""}
    <span>• DD, attaque et capacités sont mis à jour partout.</span>
    <span>• Tu peux revenir au niveau ${g.level} avec le sélecteur de niveau.</span></div>`;
}
onClick("lu-open", () => { const g = G(); if (!g || g.level >= 20) return; luOpen(g); render(); const x = document.querySelector("#lvlup .lufoot .primary"); if (x) x.focus({ preventScroll: true }); });
onClick("lu-close", () => { S.lu = null; render(); });
onClick("lu-next", () => { if (!S.lu) return; S.lu.step = Math.min(3, S.lu.step + 1); S.lu.open = null; render(); });
onClick("lu-back", () => { if (!S.lu) return; S.lu.step = Math.max(1, S.lu.step - 1); S.lu.open = null; render(); });
onClick("lu-edit", () => { if (!S.lu) return; S.lu.step = 2; render(); });
onClick("lu-pflt", (b) => { if (!S.lu) return; S.lu.flt = +b.dataset.v; S.luKeep = true; render(); });
onClick("lu-style", (b) => { if (!S.lu) return; S.lu.style = b.dataset.v; S.luKeep = true; render(); });
onClick("lu-go", () => {
  if (S.lu && !isWiz(G())) {
    const L = S.lu, g = G(), to = L.to, fn = firstName(g), max = R.maxLevel(g, to), oath = oathSpells({ ...g, level: to });
    const prev = JSON.parse(JSON.stringify({ level: g.level, style: g.style, prepared: g.prepared, cantrips: g.cantrips, favs: g.favs })); S.lu = null;
    mutate(g => { g.level = to; if (L.style) g.style = L.style; (L.wsfav || []).forEach(id => { if (!g.favs.includes(id)) g.favs.push(id); }); (L.cpicks || []).forEach(id => { if (!g.cantrips.includes(id)) g.cantrips.push(id); }); g.prepared = L.prep.filter(id => BY_ID[id] && BY_ID[id].l <= max && !oath.includes(id)); });
    toast(`<b>${esc(fn)}</b> passe au niveau ${to}`, () => { mutate(g => Object.assign(g, prev)); return "Passage de niveau annulé"; });
  } else if (S.lu) {
    const L = S.lu, g = G(); if (!g) return;
    const prev = JSON.parse(JSON.stringify({ level: g.level, spells: g.spells, cantrips: g.cantrips, prepared: g.prepared })), to = L.to, fn = firstName(g);
    S.lu = null;
    mutate(g => {
      g.level = to;
      L.picks.forEach(id => { if (!g.spells.some(x => x.id === id)) g.spells.push({ id, how: "niv" }); });
      L.cpicks.forEach(id => { if (!g.cantrips.includes(id)) g.cantrips.push(id); });
      L.prep.forEach(id => { if (!g.prepared.includes(id)) g.prepared.push(id); });
    });
    toast(`<b>${esc(fn)}</b> passe au niveau ${to}${L.picks.length + L.cpicks.length ? ` · ${plural(L.picks.length + L.cpicks.length, "sort ajouté", "sorts ajoutés")}` : ""}`,
      () => { mutate(g => Object.assign(g, prev)); return "Passage de niveau annulé"; });
  }
});
onChange("lu-cpick", t => {
  if (!S.lu) return;
  const id = t.dataset.id, g = G(), need = Math.max(0, R.cantrips(g, S.lu.to) - R.cantrips(g));
  if (t.checked && S.lu.cpicks.length >= need) { t.checked = false; toast(`${plural(need, "sort mineur", "sorts mineurs")} à ce niveau : décoche d'abord l'autre`); return; }
  S.lu.cpicks = t.checked ? [...S.lu.cpicks, id] : S.lu.cpicks.filter(x => x !== id); S.luKeep = true; render();
});
onChange("lu-pprep", t => {
  if (!S.lu) return;
  const id = t.dataset.id, g = G(), b = { ...g, level: S.lu.to }, oath = oathSpells(b), max = R.maxLevel(b);
  const cur = S.lu.prep.filter(x => BY_ID[x] && BY_ID[x].l <= max && !oath.includes(x));
  if (t.checked && cur.length >= R.prepMax(b)) { t.checked = false; toast(`Limite atteinte (${cur.length}/${R.prepMax(b)}) : décoche d'abord un sort`); return; }
  S.lu.prep = t.checked ? [...cur, id] : cur.filter(x => x !== id); S.luKeep = true; render();
});
onChange("lu-prep", t => { if (!S.lu) return; const id = t.dataset.id; S.lu.prep = t.checked ? [...S.lu.prep, id] : S.lu.prep.filter(x => x !== id); S.luKeep = true; render(); });

export { luOpen, luNeed, firstName, luHTML, palLu1, palLu2, palLu3 };
