// Druide : cercles, Forme sauvage (utilisations, FP), capacités.
import { onChange, onKey } from "../core/actions.js";
import { cap, esc, plural, signed } from "../core/format.js";
import { S } from "../core/state.js";
import { mutate } from "../core/store.js";
import { render } from "../core/ui.js";
import { BEAST, BEASTS, BY_ID } from "../data.js";
import { pCantrips, pClassList, pConc, pDots, pExtras, pFoot, pHeader, pNotes, pSlots, pSpellRow, printHTML } from "../features/print.js";
import { castingRules, concentrationRules } from "../features/rules.js";
import { R, classSpells } from "../rules/common.js";
import { SLOTS } from "../rules/tables.js";
import { capRow, foldSec, pillsRaw } from "../ui/components.js";
import { MV, SIZES, actRest, bestiaryHTML, fpLabel, modOf, newForms, spdTxt, wsActiveHTML, wsAllowed, wsConcHTML, wsSheetHTML } from "./druide-wildshape.js";

const DRU_FEATS = [
  { id: "druidic", lv: 1, n: "Druidique", pill: () => "langue secrète", k: "f", d: () => "Tu connais le druidique, la langue secrète des druides, et peux y laisser des messages cachés." },
  { id: "ritual", lv: 1, n: "Incantation rituelle", pill: () => "sorts préparés", k: "f", d: () => "Tu peux lancer en rituel (+10 minutes, sans emplacement) un sort rituel que tu as préparé." },
  { id: "combat", lv: 2, circle: "lune", n: "Changeforme de combat", pill: () => "action bonus · soin 1d8/niv.", k: "f", d: () => "Forme sauvage en action bonus. En forme de bête, action bonus : dépense un emplacement pour regagner 1d8 PV par niveau d'emplacement." },
  { id: "forms", lv: 2, circle: "lune", n: "Formes du cercle", pill: g => `FP ${DRU.fp(g)} maximum`, k: "f", d: g => `Bêtes de FP ${DRU.fp(g)} maximum (FP 1 jusqu'au niveau 5, puis niveau ÷ 3). Pas de nage avant le niveau 4, pas de vol avant le niveau 8.` },
  { id: "primal", lv: 6, circle: "lune", n: "Frappe primitive", pill: () => "attaques magiques", k: "f", d: () => "En forme de bête, tes attaques comptent comme magiques pour surmonter les résistances et immunités." },
  { id: "elem", lv: 10, circle: "lune", n: "Forme sauvage élémentaire", pill: () => "2 utilisations · élémentaire", k: "f", d: () => "Dépense deux utilisations de Forme sauvage pour devenir un élémentaire de l'air, de la terre, du feu ou de l'eau." },
  { id: "thousand", lv: 14, circle: "lune", n: "Mille formes", pill: () => "Modification d'apparence à volonté", k: "f", d: () => "Tu peux lancer Modification d'apparence à volonté." },
  { id: "landcantrip", lv: 2, circle: "terre", n: "Sort mineur supplémentaire", pill: () => "+1 sort mineur", k: "f", d: () => "Tu apprends un sort mineur de druide de plus, qui ne compte pas dans ton nombre de sorts mineurs connus (compté dans l'appli)." },
  { id: "natrec", lv: 2, circle: "terre", n: "Récupération naturelle", pill: g => `${DRU.natRec(g)} niveau${DRU.natRec(g) > 1 ? "x" : ""} d'emplacements`, k: "f", d: g => `Une fois par jour, pendant un repos court : récupère des emplacements de sort pour un total de ${DRU.natRec(g)} niveau${DRU.natRec(g) > 1 ? "x" : ""} (moitié de ton niveau, arrondi au supérieur), aucun de niveau 6 ou plus. Dans le panneau du repos court.` },
  { id: "terrain", lv: 3, circle: "terre", n: "Sorts de cercle", control: g => `<select id="f-terrain" aria-label="Terrain">${Object.entries(TERRAINS).map(([k, t]) => `<option value="${k}"${(g.terrain || "foret") === k ? " selected" : ""}>${t.n}</option>`).join("")}</select>`, pill: g => `${(TERRAINS[g.terrain] || TERRAINS.foret).n} · toujours préparés`, k: "f", d: g => `Terrain : ${(TERRAINS[g.terrain] || TERRAINS.foret).n} (à choisir en mode Gérer). Ses sorts de cercle, aux niveaux 3, 5, 7 et 9, sont toujours préparés et ne comptent pas dans ta limite : ${Object.entries((TERRAINS[g.terrain] || TERRAINS.foret).sp).map(([lv, ids]) => `niv. ${lv} ${ids.map(id => BY_ID[id] ? BY_ID[id].n : id).join(", ")}`).join(" · ")}.` },
  { id: "landstride", lv: 6, circle: "terre", n: "Foulée tellurique", pill: () => "terrain difficile ignoré", k: "f", d: () => "Le terrain difficile non magique ne te coûte pas de mouvement supplémentaire ; tu traverses les plantes non magiques sans être ralenti ni blessé. Avantage aux jets de sauvegarde contre les plantes créées ou manipulées par magie pour gêner les mouvements." },
  { id: "ward", lv: 10, circle: "terre", n: "Protégé de dame Nature", pill: () => "immunisé poison, maladie", k: "s", d: () => "Les élémentaires et les fées ne peuvent pas te charmer ni t'effrayer ; tu es immunisé contre le poison et les maladies." },
  { id: "sanctuary", lv: 14, circle: "terre", n: "Sanctuaire de dame Nature", pill: g => `bêtes et plantes : JdS SAG DD ${8 + R.prof(g.level) + R.am(g)}`, k: "s", d: g => `Une bête ou une plante qui t'attaque fait un jet de sauvegarde de Sagesse (DD ${8 + R.prof(g.level) + R.am(g)}) : en cas d'échec, elle choisit une autre cible ou rate automatiquement ; en cas de réussite, elle est immunisée pendant 24 heures.` },
  { id: "timeless", lv: 18, n: "Jeunesse éternelle, Sorts bestiaux", pill: () => "sorts en forme de bête", k: "f", d: () => "Tu vieillis dix fois moins vite. En forme de bête, tu peux lancer des sorts (composantes verbales et somatiques), sans composante matérielle." },
  { id: "arch", lv: 20, n: "Archidruide", pill: () => "Forme sauvage illimitée", k: "f", d: () => "Forme sauvage illimitée ; tu ignores les composantes verbales, somatiques et matérielles sans coût de tes sorts de druide." },
];
// Détail de Forme sauvage (capacité dépliable)
function wsBody(g) {
    const fp = DRU.fp(g), lim = g.level < 4 ? "ni nage ni vol" : g.level < 8 ? "nage autorisée, pas de vol" : "nage et vol autorisés";
    return `${pillsRaw([["n", "Incantation", g.circle === "lune" ? "1 action bonus" : "1 action"], ["n", "Durée", `${DRU.hours(g)} h maximum`], ["f", "Bêtes", `FP ${fp} maximum`, lim]])}
    <div class="eff">Tu prends la forme d'une bête déjà vue : ses statistiques physiques et ses PV remplacent les tiens (tu gardes INT, SAG, CHA, tes compétences et ta concentration). À 0 PV, tu reprends ta forme et l'excédent de dégâts passe sur tes PV. Pas de sort dans cette forme.</div>
    <div class="cast"><button class="btn cast-go sm wsbtn" data-a="ws-open">${g.wsForm ? "Changer de forme" : "Choisir une forme"}</button></div>`;
}
function druResHTML(g) {
  const n = DRU.ws(g); if (!n) return "";
  const u = Math.min(n, g.wsU);
  const pips = n > 10 ? `<span class="muted">illimitée</span>` : Array.from({ length: n }, (_, k) => `<button class="pip${k < u ? " used" : ""}" data-a="res-pip" data-r="ws" data-k="${k}" aria-label="Forme sauvage ${k + 1}, ${k < u ? "utilisée" : "disponible"}"></button>`).join("");
  return foldSec("res-cls", "Ressources du druide", "", `<div class="slots res">${capRow(g, "ws", "Forme sauvage", "repos court", pips, false, wsBody)}</div>`);
}
onChange("#f-circle", t => { mutate(g => { g.circle = t.value; }); });
onChange("#f-terrain", t => { mutate(g => { g.terrain = t.value; }); });
// Cercles du druide (Manuel des joueurs)
const CIRCLES = { lune: { n: "Lune", full: "Cercle de la Lune", sum: "Changeforme de combat : Forme sauvage en action bonus, bêtes de FP 1 dès le niveau 2, soins en dépensant des emplacements." },
  terre: { n: "Terre", full: "Cercle de la Terre", sum: "Sorts de cercle selon un terrain (toujours préparés), un sort mineur de plus, Récupération naturelle d'emplacements au repos court." } };
// Cercle de la Terre : sorts de cercle par terrain et niveau de druide (3, 5, 7, 9)
const TERRAINS = {
  arctique: { n: "Arctique", sp: {3: ["spike-growth", "hold-person"], 5: ["slow", "sleet-storm"], 7: ["freedom-of-movement", "ice-storm"], 9: ["commune-with-nature", "cone-of-cold"]} },
  desert: { n: "Désert", sp: {3: ["blur", "silence"], 5: ["create-food-and-water", "protection-from-energy"], 7: ["blight", "hallucinatory-terrain"], 9: ["insect-plague", "wall-of-stone"]} },
  foret: { n: "Forêt", sp: {3: ["spider-climb", "barkskin"], 5: ["call-lightning", "plant-growth"], 7: ["divination", "freedom-of-movement"], 9: ["commune-with-nature", "tree-stride"]} },
  littoral: { n: "Littoral", sp: {3: ["misty-step", "mirror-image"], 5: ["water-walk", "water-breathing"], 7: ["control-water", "freedom-of-movement"], 9: ["conjure-elemental", "scrying"]} },
  marais: { n: "Marais", sp: {3: ["melf-s-acid-arrow", "darkness"], 5: ["water-walk", "stinking-cloud"], 7: ["freedom-of-movement", "locate-creature"], 9: ["insect-plague", "scrying"]} },
  montagne: { n: "Montagne", sp: {3: ["spike-growth", "spider-climb"], 5: ["lightning-bolt", "meld-into-stone"], 7: ["stone-shape", "stoneskin"], 9: ["wall-of-stone", "passwall"]} },
  outreterre: { n: "Outreterre", sp: {3: ["spider-climb", "web"], 5: ["gaseous-form", "stinking-cloud"], 7: ["stone-shape", "greater-invisibility"], 9: ["cloudkill", "insect-plague"]} },
  plaine: { n: "Plaine", sp: {3: ["invisibility", "pass-without-trace"], 5: ["haste", "daylight"], 7: ["divination", "freedom-of-movement"], 9: ["insect-plague", "dream"]} },
};
const isLand = g => g.circle === "terre";
const circleSpells = g => { if (!isLand(g) || g.level < 3) return []; const t = TERRAINS[g.terrain] || TERRAINS.foret; return [...new Set(Object.entries(t.sp).filter(([lv]) => g.level >= +lv).flatMap(([, ids]) => ids))].filter(id => BY_ID[id]); };
const DRU = {
  ws: g => g.level >= 20 ? 99 : g.level >= 2 ? 2 : 0,          // Forme sauvage : 2 utilisations, repos court (illimitée au niveau 20)
  // FP maximum : Cercle de la Lune 1, puis niveau ÷ 3 dès le niveau 6 ; autres cercles 1/4, 1/2 au niveau 4, 1 au niveau 8
  fp: g => g.circle === "lune" ? (g.level >= 6 ? Math.floor(g.level / 3) : 1) : g.level >= 8 ? 1 : g.level >= 4 ? 0.5 : 0.25,
  hours: g => Math.floor(g.level / 2),
  natRec: g => Math.ceil(g.level / 2),                        // Récupération naturelle : moitié du niveau (arrondi au supérieur)
};

export { DRU_FEATS, druResHTML, CIRCLES, TERRAINS, DRU };

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
${isLand(g) && g.level >= 2 ? `<div class="res"><span class="l">Récupération naturelle</span>${pDots(1)}<span class="r">1 fois par jour, au repos court : ${DRU.natRec(g)} niveau${DRU.natRec(g) > 1 ? "x" : ""} d'emplacements (aucun de niveau 6+)</span></div>` : ""}
<h2>Capacités de classe <small>${g.level >= 2 ? esc(CIRCLES[g.circle].full) + " · " : ""}niveau ${g.level}</small></h2>
<table>${DRU_FEATS.filter(f => (!f.circle || f.circle === g.circle) && f.lv <= g.level).map(f => `<tr><td class="n">${f.n}</td><td>${esc(f.d(g))}</td></tr>`).join("")}</table>
${pCantrips(g)}
${pExtras(g)}
${pConc(" En forme de bête : avec la Constitution de la bête.")}
<div class="brk"></div>
<h2 style="margin-top:0">Mes formes <small>${favs.length ? "formes ★ de l'application" : "à compléter (ajoute des formes ★ dans l'application)"}</small></h2>
<div class="beasts">${favs.map(beastPrint).join("")}${favs.length % 2 ? empty : ""}${favs.length ? "" : empty + empty}</div>
<div class="brk"></div>
${circleSpells(g).length ? `<h2 style="margin-top:0">Sorts de cercle <small>${esc((TERRAINS[g.terrain] || TERRAINS.foret).n)} · toujours préparés, hors limite</small></h2>
<table><tr><th>Sort</th><th>Incantation · composantes</th><th>Effet</th></tr>${circleSpells(g).map(id => BY_ID[id]).sort((a, b) => a.l - b.l || a.n.localeCompare(b.n, "fr")).map(s => pSpellRow(g, s, false)).join("")}</table>` : ""}
<h2${circleSpells(g).length ? "" : ' style="margin-top:0"'}>Sorts de druide <small>sorts préparés aujourd'hui : ____ / ${pMax}</small></h2>
${pClassList(g, circleSpells(g))}
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
  saves: ["int", "wis"],
  weaponProf: ["club", "dagger", "dart", "javelin", "mace", "quarterstaff", "scimitar", "sickle", "sling", "spear"],
  armorProf: ["light", "medium", "shield"], noMetal: true,
  tools: () => ["Kit d'herboriste"], langs: () => ["Druidique"],   // les druides refusent de porter du métal             // jets de sauvegarde maîtrisés par la classe
  cantrips: lv => lv >= 10 ? 4 : lv >= 4 ? 3 : 2,
  prep: (g, m) => Math.max(1, m + g.level),
  ritualNeedsPrep: true,       // un rituel se lance s'il est préparé
  canRitual: prepared => prepared,
  defaults: () => ({ circle: "lune", terrain: "foret", natRec: false, favs: [], wsForm: null, wsU: 0 }),
  normalize(o) {
    if (!CIRCLES[o.circle]) o.circle = "lune";
    if (!TERRAINS[o.terrain]) o.terrain = "foret"; o.natRec = !!o.natRec;          // Cercle de la Terre
    if (!Array.isArray(o.favs)) o.favs = []; o.favs = o.favs.filter(id => BEAST[id]);   // formes favorites
    if (!o.wsForm || !BEAST[o.wsForm.id]) o.wsForm = null;                                // forme active {id, hp, max}
    o.wsU = Math.max(0, +o.wsU || 0);                                                     // utilisations de Forme sauvage
  },
  subclass: { lv: 2, label: "Cercle druidique", field: "circle", opts: () => Object.entries(CIRCLES).map(([k, c]) => [k, c.full, c.sum]),
    extra: (g, k, x) => k !== "terre" ? null : { label: "Terrain (sorts de cercle au niveau 3)", opts: Object.entries(TERRAINS).map(([t, v]) => [t, v.n, ""]), cur: x || g.terrain || "foret" },
    apply: (g, x) => { if (x) g.terrain = x; } },
  subline: g => `Druide niveau ${g.level}${g.level >= 2 ? ` · ${esc(CIRCLES[g.circle].full)}` : ""}`,
  subclassField: g => `<div class="field"><label for="f-circle">Cercle druidique</label><select id="f-circle">${Object.entries(CIRCLES).map(([k, o]) => `<option value="${k}"${k === g.circle ? " selected" : ""}>${o.n}</option>`).join("")}</select></div>`,
  tabs: g => [["grimoire","Sorts"],["biblio","Bibliothèque", classSpells(g).length],["bestiaire","Bestiaire", BEASTS.filter(b => wsAllowed(g, b)).length]],
  moreTabs: () => [["regles","Règles"],["imprimer","Imprimer"]],
  panels: { bestiaire: g => bestiaryHTML(g), imprimer: g => printHTML(g), regles: g => rulesHTML(g) },
  print: g => printSheet(g),
  printTitle: g => `Fiche de sorts de ${g.name}`,
  printDesc: "Elle contient le tableau de bord (emplacements, Forme sauvage à cocher, forme active à remplir), les sorts mineurs, les fiches de tes formes ★ avec leurs attaques, la liste du druide avec des cases « préparé » et le rappel des règles.",
  features: g => DRU_FEATS.filter(f => !f.circle || f.circle === g.circle),
  resources: g => druResHTML(g),
  resourceMax: { ws: g => DRU.ws(g) },
  longRest: g => { g.natRec = false; g.wsU = 0; g.wsForm = null; S.wsDice = ""; S.wsConc = null; },
  // Forme active (ou rappel de concentration si la forme vient de prendre fin), au-dessus des emplacements
  beforeSlots: g => g.wsForm ? wsActiveHTML(g) : wsConcHTML(g),
  barChips: g => g.wsForm && BEAST[g.wsForm.id] ? `<button class="chip ws" data-a="ws-top">🐾 ${esc(BEAST[g.wsForm.id].n)} · ${g.wsForm.hp}/${g.wsForm.max}</button>` : "",
  shortRest: { field: "wsU", label: "Forme sauvage", done: "récupérée" },
  // Cercle de la Terre : sorts de cercle, sort mineur de plus, Récupération naturelle
  cantripBonus: g => isLand(g) && g.level >= 2 ? 1 : 0,
  alwaysPrepared: g => circleSpells(g),
  alwaysPreparedInfo: g => ({ title: "Sorts de cercle", aside: `toujours préparés · ${esc((TERRAINS[g.terrain] || TERRAINS.foret).n)}`, origin: `Sort de cercle · ${esc((TERRAINS[g.terrain] || TERRAINS.foret).n)}`,
    tip: "Sort de cercle : toujours préparé, hors limite", aria: "Sort de cercle, toujours préparé" }),
  recovery: g => isLand(g) && g.level >= 2 ? { name: "Récupération naturelle", budget: DRU.natRec(g), field: "natRec" } : null,
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
    notes: () => [],
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
