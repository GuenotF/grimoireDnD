// Onglet Personnage, bas de fiche : défenses, dons et traits, historique, notes du personnage.
// Gérer : saisie. En jeu : lecture (sections vides masquées), notes modifiables.
import { onChange, onClick, onInput, onSubmit } from "../core/actions.js";
import { esc } from "../core/format.js";
import { G, S } from "../core/state.js";
import { mutate } from "../core/store.js";
import { render, toast } from "../core/ui.js";
import { FEATS } from "../rules/feats.js";
import { foldHead, isFold } from "../ui/components.js";

// ---------- Défenses : [code, libellé, suggestions]
const DMG = ["acide", "contondant", "feu", "force", "foudre", "froid", "nécrotique", "perforant", "poison", "psychique", "radiant", "tonnerre", "tranchant", "contondant, perforant et tranchant non magiques"];
const COND = ["à terre", "assourdi", "aveuglé", "charmé", "effrayé", "empoigné", "empoisonné", "entravé", "épuisement", "étourdi", "inconscient", "neutralisé", "paralysé", "pétrifié", "maladies", "sommeil magique"];
const DEF = [
  ["res", "Résistance", DMG],
  ["imm", "Immunité", [...DMG, ...COND]],
  ["vul", "Vulnérabilité", DMG],
  ["adv", "Avantage", ["JdS contre charmé", "JdS contre effrayé", "JdS contre empoisonné", "JdS contre les sorts", "JdS contre la magie", "JdS contre la mort"]],
];
const defName = t => (DEF.find(d => d[0] === t) || DEF[0])[1];
// Origine d'un don ou d'un trait
const ORIG = [["race", "race"], ["hist", "historique"], ["don", "don"], ["classe", "classe"], ["objet", "objet"], ["autre", "autre"]];
const origName = o => (ORIG.find(x => x[0] === o) || ORIG[5])[1];

const listOpts = cat => (DEF.find(d => d[0] === cat) || DEF[0])[2].map(v => `<option value="${esc(v)}">`).join("");
const chip = (d, i, x) => `<span class="defchip ${d.t}"><b>${defName(d.t)}</b> · ${esc(d.v)}${x ? `<button class="x" data-a="def-del" data-i="${i}" aria-label="Retirer ${esc(defName(d.t))} ${esc(d.v)}">✕</button>` : ""}</span>`;

// ---------- Gérer
function defensesGerer(g) {
  let h = foldHead("ch-df", "", "Défenses", "résistances, immunités…", g.defs.length ? `${g.defs.length}` : "aucune");
  if (isFold("ch-df")) return h;
  const cat = S.dCat || "res";
  return h + `<div class="chbox defbox">${g.defs.length ? `<div class="defs">${g.defs.map((d, i) => chip(d, i, true)).join("")}</div>` : `<p class="chhelp" style="margin:6px 0">Aucune pour l'instant (ex. résistance au poison du nain, immunité au sommeil magique de l'elfe).</p>`}
    <form class="defadd" data-a="def-add"><select id="d-cat" aria-label="Catégorie">${DEF.map(([k, n]) => `<option value="${k}"${k === cat ? " selected" : ""}>${n}</option>`).join("")}</select>
    <input id="d-val" type="text" list="d-list" placeholder="Type de dégâts ou état" aria-label="Type de dégâts ou état" autocomplete="off"><datalist id="d-list">${listOpts(cat)}</datalist>
    <button class="btn" type="submit">Ajouter</button></form></div>`;
}
function traitForm(t, i) {
  return `<form class="trform" data-a="trait-save" data-i="${i}">
    <div class="frow2"><input id="t-name" type="text" value="${esc(t.n)}" placeholder="Nom (ex. Vision dans le noir)" aria-label="Nom" required>
    <select id="t-orig" aria-label="Origine">${ORIG.map(([k, n]) => `<option value="${k}"${k === t.o ? " selected" : ""}>${n}</option>`).join("")}</select></div>
    <label class="itref"><span>Don du Manuel pris en compte dans les calculs</span><select id="t-feat" aria-label="Don du Manuel"><option value="">Aucun (texte seulement)</option>${Object.entries(FEATS).map(([k, f]) => `<option value="${k}"${k === t.feat ? " selected" : ""}>${f.n}</option>`).join("")}</select></label>
    <textarea id="t-desc" placeholder="Effet, tel qu'écrit sur ta feuille" aria-label="Description">${esc(t.d)}</textarea>
    <div class="cast"><button class="btn primary" type="submit">Enregistrer</button><button class="btn ghost" type="button" data-a="trait-cancel">Annuler</button>${i !== "new" ? `<button class="btn ghost" type="button" data-a="trait-del" data-i="${i}" style="margin-left:auto">Retirer</button>` : ""}</div></form>`;
}
function traitsGerer(g) {
  let h = foldHead("ch-tr", "", "Dons et traits", "race, historique, dons…", `${g.traits.length}`);
  if (isFold("ch-tr")) return h;
  const ed = S.trEdit;
  h += `<div class="chbox trbox">${g.traits.map((t, i) => ed === i ? traitForm(S.trDraft || t, i)
    : `<div class="tr"><div class="trh"><b>${esc(t.n)}</b><span class="o">${origName(t.o)}</span><button class="btn ghost sm" data-a="trait-edit" data-i="${i}" aria-label="Modifier ${esc(t.n)}">✎</button></div>${t.d ? `<div class="trd clip">${esc(t.d)}</div>` : ""}</div>`).join("")}`;
  h += ed === "new" ? traitForm(S.trDraft || { n: "", o: "race", d: "" }, "new") : `<button class="btn" data-a="trait-edit" data-i="new" style="justify-self:start">＋ Ajouter un don ou un trait</button>`;
  return h + `</div>`;
}
function backgroundGerer(g) {
  let h = foldHead("ch-bg", "", "Historique", "", esc(g.bg.n));
  if (isFold("ch-bg")) return h;
  return h + `<div class="chbox bgbox"><input id="bg-name" type="text" value="${esc(g.bg.n)}" placeholder="Historique (ex. Ermite, Soldat)" aria-label="Historique">
    <textarea id="bg-desc" placeholder="Aptitude, traits de personnalité, idéal, lien, défaut…" aria-label="Détail de l'historique">${esc(g.bg.d)}</textarea></div>`;
}
const notesBox = g => `<textarea id="p-notes" class="pnotes" placeholder="Langues, dettes, PNJ, objectifs…" aria-label="Notes du personnage">${esc(g.pnotes)}</textarea>`;
function notesGerer(g) {
  const h = foldHead("ch-nt", "", "Notes", "du personnage", g.pnotes ? "…" : "");
  return isFold("ch-nt") ? h : h + notesBox(g);
}
const traitsSheetGerer = g => defensesGerer(g) + traitsGerer(g) + backgroundGerer(g) + notesGerer(g);

// ---------- En jeu
function traitsSheetJeu(g) {
  let h = "";
  if (g.defs.length) { h += foldHead("ch-dfj", "", "Défenses", "", g.defs.map(d => esc(d.v)).join(", ")); if (!isFold("ch-dfj")) h += `<div class="defs">${g.defs.map((d, i) => chip(d, i, false)).join("")}</div>`; }
  if (g.traits.length) {
    h += foldHead("ch-trj", "", "Dons et traits", `${g.traits.length}`, g.traits.map(t => esc(t.n)).join(", "));
    if (!isFold("ch-trj")) h += `<div class="chbox trbox">${g.traits.map(t => `<div class="tr"><div class="trh"><b>${esc(t.n)}</b><span class="o">${origName(t.o)}</span></div>${t.d ? `<div class="trd">${esc(t.d)}</div>` : ""}</div>`).join("")}</div>`;
  }
  if (g.bg.n || g.bg.d) { h += foldHead("ch-bgj", "", "Historique", esc(g.bg.n), esc(g.bg.n)); if (!isFold("ch-bgj") && g.bg.d) h += `<div class="chbox"><div class="trd">${esc(g.bg.d)}</div></div>`; }
  h += foldHead("ch-ntj", "", "Notes", "", g.pnotes ? "…" : "");
  if (!isFold("ch-ntj")) h += notesBox(g);
  return h;
}

// ---------- Actions
onChange("#d-cat", t => { S.dCat = t.value; const dl = document.getElementById("d-list"); if (dl) dl.innerHTML = listOpts(t.value); });
onSubmit("def-add", () => {
  const v = document.getElementById("d-val").value.trim(), t = document.getElementById("d-cat").value; if (!v) return;
  const g = G(); if (g.defs.some(d => d.t === t && d.v.toLowerCase() === v.toLowerCase())) { toast("Déjà dans la liste"); return; }
  S.dCat = t; mutate(g => { g.defs.push({ t, v }); });
  const el = document.getElementById("d-val"); if (el) el.focus({ preventScroll: true });
});
onClick("def-del", (b) => { const i = +b.dataset.i, prev = G().defs[i]; if (!prev) return; mutate(g => { g.defs.splice(i, 1); }); toast(`${defName(prev.t)} retirée : ${esc(prev.v)}`, () => { mutate(g => { g.defs.splice(i, 0, prev); }); return "Rétablie"; }); });
onClick("trait-edit", (b) => { const v = b.dataset.i; S.trEdit = v === "new" ? "new" : +v; S.trDraft = null; render(); const el = document.getElementById("t-name"); if (el) el.focus(); });
onClick("trait-cancel", () => { S.trEdit = null; S.trDraft = null; render(); });
onInput(t => ["t-name", "t-desc"].includes(t.id), () => { S.trDraft = { n: document.getElementById("t-name").value, o: document.getElementById("t-orig").value, d: document.getElementById("t-desc").value, feat: document.getElementById("t-feat").value }; });
onChange("#t-feat", t => { const f = FEATS[t.value], n = document.getElementById("t-name"); if (f && !n.value.trim()) n.value = f.n; S.trDraft = { n: n.value, o: f ? "don" : document.getElementById("t-orig").value, d: document.getElementById("t-desc").value, feat: t.value }; render(); });
onChange("#t-orig", () => { S.trDraft = { n: document.getElementById("t-name").value, o: document.getElementById("t-orig").value, d: document.getElementById("t-desc").value, feat: document.getElementById("t-feat").value }; });
onSubmit("trait-save", f => {
  const n = document.getElementById("t-name").value.trim(); if (!n) return;
  const feat = document.getElementById("t-feat").value, i = f.dataset.i, g0 = G();
  const t = { n, o: feat ? "don" : document.getElementById("t-orig").value, d: document.getElementById("t-desc").value.trim() || (FEATS[feat] ? FEATS[feat].d : ""), ...(FEATS[feat] ? { feat } : {}) };
  // Vigilant ajouté alors que +5 était déjà saisi en bonus d'initiative : on retire ce bonus pour ne pas le compter deux fois
  const fixInit = feat === "alert" && !g0.traits.some(x => x.feat === "alert") && g0.initX >= 5;
  S.trEdit = null; S.trDraft = null;
  mutate(g => { if (i === "new") g.traits.push(t); else g.traits[+i] = t; if (fixInit) g.initX -= 5; });
  toast(`${i === "new" ? `Ajouté : <b>${esc(n)}</b>` : "Modification enregistrée"}${fixInit ? " · le +5 de Vigilant sort du bonus divers d'initiative" : ""}`);
});
onClick("trait-del", (b) => { const i = +b.dataset.i, prev = G().traits[i]; if (!prev) return; S.trEdit = null; S.trDraft = null; mutate(g => { g.traits.splice(i, 1); }); toast(`Retiré : <b>${esc(prev.n)}</b>`, () => { mutate(g => { g.traits.splice(i, 0, prev); }); return "Rétabli"; }); });
onInput("#bg-name", t => { mutate(g => { g.bg.n = t.value; }, false); });
onInput("#bg-desc", t => { mutate(g => { g.bg.d = t.value; }, false); });
onInput("#p-notes", t => { mutate(g => { g.pnotes = t.value; }, false); });

export { traitsSheetGerer, traitsSheetJeu, DEF, ORIG };
