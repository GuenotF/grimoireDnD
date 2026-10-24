// Occultiste (Manuel des joueurs 2014) : magie de pacte (emplacements d'un seul niveau, repos court), sorts connus,
// manifestations occultes (liste AideDD fournie par Fabien), faveur de pacte, Arcanum mystique, patrons (Archifée, Fiélon, Grand Ancien).
// Résumés rédigés pour la table (textes AideDD), à vérifier dans le livre.
import { onChange, onClick } from "../core/actions.js";
import { byName, esc, signed } from "../core/format.js";
import { G, S } from "../core/state.js";
import { mutate } from "../core/store.js";
import { render, toast } from "../core/ui.js";
import { BY_ID, GEAR, SPELLS } from "../data.js";
import { innateBlock } from "../features/innate.js";
import { pCantrips, pConc, pDots, pExtras, pFoot, pHeader, pNotes, pSlots, pSpellRow, printHTML } from "../features/print.js";
import { castingRules, concentrationRules } from "../features/rules.js";
import { R, classSpells } from "../rules/common.js";
import { setTemp } from "../rules/hp.js";
import { capRow, foldSec, pickRow, pillsRaw, statLabel } from "../ui/components.js";

// ---------- Tables
const KNOWN = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15];
const INV_N = [0, 0, 2, 2, 2, 3, 3, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 7, 8, 8, 8];
const pactLv = lv => Math.min(5, Math.ceil(lv / 2));
const pactN = lv => lv >= 17 ? 4 : lv >= 11 ? 3 : lv >= 2 ? 2 : 1;
// Emplacements de pacte : tous au niveau du pacte (les niveaux inférieurs à 0, masqués)
const PACT_SLOTS = Array.from({ length: 21 }, (_, lv) => lv ? [...Array(pactLv(lv) - 1).fill(0), pactN(lv)] : []);
const beams = lv => 1 + (lv >= 5) + (lv >= 11) + (lv >= 17);
const ARC_AT = { 6: 11, 7: 13, 8: 15, 9: 17 };

const PATRONS = {
  archifee: { n: "Archifée", full: "l'Archifée", sum: "Présence féerique (charme ou effroi), Échappatoire brumeuse (6), Défenses captivantes (10), Sombre délire (14).",
    sp: { 1: ["faerie-fire", "sleep"], 2: ["calm-emotions", "phantasmal-force"], 3: ["blink", "plant-growth"], 4: ["dominate-beast", "greater-invisibility"], 5: ["seeming", "dominate-person"] } },
  fielon: { n: "Fiélon", full: "le Fiélon", sum: "Bénédiction du ténébreux (PV temporaires), Chance du ténébreux (6), Résistance fiélonne (10), Traversée des enfers (14).",
    sp: { 1: ["command", "burning-hands"], 2: ["blindness-deafness", "scorching-ray"], 3: ["fireball", "stinking-cloud"], 4: ["fire-shield", "wall-of-fire"], 5: ["flame-strike", "hallow"] } },
  ancien: { n: "Grand Ancien", full: "le Grand Ancien", sum: "Esprit éveillé (télépathie 9 m), Protection entropique (6), Bouclier mental (10), Asservissement (14).",
    sp: { 1: ["tasha-s-hideous-laughter", "dissonant-whispers"], 2: ["detect-thoughts", "phantasmal-force"], 3: ["clairvoyance", "sending"], 4: ["dominate-beast", "evard-s-black-tentacles"], 5: ["dominate-person", "telekinesis"] } },
};
const PACTS = {
  chaine: { n: "Pacte de la chaîne", short: "Chaîne", sum: "Appel de familier en rituel ; formes spéciales (diablotin, pseudodragon, quasit, esprit follet) ; le familier peut attaquer à ta place (réaction)." },
  lame: { n: "Pacte de la lame", short: "Lame", sum: "Action : ton arme de pacte (corps à corps, au choix) apparaît dans ta main ; tu la maîtrises, elle est magique." },
  grimoire: { n: "Pacte du grimoire", short: "Grimoire", sum: "Livre des Ombres : trois sorts mineurs de n'importe quelle classe, à volonté (ils comptent comme des sorts d'occultiste)." },
};
// Manifestations occultes (AideDD) : pre = prérequis ; k = c (calculé), w (sort à volonté), s (emplacement de pacte, 1 fois par repos long), r (rappel)
const INV = {
  "armure-ombres": { n: "Armure d'ombres", k: "w", sp: "mage-armor", d: "Armure de mage sur toi à volonté, sans emplacement ni composantes." },
  "buveuse-vie": { n: "Buveuse de vie", pre: { lv: 12, pact: "lame" }, k: "c", d: "Ton arme de pacte inflige en plus des dégâts nécrotiques égaux à ton mod. de Charisme (minimum 1)." },
  "chaines-carceres": { n: "Chaînes des Carcères", pre: { lv: 15, pact: "chaine" }, k: "w", sp: "hold-monster", d: "Immobilisation de monstre à volonté sur un céleste, un démon ou un élémentaire, sans emplacement ni composantes ; une fois par repos long par créature." },
  "decharge-dechirante": { n: "Décharge déchirante", pre: { eb: true }, k: "c", d: "Ajoute ton mod. de Charisme aux dégâts de Décharge occulte (chaque rayon)." },
  "decharge-repulsive": { n: "Décharge répulsive", pre: { eb: true }, k: "r", d: "Une créature touchée par Décharge occulte peut être repoussée de 3 m en ligne droite." },
  "lame-assoiffee": { n: "Lame assoiffée", pre: { lv: 5, pact: "lame" }, k: "c", d: "Deux attaques avec ton arme de pacte quand tu prends l'action Attaquer." },
  "lance-occulte": { n: "Lance occulte", pre: { eb: true }, k: "c", d: "La portée de Décharge occulte passe à 90 m." },
  "langage-animal": { n: "Langage animal", k: "w", sp: "speak-with-animals", d: "Communication avec les animaux à volonté, sans emplacement." },
  "lenteur-esprit": { n: "Lenteur de l'esprit", pre: { lv: 5 }, k: "s", sp: "slow", d: "Lenteur une fois avec un emplacement d'occultiste, puis repos long." },
  "livre-secrets": { n: "Livre des secrets anciens", pre: { pact: "grimoire" }, k: "c", d: "Deux rituels de niveau 1 de n'importe quelle classe dans ton Livre des Ombres, lancés en rituel ; tu peux en copier d'autres (niveau au plus la moitié de ton niveau, 2 h et 50 po par niveau)." },
  "maitre-formes": { n: "Maître des formes", pre: { lv: 15 }, k: "w", sp: "alter-self", d: "Modification d'apparence à volonté, sans emplacement." },
  "maitre-ombres": { n: "Maître des ombres", pre: { lv: 5 }, k: "r", d: "En lumière faible ou ténèbres, action : invisible jusqu'à ce que tu bouges ou que tu utilises une action ou une réaction." },
  "mille-visages": { n: "Mille visages", k: "w", sp: "disguise-self", d: "Déguisement à volonté, sans emplacement." },
  "mot-effroi": { n: "Mot d'effroi", pre: { lv: 7 }, k: "s", sp: "confusion", d: "Confusion une fois avec un emplacement d'occultiste, puis repos long." },
  "murmures-tombe": { n: "Murmures de la tombe", pre: { lv: 9 }, k: "w", sp: "speak-with-dead", d: "Communication avec les morts à volonté, sans emplacement." },
  "murmures-ensorcelants": { n: "Murmures ensorcelants", pre: { lv: 7 }, k: "s", sp: "compulsion", d: "Compulsion une fois avec un emplacement d'occultiste, puis repos long." },
  "oeil-runes": { n: "Œil du gardien des runes", k: "r", d: "Tu peux lire toutes les formes d'écriture." },
  "pas-aerien": { n: "Pas aérien", pre: { lv: 9 }, k: "w", sp: "levitate", d: "Lévitation sur toi à volonté, sans emplacement ni composantes." },
  "perception-transferee": { n: "Perception transférée", k: "r", d: "Action, au contact d'un humanoïde consentant : tu perçois par ses sens jusqu'à la fin de ton prochain tour (prolongeable par une action), aveugle et sourd à ton propre environnement." },
  "presence-captivante": { n: "Présence captivante", k: "c", d: "Maîtrise de Persuasion et Tromperie." },
  "royaumes-lointains": { n: "Royaumes lointains", pre: { lv: 15 }, k: "w", sp: "arcane-eye", d: "Œil magique à volonté, sans emplacement." },
  "saut-outremonde": { n: "Saut d'Outremonde", pre: { lv: 9 }, k: "w", sp: "jump", d: "Saut sur toi à volonté, sans emplacement ni composantes." },
  "sbires-chaos": { n: "Sbires du chaos", pre: { lv: 9 }, k: "s", sp: "conjure-elemental", d: "Invocation d'élémentaire une fois avec un emplacement d'occultiste, puis repos long." },
  "sculpteur-chair": { n: "Sculpteur de chair", pre: { lv: 7 }, k: "s", sp: "polymorph", d: "Métamorphose une fois avec un emplacement d'occultiste, puis repos long." },
  "sombre-presage": { n: "Sombre présage", pre: { lv: 5 }, k: "s", sp: "bestow-curse", d: "Malédiction une fois avec un emplacement d'occultiste, puis repos long." },
  "vigueur-fielonne": { n: "Vigueur fiélonne", k: "w", sp: "false-life", d: "Simulacre de vie sur toi à volonté, comme un sort de niveau 1, sans emplacement ni composantes." },
  "vision-sorcier": { n: "Vision de sorcier", pre: { lv: 15 }, k: "r", d: "Tu vois la forme véritable des métamorphes et créatures cachées par l'illusion ou la transmutation, à 9 m et en ligne de mire." },
  "vision-diable": { n: "Vision du diable", k: "r", d: "Tu vois normalement dans les ténèbres, magiques ou non, jusqu'à 36 m." },
  "vision-occulte": { n: "Vision occulte", k: "w", sp: "detect-magic", d: "Détection de la magie à volonté, sans emplacement ni composantes." },
  "visions-embrumees": { n: "Visions embrumées", k: "w", sp: "silent-image", d: "Image silencieuse à volonté, sans emplacement ni composantes." },
  "voix-maitre-chaines": { n: "Voix du maître des Chaînes", pre: { pact: "chaine" }, k: "r", d: "Télépathie avec ton familier et perception par ses sens sur le même plan ; tu peux parler par sa bouche." },
  "voleur-destinees": { n: "Voleur des cinq destinées", k: "s", sp: "bane", d: "Fléau une fois avec un emplacement d'occultiste, puis repos long." },
};
const KIND = { c: "calculé", w: "à volonté", s: "1 fois · emplacement", r: "rappel" };
const has = (g, k) => (g.inv || []).includes(k);
const preText = p => !p ? "" : [p.lv ? `niveau ${p.lv}` : "", p.pact ? PACTS[p.pact].n.replace("Pacte ", "pacte ") : "", p.eb ? "Décharge occulte" : ""].filter(Boolean).join(", ");
/** Prérequis remplis au niveau (et avec le pacte, les sorts mineurs) de b. */
const preOk = (b, k) => { const p = INV[k].pre || {}; return (!p.lv || b.level >= p.lv) && (!p.pact || b.pacte === p.pact) && (!p.eb || (b.cantrips || []).includes("eldritch-blast")); };
const OCC = {
  dd: g => 8 + R.prof(g.level) + R.am(g),
  bless: g => Math.max(1, R.am(g) + g.level),
  arcLevels: lv => Object.entries(ARC_AT).filter(([, at]) => lv >= at).map(([l]) => +l),
};
const pat = g => PATRONS[g.patron] || PATRONS.fielon;

// ---------- Capacités (Gérer : liste par niveau)
const FEATS = [
  { lv: 1, n: "Magie de pacte", k: "f", pill: g => `${pactN(g.level)} emplacement${pactN(g.level) > 1 ? "s" : ""} de niveau ${pactLv(g.level)} · repos court`, d: g => `Tous tes emplacements sont du même niveau (${pactLv(g.level)}) : un sort connu de niveau inférieur se lance à ce niveau. Ils reviennent au repos court ou long. Caractéristique : Charisme (DD ${OCC.dd(g)}, attaque ${signed(R.prof(g.level) + R.am(g))}).` },
  { lv: 1, n: "Patron d'Outremonde", k: "f", pill: g => pat(g).n, d: g => `${pat(g).full.charAt(0).toUpperCase() + pat(g).full.slice(1)} : ${pat(g).sum} Sa liste de sorts s'ajoute à celle de l'occultiste (à apprendre comme les autres).` },
  { lv: 1, c: "fielon", n: "Bénédiction du ténébreux", k: "f", pill: g => `+${OCC.bless(g)} PV temporaires`, d: g => `Quand tu réduis une créature hostile à 0 PV, tu gagnes ${OCC.bless(g)} PV temporaires (mod. de Charisme + niveau d'occultiste).` },
  { lv: 1, c: "archifee", n: "Présence féerique", k: "s", pill: g => `JdS SAG ${OCC.dd(g)} · cube de 3 m`, d: g => `Action : chaque créature dans un cube de 3 m centré sur toi fait un JdS de Sagesse (DD ${OCC.dd(g)}) ou est charmée ou effrayée (au choix) jusqu'à la fin de ton prochain tour. Repos court ou long.` },
  { lv: 1, c: "ancien", n: "Esprit éveillé", k: "f", pill: () => "télépathie 9 m", d: () => "Tu communiques par télépathie avec une créature que tu vois à 9 m, si elle comprend au moins une langue." },
  { lv: 2, n: "Manifestations occultes", k: "f", pill: g => `${INV_N[g.level]} manifestations`, d: g => `${INV_N[g.level]} manifestations (2 au niveau 2, puis 3, 4, 5, 6, 7, 8) ; à chaque passage de niveau, tu peux en remplacer une (Gérer › Manifestations occultes).` },
  { lv: 3, n: "Faveur de pacte", k: "f", pill: g => PACTS[g.pacte] ? PACTS[g.pacte].n : "à choisir", d: g => PACTS[g.pacte] ? `${PACTS[g.pacte].n} : ${PACTS[g.pacte].sum}` : "Pacte de la chaîne, de la lame ou du grimoire (Gérer › Faveur de pacte)." },
  { lv: 6, c: "fielon", n: "Chance du ténébreux", k: "f", pill: () => "+1d10 · repos court", d: () => "Ajoute 1d10 à un test de caractéristique ou de sauvegarde, après avoir vu le jet mais avant le résultat. Repos court ou long." },
  { lv: 6, c: "archifee", n: "Échappatoire brumeuse", k: "s", pill: () => "réaction : invisible, téléport 18 m", d: () => "Réaction quand tu subis des dégâts : tu deviens invisible et te téléportes à 18 m, jusqu'au début de ton prochain tour (ou jusqu'à ce que tu attaques ou lances un sort). Repos court ou long." },
  { lv: 6, c: "ancien", n: "Protection entropique", k: "s", pill: () => "réaction : désavantage", d: () => "Réaction : désavantage à une attaque contre toi ; si elle rate, avantage à ta prochaine attaque contre l'attaquant avant la fin de ton prochain tour. Repos court ou long." },
  { lv: 10, c: "fielon", n: "Résistance fiélonne", k: "f", pill: () => "résistance au choix", d: () => "À la fin d'un repos court ou long, choisis un type de dégâts : tu y résistes jusqu'au prochain choix (sauf armes magiques ou en argent)." },
  { lv: 10, c: "archifee", n: "Défenses captivantes", k: "f", pill: () => "immunité au charme", d: g => `Immunité au charme. Réaction quand une créature tente de te charmer : elle fait un JdS de Sagesse (DD ${OCC.dd(g)}) ou est charmée par toi 1 minute.` },
  { lv: 10, c: "ancien", n: "Bouclier mental", k: "f", pill: () => "résistance psychique", d: () => "Tes pensées ne peuvent être lues sans ta permission. Résistance aux dégâts psychiques ; qui t'en inflige subit les mêmes dégâts." },
  { lv: 11, n: "Arcanum mystique", k: "f", pill: g => OCC.arcLevels(g.level).map(l => `niv. ${l}`).join(", "), d: () => "Un sort d'occultiste de niveau 6 (puis 7 au 13, 8 au 15, 9 au 17), lancé une fois par repos long sans emplacement (Gérer › Arcanum mystique)." },
  { lv: 14, c: "fielon", n: "Traversée des enfers", k: "s", pill: () => "10d10 psychique · repos long", d: () => "Quand tu touches une créature avec une attaque : elle disparaît dans les plans inférieurs jusqu'à la fin de ton prochain tour et subit 10d10 dégâts psychiques si elle n'est pas un fiélon. Repos long." },
  { lv: 14, c: "archifee", n: "Sombre délire", k: "s", pill: g => `JdS SAG ${OCC.dd(g)} · 18 m · 1 min`, d: g => `Action : une créature à 18 m fait un JdS de Sagesse (DD ${OCC.dd(g)}) ou est charmée ou effrayée 1 minute, perdue dans une illusion (concentration). Repos court ou long.` },
  { lv: 14, c: "ancien", n: "Asservissement", k: "f", pill: () => "charme un humanoïde neutralisé", d: () => "Action : tu touches un humanoïde neutralisé ; il est charmé par toi jusqu'à ce que Délivrance des malédictions soit lancé, que tu le charmes à nouveau ou qu'il ne le soit plus. Télépathie sur le même plan." },
  { lv: 20, n: "Maître de l'occulte", k: "f", pill: () => "emplacements récupérés · repos long", d: () => "Une minute de supplication à ton patron : tu récupères tous tes emplacements de pacte. Une fois par repos long." },
];
const feats = g => FEATS.filter(f => !f.c || f.c === g.patron).map((f, i) => ({ id: "o" + i, ...f }));

// ---------- Sorts sans emplacement : manifestations, Arcanum mystique, Livre des Ombres
function innate(g) {
  const out = [];
  (g.inv || []).filter(k => INV[k] && INV[k].sp && preOk(g, k)).forEach(k => { const i = INV[k];
    out.push({ s: BY_ID[i.sp], ab: "cha", src: i.n, will: i.k === "w", slot: i.k === "s", rest: i.k === "s" ? "long" : null, at: i.k === "s" ? pactLv(g.level) : BY_ID[i.sp] && BY_ID[i.sp].l, grp: "inv" }); });
  Object.entries(g.arc || {}).filter(([l]) => g.level >= ARC_AT[l]).forEach(([l, id]) => out.push({ s: BY_ID[id], ab: "cha", src: `Arcanum mystique (niv. ${l})`, rest: "long", at: +l, grp: "arc" }));
  if (g.level >= 3 && g.pacte === "grimoire") (g.tomeC || []).forEach(id => out.push({ s: BY_ID[id], ab: "cha", src: "Livre des Ombres", grp: "tome" }));
  if (g.level >= 3 && g.pacte === "chaine") out.push({ s: BY_ID["find-familiar"], ab: "cha", src: "Pacte de la chaîne", ritual: true, grp: "pact" });
  if (g.level >= 3 && g.pacte === "grimoire" && has(g, "livre-secrets")) (g.bookR || []).forEach(id => out.push({ s: BY_ID[id], ab: "cha", src: "Livre des secrets anciens", ritual: true, grp: "pact" }));
  return out.filter(x => x.s);
}
// ---------- En jeu : ressources du patron, sorts sans emplacement
const RES = [
  { r: "ofey", c: "archifee", lv: 1, n: "Présence féerique", rest: "repos court", pills: g => [["s", "JdS", `SAG ${OCC.dd(g)}`], ["n", "Zone", "cube de 3 m"], ["n", "Temps", "action"]] },
  { r: "oluck", c: "fielon", lv: 6, n: "Chance du ténébreux", rest: "repos court", pills: () => [["f", "Test ou JdS", "+1d10"]] },
  { r: "omist", c: "archifee", lv: 6, n: "Échappatoire brumeuse", rest: "repos court", pills: () => [["f", "Effet", "invisible, téléport 18 m"], ["n", "Temps", "réaction"]] },
  { r: "oent", c: "ancien", lv: 6, n: "Protection entropique", rest: "repos court", pills: () => [["f", "Attaque contre toi", "désavantage"], ["n", "Temps", "réaction"]] },
  { r: "ohell", c: "fielon", lv: 14, n: "Traversée des enfers", rest: "repos long", pills: () => [["d", "Dégâts", "10d10 psychique"]] },
  { r: "odel", c: "archifee", lv: 14, n: "Sombre délire", rest: "repos court", pills: g => [["s", "JdS", `SAG ${OCC.dd(g)}`], ["n", "Portée", "18 m"], ["n", "Durée", "1 min (conc.)"]] },
  { r: "omaster", lv: 20, n: "Maître de l'occulte", rest: "repos long", pills: () => [["f", "Effet", "emplacements de pacte récupérés"], ["n", "Temps", "1 minute"]] },
];
const resOf = g => RES.filter(x => (!x.c || x.c === g.patron) && g.level >= x.lv);
function resHTML(g) {
  const list = resOf(g), inn = innate(g);
  let h = "";
  if (list.length || g.patron === "fielon") {
    let r = `<div class="slots res">`;
    list.forEach((x, i) => { const u = g[x.r + "U"] || 0;
      r += capRow(g, x.r, x.n, x.rest, `<button class="pip${u ? " used" : ""}" data-a="res-pip" data-r="${x.r}" data-k="0" aria-label="${esc(x.n)}, ${u ? "utilisé" : "disponible"}"></button>`, i > 0, () => pillsRaw(x.pills(g)) + (x.r === "omaster" ? `<div class="cast"><button class="btn cast-go sm" data-a="occ-master"${u ? " disabled" : ""}>Récupérer les emplacements</button></div>` : "")); });
    if (g.patron === "fielon") r += `<div class="resrow${list.length ? " sep" : ""}"><span class="rn"><b>Bénédiction du ténébreux</b><small>quand tu réduis un ennemi à 0 PV</small></span><button class="btn cast-go sm" data-a="occ-bless">+${OCC.bless(g)} PV temp.</button></div>`;
    h += foldSec("res-cls", "Ressources de l'occultiste", "", r + `</div>`);
  }
  const grp = k => inn.filter(x => x.grp === k);
  if (grp("arc").length) h += innateBlock(g, grp("arc"), "occ-arc", "Arcanum mystique", "une fois par repos long, sans emplacement");
  if (grp("inv").length) h += innateBlock(g, grp("inv"), "occ-inv", "Manifestations occultes", "sorts à volonté ou une fois par repos long");
  if (grp("tome").length || grp("pact").length) h += innateBlock(g, [...grp("tome"), ...grp("pact")], "occ-pact", PACTS[g.pacte].n, g.pacte === "grimoire" ? "Livre des Ombres : sorts mineurs à volonté, rituels" : "rituel");
  return h;
}
onClick("occ-bless", () => { const g = G(); if (!g) return; const n = OCC.bless(g), prev = g.hpTemp || 0; let up = false;
  mutate(g => { up = setTemp(g, n); });
  toast(up ? `<b>Bénédiction du ténébreux</b> : ${n} PV temporaires` : `Tu gardes tes ${prev} PV temporaires : ils ne se cumulent pas`, up ? () => { mutate(g => { g.hpTemp = prev; }); return "PV temporaires annulés"; } : null); });
onClick("occ-master", () => { const g = G(); if (!g || g.omasterU) return; const prev = JSON.parse(JSON.stringify({ used: g.used, omasterU: g.omasterU }));
  mutate(g => { g.used = {}; g.omasterU = 1; });
  toast("<b>Maître de l'occulte</b> : emplacements de pacte récupérés", () => { mutate(g => Object.assign(g, prev)); return "Annulé"; }); });

// ---------- Gérer : faveur de pacte, manifestations, Arcanum mystique, Livre des Ombres
const skOf = id => BY_ID[id];
/** Liste de manifestations à cocher. b : personnage au niveau visé ; sel : choisies ; max ; lu : assistant (sinon Gérer) ; locked : anciennes à garder. */
function invPicker(b, sel, max, lu, locked = []) {
  const list = Object.entries(INV).sort((x, y) => x[1].n.localeCompare(y[1].n, "fr"));
  return `<div class="luplist">${list.map(([k, i]) => { const on = sel.includes(k), ok = preOk(b, k), lock = locked.includes(k);
    const kp = `<span class="kp ${i.k === "w" ? "f" : i.k === "s" ? "s" : "n"}">${KIND[i.k]}</span>${i.sp && BY_ID[i.sp] ? `<span class="kp n">${esc(BY_ID[i.sp].n)}</span>` : ""}`;
    return pickRow({ act: lu ? 'data-a="lu-oinv"' : 'data-a="occ-inv"', id: k, on, full: sel.length >= max || lock, off: !ok && !on, why: i.pre ? `Prérequis : ${preText(i.pre)}` : "", name: esc(i.n), label: i.n, pills: kp,
      body: `<div class="eff">${esc(i.d)}</div>${i.pre ? `<span class="muted" style="font-size:12.5px">Prérequis : ${esc(preText(i.pre))}</span>` : ""}` }); }).join("")}</div>`;
}
const cantripPool = () => SPELLS.filter(s => s.l === 0).sort(byName);
const ritualPool = g => SPELLS.filter(s => s.ri && s.l >= 1 && s.l <= Math.ceil(g.level / 2)).sort((a, b) => a.l - b.l || byName(a, b));
function settingsHTML(g) {
  let h = "";
  if (g.level >= 3) {
    h += `<div class="rubric"><h2>Faveur de pacte</h2><span class="aside">niveau 3</span></div>
    <div class="chips">${Object.entries(PACTS).map(([k, p]) => `<button class="chip" data-a="occ-pact" data-v="${k}" aria-pressed="${g.pacte === k}">${p.short}</button>`).join("")}</div>`;
    if (PACTS[g.pacte]) h += `<p class="muted" style="font-size:13px;margin:4px 0">${esc(PACTS[g.pacte].sum)}</p>`;
    if (g.pacte === "lame") { const ws = (g.items || []).filter(x => x.ref && GEAR[x.ref] && GEAR[x.ref].kind === "weapon" && GEAR[x.ref].rng === "melee");
      h += `<div class="field"><label for="occ-pw">Arme de pacte</label><select id="occ-pw"><option value="">Choisir une arme de corps à corps…</option>${ws.map(x => `<option value="${x.ref}"${g.pactW === x.ref ? " selected" : ""}>${esc(x.n)}</option>`).join("")}</select>${ws.length ? "" : `<span class="help">Ajoute d'abord l'arme dans l'équipement (Personnage).</span>`}</div>`; }
    if (g.pacte === "grimoire") { const sel = g.tomeC || [];
      h += `<span class="lusub">Livre des Ombres · sorts mineurs · ${sel.length}/3</span><select id="occ-tome" aria-label="Ajouter un sort mineur au Livre des Ombres"${sel.length >= 3 ? " disabled" : ""}><option value="">Ajouter un sort mineur (toutes classes)…</option>${cantripPool().filter(s => !sel.includes(s.id) && !g.cantrips.includes(s.id)).map(s => `<option value="${s.id}">${esc(s.n)}</option>`).join("")}</select>
      ${sel.length ? `<div class="chips">${sel.map(id => `<button class="chip" data-a="occ-tome-rm" data-v="${id}" aria-label="Retirer ${esc(skOf(id).n)}">${esc(skOf(id).n)} ✕</button>`).join("")}</div>` : ""}`;
      if (has(g, "livre-secrets")) { const r = g.bookR || [];
        h += `<span class="lusub">Livre des secrets anciens · rituels · ${r.length}</span><select id="occ-rit" aria-label="Ajouter un rituel"><option value="">${r.length < 2 ? "Ajouter un rituel de niveau 1…" : "Copier un rituel (2 h et 50 po par niveau)…"}</option>${ritualPool(g).filter(s => !r.includes(s.id) && (r.length >= 2 || s.l === 1)).map(s => `<option value="${s.id}">${esc(s.n)} · niv. ${s.l}</option>`).join("")}</select>
        ${r.length ? `<div class="chips">${r.map(id => `<button class="chip" data-a="occ-rit-rm" data-v="${id}" aria-label="Retirer ${esc(skOf(id).n)}">${esc(skOf(id).n)} ✕</button>`).join("")}</div>` : ""}`; }
    }
  }
  const n = INV_N[g.level];
  if (n) { const sel = g.inv || [], open = S.open.has("occ:inv");
    h += `<div class="rubric"><h2>Manifestations occultes</h2><span class="aside">${sel.length} sur ${n}</span></div>
    <div class="invlist">${sel.filter(k => INV[k]).map(k => `<div class="invrow${preOk(g, k) ? "" : " off"}"><span class="invstar" aria-hidden="true">✦</span><b>${esc(INV[k].n)}</b><span class="kp ${INV[k].k === "w" ? "f" : INV[k].k === "s" ? "s" : "n"}">${KIND[INV[k].k]}</span><small>${esc(INV[k].d)}${preOk(g, k) ? "" : ` <b>Prérequis : ${esc(preText(INV[k].pre))}</b>`}</small></div>`).join("") || `<div class="empty">Aucune manifestation choisie.</div>`}</div>
    <button class="linkbtn" data-a="row" data-id="occ:inv" aria-expanded="${open}">${open ? "Fermer le choix ▴" : sel.length < n ? `Choisir ${n - sel.length} manifestation${n - sel.length > 1 ? "s" : ""} ▾` : "Modifier le choix ▾"}</button>
    ${open ? invPicker(g, sel, n, false) : ""}`; }
  const arcs = OCC.arcLevels(g.level);
  if (arcs.length) h += `<div class="rubric"><h2>Arcanum mystique</h2><span class="aside">un sort par niveau · une fois par repos long</span></div>${arcs.map(l => `<div class="field"><label for="occ-arc-${l}">Niveau ${l}</label><select id="occ-arc-${l}" class="occarc" data-l="${l}"><option value="">Choisir un sort d'occultiste de niveau ${l}…</option>${classSpells(g).filter(s => s.l === l).sort(byName).map(s => `<option value="${s.id}"${(g.arc || {})[l] === s.id ? " selected" : ""}>${esc(s.n)}</option>`).join("")}</select></div>`).join("")}`;
  return h;
}
onClick("occ-pact", (b) => { mutate(g => { g.pacte = b.dataset.v; }); });
onChange("#occ-pw", t => { mutate(g => { g.pactW = t.value || null; }); });
onChange("#occ-tome", t => { if (!t.value) return; mutate(g => { g.tomeC = [...new Set([...(g.tomeC || []), t.value])].slice(0, 3); }); });
onClick("occ-tome-rm", (b) => { mutate(g => { g.tomeC = (g.tomeC || []).filter(x => x !== b.dataset.v); }); });
onChange("#occ-rit", t => { if (!t.value) return; mutate(g => { g.bookR = [...new Set([...(g.bookR || []), t.value])]; }); });
onClick("occ-rit-rm", (b) => { mutate(g => { g.bookR = (g.bookR || []).filter(x => x !== b.dataset.v); }); });
onChange(t => t.classList.contains("occarc"), t => { mutate(g => { g.arc = { ...(g.arc || {}), [t.dataset.l]: t.value || undefined }; if (!t.value) delete g.arc[t.dataset.l]; }); });
onClick("occ-inv", t => { const id = t.dataset.id, g = G(); if (!g) return; const s = g.inv || [], want = !s.includes(id);
  if (want && (s.length >= INV_N[g.level] || !preOk(g, id))) { toast(s.length >= INV_N[g.level] ? `${INV_N[g.level]} manifestations : retire d'abord une manifestation` : "Prérequis non remplis"); return; }
  mutate(g => { g.inv = want ? [...s, id] : s.filter(x => x !== id); }); });

// ---------- Assistant de niveau : faveur de pacte (3), manifestations (gagnées, une à remplacer), Arcanum mystique
function luChoices(g, b, L) {
  let h = "";
  if (b.level === 3) h += `<div class="luprep"><h3>Faveur de pacte</h3><div class="chips">${Object.entries(PACTS).map(([k, p]) => `<button class="chip" data-a="lu-opact" data-v="${k}" aria-pressed="${L.opact === k}">${p.short}</button>`).join("")}</div>${PACTS[L.opact] ? `<span class="muted" style="font-size:13px">${esc(PACTS[L.opact].sum)}</span>` : ""}</div>`;
  const n = INV_N[b.level];
  if (n) { const old = g.inv || [], sel = L.oinv || old, gone = old.filter(k => !sel.includes(k)).length;
    h += `<div class="luprep"><h3>Manifestations occultes · ${sel.length}/${n}</h3><span class="muted">${n > INV_N[g.level] ? `${n - INV_N[g.level]} de plus. ` : ""}Tu peux aussi en remplacer une : retire-la (✓) puis choisis-en une autre${gone ? ` (${gone} remplacée)` : ""}. Grisées : prérequis non remplis.</span>${invPicker(b, sel, n, true, gone >= 1 ? old.filter(k => sel.includes(k)) : [])}</div>`; }
  const arc = Object.entries(ARC_AT).find(([, at]) => at === b.level);
  if (arc) { const l = +arc[0];
    h += `<div class="luprep"><h3>Arcanum mystique · sort de niveau ${l}</h3><select id="lu-oarc" aria-label="Sort d'Arcanum mystique"><option value="">Choisir…</option>${classSpells(b).filter(s => s.l === l).sort(byName).map(s => `<option value="${s.id}"${L.oarc === s.id ? " selected" : ""}>${esc(s.n)}</option>`).join("")}</select><span class="muted">Une fois par repos long, sans emplacement.</span></div>`; }
  return h;
}
onClick("lu-opact", (b) => { if (!S.lu) return; S.lu.opact = b.dataset.v; S.luKeep = true; render(); });
onClick("lu-oinv", t => { const L = S.lu, g = G(); if (!L || !g) return; const old = g.inv || [], sel = L.oinv || [...old], id = t.dataset.id, n = INV_N[L.to];
  const b = { ...g, level: L.to, pacte: L.opact || g.pacte, cantrips: [...g.cantrips, ...(L.cpicks || [])] };
  if (!sel.includes(id)) { if (sel.length >= n || !preOk(b, id)) { toast(sel.length >= n ? `${n} manifestations à ce niveau : retire d'abord une manifestation` : "Prérequis non remplis"); return; } L.oinv = [...sel, id]; }
  else { if (old.includes(id) && old.filter(k => !sel.includes(k)).length >= 1) { toast("Une seule manifestation remplacée par niveau"); return; } L.oinv = sel.filter(x => x !== id); }
  S.luKeep = true; render(); });
onChange("#lu-oarc", t => { if (!S.lu) return; S.lu.oarc = t.value || null; S.luKeep = true; render(); });

// ---------- Création (étape Compétences) : patron d'Outremonde
const creation = {
  html: c => { const x = c.cx || {};
    return `<div class="crcls"><span class="lusub">Patron d'Outremonde · dès le niveau 1</span><p class="help" style="margin:0">Capacités aux niveaux 1, 6, 10 et 14 ; sa liste de sorts s'ajoute à celle de l'occultiste.</p>${Object.entries(PATRONS).map(([k, p]) => { const on = k === x.pat;
      return `<button class="subopt${on ? " on" : ""}" data-a="cr-opat" data-v="${k}" aria-pressed="${on}"><span class="rd" aria-hidden="true"></span><span class="bd"><b>${esc(p.full.charAt(0).toUpperCase() + p.full.slice(1))}</b><small>${esc(p.sum)}</small></span></button>${on ? `<div class="subx"><span class="fpprev">Ajoutés aux sorts proposés : ${p.sp[1].map(id => esc(BY_ID[id].n)).join(" et ")} (niveau 1), puis 2 sorts par niveau jusqu'au 5</span></div>` : ""}`; }).join("")}</div>`; },
  missing: c => PATRONS[(c.cx || {}).pat] ? "" : "choisis ton patron d'Outremonde",
  apply: (g, c) => { const x = c.cx || {}; if (PATRONS[x.pat]) g.patron = x.pat; },
};
onClick("cr-opat", (b) => { if (!S.cr) return; S.cr.cx = { pat: b.dataset.v }; S.cr.prep = (S.cr.prep || []).filter(id => (BY_ID[id].cl || []).includes("occultiste")); S.luKeep = true; render(); });

// ---------- Onglet Règles
function rulesHTML(g) {
  return `<div class="cols rules">
  <div><div class="rubric" style="margin-top:4px"><h3>Magie de pacte</h3></div>
  <p><b>${pactN(g.level)} emplacement${pactN(g.level) > 1 ? "s" : ""} de niveau ${pactLv(g.level)}</b>, récupérés au <b>repos court</b> ou long. Tous tes sorts connus de niveau 1 à ${pactLv(g.level)} se lancent à ce niveau (dégâts affichés en conséquence). Tu connais <b>${R.prepMax(g)} sorts</b> et <b>${R.cantrips(g)} sorts mineurs</b>, et tu peux en remplacer un à chaque niveau. Pas de rituels, sauf avec le Livre des secrets anciens.</p>
  ${castingRules(g)}
  ${concentrationRules()}</div>
  <div><div class="rubric" style="margin-top:4px"><h3>Patron : ${esc(pat(g).full)}</h3></div><p>${esc(pat(g).sum)}</p>
  <p>Liste élargie : ${Object.entries(pat(g).sp).map(([l, ids]) => `niv. ${l} ${ids.map(id => BY_ID[id] ? esc(BY_ID[id].n) : id).join(", ")}`).join(" · ")}.</p>
  <div class="rubric"><h3>Décharge occulte</h3></div><p>Un rayon par jet d'attaque (1, puis 2 au niveau 5, 3 au 11, 4 au 17). Les manifestations la modifient : Décharge déchirante (+ Charisme aux dégâts), Décharge répulsive (recul 3 m), Lance occulte (90 m).</p>
  <div class="rubric"><h3>Arcanum mystique</h3></div><p>Aux niveaux 11, 13, 15 et 17 : un sort de niveau 6, 7, 8 puis 9, lancé une fois par repos long sans emplacement.</p>
  <p class="muted">Source : Manuel des joueurs 2014 (occultiste) ; manifestations d'après AideDD. Résumés rédigés pour la table, à vérifier dans le livre en cas de doute.</p></div></div>`;
}
// ---------- Fiche imprimable
function printSheet(g) {
  const prof = R.prof(g.level), mod = R.am(g), known = g.prepared.map(id => BY_ID[id]).filter(Boolean).sort((a, b) => a.l - b.l || byName(a, b)), inn = innate(g);
  return `${pHeader(g, `Occultiste, niveau ${g.level} · ${esc(pat(g).full)}${PACTS[g.pacte] && g.level >= 3 ? ` · ${esc(PACTS[g.pacte].n)}` : ""}`, [[signed(mod), "MOD. CHARISME"], [OCC.dd(g), "DD DES SORTS"], [signed(prof + mod), "ATTAQUE DE SORT"], [`${pactN(g.level)} × niv. ${pactLv(g.level)}`, "PACTE"], [R.prepMax(g), "SORTS CONNUS"]])}
${pSlots(g)}
${resOf(g).length ? `<h2>Ressources <small>à cocher</small></h2>${resOf(g).map(x => `<div class="res"><span class="l">${esc(x.n)}</span>${pDots(1)}<span class="r">${x.rest}</span></div>`).join("")}` : ""}
<h2>Capacités de classe <small>niveau ${g.level}</small></h2>
<table>${feats(g).filter(f => f.lv <= g.level).map(f => `<tr><td class="n">${f.n}</td><td>${esc(f.d(g))}</td></tr>`).join("")}</table>
${(g.inv || []).length ? `<h2>Manifestations occultes</h2><table>${g.inv.filter(k => INV[k]).map(k => `<tr><td class="n">${esc(INV[k].n)}</td><td>${esc(INV[k].d)}</td></tr>`).join("")}</table>` : ""}
${pCantrips(g)}
${pExtras(g)}
${pConc()}
<div class="brk"></div>
${inn.length ? `<h2 style="margin-top:0">Sans emplacement <small>arcanum, manifestations, pacte</small></h2><table><tr><th>Sort</th><th>Incantation · composantes</th><th>Effet</th></tr>${inn.map(x => pSpellRow(g, x.s, false)).join("")}</table>` : ""}
<h2${inn.length ? "" : ' style="margin-top:0"'}>Sorts connus <small>${known.length} / ${R.prepMax(g)} · lancés au niveau ${pactLv(g.level)}</small></h2>
${known.length ? `<table><tr><th>Sort</th><th>Incantation · composantes</th><th>Effet</th></tr>${known.map(s => pSpellRow(g, s, false)).join("")}</table>` : "<p>Aucun sort connu pour l'instant.</p>"}
${pNotes(g)}
${pFoot("OCCULTISTE")}`;
}

// ---------- Définition de la classe (contrat : voir docs/ARCHITECTURE.md) ----------
const row = (l, o, n, cls) => `<div class="${o === n ? "same" : ""}"><span>${l}</span><span class="old">${o}</span><span class="ar">→</span><b${cls && o !== n ? ` style="color:var(${cls})"` : ""}>${n}</b></div>`;
const blade = g => g.level >= 3 && g.pacte === "lame";
const SHORT = ["ofeyU", "oluckU", "omistU", "oentU", "odelU"];
export default {
  n: "Occultiste", ab: "cha", abN: "Charisme", abArticle: "le Charisme", slots: PACT_SLOTS, top: 5, hitDie: "1d8",
  saves: ["wis", "cha"],
  weaponProf: g => ["simple", ...(blade(g) && g.pactW ? [g.pactW] : [])],   // arme de pacte maîtrisée
  armorProf: ["light"],
  cantrips: lv => lv >= 10 ? 4 : lv >= 4 ? 3 : 2,
  known: lv => KNOWN[lv] || 0,
  prep: () => 0,
  pact: () => true,                                         // magie de pacte : un seul niveau d'emplacements
  extraList: g => Object.values(pat(g).sp).flat(),          // liste élargie du patron
  defaults: () => ({ patron: "fielon", pacte: null, inv: [], arc: {}, tomeC: [], bookR: [], pactW: null, ofeyU: 0, oluckU: 0, omistU: 0, oentU: 0, odelU: 0, ohellU: 0, omasterU: 0 }),
  normalize(o) { if (!PATRONS[o.patron]) o.patron = "fielon"; if (!PACTS[o.pacte]) o.pacte = null; o.inv = Array.isArray(o.inv) ? o.inv.filter(k => INV[k]) : [];
    o.arc = o.arc && typeof o.arc === "object" ? Object.fromEntries(Object.entries(o.arc).filter(([l, id]) => ARC_AT[l] && BY_ID[id])) : {};
    o.tomeC = Array.isArray(o.tomeC) ? o.tomeC.filter(id => BY_ID[id] && BY_ID[id].l === 0).slice(0, 3) : []; o.bookR = Array.isArray(o.bookR) ? o.bookR.filter(id => BY_ID[id]) : [];
    ["ofeyU", "oluckU", "omistU", "oentU", "odelU", "ohellU", "omasterU"].forEach(f => { o[f] = Math.max(0, +o[f] || 0); }); },
  subclass: { lv: 1, label: "Patron d'Outremonde", field: "patron", opts: () => Object.entries(PATRONS).map(([k, p]) => [k, p.full, p.sum]) },
  subline: g => `Occultiste niveau ${g.level} · ${esc(pat(g).full)}`,
  subclassField: g => `<div class="field"><label for="f-patron">Patron d'Outremonde</label><select id="f-patron">${Object.entries(PATRONS).map(([k, p]) => `<option value="${k}"${k === g.patron ? " selected" : ""}>${p.n}</option>`).join("")}</select></div>`,
  heroStats: g => { const cMax = R.cantrips(g); return `<div class="stat ${g.cantrips.length > cMax ? "alert" : ""}" role="listitem"><div class="v">${g.cantrips.length}<small>/${cMax}</small></div>${statLabel("Sorts mineurs", "Mineurs")}</div>
    <div class="stat" role="listitem"><div class="v">${(g.inv || []).length}<small>/${INV_N[g.level]}</small></div>${statLabel("Manifestations", "Manif.")}</div>`; },
  tabs: g => [["grimoire", "Sorts"], ["biblio", "Bibliothèque", classSpells(g).length]],
  moreTabs: () => [["regles", "Règles"], ["imprimer", "Imprimer"]],
  panels: { imprimer: g => printHTML(g), regles: g => rulesHTML(g) },
  print: g => printSheet(g),
  printTitle: g => `Fiche d'occultiste de ${g.name}`,
  printDesc: "Elle contient le tableau de bord (emplacements de pacte et ressources à cocher), les capacités du patron, les manifestations occultes, les sorts sans emplacement et les sorts connus.",
  features: g => feats(g),
  settings: g => settingsHTML(g),
  resources: g => resHTML(g),
  resourceMax: Object.fromEntries(RES.map(x => [x.r, () => 1])),
  innate: g => innate(g),
  skillProf: (g, k) => has(g, "presence-captivante") && (k === "persuasion" || k === "deception") ? 1 : 0,
  // Décharge occulte : rayons et Décharge déchirante calculés
  dmgBonus: (g, s) => s.id === "eldritch-blast" && has(g, "decharge-dechirante") ? R.am(g) : 0,
  pillText: (g, s, v) => s.id === "eldritch-blast" ? `${beams(g.level)} rayon${beams(g.level) > 1 ? "s" : ""} · ${v.replace(" par rayon", "")}${has(g, "lance-occulte") ? " · 90 m" : ""}` : v,
  castExtras: (g, s) => { if (s.id !== "eldritch-blast") return "";
    const n = [has(g, "decharge-dechirante") ? "<b>Décharge déchirante</b> : + CHA à chaque rayon (calculé)" : "", has(g, "decharge-repulsive") ? "<b>Décharge répulsive</b> : un rayon qui touche repousse de 3 m" : "", has(g, "lance-occulte") ? "<b>Lance occulte</b> : portée 90 m" : "",
      (g.effects || []).some(e => e.id === "hex") ? "<b>Maléfice</b> actif : +1d6 nécrotique à chaque rayon qui touche la cible" : ""].filter(Boolean);
    return n.length ? `<div class="occeb">${n.map(x => `<span>✦ ${x}</span>`).join("")}</div>` : ""; },
  attackMods: (g, w) => blade(g) && w.id === g.pactW ? { pills: ["arme de pacte", ...(has(g, "buveuse-vie") && g.level >= 12 ? [`+${Math.max(1, R.am(g))} nécrotique`] : [])] } : {},
  attackNotes: g => [blade(g) && has(g, "lame-assoiffee") && g.level >= 5 ? "<b>Lame assoiffée</b> : deux attaques avec ton arme de pacte par action Attaquer." : "", blade(g) && !g.pactW ? "<b>Pacte de la lame</b> : choisis ton arme de pacte dans Sorts › Gérer." : ""].filter(Boolean),
  restBar: g => `<span class="muted">Repos court : dés de vie, <b>emplacements de pacte</b>${resOf(g).some(x => x.rest === "repos court") ? ", capacités du patron" : ""}. Repos long : tout.</span>`,
  shortRest: () => ({ fields: ["used", ...SHORT], label: "emplacements de pacte", done: "récupérés", reset: g => { g.used = {}; SHORT.forEach(f => { g[f] = 0; }); } }),
  longRest: g => { SHORT.forEach(f => { g[f] = 0; }); g.ohellU = 0; g.omasterU = 0; },
  creation,
  levelUp: {
    rowsAfter: (g, b) => row("Sorts mineurs connus", R.cantrips(g), R.cantrips(b), "--rubric") + row("Emplacements de pacte", `${pactN(g.level)} × niv. ${pactLv(g.level)}`, `${pactN(b.level)} × niv. ${pactLv(b.level)}`, "--ok") + (INV_N[b.level] ? row("Manifestations", INV_N[g.level], INV_N[b.level], "--ok") : "") + row("Décharge occulte", `${beams(g.level)} rayon${beams(g.level) > 1 ? "s" : ""}`, `${beams(b.level)} rayon${beams(b.level) > 1 ? "s" : ""}`, "--ok"),
    choices: (g, b, L) => luChoices(g, b, L),
    notes: (g, to) => [pactLv(to) > pactLv(to - 1) ? `<span><b>Magie de pacte</b> : tous tes emplacements passent au niveau ${pactLv(to)} ; tes sorts connus se lancent à ce niveau.</span>` : ""].filter(Boolean),
    recapBefore: (g, b, L) => [L.opact ? `<div><span class="n">Faveur de pacte</span><small>${esc(PACTS[L.opact].n)}</small></div>` : "",
      L.oinv ? `<div><span class="n">Manifestations</span><small>${[...L.oinv.filter(k => !(g.inv || []).includes(k)).map(k => "+ " + esc(INV[k].n)), ...(g.inv || []).filter(k => !L.oinv.includes(k)).map(k => "− " + esc(INV[k].n))].join(", ") || "inchangées"}</small></div>` : "",
      L.oarc ? `<div><span class="n">Arcanum mystique</span><small>${esc(BY_ID[L.oarc].n)}</small></div>` : ""].join(""),
    apply: (g, L) => { if (L.opact) g.pacte = L.opact; if (L.oinv) g.inv = [...L.oinv]; if (L.oarc) { const l = BY_ID[L.oarc].l; g.arc = { ...(g.arc || {}), [l]: L.oarc }; } },
  },
};
export { OCC, INV, PATRONS, PACTS, PACT_SLOTS };
