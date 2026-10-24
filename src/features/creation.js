// Assistant de création de personnage (règles 2014) : classe et nom, race, caractéristiques, historique, compétences,
// sorts de départ, équipement, récapitulatif et niveau de départ (l'assistant de passage de niveau s'enchaîne ensuite).
// État : S.cr. Données et calculs : rules/creation.js.
import { CLASSES, alwaysPrepared } from "../classes/index.js";
import { onChange, onClick, onInput } from "../core/actions.js";
import { byName, esc, signed } from "../core/format.js";
import { blank, norm } from "../core/schema.js";
import { G, S } from "../core/state.js";
import { newId, save, setCur } from "../core/store.js";
import { render, toast } from "../core/ui.js";
import { BY_ID, GEAR } from "../data.js";
import { R, classSpells } from "../rules/common.js";
import { acOf } from "../rules/equipment.js";
import { featApply, featChoiceOk } from "../rules/feats.js";
import { BGS, BG_CUSTOM, CLASS_START, LANGS, PB_BUDGET, PB_COST, RACES, STD, TOOL_LISTS, baseScores, bgOf, bgSkills, bgTools, build, mod, pbSpent, pickList, raceAsi, raceGives, raceMissing, roll4d6, skillName, subOf } from "../rules/creation.js";
import { ABILITIES, SKILLS } from "../rules/tables.js";
import { featPickerHTML } from "./featpicker.js";
import { keyPills, spellBody, tags } from "./spells.js";
import { pickRow } from "../ui/components.js";
import { luOpen } from "./levelup.js";

const STEPS = [["classe", "Classe"], ["race", "Race"], ["carac", "Caractéristiques"], ["hist", "Historique"], ["comp", "Compétences"], ["sorts", "Sorts"], ["equip", "Équipement"], ["fin", "Récapitulatif"]];
const AB = Object.fromEntries(ABILITIES.map(([k, a]) => [k, a]));
const hasSpells1 = cls => !CLASSES[cls].noSpells && (CLASSES[cls].cantrips(1) > 0 || !!CLASS_START[cls].book || (CLASSES[cls].known ? CLASSES[cls].known(1) > 0 : false)); // le rôdeur n'a pas de sort au niveau 1
/** Étapes réellement parcourues (pas de « Sorts » pour une classe sans sorts au niveau 1). */
const steps = c => STEPS.filter(([k]) => k !== "sorts" || hasSpells1(c.cls));
const chip = (attr, v, on, label, dis = false, extra = "") => `<button class="chip" ${attr} data-v="${esc(v)}" aria-pressed="${!!on}"${dis ? " disabled" : ""}${extra}>${label}</button>`;
const preview = c => norm(build(c, blank));
const clsToolsOf = c => CLASSES[c.cls].tools ? CLASSES[c.cls].tools({ ...blank("", c.cls), level: 1, arch: "" }) : [];

function crStart(cls, name) {
  S.cr = { step: 1, cls, name, race: null, sub: null, rc: { asi: [], skills: [], langs: [] }, method: "std", std: {}, pb: { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 }, dice: {}, rolls: {},
    bg: null, bc: { tools: [], langs: [], swap: {}, swapTool: {} }, skills: [], exp: [], cantrips: [], spells: [], prep: [], eqMode: "pack", eq: {}, picks: {}, gold: "", level: 1, fp: null };
}

// ---------- Étapes
function stepRace(c) {
  const s = subOf(c);
  let h = `<p class="help">La race donne des bonus de caractéristiques, une vitesse, des maîtrises et des traits ; tout est ajouté à la fiche.</p>`;
  h += Object.values(RACES).map(x => { const on = x.id === c.race;
    let o = `<button class="subopt${on ? " on" : ""}" data-a="cr-race" data-v="${x.id}" aria-pressed="${on}"><span class="rd" aria-hidden="true"></span><span class="bd"><b>${esc(x.n)}</b><small>${esc(x.sum)} · ${String(x.speed).replace(".", ",")} m</small></span></button>`;
    if (on) o += `<div class="subx">${raceChoices(c, x, s)}</div>`;
    return o; }).join("");
  return h;
}
function raceChoices(c, r, s) {
  let h = "";
  if (r.subs) h += `<span class="lusub">Sous-race</span><div class="chips">${r.subs.map(x => chip('data-a="cr-sub"', x.id, x.id === c.sub, esc(x.n))).join("")}</div>${s && s.sum ? `<small class="muted">${esc(s.sum)}</small>` : ""}`;
  const sx = s || {}, ach = sx.asiChoice || r.asiChoice;
  if (ach && (!r.subs || s)) h += `<span class="lusub">+${ach.v} à ${ach.n} caractéristiques · ${(c.rc.asi || []).length}/${ach.n}</span><div class="chips">${ABILITIES.filter(([k]) => !(ach.not || []).includes(k)).map(([k, a]) => { const on = (c.rc.asi || []).includes(k); return chip('data-a="cr-rasi"', k, on, a, !on && (c.rc.asi || []).length >= ach.n); }).join("")}</div>`;
  const sk = sx.skillChoice || r.skillChoice || 0;
  if (sk && (!r.subs || s)) h += `<span class="lusub">Compétence${sk > 1 ? "s" : ""} au choix · ${(c.rc.skills || []).length}/${sk}</span><div class="chips">${SKILLS.filter(([k]) => !(r.skills || []).includes(k)).map(([k, n]) => { const on = (c.rc.skills || []).includes(k); return chip('data-a="cr-rskill"', k, on, n, !on && (c.rc.skills || []).length >= sk); }).join("")}</div>`;
  const lc = sx.langChoice || r.langChoice || 0;
  if (lc && (!r.subs || s)) h += `<span class="lusub">Langue${lc > 1 ? "s" : ""} au choix</span>${Array.from({ length: lc }, (_, i) => `<select data-crlang="${i}" aria-label="Langue ${i + 1}"><option value="">Langue…</option>${LANGS.filter(l => !(r.langs || []).includes(l)).map(l => `<option${(c.rc.langs || [])[i] === l ? " selected" : ""}>${l}</option>`).join("")}</select>`).join("")}`;
  const tc = sx.toolChoice || r.toolChoice;
  if (tc) h += `<span class="lusub">Outil d'artisan</span><div class="chips">${tc.list.map(t => chip('data-a="cr-rtool"', t, c.rc.tool === t, esc(t))).join("")}</div>`;
  if (r.ancestry) h += `<span class="lusub">Ascendance draconique</span><div class="chips">${r.ancestry.map(([dn, dt], i) => chip('data-a="cr-anc"', i, c.rc.anc === i, `${dn} · ${dt}`)).join("")}</div>`;
  if (sx.cantripFrom) h += `<span class="lusub">Sort mineur de magicien (INT)</span><select id="cr-rcantrip" aria-label="Sort mineur de magicien"><option value="">Choisir…</option>${classSpells({ ...blank("", "magicien") }).filter(x => x.l === 0).map(x => `<option value="${x.id}"${c.rc.cantrip === x.id ? " selected" : ""}>${esc(x.n)}</option>`).join("")}</select>`;
  if (sx.feat) h += `<span class="lusub">Don</span>${featPickerHTML(preview(c), "cr")}`;
  if (r.id === c.race && (!r.subs || s)) { const g = raceGives(c), asi = raceAsi(c);
    h += `<span class="fpprev">Ajouté à la fiche : ${Object.entries(asi).map(([k, n]) => `${AB[k]} ${signed(n)}`).join(", ")} · ${String(g.speed).replace(".", ",")} m${g.skills.length ? ` · ${g.skills.map(skillName).join(", ")}` : ""} · ${g.langs.filter(Boolean).join(", ")}${g.traits.length ? ` · ${g.traits.length} traits` : ""}</span>`; }
  const miss = raceMissing(c); if (miss) h += `<small class="crmiss">Reste à faire : ${miss}.</small>`;
  return h;
}
function stepCarac(c) {
  const asi = raceAsi(c);
  let h = `<div class="viewsw" role="group" aria-label="Méthode">${[["std", "Tableau standard"], ["pb", "Achat de points"], ["dice", "Dés"]].map(([k, n]) => `<button data-a="cr-method" data-v="${k}" aria-pressed="${c.method === k}">${n}</button>`).join("")}</div>`;
  if (c.method === "std") h += `<p class="help">Répartis 15, 14, 13, 12, 10 et 8 : chaque valeur une seule fois.</p>`;
  if (c.method === "pb") { const sp = pbSpent(c.pb); h += `<div class="crbudget"><span>27 points à répartir (valeurs de 8 à 15)</span><b class="${sp > PB_BUDGET ? "lim" : ""}">${PB_BUDGET - sp} restant${PB_BUDGET - sp > 1 ? "s" : ""}</b></div>`; }
  if (c.method === "dice") h += `<p class="help">4d6 par caractéristique, on garde les 3 meilleurs. Tape tes résultats, ou laisse l'appli lancer. <button class="btn sm" data-a="cr-roll">🎲 Tout lancer</button></p>`;
  const used = Object.values(c.std);
  h += `<div class="crab">${ABILITIES.map(([k, a, n]) => {
    let ctl;
    if (c.method === "std") ctl = `<select data-crstd="${k}" aria-label="${n}"><option value="">—</option>${STD.map(v => `<option value="${v}"${c.std[k] === v ? " selected" : ""}${used.includes(v) && c.std[k] !== v ? " disabled" : ""}>${v}</option>`).join("")}</select>`;
    else if (c.method === "pb") { const v = c.pb[k], sp = pbSpent(c.pb); ctl = `<span class="crpb"><button class="btn sm" data-a="cr-pb" data-k="${k}" data-v="-1" aria-label="${n} −1"${v <= 8 ? " disabled" : ""}>−</button><b>${v}</b><button class="btn sm" data-a="cr-pb" data-k="${k}" data-v="1" aria-label="${n} +1"${v >= 15 || sp - PB_COST[v] + PB_COST[v + 1] > PB_BUDGET ? " disabled" : ""}>+</button><small>${PB_COST[v]} pt${PB_COST[v] > 1 ? "s" : ""}</small></span>`; }
    else ctl = `<input data-crdice="${k}" type="number" inputmode="numeric" min="3" max="18" value="${c.dice[k] || ""}" placeholder="3-18" aria-label="${n}">${c.rolls[k] ? `<small class="muted">${c.rolls[k].join(" ")}</small>` : ""}`;
    const base = c.method === "pb" ? c.pb[k] : c.method === "std" ? c.std[k] : +c.dice[k], tot = base ? base + (asi[k] || 0) : null;
    return `<div class="crabr"><b class="k">${a}</b><span class="ctl">${ctl}</span><span class="rb">${asi[k] ? signed(asi[k]) : ""}</span><span class="tot">${tot ? `<b>${tot}</b> <small>${signed(mod(tot))}</small>` : "—"}</span></div>`;
  }).join("")}</div>`;
  if (!CLASSES[c.cls].noSpells) h += `<p class="help">${CLASSES[c.cls].n} : ${esc(CLASSES[c.cls].abN)} en priorité, elle sert à tes sorts.</p>`;
  return h;
}
function stepHist(c) {
  const b = bgOf(c);
  let h = `<div class="chips">${[...Object.values(BGS), BG_CUSTOM].map(x => chip('data-a="cr-bg"', x.id, x.id === c.bg, esc(x.n))).join("")}</div>`;
  if (!b) return h + `<p class="help">L'historique donne deux compétences, des outils ou des langues, une aptitude et de l'équipement.</p>`;
  const race = (raceGives(c) || { skills: [] }).skills, clsTools = clsToolsOf(c);
  h += `<div class="crcard"><b class="t">${esc(b.n)}</b>`;
  if (c.bg === "perso") h += `<input id="cr-bgname" type="text" value="${esc(c.bc.name || "")}" placeholder="Nom de l'historique" aria-label="Nom de l'historique">
    <span class="lusub">Deux compétences · ${(c.bc.skills || []).length}/2</span><div class="chips">${SKILLS.filter(([k]) => !race.includes(k)).map(([k, n]) => { const on = (c.bc.skills || []).includes(k); return chip('data-a="cr-bgskill"', k, on, n, !on && (c.bc.skills || []).length >= 2); }).join("")}</div>`;
  else h += `<span><b>Compétences</b> : ${b.skills.map(skillName).join(", ")}</span>`;
  b.skills.filter(k => race.includes(k) && c.bg !== "perso").forEach(k => {
    h += `<div class="crdup"><b>Doublon</b> : ${skillName(k)} est déjà donnée par ta race. Choisis une autre compétence : <select data-crswap="${k}"><option value="">…</option>${SKILLS.filter(([x]) => !race.includes(x) && !b.skills.includes(x)).map(([x, n]) => `<option value="${x}"${(c.bc.swap || {})[k] === x ? " selected" : ""}>${n}</option>`).join("")}</select></div>`; });
  if ((b.tools || []).length) h += `<span><b>Outils</b> : ${b.tools.join(", ")}</span>`;
  (b.toolChoice ? [b.toolChoice] : []).forEach(tc => tc.list.forEach(l => {
    h += `<span class="lusub">${l === "jeu" ? "Un jeu" : l === "instrument" ? "Un instrument de musique" : "Des outils d'artisan"}</span><select data-crbgtool="0"><option value="">Choisir…</option>${TOOL_LISTS[l].map(t => `<option${(c.bc.tools || [])[0] === t ? " selected" : ""}>${t}</option>`).join("")}</select>`; }));
  [...(b.tools || []), ...(c.bc.tools || []).filter(Boolean)].filter(t => clsTools.includes(t)).forEach(t => {
    h += `<div class="crdup"><b>Doublon</b> : ${esc(t)} déjà donnés par ta classe. Choisis un autre outil : <select data-crswaptool="${esc(t)}"><option value="">…</option>${[...TOOL_LISTS.artisan, ...TOOL_LISTS.jeu, ...TOOL_LISTS.instrument, "Kit de déguisement", "Kit de contrefaçon", "Kit d'herboriste", "Matériel d'empoisonneur", "Outils de navigateur"].filter(x => x !== t).map(x => `<option${(c.bc.swapTool || {})[t] === x ? " selected" : ""}>${x}</option>`).join("")}</select></div>`; });
  const lc = b.langChoice || 0, known = (raceGives(c) || { langs: [] }).langs;
  if (lc) h += `<span class="lusub">Langue${lc > 1 ? "s" : ""} au choix</span>${Array.from({ length: lc }, (_, i) => `<select data-crbglang="${i}" aria-label="Langue ${i + 1}"><option value="">Langue…</option>${LANGS.filter(l => !known.includes(l)).map(l => `<option${(c.bc.langs || [])[i] === l ? " selected" : ""}>${l}</option>`).join("")}</select>`).join("")}`;
  h += `<span><b>Aptitude · ${esc(b.feat[0])}</b> : ${esc(b.feat[1])}</span>`;
  if (b.equip.length) h += `<span><b>Équipement</b> : ${b.equip.map(esc).join(", ")}${b.gold ? `, ${b.gold} po` : ""}</span>`;
  h += `</div><span class="lusub">Personnalité (facultatif)</span>${[["trait", "Trait de personnalité"], ["ideal", "Idéal"], ["bond", "Lien"], ["flaw", "Défaut"]].map(([k, n]) => `<input data-crbc="${k}" type="text" value="${esc(c.bc[k] || "")}" placeholder="${n}" aria-label="${n}">`).join("")}`;
  return h;
}
function stepComp(c) {
  const cs = CLASS_START[c.cls], race = (raceGives(c) || { skills: [] }).skills, bgs = bgSkills(c).filter(Boolean), locked = new Set([...race, ...bgs]);
  const free = cs.skills.list.filter(k => !locked.has(k)), n = Math.min(cs.skills.n, free.length);
  let h = `<div class="crbudget"><span>Compétences de ${CLASSES[c.cls].n.toLowerCase()} : ${cs.skills.n} au choix</span><b>${c.skills.length} / ${n}</b></div>`;
  if (locked.size) h += `<p class="help">Déjà maîtrisées : ${[...locked].map(k => `${skillName(k)} (${race.includes(k) ? "race" : "historique"})`).join(", ")}.</p>`;
  h += `<div class="chips">${cs.skills.list.map(k => { const lk = locked.has(k), on = lk || c.skills.includes(k); return chip('data-a="cr-skill"', k, on, skillName(k), lk || (!on && c.skills.length >= n)); }).join("")}</div>`;
  if (cs.expertise) {
    const prof = [...new Set([...locked, ...c.skills]), "tools"];
    h += `<div class="crbudget" style="margin-top:12px"><span>Expertise : ${cs.expertise} maîtrises doublées</span><b>${c.exp.length} / ${cs.expertise}</b></div><p class="help">Parmi tes compétences maîtrisées, ou les outils de voleur.</p>
      <div class="chips">${prof.map(k => { const on = c.exp.includes(k); return chip('data-a="cr-exp"', k, on, `${on ? "◉ " : ""}${skillName(k)}`, !on && c.exp.length >= cs.expertise); }).join("")}</div>`;
  }
  if (CLASSES[c.cls].creation) h += CLASSES[c.cls].creation.html(c); // choix propres à la classe au niveau 1 (rôdeur : ennemi juré, terrain favori)
  return h;
}
/** Sorts mineurs donnés d'office par la classe à la création (clerc : Lumière, sort de druide de la Nature), hors choix. */
const autoCantrips = c => CLASSES[c.cls].creation && CLASSES[c.cls].creation.auto ? CLASSES[c.cls].creation.auto(c) : [];
const cantripMax = (c, g) => R.cantrips(g) - autoCantrips(c).length;
/** Sort à choisir à la création : ligne dépliable commune (fiche du sort au toucher du nom, rond pour choisir). */
const crPick = (act, s, g, on, full) => pickRow({ act, id: s.id, on, full, name: esc(s.n) + tags(s), label: s.n, pills: keyPills(s, g), body: spellBody(s, g) });
const fold = t => (t || "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
/** Recherche par nom (les sorts choisis restent toujours visibles). */
const crFind = (c, list, sel) => !c.sq ? list : list.filter(s => sel.includes(s.id) || fold(s.n).includes(fold(c.sq)));
function stepSorts(c) {
  const g = preview(c), cMax = cantripMax(c, g), cs = CLASS_START[c.cls], auto = autoCantrips(c), ap = alwaysPrepared(g);
  const cans = classSpells(g).filter(s => s.l === 0 && !auto.includes(s.id)).sort(byName), l1 = classSpells(g).filter(s => s.l === 1 && !ap.includes(s.id)).sort(byName);
  const list = (act, arr, sel, max) => `<div class="luplist">${crFind(c, arr, sel).map(s => crPick(act, s, g, sel.includes(s.id), sel.length >= max)).join("") || `<div class="empty">Aucun sort ne correspond.</div>`}</div>`;
  let h = `<input id="cr-sq" type="search" value="${esc(c.sq || "")}" placeholder="Chercher un sort" aria-label="Chercher un sort" autocomplete="off"><p class="help" style="margin:4px 0 0">Touche un nom pour lire le sort ; le rond à droite le choisit.</p>`;
  h += `<div class="crbudget" style="margin-top:10px"><span>Sorts mineurs</span><b>${c.cantrips.length} / ${cMax}</b></div>${list('data-a="cr-can"', cans, c.cantrips, cMax)}`;
  if (cs.book) h += `<div class="crbudget" style="margin-top:12px"><span>Grimoire : ${cs.book} sorts de niveau 1</span><b>${c.spells.length} / ${cs.book}</b></div>${list('data-a="cr-book"', l1, c.spells, cs.book)}`;
  const pool = cs.book ? l1.filter(s => c.spells.includes(s.id)) : l1, pMax = R.prepMax(g);
  if (auto.length || ap.length) h = `<p class="help">${[auto.length ? `Déjà acquis : ${auto.map(id => esc(BY_ID[id].n)).join(", ")} (en plus des sorts mineurs).` : "", ap.length ? `Toujours préparés : ${ap.map(id => esc(BY_ID[id].n)).join(", ")} (hors limite).` : ""].filter(Boolean).join(" ")}</p>` + h;
  if (R.slots(g).length && pMax) h += `<div class="crbudget" style="margin-top:12px"><span>${CLASSES[c.cls].known ? "Sorts connus" : `Sorts préparés (${CLASSES[c.cls].abN} + niveau)`}</span><b>${c.prep.length} / ${pMax}</b></div><p class="help">Facultatif : modifiable ensuite chaque jour dans l'onglet Sorts.</p>${pool.length ? list('data-a="cr-prep"', pool, c.prep, pMax) : `<span class="muted">Choisis d'abord les sorts du grimoire.</span>`}`;
  return h;
}
function stepEquip(c) {
  const cs = CLASS_START[c.cls], b = bgOf(c);
  let h = `<p class="help"><b>L'un ou l'autre</b>, pas les deux : le paquetage de la classe et de l'historique, <b>ou</b> l'or de départ pour tout acheter toi-même.</p>
  <div class="viewsw" role="group" aria-label="Équipement : paquetage ou or de départ"><button data-a="cr-eqmode" data-v="pack" aria-pressed="${c.eqMode === "pack"}">Paquetage</button><button data-a="cr-eqmode" data-v="gold" aria-pressed="${c.eqMode === "gold"}">Or de départ</button></div>`;
  if (c.eqMode === "gold") return h + `<p class="help"><b>Aucun objet n'est ajouté</b> : ${cs.gold}${cs.goldX === 1 ? "" : " × 10"} po à la place de l'équipement de la classe et de l'historique, puis tu achètes ton équipement dans Personnage › Équipement.</p>
    <div class="crgold"><input id="cr-gold" type="number" inputmode="numeric" min="0" value="${esc(c.gold)}" placeholder="po" aria-label="Or de départ"><button class="btn" data-a="cr-goldroll">🎲 Lancer ${cs.gold}${cs.goldX === 1 ? "" : " × 10"}</button></div>`;
  cs.equip.forEach((line, i) => {
    h += `<div class="crcard">${line.map(([lbl, items], j) => { const on = (c.eq[i] || 0) === j;
      return `<button class="cropt${on ? " on" : ""}" data-a="cr-eq" data-k="${i}" data-v="${j}" aria-pressed="${on}"><span class="rd" aria-hidden="true"></span>${esc(lbl)}</button>${on ? items.map((it, k) => it.pick ? `<select data-crpick="${i}-${j}-${k}" aria-label="Arme au choix"><option value="">Choisir l'arme…</option>${pickList(it.pick).map(w => `<option value="${w.id}"${c.picks[`${i}-${j}-${k}`] === w.id ? " selected" : ""}>${esc(w.n)} · ${w.dmg} ${w.dt}</option>`).join("")}</select>` : "").join("") : ""}`; }).join("")}</div>`;
  });
  h += `<p class="help"><b>Toujours</b> : ${cs.fixed.map(x => x.ref ? `${GEAR[x.ref].n}${x.q > 1 ? ` ×${x.q}` : ""}` : x.n).join(", ")}.${b ? ` <b>Historique</b> : ${b.equip.join(", ")}${b.gold ? `, ${b.gold} po` : ""}.` : ""}</p>`;
  const g = preview(c);
  return h + `<span class="fpprev">${g.items.length} objets ajoutés · CA ${acOf(g) ?? "?"}${g.money.po ? ` · ${g.money.po} po` : ""}</span>`;
}
function stepFin(c) {
  const g = preview(c);
  return `<div class="crcard"><b class="t">${esc(g.name)}</b><small class="muted">${esc((g.race || {}).n || "")}${g.bg.n ? ` · ${esc(g.bg.n)}` : ""} · ${CLASSES[c.cls].n} niveau 1</small>
    <div class="crabs">${ABILITIES.map(([k, a]) => `<div><b>${signed(mod(g.abil[k]))}</b><small>${a} ${g.abil[k]}</small></div>`).join("")}</div>
    <span><b>PV ${g.hpMax}</b> · CA ${acOf(g) ?? "?"} · vitesse ${String(g.speed).replace(".", ",")} m</span>
    <span><b>Compétences</b> : ${Object.entries(g.skills).map(([k, l]) => skillName(k) + (l === 2 ? " ◉" : "")).join(", ") || "—"}</span>
    <span><b>Langues</b> : ${g.langs.join(", ") || "—"}${Object.keys(g.tools).length ? ` · <b>Outils</b> : ${Object.keys(g.tools).join(", ")}` : ""}</span>
    ${g.cantrips.length || g.spells.length ? `<span><b>Sorts</b> : ${[...g.cantrips, ...g.spells.map(x => x.id)].map(id => BY_ID[id] ? BY_ID[id].n : id).join(", ")}</span>` : ""}</div>
    <span class="lusub">Niveau de départ</span><div class="crpb"><button class="btn sm" data-a="cr-lv" data-v="-1"${c.level <= 1 ? " disabled" : ""}>−</button><b>${c.level}</b><button class="btn sm" data-a="cr-lv" data-v="1"${c.level >= 20 ? " disabled" : ""}>+</button></div>
    <p class="help">${c.level > 1 ? `La fiche est créée au niveau 1, puis l'assistant de passage de niveau s'enchaîne ${c.level - 1} fois (jusqu'au niveau ${c.level}) : PV, sous-classe, amélioration ou don, sorts.` : "La fiche est créée au niveau 1."}</p>`;
}
const BODY = { race: stepRace, carac: stepCarac, hist: stepHist, comp: stepComp, sorts: stepSorts, equip: stepEquip, fin: stepFin };
/** Ce qui manque pour passer l'étape (texte), ou "". */
function missing(c, k) {
  if (k === "race") return raceMissing(c);
  if (k === "carac") { if (c.method === "pb" && pbSpent(c.pb) > PB_BUDGET) return "trop de points dépensés"; return baseScores(c) ? "" : "attribue toutes les caractéristiques"; }
  if (k === "hist") { const b = bgOf(c); if (!b) return "choisis un historique"; if (bgSkills(c).some(x => !x) || (c.bg === "perso" && (c.bc.skills || []).length < 2)) return "choisis tes compétences d'historique"; if (b.toolChoice && !(c.bc.tools || [])[0]) return "choisis l'outil"; if (bgTools(c, clsToolsOf(c)).some(x => !x)) return "remplace l'outil en double"; if ((c.bc.langs || []).filter(Boolean).length < (b.langChoice || 0)) return "choisis les langues"; return ""; }
  if (k === "comp") { const cs = CLASS_START[c.cls], locked = new Set([...(raceGives(c) || { skills: [] }).skills, ...bgSkills(c)]), n = Math.min(cs.skills.n, cs.skills.list.filter(x => !locked.has(x)).length); if (c.skills.length < n) return `choisis ${n - c.skills.length} compétence(s)`; if (cs.expertise && c.exp.length < cs.expertise) return "choisis ton Expertise"; return CLASSES[c.cls].creation ? CLASSES[c.cls].creation.missing(c) : ""; }
  if (k === "sorts") { const g = preview(c), cs = CLASS_START[c.cls]; if (c.cantrips.length < cantripMax(c, g)) return "choisis tes sorts mineurs"; if (cs.book && c.spells.length < cs.book) return `choisis ${cs.book} sorts pour le grimoire`; return ""; }
  if (k === "equip") { if (c.eqMode === "gold") return +c.gold > 0 ? "" : "indique ton or de départ"; const cs = CLASS_START[c.cls]; const need = cs.equip.flatMap((line, i) => line[c.eq[i] || 0][1].map((it, j) => it.pick ? `${i}-${c.eq[i] || 0}-${j}` : null)).filter(Boolean); return need.every(x => c.picks[x]) ? "" : "choisis les armes"; }
  return "";
}
function crHTML() {
  const c = S.cr, st = steps(c), i = c.step, [k, title] = st[i];
  const bar = st.map((_, j) => `<span class="${j <= i ? "on" : ""}"></span>`).join("");
  const miss = missing(c, k);
  return `<div class="lubox crbox"><div class="luhead"><div class="t"><h2><span class="initial">N</span>ouveau personnage</h2><button class="x" data-a="cr-close" aria-label="Fermer l'assistant">✕</button></div>
    <div class="crbar">${bar}</div><div class="crstep">Étape ${i + 1} sur ${st.length} · <b>${title}</b> · ${esc(c.name || "sans nom")}, ${CLASSES[c.cls].n.toLowerCase()}</div></div>
    <div class="lubody">${BODY[k](c)}</div>
    <div class="lufoot"><button class="btn" data-a="cr-back">← Retour</button>${miss ? `<span class="crmiss">${esc(miss)}</span>` : ""}${k === "fin" ? `<button class="btn primary" data-a="cr-go"${miss ? " disabled" : ""}>` : `<button class="btn primary" data-a="cr-next"${miss ? " disabled" : ""}>`}${k === "fin" ? `Créer${c.level > 1 ? ` · niveau 1 → ${c.level}` : ""}` : "Suivant →"}</button></div></div>`;
}

// ---------- Actions
const upd = fn => { if (!S.cr) return; fn(S.cr); S.luKeep = true; render(); };
const toggle = (arr, v, max) => arr.includes(v) ? arr.filter(x => x !== v) : arr.length < max ? [...arr, v] : arr;
onClick("cr-close", () => { S.cr = null; render(); });
onClick("cr-back", () => upd(c => { if (c.step <= 1) { S.cr = null; S.newOpen = true; S.newCls = c.cls; S.newName = c.name; } else c.step -= 1; }));
onClick("cr-next", () => upd(c => { if (!missing(c, steps(c)[c.step][0])) c.step = Math.min(steps(c).length - 1, c.step + 1); S.luKeep = false; }));
onClick("cr-race", (b) => upd(c => { if (c.race !== b.dataset.v) { c.race = b.dataset.v; c.sub = null; c.rc = { asi: [], skills: [], langs: [] }; c.fp = null; } }));
onClick("cr-sub", (b) => upd(c => { c.sub = b.dataset.v; c.rc = { asi: [], skills: [], langs: [] }; c.fp = null; }));
onClick("cr-rasi", (b) => upd(c => { const r = RACES[c.race], s = subOf(c) || {}, ch = s.asiChoice || r.asiChoice; c.rc.asi = toggle(c.rc.asi || [], b.dataset.v, ch.n); }));
onClick("cr-rskill", (b) => upd(c => { const r = RACES[c.race], s = subOf(c) || {}; c.rc.skills = toggle(c.rc.skills || [], b.dataset.v, s.skillChoice || r.skillChoice || 0); }));
onClick("cr-rtool", (b) => upd(c => { c.rc.tool = b.dataset.v; }));
onClick("cr-anc", (b) => upd(c => { c.rc.anc = +b.dataset.v; }));
onChange(t => t.dataset.crlang != null, t => upd(c => { const l = [...(c.rc.langs || [])]; l[+t.dataset.crlang] = t.value; c.rc.langs = l; }));
onChange("#cr-rcantrip", t => upd(c => { c.rc.cantrip = t.value; c.rc.cantripName = BY_ID[t.value] ? BY_ID[t.value].n : ""; }));
onClick("cr-method", (b) => upd(c => { c.method = b.dataset.v; }));
onChange(t => t.dataset.crstd != null, t => upd(c => { const v = +t.value || null; if (v) Object.keys(c.std).forEach(k => { if (c.std[k] === v) delete c.std[k]; }); if (v) c.std[t.dataset.crstd] = v; else delete c.std[t.dataset.crstd]; }));
onClick("cr-pb", (b) => upd(c => { const k = b.dataset.k, v = c.pb[k] + +b.dataset.v; if (v < 8 || v > 15) return; const nx = { ...c.pb, [k]: v }; if (pbSpent(nx) <= PB_BUDGET) c.pb = nx; }));
onInput(t => t.dataset.crdice != null, (t) => { if (!S.cr) return; S.cr.dice[t.dataset.crdice] = t.value; delete S.cr.rolls[t.dataset.crdice]; });
onChange(t => t.dataset.crdice != null, () => upd(() => {}));
onClick("cr-roll", () => upd(c => { ABILITIES.forEach(([k]) => { const r = roll4d6(); c.dice[k] = r.total; c.rolls[k] = r.dice.map((d, i) => i < 3 ? String(d) : `(${d})`); }); toast("4d6 lancés pour chaque caractéristique (le dé entre parenthèses est écarté)"); }));
onClick("cr-bg", (b) => upd(c => { if (c.bg !== b.dataset.v) { c.bg = b.dataset.v; c.bc = { tools: [], langs: [], swap: {}, swapTool: {} }; } }));
onClick("cr-bgskill", (b) => upd(c => { c.bc.skills = toggle(c.bc.skills || [], b.dataset.v, 2); }));
onInput("#cr-bgname", t => { if (S.cr) S.cr.bc.name = t.value; });
onInput(t => t.dataset.crbc != null, t => { if (S.cr) S.cr.bc[t.dataset.crbc] = t.value; });
onChange(t => t.dataset.crswap != null, t => upd(c => { c.bc.swap = { ...c.bc.swap, [t.dataset.crswap]: t.value }; }));
onChange(t => t.dataset.crswaptool != null, t => upd(c => { c.bc.swapTool = { ...c.bc.swapTool, [t.dataset.crswaptool]: t.value }; }));
onChange(t => t.dataset.crbgtool != null, t => upd(c => { c.bc.tools = [t.value]; }));
onChange(t => t.dataset.crbglang != null, t => upd(c => { const l = [...(c.bc.langs || [])]; l[+t.dataset.crbglang] = t.value; c.bc.langs = l; }));
onClick("cr-skill", (b) => upd(c => { const cs = CLASS_START[c.cls]; c.skills = toggle(c.skills, b.dataset.v, cs.skills.n); c.exp = c.exp.filter(x => x === "tools" || c.skills.includes(x) || [...(raceGives(c) || { skills: [] }).skills, ...bgSkills(c)].includes(x)); }));
onClick("cr-exp", (b) => upd(c => { c.exp = toggle(c.exp, b.dataset.v, CLASS_START[c.cls].expertise || 0); }));
const full = (arr, id, max) => !arr.includes(id) && arr.length >= max ? (toast(`Limite atteinte (${arr.length}/${max}) : retire d'abord un sort`), true) : false;
onClick("cr-can", (b) => { const c = S.cr, id = b.dataset.id || b.dataset.v; if (!c || full(c.cantrips, id, cantripMax(c, preview(c)))) return; upd(c => { c.cantrips = toggle(c.cantrips, id, cantripMax(c, preview(c))); }); });
onInput("#cr-sq", t => { if (!S.cr) return; S.cr.sq = t.value; S.luKeep = true; render(); });
onClick("cr-book", (b) => { const c0 = S.cr, id = b.dataset.id || b.dataset.v; if (!c0 || full(c0.spells, id, CLASS_START[c0.cls].book)) return; upd(c => { c.spells = toggle(c.spells, id, CLASS_START[c.cls].book); c.prep = c.prep.filter(x => c.spells.includes(x)); }); });
onClick("cr-prep", (b) => { const c = S.cr, id = b.dataset.id || b.dataset.v; if (!c || full(c.prep, id, R.prepMax(preview(c)))) return; upd(c => { c.prep = toggle(c.prep, id, R.prepMax(preview(c))); }); });
onClick("cr-eqmode", (b) => upd(c => { c.eqMode = b.dataset.v; }));
onClick("cr-eq", (b) => upd(c => { c.eq = { ...c.eq, [b.dataset.k]: +b.dataset.v }; }));
onChange(t => t.dataset.crpick != null, t => upd(c => { c.picks = { ...c.picks, [t.dataset.crpick]: t.value }; }));
onInput("#cr-gold", t => { if (S.cr) S.cr.gold = t.value; });
onChange("#cr-gold", () => upd(() => {}));
onClick("cr-goldroll", () => upd(c => { const n = +CLASS_START[c.cls].gold.split("d")[0], d = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 4)); c.gold = String((CLASS_START[c.cls].goldX || 10) * d.reduce((a, x) => a + x, 0)); toast(`${CLASS_START[c.cls].gold} : ${d.join(" + ")} → <b>${c.gold} po</b>`); }));
onClick("cr-lv", (b) => upd(c => { c.level = Math.max(1, Math.min(20, c.level + +b.dataset.v)); }));
onClick("cr-go", () => {
  const c = S.cr; if (!c || missing(c, "fin")) return;
  const g = norm(build(c, blank));
  const fs = c.fp && c.fp.sel; if (fs && (subOf(c) || {}).feat && featChoiceOk(fs, c.fp.ch || {})) featApply(g, fs, c.fp.ch || {}, 1); // don de l'humain (variante)
  const id = newId(g.name); S.list[id] = g; S.cr = null; S.tab = "perso"; S.view = "jeu"; setCur(id); save(id);
  if (c.level > 1) { S.crTarget = c.level; luOpen(G()); render(); toast(`${esc(g.name)} créé au niveau 1 · passage au niveau 2`); }
  else { render(); toast(`${esc(g.name)} créé`); }
});

export { crHTML, crStart };
