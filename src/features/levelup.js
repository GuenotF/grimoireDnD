// Assistant de passage de niveau (structure commune et étapes des classes à sorts préparés).
import { C, alwaysPrepared, classFeats } from "../classes/index.js";
import { onChange, onClick, onInput } from "../core/actions.js";
import { byName, cap, esc, plural, signed } from "../core/format.js";
import { G, S } from "../core/state.js";
import { mutate } from "../core/store.js";
import { render, toast } from "../core/ui.js";
import { BY_ID } from "../data.js";
import { asiLevels, hpGain } from "../rules/character.js";
import { R, classSpells } from "../rules/common.js";
import { ABILITIES } from "../rules/tables.js";
import { keyPills, tags } from "./spells.js";

// Assistant ouvert par le bouton « ↑ Niveau N » : ce qui change, sorts gratuits, validation.
// Le sélecteur de niveau reste un réglage direct (création, correction), sans assistant.
// Étapes : celles de la classe (magicien : sorts gratuits du grimoire) ou les étapes communes des classes à sorts préparés,
// complétées par les crochets de la classe (C(g).levelUp : lignes du tableau, choix, récapitulatif…).
const LU = g => C(g).levelUp || {};
function luOpen(g) {
  S.lu = LU(g).init ? LU(g).init(g) : { step: 1, to: g.level + 1, style: g.style || "", prep: [...g.prepared], cpicks: [], wsfav: [], open: null };
  Object.assign(S.lu, { hp: { mode: "avg", roll: "" }, asi: {} }); // communs à toutes les classes : PV gagnés, amélioration de caractéristiques
  S.concPanel = false; S.fxOpen = false; S.shortOpen = false;
}
// ---------- Commun à toutes les classes : points de vie et amélioration de caractéristiques (étape 1, récapitulatif, validation)
const asiUsed = L => Object.values(L.asi).reduce((a, n) => a + n, 0);
function luCommonHTML(g, L) {
  let h = "";
  if (g.hpMax == null) h += `<div class="lunote"><span><b>Points de vie</b> : saisis tes PV maximum dans l'onglet Personnage (✎ Gérer), l'assistant les augmentera à chaque niveau.</span></div>`;
  else {
    const r = hpGain(g, L.hp, L.asi), avg = r.d / 2 + 1;
    h += `<div class="luhp"><span class="lusub">Points de vie</span>
    <div class="chips"><button class="chip" data-a="lu-hp" data-v="avg" aria-pressed="${L.hp.mode === "avg"}">Moyenne : ${avg} ${signed(r.con)} CON</button><button class="chip" data-a="lu-hp" data-v="roll" aria-pressed="${L.hp.mode === "roll"}">Lancer le d${r.d}</button>
    ${L.hp.mode === "roll" ? `<input id="lu-roll" type="number" inputmode="numeric" min="1" max="${r.d}" value="${esc(L.hp.roll)}" placeholder="1d${r.d}" aria-label="Résultat du d${r.d}">` : ""}</div>
    <div class="luhpv">PV maximum : ${g.hpMax} → <b>${r.total == null ? "?" : g.hpMax + r.total}</b> <span class="muted">${r.total == null ? `tape le résultat du d${r.d}` : `(${r.roll} ${signed(r.con)} CON${r.die === 1 && r.roll + r.con < 1 ? ", au moins 1" : ""}${r.retro ? `, +${r.retro} car ta CON augmente` : ""})`}</span></div></div>`;
  }
  if (asiLevels(g).includes(L.to)) {
    const used = asiUsed(L);
    h += `<div class="luasi"><span class="lusub">Amélioration de caractéristiques · ${used}/2</span>
    <p>+2 à une caractéristique ou +1 à deux (20 au plus). Un toucher : +1, +2, puis rien. Tu préfères un don ? Ne touche à rien et ajoute-le ensuite dans Personnage › Dons et traits.</p>
    <div class="asigrid">${ABILITIES.map(([k, a]) => { const n = L.asi[k] || 0, v = g.abil[k]; return `<button class="asi${n ? " on" : ""}" data-a="lu-asi" data-v="${k}" aria-pressed="${!!n}"${!n && (used >= 2 || v >= 20) ? " disabled" : ""}><span class="k">${a}</span><b>${v}${n ? ` → ${v + n}` : ""}</b>${n ? `<small>+${n}</small>` : ""}</button>`; }).join("")}</div></div>`;
  }
  return h;
}
function luCommonRecap(g, L) {
  const parts = [], r = g.hpMax != null ? hpGain(g, L.hp, L.asi) : null;
  if (r) parts.push(`<div><span class="n">Points de vie</span><small>${r.total == null ? "jet du dé à saisir à l'étape 1" : `${g.hpMax} → ${g.hpMax + r.total} (+${r.total})`}</small></div>`);
  const asi = Object.entries(L.asi).filter(([, n]) => n);
  if (asi.length) parts.push(`<div><span class="n">Caractéristiques</span><small>${asi.map(([k, n]) => `${ABILITIES.find(a => a[0] === k)[1]} ${g.abil[k]} → ${g.abil[k] + n}`).join(", ")}</small></div>`);
  return parts.length ? `<div style="display:grid;gap:6px"><span class="lusub">Personnage</span><div class="luadd">${parts.join("")}</div></div>` : "";
}
/** Applique PV et amélioration au personnage (dans un mutate). */
function luCommonApply(g, L) {
  if (g.hpMax != null) { const r = hpGain(g, L.hp, L.asi); if (r.total != null) { g.hpMax += r.total; if (g.hp != null) g.hp = Math.max(0, g.hp + r.total); } }
  Object.entries(L.asi).forEach(([k, n]) => { g.abil[k] = Math.min(20, g.abil[k] + n); });
}
const luNeed = (g, to) => ({ s: 2, c: Math.max(0, R.cantrips(g, to) - R.cantrips(g)) });
const firstName = g => g.name.trim() || g.name; // nom complet (« Ser Kael », pas « Ser »)
function luHTML(g) {
  // b : le personnage au nouveau niveau, amélioration de caractéristiques comprise (DD, sorts préparés… en tiennent compte)
  const L = S.lu, to = L.to, step = L.step, fn = firstName(g), abil = { ...g.abil };
  Object.entries(L.asi || {}).forEach(([k, n]) => { abil[k] = Math.min(20, abil[k] + n); });
  const b = { ...g, level: to, abil };
  const lu = LU(g), names = ["Ce qui change", lu.step2 || "Préparation", "Valider"], steps = lu.steps || [preparedLu1, preparedLu2, preparedLu3];
  const head = `<div class="luhead"><div class="t"><h2><span class="initial">${esc(fn.charAt(0))}</span>${esc(fn.slice(1))} passe au niveau ${to}</h2><button class="x" data-a="lu-close" aria-label="Fermer l'assistant">✕</button></div>
  <div class="lusteps">${names.map((n, i) => `<div class="${i + 1 < step ? "done" : i + 1 === step ? "cur" : ""}"${i + 1 === step ? ' aria-current="step"' : ""}>${i + 1} · ${n}</div>`).join("")}</div></div>`;
  const body = (step === 1 ? luCommonHTML(g, L) : "") + steps[step - 1](g, b) + (step === 3 ? luCommonRecap(g, L) : "");
  const foot = step === 1 ? `<button class="btn" data-a="lu-close">Annuler</button><button class="btn primary" data-a="lu-next">${lu.nextLabel ? lu.nextLabel(g, to) : "Préparation"} →</button>`
    : step === 2 ? `<button class="btn" data-a="lu-back">← Retour</button><button class="btn primary" data-a="lu-next">Suivant →</button>`
    : `<button class="btn" data-a="lu-back">← Retour</button><button class="btn primary" data-a="lu-go" style="font-weight:700">Passer au niveau ${to}</button>`;
  return `<div class="lubox">${head}<div class="lubody">${body}</div><div class="lufoot">${foot}</div></div>`;
}
function preparedLu1(g, b) {
  const lu = LU(g), from = g.level, to = b.level, a0 = R.slots(g, from), a1 = R.slots(g, to);
  let h = "";
  if (a1.length > a0.length) {
    const lv = a1.length, n = a1[lv - 1], more = a0.map((x, i) => [i + 1, a1[i] - x]).filter(([, d]) => d > 0);
    h += `<div class="lunew"><span class="k">Nouveau</span><b class="h">${lv === 1 ? `Premiers sorts de ${C(g).n.toLowerCase()}` : `Sorts de niveau ${lv} accessibles`}</b><div class="sl"><b>Niveau ${lv}</b>${Array.from({ length: n }, () => `<span class="o"></span>`).join("")}<span>${plural(n, "emplacement")}</span>${more.map(([l, d]) => `<span class="muted">· niveau ${l} : ${a0[l - 1]} → ${a1[l - 1]}</span>`).join("")}</div></div>`;
  } else {
    const more = a1.map((n, i) => [i + 1, n - (a0[i] || 0)]).filter(([, d]) => d > 0);
    if (more.length) h += `<div class="lunew"><span class="k">Nouveau</span><div class="sl">${more.map(([lv, d]) => `<span>+${d} emplacement${d > 1 ? "s" : ""} de niveau ${lv}</span>`).join(" · ")}</div></div>`;
  }
  const mod = R.am(g), mod1 = R.am(b), row = (l, o, n, cls) => `<div class="${o === n ? "same" : ""}"><span>${l}</span><span class="old">${o}</span><span class="ar">→</span><b${cls && o !== n ? ` style="color:var(${cls})"` : ""}>${n}</b></div>`;
  h += `<div class="lutab"><div class="hd"><span></span><span>Niv. ${from}</span><span></span><span>Niv. ${to}</span></div>
  ${row("DD des sorts", 8 + R.prof(from) + mod, 8 + R.prof(to) + mod1, "--ps-fg")}
  ${row("Attaque de sort", signed(R.prof(from) + mod), signed(R.prof(to) + mod1), "--pa-fg")}
  ${lu.rowsBefore ? lu.rowsBefore(g, b) : ""}
  ${row("Sorts préparés", R.maxLevel(g) ? R.prepMax(g) : 0, R.maxLevel(b) ? R.prepMax(b) : 0)}
  ${lu.rowsAfter ? lu.rowsAfter(g, b) : ""}</div>`;
  const feats = classFeats(g).filter(f => f.lv === to);
  if (feats.length) h += `<div style="display:grid;gap:6px"><span class="lusub">Nouvelle capacité</span>${feats.map(f => `<div class="lucan"><span class="n">${f.n}</span><span class="kp ${f.k}">${esc(f.pill(b))}</span></div>`).join("")}</div>`;
  if (lu.summaryExtra) h += lu.summaryExtra(g, b); // ex. nouveaux sorts de serment, nouvelles formes
  const notes = R.prof(to) > R.prof(from) ? [`<span><b>Bonus de maîtrise ${signed(R.prof(to))}</b> : sauvegardes, compétences et toucher de tes armes montent aussi.</span>`] : [];
  if (lu.notes) notes.unshift(...lu.notes(g, to)); // ex. rappel du serment ou du cercle
  return h + (notes.length ? `<div class="lunote">${notes.join("")}</div>` : "");
}
function preparedLu2(g, b) {
  const L = S.lu, lu = LU(g), max = R.maxLevel(b), pMax = max ? R.prepMax(b) : 0, oath = alwaysPrepared(b);
  let h = lu.choicesFirst ? lu.choicesFirst(g, b, L) : ""; // ex. druide : nouvelles formes à mettre en favori
  const needC = Math.max(0, R.cantrips(b) - R.cantrips(g));
  if (needC) {
    const known = new Set(g.cantrips), list = classSpells(b).filter(s => s.l === 0 && !known.has(s.id)).sort(byName), fullC = L.cpicks.length >= needC;
    h += `<div class="rubric"><h3>Sort mineur à apprendre</h3><span class="aside">${L.cpicks.length} / ${needC}</span></div><div class="luplist">${list.map(s => { const on = L.cpicks.includes(s.id); return `<label class="lurowp${on ? " on" : ""}"><input type="checkbox" data-a="lu-cpick" data-id="${s.id}"${on ? " checked" : ""}${!on && fullC ? ' class="full" aria-disabled="true"' : ""}><span class="n">${esc(s.n)}${tags(s)}</span><span class="kps">${keyPills(s, b)}</span></label>`; }).join("")}</div>`;
  }
  if (lu.choices) h += lu.choices(g, b, L); // ex. paladin : style de combat
  if (!max) return h + `<div class="empty">Le ${C(g).n.toLowerCase()} prépare ses sorts à partir du niveau ${R.unlockAt(g, 1)}.</div>`;
  const prep = L.prep.filter(id => BY_ID[id] && BY_ID[id].l <= max && !oath.includes(id)), full = prep.length >= pMax;
  const box = (s, on) => `<label class="lurowp${on ? " on" : ""}"><input type="checkbox" data-a="lu-pprep" data-id="${s.id}"${on ? " checked" : ""}${!on && full ? ' class="full" aria-disabled="true"' : ""}><span class="n">${esc(s.n)}${tags(s)}</span><span class="kps">${keyPills(s, b)}</span></label>`;
  h += `<div style="font-size:14px;line-height:1.4">Tes sorts préparés au niveau ${b.level} : <b>${pMax}</b>${C(g).prepNote || ""}.${!R.maxLevel(g) ? ` Choisis-les dans la liste du niveau 1.` : R.maxLevel(g) < max ? ` Tu peux en remplacer un par un sort de niveau ${max}.` : ""} <span class="muted">En principe au repos long : vois avec ton MJ.</span></div>`;
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
function preparedLu3(g, b) {
  const L = S.lu, lu = LU(g), max = R.maxLevel(b), oath = alwaysPrepared(b), prep = L.prep.filter(id => BY_ID[id] && BY_ID[id].l <= max && !oath.includes(id));
  const same = prep.length === g.prepared.length && prep.every(id => g.prepared.includes(id));
  const a0 = R.slots(g), a1 = R.slots(b), gained = a1.map((n, i) => [i + 1, n - (a0[i] || 0)]).filter(([, d]) => d > 0);
  return `<div style="display:grid;gap:6px"><span class="lusub">Récapitulatif</span><div class="luadd">
    ${L.cpicks && L.cpicks.length ? `<div><span class="n">Sort${L.cpicks.length > 1 ? "s" : ""} mineur${L.cpicks.length > 1 ? "s" : ""}</span><small>${L.cpicks.map(id => esc(BY_ID[id].n)).join(", ")}</small></div>` : ""}
    ${lu.recapBefore ? lu.recapBefore(g, b, L) : ""}
    ${max ? `<div><span class="n">Sorts préparés</span><small>${prep.length} / ${R.prepMax(b)}${same ? " · inchangés" : ""}</small></div>` : ""}
    ${lu.recapAfter ? lu.recapAfter(g, b, L) : ""}</div>
    <button class="linkbtn" data-a="lu-edit">Modifier</button></div>
  <div style="display:grid;gap:4px;font-size:13.5px;color:var(--muted);line-height:1.45">
    ${gained.length ? `<span>• ${cap(gained.map(([lv, d]) => `${d > 1 ? `les ${d} emplacements` : "le nouvel emplacement"} de niveau ${lv}`).join(" et "))} ${gained.length > 1 || gained[0][1] > 1 ? "sont disponibles" : "est disponible"} tout de suite.</span>` : ""}
    ${lu.recapNotes ? lu.recapNotes(g, b) : ""}
    <span>• DD, attaque et capacités sont mis à jour partout.</span>
    <span>• Tu peux revenir au niveau ${g.level} avec le sélecteur de niveau.</span></div>`;
}
onClick("lu-open", () => { const g = G(); if (!g || g.level >= 20) return; luOpen(g); render(); const x = document.querySelector("#lvlup .lufoot .primary"); if (x) x.focus({ preventScroll: true }); });
onClick("lu-close", () => { S.lu = null; render(); });
onClick("lu-next", () => { if (!S.lu) return; S.lu.step = Math.min(3, S.lu.step + 1); S.lu.open = null; render(); });
onClick("lu-back", () => { if (!S.lu) return; S.lu.step = Math.max(1, S.lu.step - 1); S.lu.open = null; render(); });
onClick("lu-edit", () => { if (!S.lu) return; S.lu.step = 2; render(); });
onClick("lu-pflt", (b) => { if (!S.lu) return; S.lu.flt = +b.dataset.v; S.luKeep = true; render(); });
onClick("lu-go", () => {
  const L = S.lu, g = G(); if (!L || !g) return;
  S.lu = null;
  if (L.hp.mode === "roll" && g.hpMax != null && !(+L.hp.roll >= 1)) { S.lu = L; L.step = 1; render(); toast(`Tape le résultat du d${hpGain(g, L.hp).d} pour les points de vie`); return; }
  if (LU(g).steps) { // assistant propre à la classe (magicien) : PV et caractéristiques d'abord, annulés avec le reste
    const prevC = JSON.parse(JSON.stringify({ abil: g.abil, hpMax: g.hpMax, hp: g.hp }));
    mutate(g => luCommonApply(g, L), false); LU(g).apply(L, g);
    const u = S.undo; if (u) S.undo = () => { mutate(g => Object.assign(g, prevC), false); return u(); };
    return;
  }
  const to = L.to, fn = firstName(g), max = R.maxLevel(g, to), oath = alwaysPrepared({ ...g, level: to });
  const prev = JSON.parse(JSON.stringify(g));
  mutate(g => {
    luCommonApply(g, L);
    g.level = to;
    if (LU(g).apply) LU(g).apply(g, L); // ex. style de combat, formes favorites
    (L.cpicks || []).forEach(id => { if (!g.cantrips.includes(id)) g.cantrips.push(id); });
    g.prepared = L.prep.filter(id => BY_ID[id] && BY_ID[id].l <= max && !oath.includes(id));
  });
  toast(`<b>${esc(fn)}</b> passe au niveau ${to}`, () => { mutate(g => Object.assign(g, prev)); return "Passage de niveau annulé"; });
});
onClick("lu-hp", (b) => { if (!S.lu) return; S.lu.hp.mode = b.dataset.v; S.luKeep = true; render(); if (b.dataset.v === "roll") { const el = document.getElementById("lu-roll"); if (el) el.focus({ preventScroll: true }); } });
onInput("#lu-roll", t => { if (!S.lu) return; S.lu.hp.roll = t.value; S.luKeep = true; render(); }); // le focus reste dans le champ (rendu : focus retrouvé par id)
onClick("lu-asi", (b) => {
  const L = S.lu, g = G(); if (!L || !g) return; const k = b.dataset.v, n = L.asi[k] || 0, used = asiUsed(L);
  const next = n === 0 ? 1 : n === 1 && used < 2 && g.abil[k] + 2 <= 20 ? 2 : 0;
  if (next) L.asi[k] = next; else delete L.asi[k]; S.luKeep = true; render();
});
onChange("lu-cpick", t => {
  if (!S.lu) return;
  const id = t.dataset.id, g = G(), need = Math.max(0, R.cantrips(g, S.lu.to) - R.cantrips(g));
  if (t.checked && S.lu.cpicks.length >= need) { t.checked = false; toast(`${plural(need, "sort mineur", "sorts mineurs")} à ce niveau : décoche d'abord l'autre`); return; }
  S.lu.cpicks = t.checked ? [...S.lu.cpicks, id] : S.lu.cpicks.filter(x => x !== id); S.luKeep = true; render();
});
onChange("lu-pprep", t => {
  if (!S.lu) return;
  const id = t.dataset.id, g = G(), b = { ...g, level: S.lu.to }, oath = alwaysPrepared(b), max = R.maxLevel(b);
  const cur = S.lu.prep.filter(x => BY_ID[x] && BY_ID[x].l <= max && !oath.includes(x));
  if (t.checked && cur.length >= R.prepMax(b)) { t.checked = false; toast(`Limite atteinte (${cur.length}/${R.prepMax(b)}) : décoche d'abord un sort`); return; }
  S.lu.prep = t.checked ? [...cur, id] : cur.filter(x => x !== id); S.luKeep = true; render();
});
onChange("lu-prep", t => { if (!S.lu) return; const id = t.dataset.id; S.lu.prep = t.checked ? [...S.lu.prep, id] : S.lu.prep.filter(x => x !== id); S.luKeep = true; render(); });

export { luOpen, luNeed, firstName, luHTML, preparedLu1, preparedLu2, preparedLu3 };
