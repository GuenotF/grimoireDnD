// Druide : cercles, Forme sauvage (utilisations, FP), capacités.
import { onChange, onKey } from "../core/actions.js";
import { cap, esc, plural, signed } from "../core/format.js";
import { S } from "../core/state.js";
import { mutate } from "../core/store.js";
import { render } from "../core/ui.js";
import { BEAST, BEASTS } from "../data.js";
import { pCantrips, pClassList, pConc, pDots, pExtras, pFoot, pHeader, pNotes, pSlots, printHTML } from "../features/print.js";
import { castingRules, concentrationRules } from "../features/rules.js";
import { R, classSpells } from "../rules/common.js";
import { SLOTS } from "../rules/tables.js";
import { capRow, pillsRaw } from "../ui/components.js";
import { MV, SIZES, actRest, bestiaryHTML, fpLabel, modOf, newForms, spdTxt, wsActiveHTML, wsAllowed, wsConcHTML, wsSheetHTML } from "./druide-wildshape.js";

const DRU_FEATS = [
  { id: "druidic", lv: 1, n: "Druidique", pill: () => "langue secrète", k: "f", d: () => "Tu connais le druidique, la langue secrète des druides, et peux y laisser des messages cachés." },
  { id: "ritual", lv: 1, n: "Incantation rituelle", pill: () => "sorts préparés", k: "f", d: () => "Tu peux lancer en rituel (+10 minutes, sans emplacement) un sort rituel que tu as préparé." },
  { id: "combat", lv: 2, circle: "lune", n: "Changeforme de combat", pill: () => "action bonus · soin 1d8/niv.", k: "f", d: () => "Forme sauvage en action bonus. En forme de bête, action bonus : dépense un emplacement pour regagner 1d8 PV par niveau d'emplacement." },
  { id: "forms", lv: 2, circle: "lune", n: "Formes du cercle", pill: g => `FP ${DRU.fp(g)} maximum`, k: "f", d: g => `Bêtes de FP ${DRU.fp(g)} maximum (FP 1 jusqu'au niveau 5, puis niveau ÷ 3). Pas de nage avant le niveau 4, pas de vol avant le niveau 8.` },
  { id: "primal", lv: 6, circle: "lune", n: "Frappe primitive", pill: () => "attaques magiques", k: "f", d: () => "En forme de bête, tes attaques comptent comme magiques pour surmonter les résistances et immunités." },
  { id: "elem", lv: 10, circle: "lune", n: "Forme sauvage élémentaire", pill: () => "2 utilisations · élémentaire", k: "f", d: () => "Dépense deux utilisations de Forme sauvage pour devenir un élémentaire de l'air, de la terre, du feu ou de l'eau." },
  { id: "thousand", lv: 14, circle: "lune", n: "Mille formes", pill: () => "Modification d'apparence à volonté", k: "f", d: () => "Tu peux lancer Modification d'apparence à volonté." },
  { id: "timeless", lv: 18, n: "Jeunesse éternelle, Sorts bestiaux", pill: () => "sorts en forme de bête", k: "f", d: () => "Tu vieillis dix fois moins vite. En forme de bête, tu peux lancer des sorts (composantes verbales et somatiques), sans composante matérielle." },
  { id: "arch", lv: 20, n: "Archidruide", pill: () => "Forme sauvage illimitée", k: "f", d: () => "Forme sauvage illimitée ; tu ignores les composantes verbales, somatiques et matérielles sans coût de tes sorts de druide." },
];
// Détail de Forme sauvage (capacité dépliable)
function wsBody(g) {
    const fp = DRU.fp(g), lim = g.level < 4 ? "ni nage ni vol" : g.level < 8 ? "nage autorisée, pas de vol" : "nage et vol autorisés";
    return `${pillsRaw([["n", "Incantation", "1 action bonus"], ["n", "Durée", `${DRU.hours(g)} h maximum`], ["f", "Bêtes", `FP ${fp} maximum`, lim]])}
    <div class="eff">Tu prends la forme d'une bête déjà vue : ses statistiques physiques et ses PV remplacent les tiens (tu gardes INT, SAG, CHA, tes compétences et ta concentration). À 0 PV, tu reprends ta forme et l'excédent de dégâts passe sur tes PV. Pas de sort dans cette forme.</div>
    <div class="cast"><button class="btn cast-go sm wsbtn" data-a="ws-open">${g.wsForm ? "Changer de forme" : "Choisir une forme"}</button></div>`;
}
function druResHTML(g) {
  const n = DRU.ws(g); if (!n) return "";
  const u = Math.min(n, g.wsU);
  const pips = n > 10 ? `<span class="muted">illimitée</span>` : Array.from({ length: n }, (_, k) => `<button class="pip${k < u ? " used" : ""}" data-a="res-pip" data-r="ws" data-k="${k}" aria-label="Forme sauvage ${k + 1}, ${k < u ? "utilisée" : "disponible"}"></button>`).join("");
  return `<div class="rubric"><h2>Ressources du druide</h2></div><div class="slots res">${capRow(g, "ws", "Forme sauvage", "repos court", pips, false, wsBody)}</div>`;
}
onChange("#f-circle", t => { mutate(g => { g.circle = t.value; }); });
// Cercles du druide (Cercle de la Lune pour l'instant)
const CIRCLES = { lune: { n: "Lune", full: "Cercle de la Lune" } };
const DRU = {
  ws: g => g.level >= 20 ? 99 : g.level >= 2 ? 2 : 0,          // Forme sauvage : 2 utilisations, repos court (illimitée au niveau 20)
  fp: g => g.level >= 6 ? Math.floor(g.level / 3) : 1,          // Cercle de la Lune : FP 1, puis niveau ÷ 3 dès le niveau 6
  hours: g => Math.floor(g.level / 2),
};

export { DRU_FEATS, druResHTML, CIRCLES, DRU };

// ---------- Onglet Règles ----------
function rulesHTML(g) {
  const n = DRU.ws(g), fp = DRU.fp(g), fpTxt = fp === 0.125 ? "1/8" : fp === 0.25 ? "1/4" : fp === 0.5 ? "1/2" : String(fp);
  return `<div class="cols rules">
  <div><div class="rubric" style="margin-top:4px"><h3>Préparer</h3></div>
  <p>Après un repos long, choisis <b>${R.prepMax(g)} sorts</b> dans toute la liste du druide (modificateur de Sagesse + niveau), parmi les niveaux que tu peux lancer. Tes <b>${R.cantrips(g)} sorts mineurs</b> sont connus et se lancent à volonté.</p>
  <div class="rubric"><h3>Rituels</h3></div>
  <p>Un sort <b>préparé</b> marqué <span class="tag r">R</span> se lance en 10 minutes de plus, sans dépenser d'emplacement.</p>
  ${castingRules(g)}
  ${concentrationRules(" En forme de bête, le jet se fait avec la Constitution de la bête.")}</div>
  <div><div class="rubric" style="margin-top:4px"><h3>Forme sauvage</h3></div>
  ${n ? `<p><b>${n > 10 ? "Sans limite" : n + " fois"}</b> par repos court ou long, en <b>action bonus</b> (Cercle de la Lune), pour <b>${DRU.hours(g)} h</b> au plus (moitié du niveau). Bêtes déjà vues de <b>FP ${fpTxt}</b> au plus ; nage dès le niveau 4, vol dès le niveau 8 ; FP = niveau ÷ 3 dès le niveau 6.</p>` : `<p>Au niveau 2.</p>`}
  <div class="rubric"><h3>Dans la forme</h3></div>
  <p>La bête remplace tes statistiques physiques (FOR, DEX, CON) et tes PV. Tu gardes INT, SAG, CHA, tes maîtrises et ta personnalité ; pour une compétence ou une sauvegarde que vous maîtrisez tous les deux, prends le meilleur bonus.</p>
  <p><b>À 0 PV</b>, tu reprends ta forme : l'excédent de dégâts passe sur tes PV. Tu reprends aussi ta forme en action bonus, ou en perdant connaissance.</p>
  <p><b>Sorts :</b> ${g.level >= 18 ? "Sorts bestiaux : tu peux lancer tes sorts à composantes verbales et somatiques." : "aucun sort dans la forme"}, mais la concentration continue. L'équipement tombe, s'intègre à la forme ou reste porté si la bête le peut (au choix).</p>
  <div class="rubric"><h3>Changeforme de combat</h3></div>
  <p>En forme de bête, action bonus : dépense un emplacement pour regagner <span class="kp f">1d8 PV par niveau</span> d'emplacement.</p>
  <div class="rubric"><h3>Récupérer</h3></div>
  <p><b>Repos long :</b> emplacements et Forme sauvage. <b>Repos court :</b> Forme sauvage.</p>
  <p class="muted">Sources : Manuel des joueurs 2014 (druide, Cercle de la Lune), Guide complet de Xanathar (Embrasement), Manuel des monstres (bêtes). Résumés rédigés pour la table, à vérifier dans le livre en cas de doute.</p></div></div>`;
}

// ---------- Fiche imprimable ----------
// Fiche d'une bête favorite : statistiques, compétences, traits et attaques
function beastPrint(b) {
  const acts = b.ac.map(a => a.b != null && a.d ? `<p><b>${esc(a.n)}</b>${a.r ? " <i>(1 fois par repos)</i>" : ""} <span class="pl a">${signed(a.b)}</span> <span class="pl d">${esc(a.d)}</span> ${esc(actRest(a))}</p>` : `<p><b>${esc(a.n)}</b>${a.r ? " <i>(1 fois par repos)</i>" : ""} ${esc(a.t)}</p>`).join("");
  return `<div class="beast"><h3>${esc(b.n)}<small>FP ${esc(b.fp)} · ${esc(SIZES[b.sz] || b.sz)}</small></h3>
  <div class="bs"><span class="pl">CA ${b.ca}</span><span class="pl">PV ${b.pv} (${esc(b.pvd)})</span><span class="pl">${esc(spdTxt(b))}</span></div>
  <div class="bs"><span class="pl">FOR ${b.st[0]} (${modOf(b.st[0])})</span><span class="pl">DEX ${b.st[1]} (${modOf(b.st[1])})</span><span class="pl">CON ${b.st[2]} (${modOf(b.st[2])})</span>${b.cp ? `<span class="pl">${esc(b.cp)}</span>` : ""}</div>
  ${b.sens ? `<p><i>${esc(b.sens)}</i></p>` : ""}${b.tr.map(([n, d]) => `<p><b>${esc(n)}.</b> ${esc(d)}</p>`).join("")}${acts}
  <p>PV : <span class="write"></span> / ${b.pv}</p></div>`;
}
function printSheet(g) {
  const prof = R.prof(g.level), mod = R.am(g), dd = 8 + prof + mod, pMax = R.prepMax(g), n = DRU.ws(g), fp = fpLabel(DRU.fp(g));
  const favs = g.favs.map(id => BEAST[id]).filter(Boolean);
  const empty = `<div class="beast"><h3><span class="write" style="min-width:45mm"></span><small>FP ____</small></h3><p>CA ____ · PV ____ · vitesses ________________</p><p>FOR ____ · DEX ____ · CON ____</p><p>Attaques :</p><div class="line"></div><div class="line"></div><p>PV : <span class="write"></span> / ____</p></div>`;
  return `${pHeader(g, `Druide, niveau ${g.level} · ${g.level >= 2 ? esc(CIRCLES[g.circle].full) : `cercle au niveau 2 (${esc(CIRCLES[g.circle].n)})`}`, [[signed(mod), "MOD. SAGESSE"], [dd, "DD DES SORTS"], [signed(prof + mod), "ATTAQUE DE SORT"], [pMax, "SORTS PRÉPARÉS"], [R.cantrips(g), "SORTS MINEURS"]])}
${pSlots(g)}
<h2>Forme sauvage <small>${n ? `${n > 10 ? "sans limite" : n + " fois"} · repos court ou long` : "au niveau 2"}</small></h2>
${n ? `<div class="res"><span class="l">Utilisations</span>${n > 10 ? "illimitées" : pDots(n)}<span class="r">action bonus · ${DRU.hours(g)} h au plus · FP ${fp} · ${g.level < 4 ? "ni nage ni vol" : g.level < 8 ? "nage, pas de vol" : "nage et vol"}</span></div>
<div class="res"><span class="l">Forme active</span><span class="write" style="min-width:55mm"></span><span>PV <span class="write"></span> / <span class="write" style="min-width:12mm"></span></span></div>
<div class="callout">La bête remplace FOR, DEX, CON et les PV ; tu gardes INT, SAG, CHA et tes maîtrises (le meilleur bonus). <b>À 0 PV</b>, retour à ta forme : l'excédent de dégâts passe sur tes PV. ${g.level >= 18 ? "Sorts à composantes verbales et somatiques possibles" : "Pas de sort"}, la concentration continue.${g.level >= 6 ? " Attaques magiques (Frappe primitive)." : ""}<br><b>Changeforme de combat</b> : action bonus, un emplacement = <b>1d8 PV par niveau</b> d'emplacement.</div>` : ""}
${pCantrips(g)}
${pExtras(g)}
${pConc(" En forme de bête : avec la Constitution de la bête.")}
<div class="brk"></div>
<h2 style="margin-top:0">Mes formes <small>${favs.length ? "formes ★ de l'application" : "à compléter (ajoute des formes ★ dans l'application)"}</small></h2>
<div class="beasts">${favs.map(beastPrint).join("")}${favs.length % 2 ? empty : ""}${favs.length ? "" : empty + empty}</div>
<div class="brk"></div>
<h2 style="margin-top:0">Sorts de druide <small>sorts préparés aujourd'hui : ____ / ${pMax}</small></h2>
${pClassList(g)}
<div class="callout"><span class="tag">C</span> concentration · <span class="tag r">R</span> rituel : un sort préparé se lance en 10 minutes de plus, sans emplacement.</div>
<h2>Règles du druide</h2><div class="cols"><div>
<h3>Préparer</h3><p>Après un repos long, ${pMax} sorts de la liste du druide (mod. de Sagesse + niveau). Un sort se lance avec un emplacement de son niveau ou supérieur.</p>
<h3>Lancer un sort</h3><p><b>Jet de sauvegarde :</b> la cible fait d20 + modificateur contre ton DD de ${dd}. <b>Attaque de sort :</b> d20 ${signed(prof + mod)} contre la CA.</p></div><div>
<h3>Forme sauvage</h3><p>Bêtes déjà vues, FP ${fp} au plus ; nage au niveau 4, vol au niveau 8, FP = niveau ÷ 3 dès le niveau 6.</p>
<h3>Récupérer</h3><p><b>Repos long :</b> emplacements et Forme sauvage. <b>Repos court :</b> Forme sauvage.</p></div></div>
${pNotes(g)}
${pFoot("DRUIDE")}
`;
}

// ---------- Définition de la classe (contrat : voir docs/ARCHITECTURE.md) ----------
const row = (l, o, n, cls) => `<div class="${o === n ? "same" : ""}"><span>${l}</span><span class="old">${o}</span><span class="ar">→</span><b${cls && o !== n ? ` style="color:var(${cls})"` : ""}>${n}</b></div>`;
export default {
  n: "Druide", ab: "wis", abN: "Sagesse", abArticle: "la Sagesse", slots: SLOTS, top: 9, hitDie: "1d8",
  saves: ["int", "wis"],             // jets de sauvegarde maîtrisés par la classe
  cantrips: lv => lv >= 10 ? 4 : lv >= 4 ? 3 : 2,
  prep: (g, m) => Math.max(1, m + g.level),
  ritualNeedsPrep: true,       // un rituel se lance s'il est préparé
  canRitual: prepared => prepared,
  defaults: () => ({ circle: "lune", favs: [], wsForm: null, wsU: 0 }),
  normalize(o) {
    if (!CIRCLES[o.circle]) o.circle = "lune";
    if (!Array.isArray(o.favs)) o.favs = []; o.favs = o.favs.filter(id => BEAST[id]);   // formes favorites
    if (!o.wsForm || !BEAST[o.wsForm.id]) o.wsForm = null;                                // forme active {id, hp, max}
    o.wsU = Math.max(0, +o.wsU || 0);                                                     // utilisations de Forme sauvage
  },
  subline: g => `Druide niveau ${g.level}${g.level >= 2 ? ` · ${esc(CIRCLES[g.circle].full)}` : ""}`,
  subclassField: g => `<div class="field"><label for="f-circle">Cercle druidique</label><select id="f-circle">${Object.entries(CIRCLES).map(([k, o]) => `<option value="${k}"${k === g.circle ? " selected" : ""}>${o.n}</option>`).join("")}</select></div>`,
  heroStats: g => { const cMax = R.cantrips(g); return `<div class="stat ${g.cantrips.length > cMax ? "alert" : ""}" role="listitem"><div class="v">${g.cantrips.length}<small>/${cMax}</small></div><div class="l">Sorts mineurs</div></div>
    <div class="stat" role="listitem"><div class="v">${DRU.ws(g) ? `FP ${DRU.fp(g)}` : "—"}</div><div class="l">Forme sauvage</div></div>`; },
  tabs: g => [["grimoire","Sorts"],["biblio","Bibliothèque", classSpells(g).length],["bestiaire","Bestiaire", BEASTS.filter(b => wsAllowed(g, b)).length]],
  moreTabs: () => [["regles","Règles"],["imprimer","Imprimer"]],
  panels: { bestiaire: g => bestiaryHTML(g), imprimer: g => printHTML(g), regles: g => rulesHTML(g) },
  print: g => printSheet(g),
  printTitle: g => `Fiche de sorts de ${g.name}`,
  printDesc: "Elle contient le tableau de bord (emplacements, Forme sauvage à cocher, forme active à remplir), les sorts mineurs, les fiches de tes formes ★ avec leurs attaques, la liste du druide avec des cases « préparé » et le rappel des règles.",
  features: g => DRU_FEATS.filter(f => !f.circle || f.circle === g.circle),
  resources: g => druResHTML(g),
  resourceMax: { ws: g => DRU.ws(g) },
  longRest: g => { g.wsU = 0; g.wsForm = null; S.wsDice = ""; S.wsConc = null; },
  // Forme active (ou rappel de concentration si la forme vient de prendre fin), au-dessus des emplacements
  beforeSlots: g => g.wsForm ? wsActiveHTML(g) : wsConcHTML(g),
  slotbarChips: g => g.wsForm && BEAST[g.wsForm.id] ? `<button class="chip ws" data-a="ws-top">🐾 ${esc(BEAST[g.wsForm.id].n)} · ${g.wsForm.hp}/${g.wsForm.max}</button>` : "",
  shortRest: { field: "wsU", label: "Forme sauvage", done: "récupérée" },
  // Volet des formes possibles ; renvoie true s'il est ouvert (jamais par-dessus l'assistant de passage de niveau)
  renderSheets(g, levelUpOpen) {
    const ws = document.getElementById("wssheet"), show = !!g && !!S.ws && !levelUpOpen;
    if (!show) S.ws = null;
    ws.hidden = !show; document.body.classList.toggle("ws-on", show);
    if (show) { const sc = ws.querySelector(".lubody"), top = sc ? sc.scrollTop : 0; ws.innerHTML = wsSheetHTML(g); const nb = ws.querySelector(".lubody"); if (nb && !S.wsTop) nb.scrollTop = top; S.wsTop = false; } // la liste garde sa position (sauf changement de filtre)
    return show;
  },
  levelUp: {
    rowsAfter: (g, b) => row("Sorts mineurs connus", R.cantrips(g), R.cantrips(b), "--rubric") + (DRU.ws(b) ? row("Forme sauvage", DRU.ws(g) ? `FP ${DRU.fp(g)}` : "—", `FP ${DRU.fp(b)}`, "--ok") : ""),
    summaryExtra(g, b) {
      const nf = newForms(g, b), to = b.level; if (!nf.length) return "";
      const why = to === 2 ? "Forme sauvage : premières transformations" : [DRU.fp(b) > DRU.fp(g) ? `bêtes de FP ${fpLabel(DRU.fp(b))}` : "", to === 4 ? "bêtes qui nagent" : "", to === 8 ? "bêtes qui volent" : ""].filter(Boolean).join(" et ");
      return `<div class="lunew"><span class="k">Nouvelles formes</span><b class="h">${plural(nf.length, "bête")} de plus</b><span style="font-size:13.5px">${cap(why)}${to === 2 ? "" : " deviennent possibles"}.</span>
      <div class="lunames">${nf.map(x => esc(x.n)).join(" · ")}</div><span class="muted" style="font-size:12.5px">Tu pourras les ajouter à tes formes ★ à l'étape suivante.</span></div>`;
    },
    notes: (g, to) => to === 2 ? [`<span><b>Cercle druidique</b> : vérifie le cercle choisi dans la fiche (${esc(CIRCLES[g.circle].n)}).</span>`] : [],
    choicesFirst(g, b, L) {
      const nf = newForms(g, b); if (!nf.length) return "";
      const fav = L.wsfav || [];
      return `<div class="rubric"><h3>Nouvelles formes</h3><span class="aside">${fav.length ? `${fav.length} ★ ajoutée${fav.length > 1 ? "s" : ""}` : "touche ☆ pour l'ajouter à tes formes"}</span></div><div class="luplist">${nf.map(x => { const on = fav.includes(x.id);
      return `<div class="lurowp lufav${on ? " on" : ""}"><button class="wsfav${on ? " on" : ""}" data-a="lu-wsfav" data-id="${x.id}" aria-pressed="${on}" aria-label="${on ? "Retirer des" : "Ajouter aux"} formes favorites">${on ? "★" : "☆"}</button><span class="n">${esc(x.n)}</span><span class="flv">FP ${esc(x.fp)}</span><span class="wsmini">PV ${x.pv} · CA ${x.ca}${Object.keys(MV).filter(k => x.v[k]).map(k => ` · ${k} ${x.v[k]} m`).join("")}</span></div>`; }).join("")}</div>`;
    },
    recapAfter: (g, b, L) => newForms(g, b).length ? `<div><span class="n">Nouvelles formes</span><small>${plural(newForms(g, b).length, "bête")}${L.wsfav && L.wsfav.length ? ` · ★ ${L.wsfav.map(id => esc(BEAST[id].n)).join(", ")}` : ""}</small></div>` : "",
    recapNotes: (g, b) => DRU.ws(b) ? `<span>• Forme sauvage : bêtes de FP ${DRU.fp(b)} maximum.</span>` : "",
    apply: (g, L) => { (L.wsfav || []).forEach(id => { if (!g.favs.includes(id)) g.favs.push(id); }); },
  },
};
onKey(e => { if (e.key === "Escape" && S.ws) { S.ws = null; render(); return true; } });
