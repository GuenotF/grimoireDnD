// Fiche imprimable A4.
import { C } from "../classes/index.js";
import { onClick } from "../core/actions.js";
import { byName, cap, esc, fmt, signed } from "../core/format.js";
import { G } from "../core/state.js";
import { toast } from "../core/ui.js";
import { BY_ID } from "../data.js";
import { speedOf, hitDieSize, initiative, passivePerception, saveBonus, saveProf, skillBonus, skillLevel } from "../rules/character.js";
import { R, classSpells } from "../rules/common.js";
import { acOf, attacks } from "../rules/equipment.js";
import { COINS } from "../rules/money.js";
import { ABILITIES, SKILLS } from "../rules/tables.js";
import { offer } from "./save.js";
import { pillData } from "./spells.js";

function printHTML(g) {
  return `<div class="rubric" style="margin-top:4px"><h2>Fiche imprimable</h2></div>
  <p style="max-width:65ch">Ouvre la fiche de ${esc(g.name)} pour l'imprimer en A4 (ou « Enregistrer en PDF »), ou télécharge-la pour plus tard. ${C(g).printDesc}</p>
  <div class="frow" style="margin-top:12px"><button class="btn primary" data-a="open-print">Ouvrir pour imprimer</button><button class="btn" data-a="dl-print">Télécharger la fiche</button></div>`;
}
// Briques communes des fiches (même apparence pour toutes les classes) ; chaque classe compose sa fiche avec C(g).print(g).
const PRINT_CSS = `@page{size:A4;margin:12mm 12mm 14mm}*{box-sizing:border-box}body{font-family:"Alegreya Sans",Arial,sans-serif;color:#1b2136;font-size:10pt;margin:0;background:#fff}
h1,h2,h3{font-family:Alegreya,Georgia,serif;font-weight:500;margin:0}h1{font-size:28pt;line-height:1}h1 b{color:#a2261c}
.sub{font-family:Alegreya,Georgia,serif;font-style:italic;color:#5a6176;font-size:11pt;margin-top:2mm}
h2{font-size:14pt;color:#a2261c;border-bottom:1.3px solid #a2261c;padding-bottom:1mm;margin:6mm 0 2.5mm;display:flex;justify-content:space-between;align-items:baseline;gap:4mm}
h2 small{font-family:"Alegreya Sans",Arial,sans-serif;font-size:8.5pt;color:#5a6176;font-style:italic;font-weight:400}
.stats{display:grid;grid-template-columns:repeat(5,1fr);border:1px solid #9aa0ae;margin-top:5mm}.stats div{text-align:center;padding:2mm 1mm;border-left:1px solid #9aa0ae}.stats div:first-child{border-left:0}
.stats b{display:block;font-family:Alegreya,Georgia,serif;font-size:18pt;font-weight:500}.stats span{font-family:"Alegreya Sans SC",Arial,sans-serif;font-size:7.5pt;letter-spacing:.06em;color:#5a6176}
.slot{display:flex;align-items:center;gap:4mm;padding:1.6mm 0;border-bottom:.6px dotted #b8bdc8}.slot .l{width:24mm;font-family:Alegreya,Georgia,serif;font-weight:700}.slot .r{margin-left:auto;font-size:8.5pt;color:#5a6176;font-style:italic}
.dot{display:inline-block;width:6mm;height:6mm;border:1.4px solid #a2261c;border-radius:50%;margin-right:2mm}.dot.fut{border:1.2px dashed #9aa0ae}
.box{display:inline-block;width:4.2mm;height:4.2mm;border:1.2px solid #a2261c;vertical-align:middle}
.callout{border-left:3px solid #8a6516;background:#f4f1ea;padding:2mm 3mm;margin:2.5mm 0;font-size:9.5pt}
table{width:100%;border-collapse:collapse}th{font-family:"Alegreya Sans SC",Arial,sans-serif;font-weight:500;font-size:7.5pt;letter-spacing:.06em;color:#5a6176;text-align:left;border-bottom:1.2px solid #8a6516;padding:1mm 1.5mm}
td{border-bottom:.6px solid #d5d9e0;padding:1.4mm 1.5mm;vertical-align:top;font-size:9pt;line-height:1.3}td.n{font-family:Alegreya,Georgia,serif;font-weight:700;font-size:9.5pt;width:38mm}td.m{font-size:8pt;color:#5a6176;width:34mm}td.c{text-align:center;width:8mm}
tr{page-break-inside:avoid}tr.blank td{height:8.5mm}.pls{display:flex;flex-wrap:wrap;gap:1.2mm;margin-bottom:1mm}.pl{border:1.2px solid #9aa0ae;border-radius:1mm;padding:0 1.6mm;font-weight:700;font-size:8.5pt}.pl.d{border-color:#c2410c;color:#8f2f08}.pl.a{border-color:#a2261c;color:#7a1c14}.pl.s{border-color:#2d4a9a;color:#233c80}.pl.f{border-color:#6b3fa0;color:#4f2c7a}.pl i{font-weight:400;font-style:normal}tr.lvl td{background:#f1e4e2;font-family:Alegreya,Georgia,serif;font-weight:700;font-size:10.5pt;color:#a2261c;border-bottom:1.2px solid #a2261c;padding:1.2mm 1.5mm}
tr.lvl td span{float:right;font-family:"Alegreya Sans",Arial,sans-serif;font-weight:400;font-style:italic;font-size:8pt;color:#5a6176}
.tag{display:inline-block;font-family:"Alegreya Sans SC",Arial,sans-serif;font-size:6.5pt;border:1px solid #a2261c;color:#a2261c;padding:0 1mm;margin-left:1mm;vertical-align:1px;font-weight:500}.tag.r{border-color:#2f6b45;color:#2f6b45}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:0 6mm}.cols p{margin:0 0 2mm;font-size:9pt}.cols b{color:#a2261c;font-weight:700}h3{font-size:11pt;color:#a2261c;margin:3mm 0 1.2mm}
.line{border-bottom:.8px solid #b8bdc8;height:7.5mm}
.stats.s6{grid-template-columns:repeat(6,1fr)}.stats.s6 div.mine span{color:#a2261c}.stats small{display:block;font-size:8pt;color:#5a6176}.stats.s6+.stats{margin-top:2mm}
.skills{display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(6,auto);grid-auto-flow:column;gap:.6mm 6mm}.sk{display:flex;gap:1.5mm;align-items:baseline;font-size:9pt;border-bottom:.5px dotted #d5d9e0;padding:.6mm 0}.sk .mk{color:#a2261c;width:3mm}.sk .n{flex:1}.sk i{font-style:normal;font-size:7pt;color:#5a6176}.sk.on{font-weight:700}
p.trait{margin:0 0 1.6mm;font-size:9pt;line-height:1.35}p.trait b{font-family:Alegreya,Georgia,serif}
.res{display:flex;align-items:center;gap:3mm;padding:1.6mm 0;border-bottom:.6px dotted #b8bdc8;flex-wrap:wrap}.res .l{width:40mm;font-family:Alegreya,Georgia,serif;font-weight:700}.res .r{margin-left:auto;font-size:8.5pt;color:#5a6176;font-style:italic}
.write{display:inline-block;border-bottom:.8px solid #9aa0ae;min-width:22mm;height:5mm;vertical-align:bottom}
.beasts{display:grid;grid-template-columns:1fr 1fr;gap:3mm}.beast{border:1px solid #9aa0ae;border-radius:1.5mm;padding:2mm 3mm;page-break-inside:avoid;font-size:8.5pt;line-height:1.3}.beast h3{margin:0 0 1mm;display:flex;justify-content:space-between;align-items:baseline}.beast h3 small{font-family:"Alegreya Sans",Arial,sans-serif;font-size:8pt;color:#5a6176;font-weight:400}
.beast .bs{display:flex;flex-wrap:wrap;gap:1.2mm;margin:1mm 0}.beast p{margin:.8mm 0}.beast b{color:#1b2136}.brk{page-break-before:always}.foot{text-align:center;font-size:7pt;color:#8a6516;letter-spacing:.1em;margin-top:5mm;font-family:"Alegreya Sans SC",Arial,sans-serif}`;
/** Marques C (concentration) et R (rituel). */
const pTags = s => `${s.c ? '<span class="tag">C</span>' : ""}${s.ri ? '<span class="tag r">R</span>' : ""}`;
const pShort = x => (x || "").replace(/^réussite : /, "").replace("moitié des dégâts", "moitié");
/** Note personnelle du sort, en italique sous l'effet. */
const pNote = (g, s) => g.snotes && g.snotes[s.id] ? `<div style="margin-top:2px;padding-left:6px;border-left:2px solid #8A6516;font-style:italic">✎ ${esc(g.snotes[s.id])}</div>` : "";
/** Pastilles du sort, version papier. */
const pPills = (g, s) => `<div class="pls">${pillData(s, g).map(p => `<span class="pl ${p.k}">${esc(p.l === "Jet" ? cap(p.sub) : p.v)}${p.k === "s" && p.sub ? ` <i>(${esc(pShort(p.sub))})</i>` : p.k === "a" ? " <i>/ CA</i>" : ""}${p.conc ? " <i>(conc.)</i>" : ""}</span>`).join("")}</div>`;
/** Cercles à cocher (fut : emplacement à venir, en pointillés). */
const pDots = (n, fut) => Array.from({length: n}, () => `<span class="dot${fut ? " fut" : ""}"></span>`).join("");
/** Cellule « Effet » d'un sort : pastilles, description, note, emplacement plus élevé. */
const pEffect = (g, s) => `${pPills(g, s)}${esc(s.e)}${pNote(g, s)}${s.up ? ` <i style="color:#5a6176">${esc(s.up)}.</i>` : ""}`;
/** Ligne de sort : [case à cocher], nom, incantation et composantes, effet. */
const pSpellRow = (g, s, box) => `<tr>${box ? `<td class="c"><span class="box"></span></td>` : ""}<td class="n">${esc(s.n)} ${pTags(s)}</td><td class="m">${esc(s.t)} · ${esc(s.v.replace(/,/g, ", "))}</td><td>${pEffect(g, s)}</td></tr>`;
/** En-tête : nom, sous-titre, bandeau de statistiques [[valeur, libellé], …]. */
const pHeader = (g, sub, stats) => `<h1><b>${esc(g.name.charAt(0))}</b>${esc(g.name.slice(1))}</h1>
<div class="sub">${sub} · Remplir au crayon, effacer au repos long</div>
<div class="stats">${stats.map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join("")}</div>`;
/** Emplacements de sorts, avec le prochain niveau en pointillés. */
function pSlots(g) {
  const slots = R.slots(g), max = slots.length, next = Math.min(C(g).top, max + 1);
  const futSlots = next > max ? (C(g).slots[R.unlockAt(g, next)] || [])[next - 1] || 0 : 0;
  return `<h2>Emplacements de sorts <small>cocher un cercle à chaque sort lancé</small></h2>
${slots.map((n, i) => `<div class="slot"><span class="l">Niveau ${i + 1}</span>${pDots(n)}<span class="r">${n} emplacement${n > 1 ? "s" : ""}</span></div>`).join("")}
${next > max ? `<div class="slot"><span class="l" style="color:#9aa0ae">Niveau ${next}</span>${pDots(futSlots, true)}<span class="r">s'ouvre au niveau ${R.unlockAt(g, next)}</span></div>` : ""}`;
}
/** Sorts mineurs connus, avec des lignes vides pour ceux qui restent à choisir. */
function pCantrips(g) {
  const can = g.cantrips.map(id => BY_ID[id]).sort(byName);
  return `<h2>Sorts mineurs <small>à volonté · jamais préparés</small></h2>
<table><tr><th>Sort</th><th>Incantation · composantes</th><th>Effet</th></tr>
${can.map(s => pSpellRow(g, s, false)).join("")}
${Array.from({length: Math.max(0, R.cantrips(g) - can.length) || 1}, () => `<tr class="blank"><td></td><td></td><td></td></tr>`).join("")}</table>`;
}
/** Autres sorts (race, dons, objets). */
const pExtras = g => g.extras.length ? `<h2>Autres sorts <small>race, dons, objets</small></h2><table><tr><th>Sort</th><th>Utilisé</th><th>Usage et effet</th></tr>${g.extras.map(x => `<tr><td class="n">${esc(x.name)}</td><td class="c"><span class="box"></span></td><td>${esc(x.note)}</td></tr>`).join("")}</table>` : "";
const pConc = (extra = "") => `<div class="callout"><b>Concentration : un seul sort à la fois.</b> Dégâts subis : JdS de Constitution, DD 10 ou la moitié des dégâts (le plus élevé).${extra}</div>`;
const pNotes = g => `<h2>Notes</h2>${g.notes ? `<p style="white-space:pre-wrap;font-size:9.5pt">${esc(g.notes)}</p>` : ""}${Array.from({length: 5}, () => '<div class="line"></div>').join("")}`;
/** Liste de la classe à préparer : une section par niveau accessible (cases), le niveau suivant annoncé. exclude : sorts toujours préparés. */
function pClassList(g, exclude = []) {
  const slots = R.slots(g), max = slots.length, next = Math.min(C(g).top, max + 1);
  let rows = "";
  for (let lv = 1; lv <= next; lv++) {
    if (lv > max) { rows += `<tr class="lvl"><td colspan="4">Niveau ${lv}<span>s'ouvre au niveau ${R.unlockAt(g, lv)}</span></td></tr>`; break; }
    rows += `<tr class="lvl"><td colspan="4">Niveau ${lv}<span>${slots[lv - 1]} emplacement${slots[lv - 1] > 1 ? "s" : ""}</span></td></tr>`;
    classSpells(g).filter(s => s.l === lv && !exclude.includes(s.id)).sort(byName).forEach(s => { rows += pSpellRow(g, s, true); });
  }
  return `<table><tr><th>Prép.</th><th>Sort</th><th>Incantation · composantes</th><th>Effet</th></tr>${rows}</table>`;
}
/** Page « Personnage » (commune) : caractéristiques, combat, PV à remplir, compétences, défenses, dons et traits, historique, notes. */
function pCharacter(g) {
  const sk = SKILLS.map(([k, n, a]) => { const l = skillLevel(g, k); return `<div class="sk${l ? " on" : ""}"><span class="mk">${l === 2 ? "◉" : l ? "●" : "○"}</span><span class="n">${n} <i>${ABILITIES.find(x => x[0] === a)[1]}</i></span><b>${signed(skillBonus(g, k))}</b></div>`; }).join("");
  const DEFN = { res: "Résistance", imm: "Immunité", vul: "Vulnérabilité", adv: "Avantage" };
  return `<h1><b>${esc(g.name.charAt(0))}</b>${esc(g.name.slice(1))}</h1>
<div class="sub">${C(g).n} niveau ${g.level}${g.bg.n ? ` · ${esc(g.bg.n)}` : ""} · Remplir au crayon</div>
<div class="stats s6">${ABILITIES.map(([k, a]) => `<div${k === C(g).ab ? ' class="mine"' : ""}><span>${a}</span><b>${signed(R.ab(g, k))}</b><small>${g.abil[k]} · JdS ${saveProf(g, k) ? "<u>" : ""}${signed(saveBonus(g, k))}${saveProf(g, k) ? "</u>" : ""}</small></div>`).join("")}</div>
<div class="stats">${[[acOf(g) ?? "____", "CA"], [signed(initiative(g)), "INITIATIVE"], [`${fmt(speedOf(g))} m`, "VITESSE"], [signed(R.prof(g.level)), "MAÎTRISE"], [passivePerception(g), "PERCEPTION PASSIVE"]].map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join("")}</div>
<h2>Attaques <small>armes équipées</small></h2>
<table><tr><th>Arme</th><th>Toucher</th><th>Dégâts</th><th>Propriétés</th></tr>${attacks(g).map(a => `<tr><td class="n">${esc(a.n)}${a.q > 1 ? ` ×${a.q}` : ""}</td><td>${signed(a.hit)}</td><td>${esc(a.dmg)}</td><td>${esc([...a.pills, ...a.notes].join(" · "))}</td></tr>`).join("")}<tr class="blank"><td></td><td></td><td></td><td></td></tr></table>
<h2>Points de vie <small>JdS soulignés : maîtrisés</small></h2>
<div class="res"><span class="l">PV maximum ${g.hpMax ?? "____"}</span><span>PV actuels <span class="write" style="min-width:30mm"></span></span><span>PV temporaires <span class="write"></span></span></div>
<div class="res"><span class="l">Dés de vie (d${hitDieSize(g)})</span>${Array.from({ length: g.level }, () => '<span class="box"></span>').join(" ")}<span class="r">cocher un dé dépensé · repos court : dé + CON · repos long : la moitié revient</span></div>
<div class="res"><span class="l">Jets contre la mort</span><span>Réussites ${pDots(3)}</span><span>Échecs ${pDots(3)}</span><span class="r">10 ou plus : réussite · 1 : deux échecs · 20 : 1 PV</span></div>
<h2>Compétences <small>● maîtrise · ◉ expertise</small></h2>
<div class="skills">${sk}</div>
${g.defs.length ? `<h2>Défenses</h2><p style="margin:0">${g.defs.map(d => `<b>${DEFN[d.t]}</b> ${esc(d.v)}`).join(" · ")}</p>` : ""}
${g.traits.length ? `<h2>Dons et traits</h2>${g.traits.map(t => `<p class="trait"><b>${esc(t.n)}</b>${t.d ? ` · ${esc(t.d)}` : ""}</p>`).join("")}` : ""}
${g.bg.n || g.bg.d ? `<h2>Historique${g.bg.n ? ` <small>${esc(g.bg.n)}</small>` : ""}</h2>${g.bg.d ? `<p class="trait">${esc(g.bg.d)}</p>` : ""}` : ""}
<h2>Équipement <small>bourse au crayon</small></h2>
<div class="res">${COINS.map(([k]) => `<span>${k} <span class="write" style="min-width:12mm">${g.money[k] || ""}</span></span>`).join("")}</div>
${g.items.length ? `<p class="trait">${g.items.map(x => `${x.eq ? "<b>" : ""}${esc(x.n)}${x.eq ? "</b>" : ""}${x.q !== 1 ? ` ×${x.q}` : ""}${x.note ? ` <i>(${esc(x.note)})</i>` : ""}`).join(" · ")}</p>` : ""}<div class="line"></div>
<h2>Notes du personnage</h2>${g.pnotes ? `<p style="white-space:pre-wrap;font-size:9.5pt;margin:0 0 2mm">${esc(g.pnotes)}</p>` : ""}${Array.from({ length: 3 }, () => '<div class="line"></div>').join("")}
<div class="brk"></div>`;
}
const pFoot = label => `<div class="foot">${label} · D&amp;D 5E · MANUEL DES JOUEURS 2014</div>`;

/** Fiche complète : page HTML autonome, prête à imprimer en A4. */
function printable(g) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(C(g).printTitle(g))}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya:wght@400;500;700&family=Alegreya+Sans:ital,wght@0,400;0,700;1,400&family=Alegreya+Sans+SC:wght@500&display=swap">
<style>
${PRINT_CSS}
</style></head><body>
${pCharacter(g)}
${C(g).print(g)}</body></html>`;
}
onClick("dl-print", () => { const g = G(); offer(`${C(g).fileLabel || C(g).n} - ${g.name}.html`, printable(g)); });
onClick("open-print", (b, a) => {
  const html = printable(G()).replace("</body>", '<script>window.addEventListener("load", () => setTimeout(() => window.print(), 400));<\/script></body>');
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const w = window.open(url, "_blank");
  if (!w) toast("Le navigateur a bloqué l'ouverture : autorise les fenêtres pour ce fichier.");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
});

export { printHTML, printable, pClassList, PRINT_CSS, pTags, pNote, pPills, pDots, pEffect, pSpellRow, pHeader, pSlots, pCantrips, pExtras, pConc, pNotes, pFoot };
