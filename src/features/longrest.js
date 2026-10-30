// Repos long guidé, en écran plein comme l'assistant de niveau :
// 1 · Récupérer : ce que le repos rend à ce personnage (rien n'est appliqué avant validation) ;
// 2 · Préparer : lanceurs qui préparent (magicien, clerc, druide, paladin), sorts préparés pour la journée ;
// 3 · étape de la classe ou de la sous-classe si elle en a une au repos long (C(g).lrStep : Présage de la divination).
// « Préparer les sorts » (onglet Sorts, Gérer) ouvre l'étape 2 seule, sans repos.
import { C, alwaysPrepared, noSpells } from "../classes/index.js";
import { onClick, onInput } from "../core/actions.js";
import { byName, esc, plural } from "../core/format.js";
import { G, S } from "../core/state.js";
import { mutate } from "../core/store.js";
import { render, toast } from "../core/ui.js";
import { BY_ID } from "../data.js";
import { R, classSpells } from "../rules/common.js";
import { FEATS, featPlay, featRecharge } from "../rules/feats.js";
import { hdLeft, hpCur, isDead, longRestHP } from "../rules/hp.js";
import { rechargeItems } from "../rules/magic.js";
import { pickRow } from "../ui/components.js";
import { breathOf, innateRest } from "./innate.js";
import { keyPills, spellBody } from "./spells.js";

/** Le personnage choisit-il ses sorts préparés après un repos long ? */
const prepares = g => !noSpells(g) && !C(g).known && R.maxLevel(g) > 0;
const clsStep = g => (C(g).lrStep ? C(g).lrStep(g) : null);
function steps(g, only) {
  if (only) return [["prep", "Préparer"]];
  return [["rec", "Récupérer"], ...(prepares(g) ? [["prep", "Préparer"]] : []), ...(clsStep(g) ? [["cls", clsStep(g).label]] : [])];
}
const SR = g => typeof C(g).shortRest === "function" ? C(g).shortRest(g) : C(g).shortRest;

/** Le repos long lui-même (sans message) : PV, dés de vie, emplacements, sorts en cours, ressources, objets, dons, sorts innés. */
function applyLongRest(g) {
  g.used = {}; g.effects = []; if (C(g).longRest) C(g).longRest(g); g.extras.forEach(x => x.used = false);
  longRestHP(g); rechargeItems(g, "long"); featRecharge(g, "long"); innateRest(g);
}

// ---------- 1 · Récupérer
function recHTML(g) {
  const row = (n, a, b, sub) => `<div class="lrrow"><span class="ok" aria-hidden="true">✓</span><span class="n">${n}${sub ? `<small>${sub}</small>` : ""}</span>${a != null ? `<span class="old">${a}</span><span class="ar" aria-hidden="true">→</span>` : ""}<b>${b}</b></div>`;
  let h = `<p class="lrlead">8 heures de repos : ce que tu récupères.</p><div class="lrlist">`;
  if (isDead(g)) return `<p class="lrlead">Ton personnage est mort : le repos ne le ramène pas. Seule la magie (Revivifier, Rappel à la vie…) le peut.</p>`;
  if (g.hpMax != null) h += row("Points de vie", hpCur(g) < g.hpMax || g.hpTemp ? `${hpCur(g)}${g.hpTemp ? ` +${g.hpTemp}` : ""}` : null, `${g.hpMax} / ${g.hpMax}`, g.hpTemp ? "les PV temporaires disparaissent" : "");
  const back = Math.max(1, Math.floor(g.level / 2)), left = hdLeft(g), after = Math.min(g.level, left + back);
  h += row("Dés de vie", after > left ? `${left} / ${g.level}` : null, `${after} / ${g.level}`, `la moitié de ton niveau (${back}) revient`);
  R.slots(g).forEach((n, i) => { if (!n) return; const u = Math.min(n, +(g.used[i + 1] || 0)); h += row(`${C(g).pact && C(g).pact(g) ? "Magie de pacte" : "Emplacements"} niv. ${i + 1}`, u ? `${n - u} / ${n}` : null, `${n} / ${n}`); });
  const sr = SR(g), srUsed = sr && (sr.fields || [sr.field]).some(f => +g[f] > 0);
  const res = [...(C(g).longOnly ? C(g).longOnly(g).filter(Boolean) : []), srUsed ? sr.label : "", g.breathU && breathOf(g) ? "Souffle" : ""].filter(Boolean);
  if (res.length) h += row("Capacités", null, "récupérées", res.map(esc).join(", "));
  const items = g.items.filter(x => x.chMax && x.chU && x.rec !== "");
  if (items.length) h += row("Objets", null, "rechargés", items.map(x => esc(x.n)).join(", "));
  const feats = featPlay(g).filter(id => FEATS[id].res && (g.featU || {})[id]);
  if (feats.length) h += row("Dons", null, "récupérés", feats.map(id => esc(FEATS[id].n)).join(", "));
  if (Object.values(g.innU || {}).some(Boolean)) h += row("Sorts innés", null, "récupérés");
  if (g.exh) h += row("Épuisement", `niveau ${g.exh}`, g.exh > 1 ? `niveau ${g.exh - 1}` : "aucun", "un niveau en moins, avec nourriture et eau");
  if (g.effects.length) h += `<div class="lrrow end"><span class="ok" aria-hidden="true">◦</span><span class="n">Sorts en cours terminés<small>${g.effects.map(e => esc(e.name) + (e.c ? " (conc.)" : "")).join(", ")}</small></span></div>`;
  h += `</div>`;
  const nx = steps(g)[1];
  h += `<p class="muted lrnote">${nx ? nx[0] === "prep" ? `Ensuite : tu choisis tes sorts préparés pour la journée.` : `Ensuite : ${esc(nx[1])}.` : "Rien d'autre à faire : le repos se termine ici."} Annuler ne change rien.</p>`;
  return h;
}

// ---------- 2 · Préparer
/** Sorts qu'on peut préparer : le grimoire (magicien) ou la liste de la classe, jusqu'au plus haut niveau d'emplacement ; hors sorts toujours préparés. */
function candidates(g) {
  const max = R.maxLevel(g), ap = alwaysPrepared(g);
  const list = C(g).book ? g.spells.map(x => BY_ID[x.id]).filter(Boolean) : classSpells(g);
  return list.filter(s => s.l >= 1 && s.l <= max && !ap.includes(s.id)).sort((a, b) => a.l - b.l || byName(a, b));
}
function prepHTML(g) {
  const L = S.lr, pMax = R.prepMax(g), sel = new Set(L.draft), max = R.maxLevel(g), wiz = !!C(g).book;
  const n = L.draft.length, full = n >= pMax, q = (L.q || "").trim().toLowerCase();
  let h = `<div class="lrcount"><b>Sorts préparés</b><span class="${n > pMax ? "over" : n === pMax ? "good" : ""}">${n} / ${pMax}</span></div>
  <p class="muted lrnote">${esc(C(g).abN)} ${R.am(g) >= 0 ? "+" : "−"}${Math.abs(R.am(g))} + ${pMax === Math.max(1, R.am(g) + g.level) ? "niveau" : "moitié du niveau"}${wiz ? " · sorts mineurs et rituels du grimoire en plus" : R.cantrips(g, 20) > 0 ? " · sorts mineurs en plus" : ""}</p>
  <input type="search" id="lr-q" placeholder="${wiz ? "Chercher dans le grimoire" : `Chercher dans la liste du ${esc(C(g).n.toLowerCase())}`}" value="${esc(L.q || "")}" aria-label="Chercher un sort">
  <div class="chips">${[["0", "Tous"], ...Array.from({ length: max }, (_, i) => [String(i + 1), `Niv. ${i + 1}`]), ["p", "Préparés"]].map(([v, l]) => `<button class="chip${String(L.lv || "0") === v ? " on" : ""}" data-a="lr-flt" data-v="${v}" aria-pressed="${String(L.lv || "0") === v}">${l}</button>`).join("")}</div>`;
  if (n > pMax) h += `<div class="note warn">Trop de sorts préparés : retire-en ${n - pMax}.</div>`;
  const ok = s => (!q || s.n.toLowerCase().includes(q) || (s.en || "").toLowerCase().includes(q)) && (L.lv === "p" ? sel.has(s.id) : !+L.lv || s.l === +L.lv);
  const all = candidates(g).filter(ok), mine = all.filter(s => sel.has(s.id)), rest = all.filter(s => !sel.has(s.id));
  const row = s => {
    const rit = wiz && s.ri && !sel.has(s.id);
    return pickRow({ act: 'data-a="lr-tog"', id: s.id, on: sel.has(s.id), full, label: s.n,
      name: `${esc(s.n)} <small class="lrlv">niv. ${s.l}</small>`, pills: keyPills(s, g) + (rit ? `<span class="pkwhy">rituel : lançable sans le préparer</span>` : ""), body: S.open.has("pk:" + s.id) ? spellBody(s, g) : "" });
  };
  const ap = alwaysPrepared(g).map(id => BY_ID[id]).filter(s => s && s.l <= max);
  if (ap.length && !+L.lv && L.lv !== "p") h += `<div class="lrcap">${esc(C(g).alwaysPreparedInfo(g).title)} · toujours préparés, hors limite</div><p class="lrap">${ap.sort(byName).map(s => `★ ${esc(s.n)}`).join(" · ")}</p>`;
  h += `<div class="lrcap">Préparés${mine.length ? ` · touche ✓ pour retirer` : ""}</div>${mine.length ? mine.map(row).join("") : `<p class="muted lrnote">${q || +L.lv ? "Aucun sort préparé ne correspond." : "Aucun sort préparé."}</p>`}`;
  if (L.lv !== "p") h += `<div class="lrcap">${wiz ? "Dans le grimoire" : `Liste du ${esc(C(g).n.toLowerCase())}`}${full && rest.length ? " · limite atteinte : retire un sort pour en choisir un autre" : ""}</div>${rest.length ? rest.map(row).join("") : `<p class="muted lrnote">${q || +L.lv ? "Aucun autre sort ne correspond." : wiz ? "Tous les sorts du grimoire sont préparés." : "Tous les sorts sont préparés."}</p>`}`;
  return h;
}

// ---------- Écran
function lrHTML(g) {
  const L = S.lr, st = steps(g, L.only), cur = st[L.step], last = L.step === st.length - 1, fn = g.name;
  const title = L.only ? `<span class="initial">P</span>réparation des sorts` : `<span class="initial">R</span>epos long · ${esc(fn)}`;
  const bar = st.length > 1 ? `<div class="lusteps" style="grid-template-columns:repeat(${st.length},minmax(0,1fr))">${st.map(([, n], i) => `<div class="${i < L.step ? "done" : i === L.step ? "cur" : ""}"${i === L.step ? ' aria-current="step"' : ""}>${i + 1} · ${esc(n)}</div>`).join("")}</div>` : "";
  const head = `<div class="luhead"><div class="t"><h2>${title}</h2><button class="x" data-a="${L.applied ? "lr-done" : "lr-close"}" aria-label="${L.applied ? "Terminer le repos" : "Fermer sans rien changer"}">✕</button></div>${bar}</div>`;
  const body = cur[0] === "rec" ? recHTML(g) : cur[0] === "prep" ? prepHTML(g) : clsStep(g).html(g);
  const done = L.only ? "Valider ✓" : cur[0] === "prep" ? "Terminer ✓" : "Terminer le repos ✓"; // trois boutons sur téléphone : libellé court
  const back = L.step > 0 && !L.applied ? `<button class="btn" data-a="lr-back">← Retour</button>` : L.step === 0 ? `<button class="btn" data-a="lr-close">Annuler</button>` : `<span></span>`;
  const keep = cur[0] === "prep" ? `<button class="btn" data-a="lr-keep">Garder comme ${L.only ? "avant" : "hier"}</button>` : "";
  const next = last ? `<button class="btn primary" data-a="lr-done" style="font-weight:700">${done}</button>`
    : `<button class="btn primary" data-a="lr-next">${st[L.step + 1][0] === "prep" ? "Suivant : préparer" : `Suivant : ${esc(st[L.step + 1][1].toLowerCase())}`} →</button>`;
  return `<div class="lubox">${head}<div class="lubody">${body}</div><div class="lufoot">${back}${keep ? `<span class="lrbtns">${keep}${next}</span>` : next}</div></div>`;
}

// ---------- Actions
function open(only) {
  const g = G(); if (!g) return;
  S.concPanel = false; S.shortOpen = false; S.sr = {}; S.hpOpen = false; S.abOpen = null;
  S.lr = { only, step: 0, draft: [...g.prepared], q: "", lv: "0", applied: false, snap: null };
  render();
}
/** Applique le repos (une seule fois) et la préparation choisie ; garde l'état d'avant pour Annuler. */
function commit() {
  const L = S.lr, g = G(); if (!L || !g) return;
  if (!L.snap) L.snap = JSON.parse(JSON.stringify(g));
  const draft = [...L.draft], rest = !L.only && !L.applied;
  mutate(g => { if (rest) applyLongRest(g); if (prepares(g) || L.only) g.prepared = draft; });
  L.applied = true;
}
onClick("longrest", () => open(false));
onClick("prep-open", () => open(true));
onClick("lr-close", () => { S.lr = null; render(); });
onClick("lr-back", () => { if (!S.lr || S.lr.applied) return; S.lr.step = Math.max(0, S.lr.step - 1); render(); });
function next() {
  const L = S.lr, g = G(); if (!L || !g) return; const st = steps(g, L.only);
  if (st[L.step + 1] && st[L.step + 1][0] === "cls") commit(); // l'étape de la classe se fait après le repos (ex. Présage : nouveaux d20)
  L.step = Math.min(st.length - 1, L.step + 1); render();
  const b = document.querySelector("#lrsheet .lubody"); if (b) b.scrollTop = 0;
}
function done() {
  const L = S.lr, g = G(); if (!L || !g) return;
  const pMax = R.prepMax(g);
  if (!L.applied) commit();
  const snap = L.snap, only = L.only, n = G().prepared.length; S.lr = null; render();
  const over = (prepares(G()) || only) && n > pMax ? ` · <b>attention : ${n} préparés pour ${pMax} autorisés</b>` : "";
  toast(only ? `Sorts préparés : ${n} / ${pMax}${over}` : `Repos long terminé : ${g.hpMax != null ? "PV au maximum, " : ""}emplacements et capacités récupérés, sorts en cours terminés${prepares(G()) ? ` · ${plural(n, "sort préparé")}` : ""}${over}`,
    () => { mutate(g => { Object.keys(g).forEach(k => delete g[k]); Object.assign(g, JSON.parse(JSON.stringify(snap))); }); return only ? "Préparation annulée" : "Repos long annulé"; });
}
onClick("lr-next", next);
onClick("lr-done", done);
onClick("lr-keep", () => { const L = S.lr, g = G(); if (!L || !g) return; L.draft = [...g.prepared]; if (L.step === steps(g, L.only).length - 1) done(); else next(); });
onClick("lr-tog", (b) => {
  const L = S.lr, g = G(); if (!L || !g) return; const id = b.dataset.id, on = L.draft.includes(id), pMax = R.prepMax(g);
  if (!on && L.draft.length >= pMax) { toast(`Limite atteinte : ${pMax} sorts préparés. Retire un sort pour en choisir un autre.`); return; }
  L.draft = on ? L.draft.filter(x => x !== id) : [...L.draft, id]; S.luKeep = true; render();
});
onClick("lr-flt", (b) => { if (!S.lr) return; S.lr.lv = b.dataset.v; S.luKeep = true; render(); });
onInput("#lr-q", t => { if (!S.lr) return; S.lr.q = t.value; S.luKeep = true; render(); });

/** Bouton « Préparer les sorts » en tête de la liste (onglet Sorts, Gérer). */
const prepOpenHTML = g => prepares(g) ? `<div class="lrentry"><div><b>Sorts préparés <span class="${g.prepared.length > R.prepMax(g) ? "over" : g.prepared.length === R.prepMax(g) ? "good" : ""}">${g.prepared.length} / ${R.prepMax(g)}</span></b><small>à changer après un repos long</small>${C(g).prepLine ? `<small>${C(g).prepLine(g)}</small>` : ""}</div><button class="btn" data-a="prep-open">Préparer les sorts</button></div>` : "";

export { lrHTML, prepOpenHTML, applyLongRest, prepares };
