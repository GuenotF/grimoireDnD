// Roublard (Manuel des joueurs 2014) : Attaque sournoise, Expertise, Ruse, archétypes Assassin, Voleur, Escroc arcanique.
// Classe sans sorts (onglet Capacités), sauf l'Escroc arcanique au niveau 3 : tiers de lanceur, sorts de magicien
// d'enchantement et d'illusion (même méthode que le Chevalier occulte). Résumés rédigés pour la table, à vérifier dans le livre.
import { onChange } from "../core/actions.js";
import { byName, esc, signed } from "../core/format.js";
import { S } from "../core/state.js";
import { mutate } from "../core/store.js";
import { render } from "../core/ui.js";
import { abilitiesHTML } from "../features/abilities.js";
import { pCantrips, pDots, pFoot, pHeader, pSlots, pSpellRow, printHTML } from "../features/print.js";
import { initiative, passivePerception, skillBonus } from "../rules/character.js";
import { R, classSpells } from "../rules/common.js";
import { acOf } from "../rules/equipment.js";
import { THIRD, THIRD_KNOWN, thirdFree, thirdOk } from "../rules/tables.js";
import { BY_ID, SPELLS } from "../data.js";
import { capRow, foldSec, pillsRaw, statLabel } from "../ui/components.js";

// Archétypes du Manuel des joueurs
const ARCH = { escroc: { n: "Escroc arcanique", full: "Escroc arcanique", sum: "Sorts de magicien (surtout enchantement et illusion), main de mage invisible pour l'escamotage, Embuscade magique (9), Escroc polyvalent (13), Voleur de sort (17)." }, assassin: { n: "Assassin", full: "Assassin", sum: "Assassinat : avantage contre qui n'a pas encore joué, critique contre une créature surprise. Puis fausse identité, Imposteur, Frappe mortelle." },
  voleur: { n: "Voleur", full: "Voleur", sum: "Mains lestes : la Ruse sert aussi à Escamoter, crocheter, désamorcer ou Utiliser un objet. Monte-en-l'air, puis Discrétion suprême, objets magiques sans restriction, deux tours au premier round." } };
const ROU = {
  sneak: g => Math.ceil(g.level / 2),                       // Attaque sournoise : 1d6 au niveau 1, +1d6 tous les deux niveaux
  dd: g => 8 + R.prof(g.level) + R.ab(g, "dex"),            // Frappe mortelle (Assassin, niveau 17)
};
const AT_SCHOOLS = ["Enchantement", "Illusion"];
const at = g => g.arch === "escroc" && g.level >= 3;
const WIZ = () => SPELLS.filter(s => (s.cl || []).includes("magicien")).map(s => s.id);
const ROU_FEATS = [
  { id: "expertise", lv: 1, n: "Expertise", pill: g => g.level >= 6 ? "4 maîtrises doublées" : "2 maîtrises doublées", k: "f", d: g => `Choisis ${g.level >= 6 ? "quatre" : "deux"} de tes compétences maîtrisées (ou les outils de voleur) : ton bonus de maîtrise est doublé pour elles. Deux au niveau 1, deux de plus au niveau 6 (onglet Personnage : toucher deux fois une compétence).` },
  { id: "sneak", lv: 1, n: "Attaque sournoise", pill: g => `+${ROU.sneak(g)}d6 · 1 fois par tour`, k: "d", d: g => `Une fois par tour, +${ROU.sneak(g)}d6 dégâts à une créature touchée avec une arme de finesse ou à distance, si tu as l'avantage à l'attaque, ou si un ennemi de la cible est à 1,5 m d'elle (pas neutralisé) et que tu n'as pas de désavantage.` },
  { id: "cant", lv: 1, n: "Jargon des voleurs", pill: () => "langue secrète", k: "f", d: () => "Argot, signes et symboles des voleurs : tu peux cacher un message dans une conversation banale (quatre fois plus long à dire)." },
  { id: "cunning", lv: 2, n: "Ruse", pill: () => "action bonus : Foncer, Se désengager, Se cacher", k: "f", d: () => "À chacun de tes tours, en action bonus : Foncer, Se désengager ou Se cacher." },
  { id: "arch", lv: 3, n: "Archétype de roublard", pill: g => ARCH[g.arch].full, k: "f", d: g => `Tu suis l'archétype ${ARCH[g.arch].full} ; ses capacités arrivent aux niveaux 3, 9, 13 et 17.` },
  { id: "bonusprof", lv: 3, arch: "assassin", n: "Maîtrises supplémentaires", pill: () => "kit de déguisement, matériel d'empoisonneur", k: "f", d: () => "Tu maîtrises le kit de déguisement et le matériel d'empoisonneur (ajoutés d'office dans Personnage › Outils et langues)." },
  { id: "assassinate", lv: 3, arch: "assassin", n: "Assassinat", pill: () => "avantage · critique si surprise", k: "d", d: () => "Avantage aux attaques contre toute créature qui n'a pas encore joué son tour dans le combat. Tout coup réussi contre une créature surprise est un coup critique (dés de dégâts doublés, Attaque sournoise comprise)." },
  { id: "fasthands", lv: 3, arch: "voleur", n: "Mains lestes", pill: () => "Ruse : Escamotage, outils, objet", k: "f", d: () => "L'action bonus de la Ruse sert aussi à faire un test de Dextérité (Escamotage), à crocheter une serrure ou désamorcer un piège avec les outils de voleur, ou à Utiliser un objet." },
  { id: "climber", lv: 3, arch: "voleur", n: "Monte-en-l'air", pill: g => `escalade sans surcoût · saut +${String(Math.max(0, R.ab(g, "dex")) * 0.3).replace(".", ",")} m`, k: "f", d: g => `Escalader ne te coûte plus de mouvement supplémentaire, et la distance de ton saut en longueur avec élan augmente de ton mod. de DEX × 30 cm (+${String(Math.max(0, R.ab(g, "dex")) * 0.3).replace(".", ",")} m).` },
  { id: "atcast", lv: 3, arch: "escroc", n: "Incantation", pill: g => `${THIRD_KNOWN[g.level]} sorts connus · INT`, k: "f", d: g => `Sorts de magicien, Intelligence (DD ${8 + R.prof(g.level) + R.ab(g, "int")}). Enchantement ou illusion, sauf ${thirdFree(g.level)} sort${thirdFree(g.level) > 1 ? "s" : ""} d'une école libre (niveaux 3, 8, 14, 20). Sorts mineurs : main de mage et ${g.level >= 10 ? 3 : 2} autres.` },
  { id: "legerdemain", lv: 3, arch: "escroc", n: "Escamotage et main de mage", pill: () => "main invisible · Ruse", k: "f", d: () => "Ta main de mage est invisible. Elle peut ranger ou prendre un objet porté par une créature, utiliser des outils de voleur à distance (crocheter, désamorcer) ; discrètement si ton Escamotage bat la Perception de la créature. La Ruse (action bonus) sert à la contrôler." },
  { id: "ambush", lv: 9, arch: "escroc", n: "Embuscade magique", pill: () => "désavantage au JdS si tu es caché", k: "s", d: () => "Si tu es caché d'une créature quand tu lui lances un sort, elle a un désavantage à ses jets de sauvegarde contre ce sort ce tour-ci." },
  { id: "versatile", lv: 13, arch: "escroc", n: "Escroc polyvalent", pill: () => "action bonus : avantage", k: "f", d: () => "Action bonus : désigne une créature à 1,50 m de ta main de mage ; avantage à tes attaques contre elle jusqu'à la fin du tour." },
  { id: "thief", lv: 17, arch: "escroc", n: "Voleur de sort", pill: () => "réaction · repos long", k: "s", d: g => `Réaction quand un sort te cible ou t'inclut dans sa zone : le lanceur fait un JdS avec sa caractéristique d'incantation (DD ${8 + R.prof(g.level) + R.ab(g, "int")}). Échec : le sort n'a pas d'effet sur toi et tu le connais pendant 8 heures (s'il est d'un niveau que tu peux lancer) ; il ne peut plus le lancer pendant ce temps. Une fois par repos long.` },
  { id: "uncanny", lv: 5, n: "Esquive instinctive", pill: () => "réaction : dégâts ½", k: "s", d: () => "Quand un attaquant que tu vois te touche, ta réaction divise par deux les dégâts de cette attaque (bouton « Dégâts ½ » de la carte des PV)." },
  { id: "evasion", lv: 7, n: "Dérobade", pill: () => "JdS DEX : 0 ou ½", k: "s", d: () => "Contre un effet qui permet un jet de sauvegarde de Dextérité pour moitié des dégâts (souffle, boule de feu…) : aucun dégât si tu réussis, la moitié si tu échoues." },
  { id: "supreme", lv: 9, arch: "voleur", n: "Discrétion suprême", pill: () => "avantage en Discrétion à ½ vitesse", k: "f", d: () => "Avantage aux tests de Dextérité (Discrétion) si tu ne te déplaces pas de plus de la moitié de ta vitesse pendant ce tour." },
  { id: "infiltration", lv: 9, arch: "assassin", n: "Expert en infiltration", pill: () => "fausse identité", k: "f", d: () => "En sept jours et pour 25 po, tu te forges une fausse identité solide (histoire, profession, relations) ; on la croit tant que rien ne prouve le contraire." },
  { id: "reliable", lv: 11, n: "Talent", pill: () => "d20 au moins 10", k: "f", d: () => "Pour un test de caractéristique avec une compétence maîtrisée, un résultat de 9 ou moins au d20 compte comme un 10." },
  { id: "magicitem", lv: 13, arch: "voleur", n: "Utilisation d'objets magiques", pill: () => "objets sans restriction", k: "f", d: () => "Tu ignores les restrictions de classe, de race et de niveau pour utiliser et te lier aux objets magiques." },
  { id: "impostor", lv: 13, arch: "assassin", n: "Imposteur", pill: () => "imiter une personne", k: "f", d: () => "Après trois heures d'observation, tu imites sans faille la voix, l'écriture et les manières d'une personne ; avantage aux tests de Charisme (Tromperie) pour éviter d'être démasqué." },
  { id: "blindsense", lv: 14, n: "Perception aveugle", pill: () => "créatures à 3 m", k: "f", d: () => "Si tu entends, tu sais où se trouvent les créatures cachées ou invisibles à 3 m de toi." },
  { id: "slippery", lv: 15, n: "Esprit fuyant", pill: () => "maîtrise des JdS de SAG", k: "f", d: () => "Tu maîtrises les jets de sauvegarde de Sagesse (ajouté automatiquement)." },
  { id: "reflexes", lv: 17, arch: "voleur", n: "Réflexes de voleur", pill: g => `2 tours au 1er round (2e à initiative ${initiative(g) - 10})`, k: "f", d: g => `Au premier round d'un combat, tu joues deux tours : le premier à ton initiative, le second à ton initiative − 10. Impossible si tu es surpris.` },
  { id: "death", lv: 17, arch: "assassin", n: "Frappe mortelle", pill: g => `JdS CON DD ${ROU.dd(g)} · dégâts ×2`, k: "s", d: g => `Quand tu attaques et touches une créature surprise, elle fait un jet de sauvegarde de Constitution (DD ${ROU.dd(g)}, 8 + DEX + maîtrise) : sur un échec, les dégâts de l'attaque sont doublés.` },
  { id: "elusive", lv: 18, n: "Insaisissable", pill: () => "aucun avantage contre toi", k: "f", d: () => "Tant que tu n'es pas neutralisé, aucune attaque contre toi n'a l'avantage." },
  { id: "luck", lv: 20, n: "Coup de chance", pill: () => "1 fois · repos court ou long", k: "f", d: () => "Une attaque ratée devient un coup réussi, ou un test de caractéristique raté devient un 20 naturel. Une fois par repos court ou long." },
];
const feats = g => ROU_FEATS.filter(f => !f.arch || f.arch === g.arch);
// Arme qui permet l'Attaque sournoise : finesse ou à distance
const sneakable = w => w.finesse || w.rng === "ranged";

// ---------- Carte Attaque sournoise (onglet Capacités) : une case « Utilisée » suffit
function sneakCard(g) {
  const used = !!S.sneakUsed;
  return `<section class="ragecard sneak${used ? " used" : ""}" id="sneak-card"><div class="rh"><b>Attaque sournoise</b><span class="kp d">+${ROU.sneak(g)}d6</span><span class="muted">1 fois par tour</span></div>
    <p>Arme de <b>finesse</b> ou <b>à distance</b>, et : <b>avantage</b> à l'attaque, <b>ou</b> un allié à 1,5 m de la cible (sans désavantage).${g.level >= 3 && g.arch === "assassin" ? " <b>Assassinat</b> : avantage contre qui n'a pas encore joué ; critique contre une créature surprise." : ""}</p>
    <label class="check"><input type="checkbox" data-a="sneak-used"${used ? " checked" : ""}> Utilisée ce tour</label></section>`;
}
function rouResHTML(g) {
  let h = "";
  if (g.level >= 2) h += foldSec("res-ruse", "Ruse", "action bonus, à chaque tour", `<div class="pills" style="margin-bottom:6px">${[["n", "Foncer", "vitesse doublée"], ["n", "Se désengager", "pas d'attaque d'opportunité"], ["n", "Se cacher", "test de Discrétion " + signed(skillBonus(g, "stealth"))], ...(g.level >= 3 && g.arch === "voleur" ? [["n", "Mains lestes", "Escamotage " + signed(skillBonus(g, "sleight")) + ", outils, objet"]] : [])].map(([k, l, v]) => `<div class="pill ${k}"><span class="pl">${l}</span><span class="pv">${esc(v)}</span></div>`).join("")}</div>`);
  if (at(g) && g.level >= 17) h += `<div class="slots res">${capRow(g, "thief", "Voleur de sort", "repos long", `<button class="pip${g.thiefU ? " used" : ""}" data-a="res-pip" data-r="thief" data-k="0" aria-label="Voleur de sort, ${g.thiefU ? "utilisé" : "disponible"}"></button>`, false, () => pillsRaw([["n", "Temps", "réaction"], ["s", "JdS du lanceur", `DD ${8 + R.prof(g.level) + R.ab(g, "int")}`], ["f", "Effet", "sort volé 8 heures"]]))}</div>`;
  if (g.level >= 20) {
    const u = Math.min(1, g.luckU);
    h += `<div class="slots res">${capRow(g, "luck", "Coup de chance", "repos court ou long", `<button class="pip${u ? " used" : ""}" data-a="res-pip" data-r="luck" data-k="0" aria-label="Coup de chance, ${u ? "utilisé" : "disponible"}"></button>`, false, () => pillsRaw([["f", "Effet", "raté → réussi, ou test → 20"]]))}</div>`;
  }
  return h;
}
onChange("sneak-used", t => { S.sneakUsed = t.checked; render(); });
onChange("#f-arch", t => { mutate(g => { g.arch = t.value; }); });

// ---------- Onglet Règles
function rulesHTML(g) {
  return `<div class="cols rules">
  <div><div class="rubric" style="margin-top:4px"><h3>Attaque sournoise</h3></div>
  <p><b>Une fois par tour</b>, <span class="kp d">+${ROU.sneak(g)}d6</span> aux dégâts d'une attaque réussie avec une arme de <b>finesse</b> ou <b>à distance</b>, si tu as l'<b>avantage</b>, ou si un ennemi de la cible est à 1,5 m d'elle (pas neutralisé) et que tu n'as pas de désavantage. Une fois par tour, pas par attaque : elle peut servir pendant le tour d'un autre (attaque d'opportunité).</p>
  <div class="rubric"><h3>Ruse</h3></div>
  <p>Action bonus à chaque tour : <b>Foncer</b>, <b>Se désengager</b> ou <b>Se cacher</b>.</p>
  <div class="rubric"><h3>Combat à deux armes</h3></div>
  <p>Avec une arme légère de corps à corps dans chaque main : après l'attaque de l'action Attaquer, une attaque avec l'autre arme en <b>action bonus</b>, sans modificateur positif aux dégâts. Elle se partage l'action bonus avec la Ruse.</p></div>
  <div><div class="rubric" style="margin-top:4px"><h3>Assassin</h3></div>
  <p><b>Assassinat</b> (niveau 3) : avantage contre toute créature qui n'a pas encore joué. Contre une créature <b>surprise</b>, tout coup est critique : les dés (arme et sournoise) sont doublés. La surprise se décide à la Discrétion, au début du combat.</p>
  <div class="rubric"><h3>Expertise</h3></div>
  <p>Bonus de maîtrise doublé pour 2 compétences (ou outils de voleur) au niveau 1, 2 de plus au niveau 6.</p>
  <div class="rubric"><h3>Récupérer</h3></div>
  <p><b>Repos court :</b> dés de vie${g.level >= 20 ? ", Coup de chance" : ""}. <b>Repos long :</b> PV, moitié des dés de vie.</p>
  <p class="muted">Source : Manuel des joueurs 2014 (roublard, Assassin). Résumés rédigés pour la table, à vérifier dans le livre en cas de doute.</p></div></div>`;
}
// ---------- Fiche imprimable
function printSheet(g) {
  return `${pHeader(g, `Roublard, niveau ${g.level}${g.level >= 3 ? ` · ${esc(ARCH[g.arch].full)}` : ""}`, [[`${ROU.sneak(g)}d6`, "ATTAQUE SOURNOISE"], [signed(initiative(g)), "INITIATIVE"], [acOf(g) ?? "____", "CA"], [signed(skillBonus(g, "stealth")), "DISCRÉTION"], [passivePerception(g), "PERCEPTION PASSIVE"]])}
<h2>Attaque sournoise <small>1 fois par tour · finesse ou distance</small></h2>
<div class="res"><span class="l">+${ROU.sneak(g)}d6</span>Avantage, ou allié à 1,5 m de la cible (sans désavantage)<span class="r">utilisée ce tour ${pDots(1)}</span></div>
${g.level >= 2 ? `<div class="callout"><b>Ruse</b> (action bonus) : Foncer, Se désengager, Se cacher.${g.level >= 5 ? " <b>Esquive instinctive</b> (réaction) : dégâts ÷ 2 contre un attaquant visible." : ""}</div>` : ""}
<h2>Capacités de classe</h2>
<table>${feats(g).filter(f => f.lv <= g.level).map(f => `<tr><td class="n">${f.n}</td><td>${esc(f.d(g))}</td></tr>`).join("")}</table>
${at(g) ? `${pSlots(g)}${pCantrips(g)}<h2>Sorts connus <small>${g.prepared.length} / ${R.prepMax(g)} · INT, DD ${8 + R.prof(g.level) + R.ab(g, "int")}</small></h2><table><tr><th>Sort</th><th>Incantation · composantes</th><th>Effet</th></tr>${g.prepared.map(id => BY_ID[id]).filter(Boolean).sort((a, b) => a.l - b.l || byName(a, b)).map(s => pSpellRow(g, s, false)).join("")}</table>` : ""}
${pFoot("ATELIER DU GRIMOIRE · ROUBLARD")}`;
}

// ---------- Définition de la classe (contrat : voir docs/ARCHITECTURE.md) ----------
export default {
  n: "Roublard", hitDie: "1d8",
  noSpells: g => !at(g),                                               // sorts seulement en Escroc arcanique (niveau 3)
  ab: "int", abN: "Intelligence", abArticle: "l'Intelligence",
  slots: g => g.arch === "escroc" ? THIRD : {}, top: 4,
  cantrips: () => 0, cantripBonus: g => g.arch === "escroc" && g.level >= 3 ? (g.level >= 10 ? 4 : 3) : 0, // main de mage comprise
  known: lv => THIRD_KNOWN[lv] || 0, prep: () => 0,
  extraList: g => g.arch === "escroc" ? WIZ() : [],                  // liste du magicien
  knownOk: (g, s, ids) => g.arch === "escroc" ? thirdOk(g.level, AT_SCHOOLS, s, ids, BY_ID) : "",
  fileLabel: "Roublard",
  saves: g => g.level >= 15 ? ["dex", "int", "wis"] : ["dex", "int"],   // Esprit fuyant au niveau 15
  weaponProf: ["simple", "crossbow-hand", "longsword", "rapier", "shortsword"], armorProf: ["light"],
  asiLevels: [4, 8, 10, 12, 16, 19],
  tools: g => ["Outils de voleur", ...(g.level >= 3 && g.arch === "assassin" ? ["Kit de déguisement", "Matériel d'empoisonneur"] : [])],
  langs: () => ["Jargon des voleurs"],
  defaults: () => ({ arch: "assassin", luckU: 0, thiefU: 0 }),
  normalize(o) { if (!ARCH[o.arch]) o.arch = "assassin"; o.luckU = Math.max(0, +o.luckU || 0); o.thiefU = Math.max(0, +o.thiefU || 0); },
  subclass: { lv: 3, label: "Archétype", field: "arch", opts: () => Object.entries(ARCH).map(([k, a]) => [k, a.full, a.sum]) },
  subline: g => `Roublard niveau ${g.level}${g.level >= 3 ? ` · ${esc(ARCH[g.arch].full)}` : ""}`,
  subclassField: g => `<div class="field"><label for="f-arch">Archétype</label><select id="f-arch">${Object.entries(ARCH).map(([k, o]) => `<option value="${k}"${k === g.arch ? " selected" : ""}>${o.n}</option>`).join("")}</select></div>`,
  heroStats: g => {
    const st = (v, f, s, cls = "") => `<div class="stat${cls}" role="listitem"><div class="v">${v}</div>${statLabel(f, s)}</div>`;
    if (at(g) && S.tab !== "caps") return st(`${ROU.sneak(g)}d6`, "Attaque sournoise", "Sournoise", " sneak") + st(signed(skillBonus(g, "sleight")), "Escamotage", "Escamotage"); // en-tête des sorts
    return st(`${ROU.sneak(g)}d6`, "Attaque sournoise", "Sournoise", " sneak") + st(signed(initiative(g)), "Initiative", "Initiative") + st(acOf(g) ?? "?", "CA", "CA")
      + st(signed(skillBonus(g, "stealth")), "Discrétion", "Discrétion") + st(passivePerception(g), "Perception passive", "Perc. passive") + st(signed(R.prof(g.level)), "Maîtrise", "Maîtrise");
  },
  tabs: g => [["caps", "Capacités"], ...(at(g) ? [["grimoire", "Sorts"], ["biblio", "Bibliothèque", classSpells(g).length]] : [])],
  moreTabs: () => [["regles", "Règles"], ["imprimer", "Imprimer"]],
  panels: { caps: g => abilitiesHTML(g), regles: g => rulesHTML(g), imprimer: g => printHTML(g) },
  print: g => printSheet(g),
  printTitle: g => `Fiche de roublard de ${g.name}`,
  printDesc: "Elle contient la page Personnage (attaques, compétences, équipement), l'Attaque sournoise, la Ruse et toutes les capacités de classe de ton niveau.",
  features: g => feats(g),
  capsTop: g => sneakCard(g),
  resources: g => rouResHTML(g),
  resourceMax: { luck: g => g.level >= 20 ? 1 : 0, thief: () => 1 },
  shortRest: g => g.level >= 20 ? { field: "luckU", label: "Coup de chance", done: "récupéré" } : null,
  longRest: g => { g.luckU = 0; g.thiefU = 0; },
  longOnly: g => [g.thiefU ? "Voleur de sort" : ""],
  // Attaque sournoise rappelée sur les armes de finesse ou à distance
  attackMods: (g, w) => sneakable(w) ? { pills: [S.sneakUsed ? "sournoise déjà utilisée ce tour" : `sournoise +${ROU.sneak(g)}d6`] } : {},
  attackNotes: g => [g.level >= 3 && g.arch === "assassin" ? "<b>Assassinat</b> : avantage contre une créature qui n'a pas encore joué ; critique contre une créature surprise." : "",
    g.level >= 17 && g.arch === "assassin" ? `<b>Frappe mortelle</b> : créature surprise touchée, JdS CON DD ${ROU.dd(g)} ou dégâts doublés.` : "",
    at(g) && g.level >= 13 ? "<b>Escroc polyvalent</b> : action bonus, avantage contre une créature à 1,50 m de ta main de mage." : ""].filter(Boolean),
  // Esquive instinctive (réaction) : dégâts d'une attaque divisés par 2
  halfDamage: g => g.level >= 5 ? "Esquive instinctive (réaction, attaquant visible)" : "",
  levelUp: {
    step2: "Choix",
    rowsAfter: (g, b) => { const o = `${ROU.sneak(g)}d6`, n = `${ROU.sneak(b)}d6`; return `<div class="${o === n ? "same" : ""}"><span>Attaque sournoise</span><span class="old">${o}</span><span class="ar">→</span><b${o !== n ? ' style="color:var(--pd-fg)"' : ""}>${n}</b></div>`; },
    autoCantrips: (g, b) => b.arch === "escroc" && b.level >= 3 ? ["mage-hand"] : [],   // Escroc arcanique : main de mage offerte
    notes: (g, to) => [to === 3 ? `<span><b>Escroc arcanique</b> : onglet Sorts (main de mage offerte, sorts de magicien d'enchantement et d'illusion).</span>` : "", to === 3 && g.arch === "assassin" ? `<span><b>Assassin</b> : kit de déguisement et matériel d'empoisonneur ajoutés dans Outils et langues.</span>` : "",
      to === 6 ? `<span><b>Expertise</b> : deux compétences de plus (onglet Personnage, toucher deux fois la compétence).</span>` : ""].filter(Boolean),
  },
};
