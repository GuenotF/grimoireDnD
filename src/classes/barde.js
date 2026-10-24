// Barde (Manuel des joueurs 2014) : sorts connus, Inspiration bardique, Touche-à-tout, Chant reposant, Expertise,
// Secrets magiques (sorts de toutes les classes), collèges du Savoir et de la Vaillance.
// Résumés rédigés pour la table (textes AideDD), à vérifier dans le livre.
import { onChange, onClick, onInput } from "../core/actions.js";
import { byName, esc, signed } from "../core/format.js";
import { G, S } from "../core/state.js";
import { mutate } from "../core/store.js";
import { render, toast } from "../core/ui.js";
import { BY_ID, SPELLS } from "../data.js";
import { pCantrips, pConc, pDots, pExtras, pFoot, pHeader, pNotes, pSlots, pSpellRow, printHTML } from "../features/print.js";
import { castingRules, concentrationRules } from "../features/rules.js";
import { keyPills, tags } from "../features/spells.js";
import { R, classSpells } from "../rules/common.js";
import { SKILLS, SLOTS } from "../rules/tables.js";
import { capRow, pillsRaw, statLabel } from "../ui/components.js";
import { CLASSES } from "./index.js";

const KNOWN = [0, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 15, 16, 18, 19, 19, 20, 22, 22, 22];
const BAR = {
  die: lv => lv >= 15 ? "d12" : lv >= 10 ? "d10" : lv >= 5 ? "d8" : "d6",          // Inspiration bardique
  ins: g => Math.max(1, R.am(g)),                                                    // utilisations = mod. CHA
  song: lv => lv >= 17 ? "d12" : lv >= 13 ? "d10" : lv >= 9 ? "d8" : "d6",          // Chant reposant (niveau 2)
  secrets: g => (g.level >= 18 ? 6 : g.level >= 14 ? 4 : g.level >= 10 ? 2 : 0) + (g.bcol === "savoir" && g.level >= 6 ? 2 : 0),
  dd: g => 8 + R.prof(g.level) + R.am(g),
};
const COL = {
  savoir: { n: "Savoir", full: "Collège du Savoir", sum: "3 compétences en plus. Mots cinglants : réaction, retire le dé d'inspiration au jet d'un ennemi. Secrets magiques supplémentaires (2 sorts au niveau 6), Talent incomparable." },
  vaillance: { n: "Vaillance", full: "Collège de la Vaillance", sum: "Armures intermédiaires, boucliers, armes de guerre. Inspiration martiale : le dé s'ajoute aux dégâts ou à la CA. Attaque supplémentaire (6), Magie de combat (14)." },
};
const INSTR = ["Chalemie", "Cor", "Cornemuse", "Flûte", "Flûte de pan", "Luth", "Lyre", "Tambour", "Tympanon", "Viole"];
const skN = k => (SKILLS.find(s => s[0] === k) || [k, k])[1];
const FEATS = [
  { lv: 1, n: "Inspiration bardique", k: "f", pill: g => `${BAR.die(g.level)} · ${BAR.ins(g)} fois · ${g.level >= 5 ? "repos court" : "repos long"}`, d: g => `Action bonus : une créature (pas toi) à 18 m qui t'entend gagne un ${BAR.die(g.level)} d'inspiration pendant 10 minutes, à ajouter à un jet d'attaque, de caractéristique ou de sauvegarde après le d20. ${BAR.ins(g)} fois (mod. de Charisme), récupérées au repos long${g.level >= 5 ? " ou court (Source d'inspiration)" : ""}.` },
  { lv: 2, n: "Touche-à-tout", k: "f", pill: g => `${signed(Math.floor(R.prof(g.level) / 2))} sans maîtrise`, d: g => `Tu ajoutes la moitié de ta maîtrise (${signed(Math.floor(R.prof(g.level) / 2))}) aux tests de caractéristique qui ne l'ont pas déjà : compétences non maîtrisées (½) et initiative, calculées.` },
  { lv: 2, n: "Chant reposant", k: "f", pill: g => `+1${BAR.song(g.level)} PV au repos court`, d: g => `Pendant un repos court, si tu joues ou chantes : chaque allié qui dépense au moins un dé de vie regagne 1${BAR.song(g.level)} PV de plus.` },
  { lv: 3, n: "Collège bardique", k: "f", pill: g => COL[g.bcol].full, d: g => `${COL[g.bcol].full} : ${COL[g.bcol].sum}` },
  { lv: 3, n: "Expertise", k: "f", pill: g => g.level >= 10 ? "4 compétences ×2" : "2 compétences ×2", d: () => "Maîtrise doublée pour deux compétences maîtrisées au niveau 3, deux de plus au niveau 10 (proposé dans l'assistant de niveau, ou dans Personnage : toucher deux fois)." },
  { lv: 3, c: "savoir", n: "Maîtrises supplémentaires", k: "f", pill: () => "3 compétences", d: () => "Tu maîtrises trois compétences de ton choix (assistant de niveau)." },
  { lv: 3, c: "savoir", n: "Mots cinglants", k: "s", pill: g => `réaction : −${BAR.die(g.level)} · 18 m`, d: g => `Réaction, quand une créature que tu vois à 18 m fait un jet d'attaque, de caractéristique ou de dégâts : dépense une Inspiration bardique et retire le ${BAR.die(g.level)} à son résultat (après le jet, avant l'effet). Sans effet sur une créature qui ne t'entend pas ou qui est immunisée au charme.` },
  { lv: 3, c: "vaillance", n: "Maîtrises supplémentaires", k: "f", pill: () => "armures intermédiaires, boucliers, armes de guerre", d: () => "Tu maîtrises les armures intermédiaires, les boucliers et les armes de guerre." },
  { lv: 3, c: "vaillance", n: "Inspiration martiale", k: "f", pill: g => `${BAR.die(g.level)} aux dégâts ou à la CA`, d: g => `Une créature qui a ton Inspiration bardique peut aussi lancer le ${BAR.die(g.level)} et l'ajouter aux dégâts d'une attaque d'arme, ou à sa CA contre une attaque (réaction, après avoir vu le jet).` },
  { lv: 5, n: "Source d'inspiration", k: "f", pill: () => "inspiration au repos court", d: () => "Tu récupères toutes tes utilisations d'Inspiration bardique à la fin d'un repos court ou long." },
  { lv: 6, n: "Contre-charme", k: "s", pill: () => "action : avantage contre charme et effroi, 9 m", d: () => "Action : jusqu'à la fin de ton prochain tour, toi et les créatures amicales à 9 m qui t'entendent avez l'avantage aux jets de sauvegarde contre l'effroi et le charme (prend fin si tu es neutralisé ou réduit au silence)." },
  { lv: 6, c: "savoir", n: "Secrets magiques supplémentaires", k: "f", pill: () => "2 sorts de toute classe", d: () => "Tu apprends deux sorts de n'importe quelle classe, qui comptent comme des sorts de barde, en plus de tes sorts connus (Gérer › Secrets magiques)." },
  { lv: 6, c: "vaillance", n: "Attaque supplémentaire", k: "f", pill: () => "2 attaques par action", d: () => "Quand tu prends l'action Attaquer, tu attaques deux fois au lieu d'une." },
  { lv: 10, n: "Secrets magiques", k: "f", pill: g => `${g.level >= 18 ? 6 : g.level >= 14 ? 4 : 2} sorts de toute classe`, d: () => "Deux sorts de n'importe quelle classe aux niveaux 10, 14 et 18 : ils comptent comme des sorts de barde, en plus de tes sorts connus (Gérer › Secrets magiques)." },
  { lv: 14, c: "savoir", n: "Talent incomparable", k: "f", pill: () => "inspiration sur tes propres tests", d: () => "Quand tu fais un test de caractéristique, tu peux dépenser une Inspiration bardique et ajouter le dé à ton résultat." },
  { lv: 14, c: "vaillance", n: "Magie de combat", k: "f", pill: () => "sort puis attaque en action bonus", d: () => "Quand tu utilises ton action pour lancer un sort de barde, tu peux faire une attaque d'arme en action bonus." },
  { lv: 20, n: "Inspiration supérieure", k: "f", pill: () => "1 inspiration au jet d'initiative", d: () => "Si tu n'as plus d'Inspiration bardique quand tu lances l'initiative, tu en récupères une." },
];
const feats = g => FEATS.filter(f => !f.c || f.c === g.bcol).map((f, i) => ({ id: "b" + i, ...f }));

// ---------- Inspiration bardique (En jeu)
function insBody(g) {
  const left = BAR.ins(g) - Math.min(BAR.ins(g), g.insU), die = BAR.die(g.level);
  const opt = (n, pills, e, k, b) => `<div class="capopt"><b>${n}</b>${pillsRaw(pills)}<div class="eff">${e}</div><div class="cast"><button class="btn cast-go sm" data-a="ins-use" data-v="${k}"${left ? "" : " disabled"}>${b}</button></div></div>`;
  let h = opt("Inspirer", [["f", "Dé", `${die} à un allié`], ["n", "Portée", "18 m"], ["n", "Durée", "10 minutes"]], `Action bonus : une créature qui t'entend ajoute le ${die} à un jet d'attaque, de caractéristique ou de sauvegarde, après le d20.`, "give", "Inspirer");
  if (g.level >= 3 && g.bcol === "savoir") h += opt("Mots cinglants", [["d", "Jet d'un ennemi", `−${die}`], ["n", "Temps", "réaction"], ["n", "Portée", "18 m"]], "Retire le dé à un jet d'attaque, de caractéristique ou de dégâts d'une créature que tu vois (pas immunisée au charme).", "cut", "Mots cinglants");
  if (g.level >= 14 && g.bcol === "savoir") h += opt("Talent incomparable", [["f", "Ton test", `+${die}`]], "Ajoute le dé à l'un de tes tests de caractéristique.", "self", "Talent incomparable");
  if (g.level >= 3 && g.bcol === "vaillance") h += `<div class="capopt"><b>Inspiration martiale</b>${pillsRaw([["d", "Dégâts", `+${die}`], ["n", "ou CA", `+${die} (réaction)`]])}<div class="eff">L'allié inspiré peut aussi utiliser le dé pour ses dégâts d'arme, ou sa CA contre une attaque.</div></div>`;
  return h + `<span class="muted" style="font-size:12.5px">${left} utilisation${left > 1 ? "s" : ""} restante${left > 1 ? "s" : ""} · ${g.level >= 5 ? "repos court ou long" : "repos long"}.</span>`;
}
function resHTML(g) {
  const n = BAR.ins(g);
  let h = `<div class="rubric"><h2>Ressources du barde</h2></div><div class="slots res">`;
  h += capRow(g, "ins", `Inspiration bardique <span class="kp p">${BAR.die(g.level)}</span>`, g.level >= 5 ? "repos court" : "repos long", Array.from({ length: n }, (_, k) => `<button class="pip${k < Math.min(n, g.insU) ? " used" : ""}" data-a="res-pip" data-r="ins" data-k="${k}" aria-label="Inspiration bardique ${k + 1}, ${k < g.insU ? "utilisée" : "disponible"}"></button>`).join(""), false, insBody);
  if (g.level >= 6) h += `<div class="resrow sep"><span class="rn"><b>Contre-charme</b><small>action · 9 m · jusqu'à ton prochain tour</small></span><span class="kp s">avantage contre charme et effroi</span></div>`;
  return h + `</div>`;
}
onClick("ins-use", (b) => {
  const g = G(); if (!g || g.insU >= BAR.ins(g)) return; const k = b.dataset.v, prev = g.insU, die = BAR.die(g.level);
  mutate(g => { g.insU = prev + 1; });
  const m = { give: `<b>Inspiration bardique</b> : un ${die} à un allié (10 minutes)`, cut: `<b>Mots cinglants</b> : lance le ${die} et retire-le au jet de l'ennemi`, self: `<b>Talent incomparable</b> : +${die} à ton test` }[k];
  toast(`${m} · reste ${BAR.ins(g) - prev - 1}`, () => { mutate(g => { g.insU = prev; }); return "Inspiration rendue"; });
});

// ---------- Secrets magiques : sorts de toutes les classes (Gérer et assistant de niveau)
const CLS_N = () => Object.fromEntries(Object.entries(CLASSES).filter(([, c]) => !c.noSpells).map(([k, c]) => [k, c.n]));
const origin = s => (s.cl || []).filter(c => CLS_N()[c]).map(c => CLS_N()[c].toLowerCase()).join(" · ");
/** Choix de sorts de toutes les classes : chips de filtre, liste à cocher. st : { cls, lv, q } ; sel : choisis ; max ; act : data-a. */
function secretPicker(b, st, sel, max, act, have) {
  const top = R.maxLevel(b), lvls = []; for (let l = top; l >= 1; l--) lvls.push(l);
  const lv = st.lv && st.lv <= top ? st.lv : top, q = (st.q || "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  const list = SPELLS.filter(s => s.l === lv && (s.cl || []).some(c => CLS_N()[c]) && (!st.cls || (s.cl || []).includes(st.cls)) && (!have.includes(s.id) || sel.includes(s.id))
    && (!q || s.n.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").includes(q))).sort(byName);
  return `<input id="sec-q" type="search" value="${esc(st.q || "")}" placeholder="Chercher un sort" aria-label="Chercher un sort" autocomplete="off">
  <div class="chips"><button class="chip" data-a="sec-cls" data-v="" aria-pressed="${!st.cls}">Toutes</button>${Object.entries(CLS_N()).filter(([k]) => k !== "barde").map(([k, n]) => `<button class="chip" data-a="sec-cls" data-v="${k}" aria-pressed="${st.cls === k}">${n}</button>`).join("")}</div>
  <div class="chips">${lvls.map(l => `<button class="chip" data-a="sec-lv" data-v="${l}" aria-pressed="${l === lv}">Niv. ${l}</button>`).join("")}</div>
  <div class="luplist">${list.map(s => { const on = sel.includes(s.id); return `<label class="lurowp${on ? " on" : ""}"><input type="checkbox" ${act === "lu-bsec" ? 'data-a="lu-bsec"' : 'data-a="sec-pick"'} data-id="${s.id}"${on ? " checked" : ""}${!on && sel.length >= max ? ' class="full" aria-disabled="true"' : ""}><span class="n">${esc(s.n)}${tags(s)}<small class="secorg"> ${esc(origin(s))}</small></span><span class="kps">${keyPills(s, b)}</span></label>`; }).join("") || `<div class="empty">Aucun sort ne correspond.</div>`}</div>`;
}
const secSt = () => S.lu ? (S.lu.secF = S.lu.secF || {}) : (S.secF = S.secF || {});
onClick("sec-cls", (b) => { secSt().cls = b.dataset.v || null; if (S.lu) S.luKeep = true; render(); });
onClick("sec-lv", (b) => { secSt().lv = +b.dataset.v; if (S.lu) S.luKeep = true; render(); });
onInput("#sec-q", t => { secSt().q = t.value; if (S.lu) S.luKeep = true; render(); });
function settingsHTML(g) {
  const n = BAR.secrets(g); if (!n) return "";
  const sel = g.secrets || [], open = S.open.has("sec:pick");
  return `<div class="rubric"><h2>Secrets magiques</h2><span class="aside">${sel.length} sur ${n} · de n'importe quelle classe</span></div>
  ${sel.length ? `<p class="muted" style="font-size:13px;margin:0 0 6px">${sel.map(id => BY_ID[id]).filter(Boolean).map(s => `✦ ${esc(s.n)} <small>(${esc(origin(s))})</small>`).join(" · ")}</p>` : ""}
  <button class="linkbtn" data-a="row" data-id="sec:pick" aria-expanded="${open}">${open ? "Fermer le choix ▴" : sel.length < n ? `Choisir ${n - sel.length} sort${n - sel.length > 1 ? "s" : ""} ▾` : "Modifier le choix ▾"}</button>
  ${open ? `<div class="secpick">${secretPicker(g, S.secF = S.secF || {}, sel, n, "sec-pick", [...g.prepared, ...sel])}</div>` : ""}`;
}
onChange("sec-pick", t => { const id = t.dataset.id; mutate(g => { const s = g.secrets || []; g.secrets = t.checked ? (s.length < BAR.secrets(g) ? [...s, id] : s) : s.filter(x => x !== id); }); });

// ---------- Assistant de niveau : collège (Savoir : 3 compétences), Expertise, Secrets magiques
function luChoices(g, b, L) {
  let h = "";
  if (b.level === 3 && b.bcol === "savoir") { const sel = L.lsk || [];
    h += `<div class="luprep"><h3>Collège du Savoir · 3 compétences · ${sel.length}/3</h3><div class="chips">${SKILLS.filter(([k]) => !(g.skills || {})[k]).map(([k, n]) => `<button class="chip" data-a="lu-bsk" data-v="${k}" aria-pressed="${sel.includes(k)}"${!sel.includes(k) && sel.length >= 3 ? " disabled" : ""}>${n}</button>`).join("")}</div></div>`; }
  if (b.level === 3 || b.level === 10) { const sel = L.bexp || [], prof = SKILLS.filter(([k]) => (g.skills || {})[k] === 1 || (L.lsk || []).includes(k));
    h += `<div class="luprep"><h3>Expertise · 2 compétences · ${sel.length}/2</h3><span class="muted">Parmi tes compétences maîtrisées, sans expertise.</span><div class="chips">${prof.map(([k, n]) => `<button class="chip" data-a="lu-bexp" data-v="${k}" aria-pressed="${sel.includes(k)}"${!sel.includes(k) && sel.length >= 2 ? " disabled" : ""}>${n}</button>`).join("")}</div></div>`; }
  const n = BAR.secrets(b) - BAR.secrets(g);
  if (n > 0) { const sel = L.sec || [];
    h += `<div class="luprep"><h3>Secrets magiques · ${sel.length}/${n}</h3><span class="muted">De n'importe quelle classe, d'un niveau que tu peux lancer.</span>${secretPicker(b, L.secF = L.secF || {}, sel, n, "lu-bsec", [...g.prepared, ...(g.secrets || [])])}</div>`; }
  return h;
}
const tog = (arr, v, max) => arr.includes(v) ? arr.filter(x => x !== v) : arr.length < max ? [...arr, v] : arr;
onClick("lu-bsk", (b) => { if (!S.lu) return; S.lu.lsk = tog(S.lu.lsk || [], b.dataset.v, 3); S.luKeep = true; render(); });
onClick("lu-bexp", (b) => { if (!S.lu) return; S.lu.bexp = tog(S.lu.bexp || [], b.dataset.v, 2); S.luKeep = true; render(); });
onChange("lu-bsec", t => { const L = S.lu, g = G(); if (!L || !g) return; const n = BAR.secrets({ ...g, level: L.to, bcol: L.sub || g.bcol }) - BAR.secrets(g);
  if (t.checked && (L.sec || []).length >= n) { t.checked = false; toast(`${n} sort${n > 1 ? "s" : ""} à ce niveau : décoche d'abord un sort`); return; }
  L.sec = t.checked ? [...(L.sec || []), t.dataset.id] : (L.sec || []).filter(x => x !== t.dataset.id); S.luKeep = true; render(); });
onChange("#f-bcol", t => { mutate(g => { g.bcol = t.value; }); });

// ---------- Création (étape Compétences) : 3 instruments de musique
const creation = {
  html: c => { const sel = (c.cx || {}).instr || [];
    return `<div class="crcls"><span class="lusub">Instruments de musique · ${sel.length}/3</span><div class="chips">${INSTR.map(i => `<button class="chip" data-a="cr-binstr" data-v="${esc(i)}" aria-pressed="${sel.includes(i)}"${!sel.includes(i) && sel.length >= 3 ? " disabled" : ""}>${esc(i)}</button>`).join("")}</div>${sel.length === 3 ? `<span class="fpprev">Ajoutés à la fiche : maîtrise de ${sel.map(esc).join(", ")} (Outils et langues)</span>` : ""}</div>`; },
  missing: c => ((c.cx || {}).instr || []).length < 3 ? "choisis 3 instruments de musique" : "",
  apply: (g, c) => { ((c.cx || {}).instr || []).forEach(i => { g.tools[i] = Math.max(1, g.tools[i] || 0); }); },
};
onClick("cr-binstr", (b) => { const c = S.cr; if (!c) return; c.cx = c.cx || {}; c.cx.instr = tog(c.cx.instr || [], b.dataset.v, 3); S.luKeep = true; render(); });

// ---------- Onglet Règles
function rulesHTML(g) {
  return `<div class="cols rules">
  <div><div class="rubric" style="margin-top:4px"><h3>Sorts connus</h3></div>
  <p>Le barde ne prépare pas ses sorts : il en <b>connaît ${R.prepMax(g)}</b>, tous lançables, et <b>${R.cantrips(g)} sorts mineurs</b>. À chaque niveau, il peut en remplacer un. Ses sorts rituels connus se lancent en rituel.</p>
  ${BAR.secrets(g) ? `<p><b>Secrets magiques</b> : ${BAR.secrets(g)} sorts de n'importe quelle classe, en plus, qui comptent comme des sorts de barde.</p>` : ""}
  ${castingRules(g)}
  ${concentrationRules()}</div>
  <div><div class="rubric" style="margin-top:4px"><h3>Inspiration bardique</h3></div>
  <p>Action bonus, <b>${BAR.ins(g)} fois</b> (mod. de Charisme) : un allié à 18 m qui t'entend gagne un <span class="kp p">${BAR.die(g.level)}</span> à ajouter, dans les 10 minutes, à un jet d'attaque, de caractéristique ou de sauvegarde (après le d20). ${g.level >= 5 ? "Récupérée au repos court ou long." : "Récupérée au repos long (court au niveau 5)."}</p>
  <div class="rubric"><h3>Touche-à-tout et Chant reposant</h3></div>
  <p>Dès le niveau 2 : moitié de la maîtrise aux tests sans maîtrise (initiative comprise) ; au repos court, chaque allié qui dépense un dé de vie regagne 1${BAR.song(g.level)} PV de plus.</p>
  <div class="rubric"><h3>${esc(COL[g.bcol].full)}</h3></div><p>${esc(COL[g.bcol].sum)}</p>
  <p class="muted">Source : Manuel des joueurs 2014 (barde, collèges du Savoir et de la Vaillance). Résumés rédigés pour la table, à vérifier dans le livre en cas de doute.</p></div></div>`;
}
// ---------- Fiche imprimable
function printSheet(g) {
  const prof = R.prof(g.level), mod = R.am(g), known = g.prepared.map(id => BY_ID[id]).filter(Boolean).sort((a, b) => a.l - b.l || byName(a, b)), sec = (g.secrets || []).map(id => BY_ID[id]).filter(Boolean).sort((a, b) => a.l - b.l || byName(a, b));
  return `${pHeader(g, `Barde, niveau ${g.level}${g.level >= 3 ? ` · ${esc(COL[g.bcol].full)}` : ""}`, [[signed(mod), "MOD. CHARISME"], [BAR.dd(g), "DD DES SORTS"], [signed(prof + mod), "ATTAQUE DE SORT"], [BAR.die(g.level), "INSPIRATION"], [R.prepMax(g), "SORTS CONNUS"]])}
${pSlots(g)}
<h2>Inspiration bardique <small>${g.level >= 5 ? "repos court ou long" : "repos long"}</small></h2>
<div class="res"><span class="l">${BAR.die(g.level)} d'inspiration</span>${pDots(BAR.ins(g))}<span class="r">action bonus · 18 m · 10 minutes</span></div>
<h2>Capacités de classe <small>niveau ${g.level}</small></h2>
<table>${feats(g).filter(f => f.lv <= g.level).map(f => `<tr><td class="n">${f.n}</td><td>${esc(f.d(g))}</td></tr>`).join("")}</table>
${pCantrips(g)}
${pExtras(g)}
${pConc()}
<div class="brk"></div>
${sec.length ? `<h2 style="margin-top:0">Secrets magiques <small>sorts d'autres classes, en plus</small></h2><table><tr><th>Sort</th><th>Incantation · composantes</th><th>Effet</th></tr>${sec.map(s => pSpellRow(g, s, false)).join("")}</table>` : ""}
<h2${sec.length ? "" : ' style="margin-top:0"'}>Sorts connus <small>${known.length} / ${R.prepMax(g)} · tous lançables</small></h2>
${known.length ? `<table><tr><th>Sort</th><th>Incantation · composantes</th><th>Effet</th></tr>${known.map(s => pSpellRow(g, s, false)).join("")}</table>` : "<p>Aucun sort connu pour l'instant.</p>"}
${pNotes(g)}
${pFoot("BARDE")}`;
}

// ---------- Définition de la classe (contrat : voir docs/ARCHITECTURE.md) ----------
const row = (l, o, n, cls) => `<div class="${o === n ? "same" : ""}"><span>${l}</span><span class="old">${o}</span><span class="ar">→</span><b${cls && o !== n ? ` style="color:var(${cls})"` : ""}>${n}</b></div>`;
const valor = g => g.level >= 3 && g.bcol === "vaillance";
export default {
  n: "Barde", ab: "cha", abN: "Charisme", abArticle: "le Charisme", slots: SLOTS, top: 9, hitDie: "1d8",
  saves: ["dex", "cha"],
  weaponProf: g => ["simple", "crossbow-hand", "longsword", "rapier", "shortsword", ...(valor(g) ? ["martial"] : [])],
  armorProf: g => ["light", ...(valor(g) ? ["medium", "shield"] : [])],
  cantrips: lv => lv >= 10 ? 4 : lv >= 4 ? 3 : 2,
  known: lv => KNOWN[lv] || 0,
  prep: () => 0,
  canRitual: prepared => prepared, ritualNeedsPrep: true,   // rituel : sort connu
  halfProf: g => g.level >= 2,                              // Touche-à-tout
  defaults: () => ({ bcol: "savoir", insU: 0, secrets: [] }),
  normalize(o) { if (!COL[o.bcol]) o.bcol = "savoir"; o.insU = Math.max(0, +o.insU || 0); o.secrets = Array.isArray(o.secrets) ? o.secrets.filter(id => BY_ID[id] && BY_ID[id].l >= 1) : []; },
  subclass: { lv: 3, label: "Collège bardique", field: "bcol", opts: () => Object.entries(COL).map(([k, c]) => [k, c.full, c.sum]) },
  subline: g => `Barde niveau ${g.level}${g.level >= 3 ? ` · ${esc(COL[g.bcol].full)}` : ""}`,
  subclassField: g => `<div class="field"><label for="f-bcol">Collège bardique</label><select id="f-bcol">${Object.entries(COL).map(([k, c]) => `<option value="${k}"${k === g.bcol ? " selected" : ""}>${c.n}</option>`).join("")}</select></div>`,
  heroStats: g => { const cMax = R.cantrips(g); return `<div class="stat ${g.cantrips.length > cMax ? "alert" : ""}" role="listitem"><div class="v">${g.cantrips.length}<small>/${cMax}</small></div>${statLabel("Sorts mineurs", "Mineurs")}</div>
    <div class="stat" role="listitem"><div class="v">${BAR.ins(g) - Math.min(BAR.ins(g), g.insU)}<small>/${BAR.ins(g)}</small></div>${statLabel(`Inspiration ${BAR.die(g.level)}`, `Inspi. ${BAR.die(g.level)}`)}</div>`; },
  tabs: g => [["grimoire", "Sorts"], ["biblio", "Bibliothèque", classSpells(g).length]],
  moreTabs: () => [["regles", "Règles"], ["imprimer", "Imprimer"]],
  panels: { imprimer: g => printHTML(g), regles: g => rulesHTML(g) },
  print: g => printSheet(g),
  printTitle: g => `Fiche de barde de ${g.name}`,
  printDesc: "Elle contient le tableau de bord (emplacements, Inspiration bardique à cocher), les capacités du barde et du collège, les sorts mineurs, les Secrets magiques et les sorts connus.",
  features: g => feats(g),
  settings: g => settingsHTML(g),
  resources: g => resHTML(g),
  resourceMax: { ins: g => BAR.ins(g) },
  // Secrets magiques : lançables comme des sorts connus, hors limite (section à part)
  alwaysPrepared: g => (g.secrets || []).filter(id => BY_ID[id] && BY_ID[id].l <= R.maxLevel(g)),
  alwaysPreparedInfo: () => ({ title: "Secrets magiques", aside: "sorts d'autres classes · en plus des sorts connus", origin: "Secrets magiques", tip: "Secret magique : en plus des sorts connus", aria: "Secret magique" }),
  restBar: g => g.level >= 2 ? `<span class="muted">Repos court : dés de vie${g.level >= 5 ? ", Inspiration bardique" : ""} ; Chant reposant, +1${BAR.song(g.level)} PV par allié qui dépense un dé. Repos long : tout.</span>` : null,
  attackNotes: g => [valor(g) && g.level >= 6 ? "<b>Attaque supplémentaire</b> : deux attaques par action Attaquer." : "", valor(g) && g.level >= 14 ? "<b>Magie de combat</b> : après un sort de barde (action), une attaque d'arme en action bonus." : ""].filter(Boolean),
  longRest: g => { g.insU = 0; },
  longOnly: g => [g.level < 5 && g.insU ? "Inspiration bardique (repos court dès le niveau 5)" : ""],
  shortRest: g => g.level >= 5 ? { field: "insU", label: "Inspiration bardique", done: "récupérée" } : null,
  creation,
  levelUp: {
    rowsAfter: (g, b) => row("Sorts mineurs connus", R.cantrips(g), R.cantrips(b), "--rubric") + row("Inspiration bardique", BAR.die(g.level), BAR.die(b.level), "--ok") + (BAR.secrets(b) ? row("Secrets magiques", BAR.secrets(g), BAR.secrets(b), "--ok") : ""),
    choices: (g, b, L) => luChoices(g, b, L),
    recapBefore: (g, b, L) => [(L.lsk || []).length ? `<div><span class="n">Compétences</span><small>+ ${L.lsk.map(skN).join(", ")}</small></div>` : "", (L.bexp || []).length ? `<div><span class="n">Expertise</span><small>${L.bexp.map(skN).join(", ")}</small></div>` : "",
      (L.sec || []).length ? `<div><span class="n">Secrets magiques</span><small>+ ${L.sec.map(id => esc(BY_ID[id].n)).join(", ")}</small></div>` : ""].join(""),
    apply: (g, L) => { (L.lsk || []).forEach(k => { g.skills[k] = Math.max(1, g.skills[k] || 0); }); (L.bexp || []).forEach(k => { g.skills[k] = 2; }); if ((L.sec || []).length) g.secrets = [...new Set([...(g.secrets || []), ...L.sec])]; },
  },
};
export { BAR, COL };
