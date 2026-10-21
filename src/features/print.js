// Fiche imprimable A4.
import { onClick } from "../core/actions.js";
import { byName, cap, esc, signed } from "../core/format.js";
import { G } from "../core/state.js";
import { toast } from "../core/ui.js";
import { BY_ID } from "../data.js";
import { offer } from "./save.js";
import { pillData } from "./spells.js";
import { R } from "../rules/common.js";
import { SLOTS } from "../rules/tables.js";

function printHTML(g) {
  return `<div class="rubric" style="margin-top:4px"><h2>Fiche imprimable</h2></div>
  <p style="max-width:65ch">Ouvre la fiche de ${esc(g.name)} pour l'imprimer en A4 (ou « Enregistrer en PDF »), ou télécharge-la pour plus tard. Elle contient le tableau de bord avec les cercles d'emplacements, le grimoire par niveau avec des cases « préparé » et des lignes vides à remplir au crayon, le journal de copie et le rappel des règles.</p>
  <div class="frow" style="margin-top:12px"><button class="btn primary" data-a="open-print">Ouvrir pour imprimer</button><button class="btn" data-a="dl-print">Télécharger la fiche</button></div>`;
}
function printable(g) {
  const prof = R.prof(g.level), mod = R.am(g), slots = R.slots(g), max = slots.length, pMax = R.prepMax(g);
  const next = Math.min(9, max + 1);
  const can = g.cantrips.map(id => BY_ID[id]).sort(byName);
  const sp = lv => g.spells.map(x => BY_ID[x.id]).filter(s => s.l === lv).sort(byName);
  const t = s => `${s.c ? '<span class="tag">C</span>' : ""}${s.ri ? '<span class="tag r">R</span>' : ""}`;
  const short = x => (x || "").replace(/^réussite : /, "").replace("moitié des dégâts", "moitié");
  const pn = s => g.snotes && g.snotes[s.id] ? `<div style="margin-top:2px;padding-left:6px;border-left:2px solid #8A6516;font-style:italic">✎ ${esc(g.snotes[s.id])}</div>` : "";
  const pl = s => `<div class="pls">${pillData(s, g).map(p => `<span class="pl ${p.k}">${esc(p.l === "Jet" ? cap(p.sub) : p.v)}${p.k === "s" && p.sub ? ` <i>(${esc(short(p.sub))})</i>` : p.k === "a" ? " <i>/ CA</i>" : ""}${p.conc ? " <i>(conc.)</i>" : ""}</span>`).join("")}</div>`;
  const dots = (n, fut) => Array.from({length: n}, () => `<span class="dot${fut ? " fut" : ""}"></span>`).join("");
  const futSlots = next > max ? (SLOTS[R.unlockAt(g, next)] || [])[next - 1] || 0 : 0;
  let rows = "";
  for (let lv = 1; lv <= next; lv++) {
    const locked = lv > max, list = sp(lv);
    rows += `<tr class="lvl"><td colspan="4">Niveau ${lv}<span>${locked ? `s'ouvre au niveau ${R.unlockAt(g, lv)}` : `${slots[lv - 1]} emplacement${slots[lv - 1] > 1 ? "s" : ""}`}</span></td></tr>`;
    list.forEach(s => { rows += `<tr><td class="c"><span class="box"></span></td><td class="n">${esc(s.n)} ${t(s)}</td><td class="m">${esc(s.t)} · ${esc(s.v.replace(/,/g, ", "))}</td><td>${pl(s)}${esc(s.e)}${pn(s)}${s.up ? ` <i style="color:#5a6176">${esc(s.up)}.</i>` : ""}</td></tr>`; });
    for (let i = 0; i < (locked ? 3 : 2); i++) rows += `<tr class="blank"><td class="c"><span class="box"></span></td><td></td><td></td><td></td></tr>`;
  }
  const extras = g.extras.map(x => `<tr><td class="n">${esc(x.name)}</td><td class="c"><span class="box"></span></td><td>${esc(x.note)}</td></tr>`).join("");
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Grimoire de ${esc(g.name)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya:wght@400;500;700&family=Alegreya+Sans:ital,wght@0,400;0,700;1,400&family=Alegreya+Sans+SC:wght@500&display=swap">
<style>
@page{size:A4;margin:12mm 12mm 14mm}*{box-sizing:border-box}body{font-family:"Alegreya Sans",Arial,sans-serif;color:#1b2136;font-size:10pt;margin:0;background:#fff}
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
.line{border-bottom:.8px solid #b8bdc8;height:7.5mm}.brk{page-break-before:always}.foot{text-align:center;font-size:7pt;color:#8a6516;letter-spacing:.1em;margin-top:5mm;font-family:"Alegreya Sans SC",Arial,sans-serif}
</style></head><body>
<h1><b>${esc(g.name.charAt(0))}</b>${esc(g.name.slice(1))}</h1>
<div class="sub">Magicien, niveau ${g.level} · École ${/^[AÉEIO]/.test(g.school) ? "d'" : "de "}${esc(g.school)} · Remplir au crayon, effacer au repos long</div>
<div class="stats"><div><b>${signed(mod)}</b><span>MOD. INTELLIGENCE</span></div><div><b>${8 + prof + mod}</b><span>DD DES SORTS</span></div><div><b>${signed(prof + mod)}</b><span>ATTAQUE DE SORT</span></div><div><b>${pMax}</b><span>SORTS PRÉPARÉS</span></div><div><b>${R.cantrips(g)}</b><span>SORTS MINEURS</span></div></div>
<h2>Emplacements de sorts <small>cocher un cercle à chaque sort lancé</small></h2>
${slots.map((n, i) => `<div class="slot"><span class="l">Niveau ${i + 1}</span>${dots(n)}<span class="r">${n} emplacement${n > 1 ? "s" : ""}</span></div>`).join("")}
${next > max ? `<div class="slot"><span class="l" style="color:#9aa0ae">Niveau ${next}</span>${dots(futSlots, true)}<span class="r">s'ouvre au niveau ${R.unlockAt(g, next)}</span></div>` : ""}
<div class="callout"><span class="box"></span> <b>Restauration arcanique</b> : une fois par jour, après un repos court, récupère des emplacements pour un total de <b>${R.arcane(g.level)}</b> niveau${R.arcane(g.level) > 1 ? "x" : ""} (aucun de niveau 6 ou plus).</div>
<h2>Sorts mineurs <small>à volonté · jamais préparés</small></h2>
<table><tr><th>Sort</th><th>Incantation · composantes</th><th>Effet</th></tr>
${can.map(s => `<tr><td class="n">${esc(s.n)} ${t(s)}</td><td class="m">${esc(s.t)} · ${esc(s.v.replace(/,/g, ", "))}</td><td>${pl(s)}${esc(s.e)}${pn(s)}${s.up ? ` <i style="color:#5a6176">${esc(s.up)}.</i>` : ""}</td></tr>`).join("")}
${Array.from({length: Math.max(0, R.cantrips(g) - can.length) || 1}, () => `<tr class="blank"><td></td><td></td><td></td></tr>`).join("")}</table>
${g.extras.length ? `<h2>Autres sorts <small>race, dons, objets</small></h2><table><tr><th>Sort</th><th>Utilisé</th><th>Usage et effet</th></tr>${extras}</table>` : ""}
<div class="callout"><b>Concentration : un seul sort à la fois.</b> Dégâts subis : JdS de Constitution, DD 10 ou la moitié des dégâts (le plus élevé).</div>
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
<h2>Notes</h2>${g.notes ? `<p style="white-space:pre-wrap;font-size:9.5pt">${esc(g.notes)}</p>` : ""}${Array.from({length: 5}, () => '<div class="line"></div>').join("")}
<div class="foot">GRIMOIRE · D&amp;D 5E · MANUEL DES JOUEURS 2014</div>
</body></html>`;
}
onClick("dl-print", () => { const g = G(); offer(`Grimoire - ${g.name}.html`, printable(g)); });
onClick("open-print", (b, a) => {
  const html = printable(G()).replace("</body>", '<script>window.addEventListener("load", () => setTimeout(() => window.print(), 400));<\/script></body>');
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const w = window.open(url, "_blank");
  if (!w) toast("Le navigateur a bloqué l'ouverture : autorise les fenêtres pour ce fichier.");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
});

export { printHTML, printable };
