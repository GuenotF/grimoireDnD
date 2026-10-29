// Magicien : capacités de classe et des 8 écoles (traditions arcaniques, Manuel des joueurs 2014, texte d'AideDD
// résumé pour la table). Ressources suivies : Protection arcanique (Abjuration, absorbe les dégâts avant les PV),
// Présage (Divination), et une utilisation par repos pour Permutation, Double illusoire et Métamorphe.
import { onChange, onClick, onInput } from "../core/actions.js";
import { esc, signed } from "../core/format.js";
import { G, S } from "../core/state.js";
import { mutate } from "../core/store.js";
import { render, toast } from "../core/ui.js";
import { R } from "../rules/common.js";
import { capRow, foldSec, pillsRaw } from "../ui/components.js";

const dd = g => 8 + R.prof(g.level) + R.am(g);
const school = g => g.school;
// Arrivée de la tradition : niveau 2 ; « Savant » commun à toutes les écoles
const sav = (n, d) => ({ lv: 2, n, pill: () => "copie ½ temps, ½ or", k: "f", d: () => `Copier un sort ${d} dans ton grimoire te coûte deux fois moins de temps et d'or.` });
const SCHOOL_FEATS = {
  Abjuration: [sav("Abjurateur érudit", "d'abjuration"),
    { id: "ward", lv: 2, n: "Protection arcanique", pill: g => `${wardMax(g)} PV de protection`, k: "s", d: g => `Quand tu lances un sort d'abjuration de niveau 1 ou plus, tu crées une protection (une fois par repos long) : ${wardMax(g)} PV (2 × niveau + INT) qui encaissent les dégâts avant toi. Chaque sort d'abjuration de niveau 1+ la recharge de 2 × son niveau. Suivie dans les ressources ; le bouton Dégâts l'utilise d'abord.` },
    { id: "projward", lv: 6, n: "Protection projetée", pill: () => "réaction : protège un allié à 9 m", k: "s", d: () => "Réaction : quand une créature que tu vois à 9 m ou moins subit des dégâts, ta Protection arcanique les encaisse à sa place (l'excédent va à la créature)." },
    { id: "impabj", lv: 10, n: "Abjuration améliorée", pill: g => `${signed(R.prof(g.level))} aux tests (Contresort, Dissipation)`, k: "f", d: g => `Tu ajoutes ton bonus de maîtrise (${signed(R.prof(g.level))}) aux tests de caractéristique demandés par tes sorts d'abjuration (Contresort, Dissipation de la magie).` },
    { id: "spellres", lv: 14, n: "Résistance aux sorts", pill: () => "avantage JdS et résistance aux sorts", k: "s", d: () => "Avantage aux jets de sauvegarde contre les sorts, et résistance aux dégâts des sorts." }],
  Divination: [sav("Devin érudit", "de divination"),
    { id: "portent", lv: 2, n: "Présage", pill: g => `${portentN(g)} d20 après le repos long`, k: "f", d: g => `Après chaque repos long, lance ${portentN(g)} d20 et note les résultats (ressources). Tu peux remplacer un jet d'attaque, de sauvegarde ou de caractéristique, le tien ou celui d'une créature que tu vois, par l'un d'eux, avant le jet ; une fois par tour, chaque résultat une seule fois.` },
    { id: "expdiv", lv: 6, n: "Divination experte", pill: () => "emplacement inférieur rendu", k: "f", d: () => "Quand tu lances un sort de divination de niveau 2 ou plus avec un emplacement, tu récupères un emplacement dépensé de niveau inférieur à ce sort (5 au plus)." },
    { id: "eye", lv: 10, n: "Troisième œil", pill: () => "action : vision au choix, jusqu'au repos", k: "f", d: () => "Action, jusqu'à ce que tu sois neutralisé ou prennes un repos : lire toutes les langues, vision dans le noir 18 m, voir le plan éthéré à 18 m, ou voir l'invisible à 3 m. Une fois par repos court ou long." },
    { id: "gportent", lv: 14, n: "Présage supérieur", pill: () => "3 d20 de Présage", k: "f", d: () => "Tu lances trois d20 pour ton Présage au lieu de deux." }],
  Enchantement: [sav("Enchanteur érudit", "d'enchantement"),
    { id: "gaze", lv: 2, n: "Regard hypnotique", pill: g => `JdS SAG DD ${dd(g)} · 1,5 m`, k: "s", d: g => `Action : une créature à 1,5 m qui te voit ou t'entend fait un jet de sauvegarde de Sagesse (DD ${dd(g)}) ou est charmée jusqu'à la fin de ton prochain tour (vitesse 0, neutralisée, hébétée). Tu peux prolonger par une action à chaque tour ; fin si tu t'éloignes, si elle ne te perçoit plus ou subit des dégâts. Ensuite, plus sur elle avant un repos long.` },
    { id: "charm", lv: 6, n: "Charme instinctif", pill: g => `réaction : détourner une attaque (DD ${dd(g)})`, k: "s", d: g => `Réaction quand une créature que tu vois à 9 m t'attaque : jet de sauvegarde de Sagesse (DD ${dd(g)}) ; en cas d'échec, elle vise la créature la plus proche d'elle (pas toi ni elle-même). En cas de réussite, plus sur elle avant un repos long.` },
    { id: "split", lv: 10, n: "Partage d'enchantement", pill: () => "2e cible pour un sort à 1 cible", k: "f", d: () => "Un sort d'enchantement de niveau 1+ qui ne vise qu'une créature peut en viser une seconde." },
    { id: "memory", lv: 14, n: "Altération mémorielle", pill: () => "faire oublier le charme", k: "f", d: g => `Une créature charmée par ton sort d'enchantement peut ignorer l'avoir été ; avant la fin du sort, action pour lui faire oublier jusqu'à ${1 + Math.max(0, R.ab(g, "cha"))} heure(s) (JdS INT, DD ${dd(g)}).` }],
  Évocation: [sav("Évocateur érudit", "d'évocation"),
    { id: "sculpt", lv: 2, n: "Façonneur de sorts", pill: () => "1 + niveau du sort créatures épargnées", k: "s", d: () => "Quand tu lances un sort d'évocation qui affecte des créatures que tu vois, tu en choisis jusqu'à 1 + le niveau du sort : elles réussissent d'office leur jet et ne subissent aucun dégât." },
    { id: "potent", lv: 6, n: "Sort mineur puissant", pill: () => "½ dégâts si le JdS réussit", k: "d", d: () => "Une créature qui réussit son jet contre ton sort mineur à dégâts subit quand même la moitié des dégâts." },
    { id: "empowered", lv: 10, n: "Évocation améliorée", pill: g => `${signed(R.ab(g, "int"))} aux dégâts (INT)`, k: "d", d: g => `Tu ajoutes ton modificateur d'Intelligence (${signed(R.ab(g, "int"))}) à un jet de dégâts de tes sorts d'évocation (déjà compté dans les pastilles).` },
    { id: "overchannel", lv: 14, n: "Surcharge magique", pill: () => "dégâts maximaux (niv. 1 à 5)", k: "d", d: () => "Un sort de magicien de niveau 1 à 5 qui inflige des dégâts : dégâts maximaux. Gratuit la première fois ; ensuite, avant un repos long, 2d12 nécrotiques par niveau du sort pour toi (+1d12 par niveau à chaque nouvelle utilisation), sans résistance possible." }],
  Illusion: [sav("Illusionniste érudit", "d'illusion"),
    { id: "minill", lv: 2, n: "Illusion mineure améliorée", pill: () => "son et image ensemble", k: "f", d: () => "Tu apprends Illusion mineure (ou un autre sort mineur de magicien si tu la connais déjà), en plus de tes sorts mineurs connus ; elle crée à la fois un son et une image." },
    { id: "malleable", lv: 6, n: "Illusions malléables", pill: () => "action : modifier l'illusion", k: "f", d: () => "Pendant un sort d'illusion d'au moins 1 minute que tu vois, action pour modifier l'illusion dans les limites du sort." },
    { id: "self", lv: 10, n: "Double illusoire", pill: () => "réaction : une attaque rate", k: "s", d: () => "Réaction quand une créature t'attaque : un double illusoire s'interpose, l'attaque rate automatiquement. Une fois par repos court ou long (ressources)." },
    { id: "reality", lv: 14, n: "Réalité illusoire", pill: () => "un objet réel 1 minute", k: "f", d: () => "Avec un sort d'illusion de niveau 1+, action bonus : un objet non magique et inanimé de l'illusion devient réel pendant 1 minute (sans pouvoir blesser)." }],
  Invocation: [sav("Invocateur érudit", "d'invocation"),
    { id: "minconj", lv: 2, n: "Invocation mineure", pill: () => "objet de 5 kg, 1 heure", k: "f", d: () => "Action : un objet non magique déjà vu (1 m de côté, 5 kg au plus) apparaît dans ta main ou à 3 m ; il luit faiblement sur 1,5 m et disparaît au bout d'une heure, si tu recommences, ou s'il subit ou inflige des dégâts." },
    { id: "transpo", lv: 6, n: "Permutation", pill: () => "téléport 9 m · 1 fois", k: "f", d: () => "Action : téléportation de 9 m vers un endroit que tu vois, ou échange de place avec une créature consentante Petite ou Moyenne. Revient au repos long ou quand tu lances un sort d'invocation de niveau 1+ (ressources)." },
    { id: "focused", lv: 10, n: "Invocation consciencieuse", pill: () => "concentration insensible aux dégâts", k: "s", d: () => "Subir des dégâts ne rompt pas ta concentration sur un sort d'invocation." },
    { id: "durable", lv: 14, n: "Convocations coriaces", pill: () => "+30 PV temporaires", k: "f", d: () => "Les créatures que tu convoques ou crées avec un sort d'invocation ont 30 PV temporaires." }],
  Nécromancie: [sav("Nécromancien érudit", "de nécromancie"),
    { id: "harvest", lv: 2, n: "Sinistre moisson", pill: () => "PV : 2 × niveau du sort (3 × nécromancie)", k: "f", d: () => "Une fois par tour, quand ton sort de niveau 1+ tue une ou plusieurs créatures (ni artificielles ni mortes-vivantes), tu regagnes 2 × le niveau du sort en PV, 3 × si c'est un sort de nécromancie." },
    { id: "thralls", lv: 6, n: "Serviteurs morts-vivants", pill: g => `+${g.level} PV, +${R.prof(g.level)} dégâts`, k: "f", d: g => `Animation des morts rejoint ton grimoire et anime un cadavre de plus. Tes morts-vivants ont ${g.level} PV maximum de plus et ajoutent ${R.prof(g.level)} aux dégâts de leurs armes.` },
    { id: "inured", lv: 10, n: "Insensibilité à la non-vie", pill: () => "résistance nécrotique", k: "s", d: () => "Résistance aux dégâts nécrotiques ; ton maximum de PV ne peut pas être réduit." },
    { id: "command", lv: 14, n: "Contrôle des morts-vivants", pill: g => `JdS CHA DD ${dd(g)} · 18 m`, k: "s", d: g => `Action : un mort-vivant à 18 m fait un jet de sauvegarde de Charisme (DD ${dd(g)} ; avantage si son INT est de 8 ou plus) ou t'obéit jusqu'à ce que tu recommences. INT 12 ou plus : nouveau jet chaque heure.` }],
  Transmutation: [sav("Transmutateur érudit", "de transmutation"),
    { id: "alchemy", lv: 2, n: "Alchimie mineure", pill: () => "changer bois, pierre, fer, cuivre, argent", k: "f", d: () => "Transforme un objet non magique en bois, pierre, fer, cuivre ou argent en un autre de ces matériaux (10 minutes par cube de 30 cm) ; il redevient normal au bout d'une heure ou si ta concentration est rompue." },
    { id: "stone", lv: 6, n: "Pierre du transmutateur", pill: () => "un bonus au choix pour le porteur", k: "f", d: () => "En 8 heures, une pierre qui donne à son porteur : +3 m de vitesse, maîtrise des JdS de CON, vision dans le noir 18 m, ou résistance à l'acide, au froid, au feu, à la foudre ou au tonnerre. Changeable quand tu lances une transmutation de niveau 1+ en la tenant." },
    { id: "shapechanger", lv: 10, n: "Métamorphe", pill: () => "Métamorphose sur toi · FP 1", k: "f", d: () => "Métamorphose rejoint ton grimoire ; tu peux la lancer sur toi sans emplacement, en bête de FP 1 maximum. Une fois par repos court ou long (ressources)." },
    { id: "master", lv: 14, n: "Maître transmutateur", pill: () => "consumer la pierre", k: "f", d: () => "Action : la pierre se consume pour Transformation majeure, Panacée (maladies, poisons, malédictions, PV au maximum), Restitution de vie (Rappel à la vie) ou Jouvence (3d10 ans de moins). Nouvelle pierre après un repos long." }],
};
const WIZ_FEATS = [
  { id: "arcrec", lv: 1, n: "Restauration arcanique", pill: g => `${R.arcane(g.level)} niveau${R.arcane(g.level) > 1 ? "x" : ""} / jour`, k: "f", d: g => `Une fois par jour, au repos court : récupère des emplacements pour un total de ${R.arcane(g.level)} niveau${R.arcane(g.level) > 1 ? "x" : ""} (moitié du niveau, arrondi au supérieur), aucun de niveau 6 ou plus.` },
  { id: "trad", lv: 2, n: "Tradition arcanique", pill: g => `École ${/^[AÉEIO]/.test(school(g)) ? "d'" : "de "}${school(g)}`, k: "f", d: g => `Ton école (${school(g)}) donne ses capacités aux niveaux 2, 6, 10 et 14.` },
  { id: "mastery", lv: 18, n: "Maîtrise des sorts", pill: () => "un sort de niv. 1 et un de niv. 2 à volonté", k: "f", d: () => "Choisis un sort de niveau 1 et un de niveau 2 de ton grimoire : tu les lances à leur plus bas niveau sans emplacement, quand ils sont préparés. Changeables en 8 heures d'étude." },
  { id: "signature", lv: 20, n: "Sorts de prédilection", pill: () => "deux sorts de niv. 3, une fois par repos", k: "f", d: () => "Deux sorts de niveau 3 de ton grimoire sont toujours préparés (hors limite) ; chacun se lance une fois au niveau 3 sans emplacement, jusqu'au prochain repos court ou long." },
];
/** Capacités du magicien : classe et école, dans l'ordre des niveaux. */
const wizFeats = g => [...WIZ_FEATS, ...(SCHOOL_FEATS[school(g)] || []).map(f => ({ ...f, id: f.id || "sav" }))].sort((a, b) => a.lv - b.lv);

// ---------- Ressources des écoles
const wardMax = g => 2 * g.level + R.ab(g, "int");
const portentN = g => g.level >= 14 ? 3 : 2;
const isSchool = (g, s, lv) => school(g) === s && g.level >= lv;
/** Ressource « une fois par repos » de l'école : Permutation (long), Double illusoire, Métamorphe (court). */
function schoolUse(g) {
  if (isSchool(g, "Invocation", 6)) return { n: "Permutation", rest: "repos long ou sort d'invocation", short: false };
  if (isSchool(g, "Illusion", 10)) return { n: "Double illusoire", rest: "repos court", short: true };
  if (isSchool(g, "Transmutation", 10)) return { n: "Métamorphe", rest: "repos court", short: true };
  return null;
}
/** Les d20 du Présage : champs à remplir, puis résultats à toucher pour les utiliser. */
function portentDice(g) {
  const n = portentN(g), v = g.portent || [], u = g.portentU || [];
  return `<div class="portent">${Array.from({ length: n }, (_, i) => v[i] ? `<button class="pdie${u[i] ? " used" : ""}" data-a="portent-use" data-i="${i}" aria-pressed="${!!u[i]}" aria-label="Présage ${v[i]}${u[i] ? ", utilisé (toucher pour annuler)" : ", disponible"}">${v[i]}${u[i] ? "<small>utilisé</small>" : ""}</button>` : `<input id="portent-${i}" class="pdie" type="number" inputmode="numeric" min="1" max="20" placeholder="d20" aria-label="Résultat du d20 de Présage ${i + 1}" enterkeyhint="done">`).join("")}
    ${v.some(Boolean) ? `<button class="linkbtn" data-a="portent-clear">Corriger les résultats</button>` : ""}</div>`;
}
/** Étape du repos long guidé (Divination, niveau 2) : lancer les d20 du Présage. */
const wizLrStep = g => isSchool(g, "Divination", 2) ? { label: "Présage", html: g => `<p class="lrlead">Présage</p>
  <p style="margin:0;font-size:14.5px;line-height:1.45">Lance <b>${portentN(g)}d20</b> et note les résultats. Tu peux remplacer un jet d'attaque, de sauvegarde ou de caractéristique, le tien ou celui d'une créature que tu vois, par l'un d'eux, avant le jet ; une fois par tour, chaque résultat une seule fois. Les résultats d'avant sont perdus.</p>
  ${portentDice(g)}<p class="muted lrnote">Tu peux aussi les noter plus tard : Ressources de l'école, onglet Grimoire (En jeu).</p>` } : null;
function wizResHTML(g) {
  let rows = "";
  if (isSchool(g, "Abjuration", 2)) {
    const max = wardMax(g), hp = g.wardMade ? Math.min(max, g.wardHp) : 0;
    rows += `<div class="resrow"><span class="rn"><b>Protection arcanique</b><small>${g.wardMade ? "encaisse les dégâts avant tes PV" : "créée par ton premier sort d'abjuration de niveau 1+"}</small></span><span class="rv">${hp}<small>/${max}</small></span></div>
    <div class="bar ward"><span style="width:${Math.round(100 * hp / max)}%"></span></div>
    ${g.wardMade ? `<div class="cast">${[1, 2, 3].filter(l => R.slots(g).length >= l).map(l => `<button class="btn sm" data-a="ward-add" data-v="${2 * l}"${hp >= max ? " disabled" : ""}>+${2 * l} (niv. ${l})</button>`).join("")}<span class="muted" style="font-size:12.5px">recharge en lançant une abjuration</span></div>` : ""}`;
  }
  if (isSchool(g, "Divination", 2)) {
    rows += `<div class="resrow"><span class="rn"><b>Présage</b><small>${portentN(g)} d20 après chaque repos long · touche un résultat pour l'utiliser</small></span></div>
    ${S.lr ? `<p class="muted" style="margin:0;font-size:13px">Saisie dans l'écran du repos long.</p>` : portentDice(g)}`; // un seul jeu de champs à la fois (identifiants)
  }
  const su = schoolUse(g);
  if (su) rows += capRow(g, "schoolu", su.n, su.rest, `<button class="pip${g.schoolU ? " used" : ""}" data-a="school-use" aria-label="${su.n}, ${g.schoolU ? "utilisé" : "disponible"}"></button>`, false, () => pillsRaw([["f", "Effet", (wizFeats(g).find(f => f.n === su.n) || {}).pill ? wizFeats(g).find(f => f.n === su.n).pill(g) : ""]]));
  return rows ? foldSec("res-cls", "Ressources de l'école", "", `<div class="slots res">${rows}</div>`) : "";
}
/** Dégâts encaissés par la Protection arcanique avant les PV (appelé par les dégâts du personnage). */
function wardAbsorb(g, n) {
  if (!isSchool(g, "Abjuration", 2) || !g.wardMade || !g.wardHp) return 0;
  const a = Math.min(g.wardHp, n); g.wardHp -= a; return a;
}
/** Sort lancé : Protection arcanique créée ou rechargée (abjuration), Permutation rendue (invocation). Renvoie un message. */
function wizOnCast(g, s, lv) {
  if (s.l < 1 || !lv) return "";
  if (s.s === "Abjuration" && isSchool(g, "Abjuration", 2)) {
    if (!g.wardMade) { g.wardMade = true; g.wardHp = wardMax(g); return ` · Protection arcanique : ${g.wardHp} PV`; }
    const before = g.wardHp; g.wardHp = Math.min(wardMax(g), g.wardHp + 2 * lv); return g.wardHp > before ? ` · Protection arcanique +${g.wardHp - before} (${g.wardHp})` : "";
  }
  if (s.s === "Invocation" && isSchool(g, "Invocation", 6) && g.schoolU) { g.schoolU = 0; return " · Permutation récupérée"; }
  return "";
}
/** Évocation améliorée : + INT aux dégâts des évocations (niveau 10). */
const wizDmgBonus = (g, s) => isSchool(g, "Évocation", 10) && s.s === "Évocation" && s.p && s.p.startsWith("d:") ? R.ab(g, "int") : 0;

onClick("ward-add", (b) => { mutate(g => { g.wardHp = Math.min(wardMax(g), (g.wardHp || 0) + +b.dataset.v); }); });
onClick("portent-use", (b) => { const g = G(); if (!g) return; const i = +b.dataset.i, v = (g.portent || [])[i], was = !!(g.portentU || [])[i];
  mutate(g => { const u = [...(g.portentU || [])]; u[i] = !was; g.portentU = u; });
  toast(was ? `Présage <b>${v}</b> de nouveau disponible` : `<b>Présage ${v}</b> utilisé : il remplace le d20`, was ? null : () => { mutate(g => { const u = [...(g.portentU || [])]; u[i] = false; g.portentU = u; }); return "Présage rendu"; }); });
// Saisie d'un d20 : validée au bout de deux chiffres, ou d'un seul de 3 à 9 (1 et 2 peuvent commencer 10 à 20) ; sinon en quittant le champ ou avec Entrée
const portentSet = (t, now) => { const raw = t.value.trim(), n = Math.floor(+raw); if (!(n >= 1 && n <= 20)) return;
  if (!now && raw.length < 2 && n <= 2) return;
  const i = +t.id.slice(8); mutate(g => { const v = [...(g.portent || [])]; v[i] = n; g.portent = v; }, false);
  setTimeout(() => { render(); const nx = document.getElementById(`portent-${i + 1}`) || document.querySelector('input[id^="portent-"]'); if (nx) nx.focus({ preventScroll: true }); }, 0); };
onInput(t => /^portent-\d$/.test(t.id), t => portentSet(t, false));
onChange(t => /^portent-\d$/.test(t.id), t => portentSet(t, true));
onClick("portent-clear", () => { const g = G(); if (!g) return; const prev = JSON.parse(JSON.stringify({ portent: g.portent || [], portentU: g.portentU || [] }));
  mutate(g => { g.portent = []; g.portentU = []; }); toast("Résultats du Présage effacés : tape-les de nouveau", () => { mutate(g => Object.assign(g, prev)); return "Résultats rétablis"; }); });
onClick("school-use", () => { const g = G(); if (!g) return; const su = schoolUse(g); mutate(g => { g.schoolU = g.schoolU ? 0 : 1; }); if (su && !g.schoolU) toast(`<b>${esc(su.n)}</b> utilisé`); });

/** Champs propres aux écoles (normalisation) et repos. */
function wizNormalize(o) {
  o.wardMade = !!o.wardMade; o.wardHp = Math.max(0, Math.round(+o.wardHp) || 0);
  o.portent = Array.isArray(o.portent) ? o.portent.map(n => n >= 1 && n <= 20 ? Math.floor(n) : 0).slice(0, 3) : [];
  o.portentU = Array.isArray(o.portentU) ? o.portentU.map(Boolean).slice(0, 3) : [];
  o.schoolU = +o.schoolU ? 1 : 0;
}
function wizLongRest(g) { g.arcane = false; g.wardMade = false; g.wardHp = 0; g.portent = []; g.portentU = []; g.schoolU = 0; }
const wizShortRest = g => { const su = schoolUse(g); return su && su.short ? { field: "schoolU", label: su.n, done: "récupéré" } : null; };

export { wizLrStep, wizFeats, wizResHTML, wardAbsorb, wizOnCast, wizDmgBonus, wizNormalize, wizLongRest, wizShortRest, SCHOOL_FEATS };
