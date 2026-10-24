// Clerc (Manuel des joueurs 2014 ; domaine de la Forge : Guide complet de Xanathar) : domaines divins, Conduit divin,
// Renvoi et Destruction des morts-vivants, Intervention divine, sorts de domaine toujours préparés.
// Résumés rédigés pour la table (textes AideDD), à vérifier dans le livre.
import { onChange, onClick } from "../core/actions.js";
import { byName, esc, signed } from "../core/format.js";
import { fxKey } from "../core/schema.js";
import { G, S } from "../core/state.js";
import { mutate } from "../core/store.js";
import { render, toast } from "../core/ui.js";
import { BY_ID, SPELLS } from "../data.js";
import { pCantrips, pClassList, pConc, pDots, pExtras, pFoot, pHeader, pNotes, pSlots, pSpellRow, printHTML } from "../features/print.js";
import { castingRules, concentrationRules } from "../features/rules.js";
import { keyPills } from "../features/spells.js";
import { R, classSpells } from "../rules/common.js";
import { LANGS } from "../rules/creation.js";
import { SLOTS, SKILLS } from "../rules/tables.js";
import { capRow, pillsRaw, statLabel } from "../ui/components.js";

const DD = g => 8 + R.prof(g.level) + R.am(g);
const WIS = g => Math.max(1, R.am(g));
const CLE = {
  cd: g => g.level >= 18 ? 3 : g.level >= 6 ? 2 : g.level >= 2 ? 1 : 0,               // Conduit divin : utilisations par repos court
  destroy: lv => lv >= 17 ? "4" : lv >= 14 ? "3" : lv >= 11 ? "2" : lv >= 8 ? "1" : lv >= 5 ? "1/2" : "", // Destruction des morts-vivants : FP maximum
  strike: g => g.level >= 14 ? "2d8" : "1d8",                                               // Frappe divine (niveau 8)
};
const strike = (type) => ({ lv: 8, n: "Frappe divine", k: "d", pill: g => `+${CLE.strike(g)} ${type} · 1 fois par tour`, d: g => `Une fois à chacun de tes tours, quand tu touches une créature avec une attaque d'arme : +${CLE.strike(g)} dégâts ${type} (2d8 au niveau 14).` });
const potent = { lv: 8, n: "Incantation puissante", k: "d", pill: g => `${signed(R.am(g))} aux sorts mineurs (SAG)`, d: g => `Tu ajoutes ton modificateur de Sagesse (${signed(R.am(g))}) aux dégâts de tes sorts mineurs de clerc (calculé dans leurs pastilles).` };
const heavy = { lv: 1, n: "Maîtrises supplémentaires", k: "f", pill: () => "armures lourdes", d: () => "Tu maîtrises les armures lourdes." };
const martial = { lv: 1, n: "Maîtrises supplémentaires", k: "f", pill: () => "armes de guerre, armures lourdes", d: () => "Tu maîtrises les armes de guerre et les armures lourdes." };
const res = (n, rest) => ({ n, rest, max: g => WIS(g) });

// Domaines divins : sorts de domaine (niveau de clerc → sorts), maîtrises, capacités, options de Conduit divin, ressource
const DOMAINS = {
  vie: { n: "Vie", full: "Domaine de la Vie", sum: "Armures lourdes. Disciple de la vie : soins +2 + niveau du sort. Conduit divin : Préservation de la vie.",
    armor: ["heavy"], sp: { 1: ["bless", "cure-wounds"], 3: ["lesser-restoration", "spiritual-weapon"], 5: ["beacon-of-hope", "revivify"], 7: ["death-ward", "guardian-of-faith"], 9: ["mass-cure-wounds", "raise-dead"] },
    heal: true,
    feats: [heavy,
      { lv: 1, n: "Disciple de la vie", k: "f", pill: () => "soins +2 + niveau du sort", calc: true, d: () => "Tes sorts de soins de niveau 1 ou plus rendent 2 + le niveau du sort de PV en plus (calculé dans leurs pastilles, au niveau de base du sort : ajoute 1 par niveau d'emplacement au-dessus)." },
      { lv: 6, n: "Guérisseur béni", k: "f", pill: () => "tu regagnes 2 + niveau du sort", d: () => "Quand tu soignes une autre créature avec un sort de niveau 1 ou plus, tu regagnes toi aussi 2 + le niveau du sort de PV." },
      strike("radiants"),
      { lv: 17, n: "Guérison suprême", k: "f", pill: () => "dés de soins au maximum", d: () => "Quand tu devrais lancer des dés pour rendre des PV avec un sort, tu prends le maximum de chaque dé." }],
    cd: [{ k: "life", lv: 2, n: "Préservation de la vie", btn: "Préservation de la vie", note: g => ` · <b>${5 * g.level} PV</b> à répartir (moitié des PV max au plus)`,
      pills: g => [["f", "Soins", `${5 * g.level} PV à répartir`], ["n", "Portée", "9 m"], ["n", "Limite", "moitié des PV max"]],
      e: g => `Action : tu répartis ${5 * g.level} PV (5 × niveau) entre les créatures à 9 m ou moins, sans dépasser la moitié de leurs PV maximum. Sans effet sur les morts-vivants et les artificiels.` }] },
  lumiere: { n: "Lumière", full: "Domaine de la Lumière", sum: "Sort mineur Lumière. Illumination protectrice : réaction, désavantage à l'attaquant. Conduit divin : Radiance de l'aube.",
    cantrip: "light", sp: { 1: ["burning-hands", "faerie-fire"], 3: ["flaming-sphere", "scorching-ray"], 5: ["daylight", "fireball"], 7: ["guardian-of-faith", "wall-of-fire"], 9: ["flame-strike", "scrying"] },
    potent: true, res: res("Illumination protectrice", "long"),
    feats: [{ lv: 1, n: "Sort mineur supplémentaire", k: "f", pill: () => "Lumière", d: () => "Tu connais le sort mineur Lumière, en plus de tes sorts mineurs (compté dans l'appli)." },
      { lv: 1, n: "Illumination protectrice", k: "s", pill: g => `${WIS(g)} fois · repos long`, d: g => `Réaction, quand une créature que tu vois à 9 m ou moins t'attaque : un éclat de lumière lui impose le désavantage à cette attaque (sauf si elle ne peut pas être aveuglée). ${WIS(g)} fois par repos long (mod. de Sagesse, au moins 1).` },
      { lv: 6, n: "Illumination améliorée", k: "s", pill: () => "aussi pour protéger un allié", d: () => "Tu peux utiliser Illumination protectrice quand une créature que tu vois à 9 m ou moins attaque une autre créature que toi." },
      potent,
      { lv: 17, n: "Halo de lumière", k: "f", pill: () => "action : aura de soleil, 1 minute", d: () => "Action : lumière vive sur 18 m (faible sur 9 m de plus) pendant 1 minute ; tes ennemis dans la lumière vive ont le désavantage aux jets de sauvegarde contre les sorts qui infligent des dégâts de feu ou radiants." }],
    cd: [{ k: "dawn", lv: 2, n: "Radiance de l'aube", btn: "Radiance de l'aube", pills: g => [["d", "Dégâts", `2d10 + ${g.level} radiants`], ["s", "Jet de la cible", `JdS CON · DD ${DD(g)}`, "réussite : moitié des dégâts"], ["n", "Zone", "9 m"]],
      e: () => "Action : dissipe les ténèbres magiques à 9 m ou moins. Chaque créature hostile à 9 m ou moins fait un jet de Constitution (sauf abri total)." }] },
  savoir: { n: "Savoir", full: "Domaine du Savoir", sum: "Deux langues et deux compétences (Arcanes, Histoire, Nature, Religion) à maîtrise doublée. Conduit divin : Savoir ancestral, puis Lecture des pensées.",
    sp: { 1: ["command", "identify"], 3: ["augury", "suggestion"], 5: ["nondetection", "speak-with-dead"], 7: ["arcane-eye", "confusion"], 9: ["legend-lore", "scrying"] }, potent: true,
    feats: [{ lv: 1, n: "Bénédictions du savoir", k: "f", pill: () => "2 langues, 2 compétences ×2", d: () => "Tu apprends deux langues, et tu maîtrises deux compétences parmi Arcanes, Histoire, Nature et Religion avec ton bonus de maîtrise doublé (Expertise : choisies à la création, ou dans Personnage)." },
      potent,
      { lv: 17, n: "Visions du passé", k: "f", pill: () => "méditer : visions d'un objet ou d'un lieu", d: g => `En méditant au moins 1 minute (concentration, jusqu'à ${g.level} minutes) : tu vois le passé d'un objet que tu tiens (son ancien propriétaire) ou d'un lieu (événements des derniers jours, jusqu'à ${g.level} jours). Une fois par repos court ou long.` }],
    cd: [{ k: "lore", lv: 2, n: "Savoir ancestral", btn: "Savoir ancestral", fx: "10 minutes", pills: () => [["f", "Effet", "maîtrise d'une compétence ou d'un outil"], ["n", "Durée", "10 minutes"]], e: () => "Action : tu maîtrises une compétence ou un outil de ton choix pendant 10 minutes." },
      { k: "mind", lv: 6, n: "Lecture des pensées", btn: "Lecture des pensées", fx: "1 minute", pills: g => [["s", "Jet de la cible", `JdS SAG · DD ${DD(g)}`], ["n", "Portée", "18 m"], ["n", "Durée", "1 minute"]], e: () => "Action : une créature que tu vois à 18 m ou moins ; si elle rate, tu lis ses pensées de surface pendant 1 minute (portée 18 m), et tu peux lancer Suggestion sur elle sans emplacement, sans jet de sauvegarde possible (le sort prend fin avec la lecture)." }] },
  guerre: { n: "Guerre", full: "Domaine de la Guerre", sum: "Armes de guerre, armures lourdes. Prêtre de guerre : attaque en action bonus. Conduit divin : Frappe guidée (+10).",
    weapons: ["martial"], armor: ["heavy"], sp: { 1: ["divine-favor", "shield-of-faith"], 3: ["magic-weapon", "spiritual-weapon"], 5: ["crusaders-mantle", "spirit-guardians"], 7: ["freedom-of-movement", "stoneskin"], 9: ["flame-strike", "hold-monster"] },
    res: res("Prêtre de guerre", "long"), strikeType: "du type de l'arme",
    feats: [martial,
      { lv: 1, n: "Prêtre de guerre", k: "f", pill: g => `${WIS(g)} fois · repos long`, d: g => `Quand tu prends l'action Attaquer, tu peux faire une attaque d'arme en action bonus. ${WIS(g)} fois par repos long (mod. de Sagesse, au moins 1).` },
      strike("du type de l'arme"),
      { lv: 17, n: "Avatar de bataille", k: "s", pill: () => "résistance C/P/T non magiques", d: () => "Résistance aux dégâts contondants, perforants et tranchants des attaques non magiques (bouton « Dégâts ½ » de la carte des PV)." }],
    cd: [{ k: "guided", lv: 2, n: "Frappe guidée", btn: "Frappe guidée · +10", note: () => " · +10 au jet d'attaque", pills: () => [["a", "Attaque", "+10"]], e: () => "Après avoir vu ton jet d'attaque, avant de savoir s'il touche : +10." },
      { k: "wargod", lv: 6, n: "Bénédiction du dieu de la guerre", btn: "Bénédiction · +10", note: () => " · +10 au jet d'attaque de l'allié", pills: () => [["a", "Attaque d'un allié", "+10"], ["n", "Portée", "9 m"]], e: () => "Réaction, quand une créature que tu vois à 9 m ou moins fait un jet d'attaque, après avoir vu le d20 : +10 à son jet." }] },
  tempete: { n: "Tempête", full: "Domaine de la Tempête", sum: "Armes de guerre, armures lourdes. Fureur de l'ouragan : réaction, 2d8 foudre ou tonnerre. Conduit divin : Fureur destructrice (dégâts maximaux).",
    weapons: ["martial"], armor: ["heavy"], sp: { 1: ["fog-cloud", "thunderwave"], 3: ["gust-of-wind", "shatter"], 5: ["call-lightning", "sleet-storm"], 7: ["control-water", "ice-storm"], 9: ["destructive-wave", "insect-plague"] },
    res: res("Fureur de l'ouragan", "long"),
    feats: [martial,
      { lv: 1, n: "Fureur de l'ouragan", k: "d", pill: g => `2d8 · JdS DEX DD ${DD(g)} · ${WIS(g)} fois`, d: g => `Réaction, quand une créature à 1,5 m que tu vois te touche : elle fait un jet de Dextérité (DD ${DD(g)}) et subit 2d8 dégâts de foudre ou de tonnerre (au choix), la moitié si elle réussit. ${WIS(g)} fois par repos long.` },
      { lv: 6, n: "Frappe de l'éclair", k: "f", pill: () => "foudre : repousse de 3 m", d: () => "Quand tu infliges des dégâts de foudre à une créature de taille Grande ou moins, tu peux aussi la repousser de 3 m." },
      strike("de tonnerre"),
      { lv: 17, n: "Enfant de la tempête", k: "f", pill: () => "vol = ta vitesse (dehors)", d: () => "Tu as une vitesse de vol égale à ta vitesse au sol, quand tu n'es ni sous terre ni à l'intérieur." }],
    cd: [{ k: "destr", lv: 2, n: "Fureur destructrice", btn: "Fureur destructrice", note: () => " · dégâts de foudre ou de tonnerre maximaux", pills: () => [["d", "Dégâts", "maximum, sans lancer les dés"]], e: () => "Quand tu lances les dés de dégâts de foudre ou de tonnerre : tu infliges le maximum à la place." }] },
  nature: { n: "Nature", full: "Domaine de la Nature", sum: "Armures lourdes, un sort mineur de druide et une compétence (Dressage, Nature, Survie). Conduit divin : Charme des animaux et des plantes.",
    armor: ["heavy"], sp: { 1: ["animal-friendship", "speak-with-animals"], 3: ["barkskin", "spike-growth"], 5: ["plant-growth", "wind-wall"], 7: ["dominate-beast", "grasping-vine"], 9: ["insect-plague", "tree-stride"] },
    feats: [heavy,
      { lv: 1, n: "Acolyte de la nature", k: "f", pill: () => "sort mineur de druide, compétence", d: () => "Tu apprends un sort mineur de druide (compté en plus de tes sorts mineurs) et tu maîtrises une compétence : Dressage, Nature ou Survie." },
      { lv: 6, n: "Atténuation des éléments", k: "s", pill: () => "réaction : résistance à un élément", d: () => "Réaction, quand toi ou une créature à 9 m subissez des dégâts d'acide, de froid, de feu, de foudre ou de tonnerre : résistance à ces dégâts." },
      strike("de froid, de feu ou de foudre (au choix)"),
      { lv: 17, n: "Maître de la nature", k: "f", pill: () => "action bonus : ordres aux créatures charmées", d: () => "Action bonus : tu donnes des ordres verbaux aux bêtes et plantes charmées par ton Conduit divin ; elles les suivent à leur prochain tour." }],
    cd: [{ k: "charm", lv: 2, n: "Charme des animaux et des plantes", btn: "Charmer", fx: "1 minute", pills: g => [["f", "Effet", "Charmé"], ["s", "Jet de la cible", `JdS SAG · DD ${DD(g)}`], ["n", "Zone", "9 m"], ["n", "Durée", "1 minute ou dégâts"]], e: () => "Action : chaque bête ou plante qui te voit à 9 m ou moins fait un jet de Sagesse ; si elle rate, elle est charmée et amicale envers toi et les créatures que tu désignes." }] },
  duperie: { n: "Duperie", full: "Domaine de la Duperie", sum: "Bénédiction de l'escroc : avantage en Discrétion à un allié. Conduit divin : Invocation de duplicata, puis Linceul d'ombre.",
    sp: { 1: ["charm-person", "disguise-self"], 3: ["mirror-image", "pass-without-trace"], 5: ["blink", "dispel-magic"], 7: ["dimension-door", "polymorph"], 9: ["dominate-person", "modify-memory"] },
    feats: [{ lv: 1, n: "Bénédiction de l'escroc", k: "f", pill: () => "action : avantage en Discrétion, 1 heure", d: () => "Action : une créature consentante que tu touches (pas toi) a l'avantage aux tests de Dextérité (Discrétion) pendant 1 heure, ou jusqu'à ce que tu la réutilises." },
      strike("de poison"),
      { lv: 17, n: "Duplicata amélioré", k: "f", pill: () => "jusqu'à 4 doubles", d: () => "Invocation de duplicata crée jusqu'à quatre doubles ; une action bonus les déplace tous." }],
    cd: [{ k: "dup", lv: 2, n: "Invocation de duplicata", btn: "Duplicata", fx: "1 minute", pills: () => [["f", "Effet", "double illusoire, 1 minute"], ["n", "Portée", "9 m"]], e: () => "Action : un double illusoire parfait de toi apparaît à 9 m (concentration, 1 minute). Action bonus : il se déplace de 9 m. Tu peux lancer tes sorts depuis sa place ; avantage à tes attaques contre une créature à 1,5 m de lui." },
      { k: "shroud", lv: 6, n: "Linceul d'ombre", btn: "Linceul d'ombre", pills: () => [["f", "Effet", "invisible jusqu'à ton prochain tour"]], e: () => "Action : tu deviens invisible jusqu'à la fin de ton prochain tour, ou jusqu'à ce que tu attaques ou lances un sort." }] },
  forge: { n: "Forge", full: "Domaine de la Forge", src: "Guide complet de Xanathar", sum: "Armures lourdes, outils de forgeron. Bénédiction de la forge : arme ou armure +1. Conduit divin : Bénédiction de l'artisan.",
    armor: ["heavy"], tools: ["Outils de forgeron"], sp: { 1: ["identify", "searing-smite"], 3: ["heat-metal", "magic-weapon"], 5: ["elemental-weapon", "protection-from-energy"], 7: ["fabricate", "wall-of-fire"], 9: ["animate-objects", "creation"] },
    feats: [{ lv: 1, n: "Maîtrises supplémentaires", k: "f", pill: () => "armures lourdes, outils de forgeron", d: () => "Tu maîtrises les armures lourdes et les outils de forgeron." },
      { lv: 1, n: "Bénédiction de la forge", k: "f", pill: () => "arme ou armure +1 · repos long", d: () => "À la fin d'un repos long, une arme ou une armure non magique que tu touches devient magique (+1 à la CA, ou +1 aux jets d'attaque et de dégâts) jusqu'à ton prochain repos long. Note-la dans l'équipement (objet magique +1)." },
      { lv: 6, n: "Âme de la forge", k: "s", pill: () => "résistance au feu · +1 CA en armure lourde", d: () => "Résistance aux dégâts de feu (à ajouter dans les défenses) ; +1 à la CA en armure lourde (calculé)." },
      strike("de feu"),
      { lv: 17, n: "Saint de la forge et du feu", k: "s", pill: () => "immunité au feu · résistance en armure lourde", d: () => "Immunité aux dégâts de feu ; en armure lourde, résistance aux dégâts contondants, perforants et tranchants des attaques non magiques." }],
    cd: [{ k: "artisan", lv: 2, n: "Bénédiction de l'artisan", btn: "Bénédiction de l'artisan", pills: () => [["n", "Incantation", "rituel d'une heure"], ["f", "Effet", "objet en métal de 100 po au plus"]], e: () => "Rituel d'une heure : tu crées un objet non magique comprenant du métal (arme, armure, 10 munitions, outils…) d'une valeur de 100 po au plus, en consommant du métal de même valeur." }] },
};
const dom = g => DOMAINS[g.domain] || DOMAINS.vie;
const domainSpells = g => { const d = dom(g); return [...new Set(Object.entries(d.sp).filter(([lv]) => g.level >= +lv).flatMap(([, ids]) => ids))].filter(id => BY_ID[id]); };
// Capacités communes du clerc, puis celles du domaine (ordre des niveaux)
const BASE = [
  { lv: 1, n: "Domaine divin", k: "f", pill: g => dom(g).full, d: g => `${dom(g).full}${dom(g).src ? ` (${dom(g).src})` : ""} : ${dom(g).sum} Ses sorts de domaine sont toujours préparés et ne comptent pas dans ta limite.` },
  { lv: 2, n: "Conduit divin", k: "f", pill: g => `${CLE.cd(g)} · repos court`, d: g => `${CLE.cd(g)} utilisation${CLE.cd(g) > 1 ? "s" : ""} par repos court ou long (2 au niveau 6, 3 au niveau 18) : Renvoi des morts-vivants ou une option du domaine (ressources du clerc). JdS : DD ${DD(g)}.` },
  { lv: 5, n: "Destruction des morts-vivants", k: "d", pill: g => `FP ${CLE.destroy(g.level)} ou moins`, d: g => `Un mort-vivant qui rate son jet contre ton Renvoi est détruit si son FP est de ${CLE.destroy(g.level)} ou moins (1/2 au niveau 5, 1 au 8, 2 au 11, 3 au 14, 4 au 17).` },
  { lv: 10, n: "Intervention divine", k: "f", pill: g => g.level >= 20 ? "réussite automatique" : `d100 ≤ ${g.level}`, d: g => `Action : tu implores ta divinité. ${g.level >= 20 ? "Au niveau 20, elle intervient à coup sûr." : `Lance 1d100 : si tu fais ${g.level} ou moins, elle intervient (au MJ de choisir l'effet, souvent celui d'un sort de clerc).`} Si elle intervient, plus d'appel pendant 7 jours ; sinon, nouvel essai après un repos long.` },
];
const feats = g => [...BASE, ...dom(g).feats].map((f, i) => ({ id: f.id || `f${i}`, ...f })).sort((a, b) => a.lv - b.lv);

// ---------- Ressources (En jeu) : Conduit divin dépliable, ressource du domaine, Intervention divine
const turn = { k: "turn", lv: 2, n: "Renvoi des morts-vivants", btn: "Renvoyer", fx: "1 minute",
  pills: g => [["s", "Jet de la cible", `JdS SAG · DD ${DD(g)}`, "morts-vivants qui te voient ou t'entendent"], ["n", "Zone", "9 m"], ["n", "Durée", "1 minute ou dégâts"], ...(CLE.destroy(g.level) ? [["d", "Destruction", `FP ${CLE.destroy(g.level)} ou moins`]] : [])],
  e: g => `Action, symbole sacré en main : chaque mort-vivant qui rate son jet est renvoyé : il s'éloigne le plus possible de toi, ne peut pas s'approcher à 9 m ni prendre de réaction, et n'agit que pour Foncer ou se libérer (Esquiver s'il est coincé). Prend fin s'il subit des dégâts.${CLE.destroy(g.level) ? ` <b>Destruction</b> : FP ${CLE.destroy(g.level)} ou moins, il est détruit.` : ""}` };
const cdOpts = g => [turn, ...dom(g).cd].filter(o => g.level >= o.lv);
function cdBody(g) {
  const left = CLE.cd(g) - Math.min(CLE.cd(g), g.ccdU);
  return cdOpts(g).map(x => `<div class="capopt"><b>${esc(x.n)}</b>${pillsRaw(x.pills(g))}<div class="eff">${x.e(g)}</div><div class="cast"><button class="btn cast-go sm" data-a="ccd-use" data-v="${x.k}"${left ? "" : " disabled"}>${esc(x.btn)}</button></div></div>`).join("")
    + `<span class="muted" style="font-size:12.5px">${left ? `${left} utilisation${left > 1 ? "s" : ""} restante${left > 1 ? "s" : ""} : une option par utilisation.` : "Conduit divin utilisé : il revient au prochain repos court ou long."}</span>`;
}
const pipsOf = (r, n, u, lbl) => Array.from({ length: n }, (_, k) => `<button class="pip${k < u ? " used" : ""}" data-a="res-pip" data-r="${r}" data-k="${k}" aria-label="${lbl} ${k + 1}, ${k < u ? "utilisée" : "disponible"}"></button>`).join("");
function cleResHTML(g) {
  const cd = CLE.cd(g), d = dom(g), rs = d.res;
  if (!cd && !rs) return "";
  let h = `<div class="rubric"><h2>Ressources du clerc</h2></div><div class="slots res">`;
  if (cd) h += capRow(g, "ccd", "Conduit divin", "repos court", pipsOf("ccd", cd, Math.min(cd, g.ccdU), "Conduit divin"), false, cdBody);
  if (rs) { const f = d.feats.find(x => x.n === rs.n); h += capRow(g, "dres", rs.n, "repos long", pipsOf("dres", rs.max(g), Math.min(rs.max(g), g.dresU), rs.n), !!cd, () => f ? `<div class="eff">${esc(f.d(g))}</div>` : ""); }
  if (g.level >= 10) h += capRow(g, "di", "Intervention divine", g.level >= 20 ? "réussite automatique" : `d100 ≤ ${g.level} · 7 jours si elle réussit`, pipsOf("di", 1, Math.min(1, g.diU), "Intervention divine"), true, () => `<div class="eff">${esc(BASE[3].d(g))}</div><div class="cast"><button class="btn cast-go sm" data-a="di-roll"${g.diU ? " disabled" : ""}>Implorer · lancer 1d100</button></div>`);
  return h + `</div>`;
}
onClick("ccd-use", (b) => {
  const g = G(); if (!g || g.ccdU >= CLE.cd(g)) return; const x = cdOpts(g).find(o => o.k === b.dataset.v); if (!x) return;
  const prev = JSON.parse(JSON.stringify({ ccdU: g.ccdU, effects: g.effects }));
  mutate(g => { g.ccdU += 1; if (x.fx) g.effects.push({ k: fxKey(), id: "ccd-" + x.k, name: x.n, d: x.fx, c: false, note: "" }); });
  toast(`<b>${esc(x.n)}</b> : Conduit divin utilisé${x.note ? x.note(g) : ""}`, () => { mutate(g => { g.ccdU = prev.ccdU; g.effects = prev.effects; }); return "Conduit divin annulé"; });
});
onClick("di-roll", () => {
  const g = G(); if (!g || g.diU) return; const r = 1 + Math.floor(Math.random() * 100), ok = g.level >= 20 || r <= g.level;
  if (ok) mutate(g => { g.diU = 1; });
  toast(g.level >= 20 ? "<b>Intervention divine</b> : ta divinité intervient (niveau 20). Plus d'appel pendant 7 jours." : `<b>Intervention divine</b> : ${r} ${ok ? `≤ ${g.level}, ta divinité intervient ! Plus d'appel pendant 7 jours (cercle coché).` : `> ${g.level}, pas de réponse. Nouvel essai après un repos long.`}`, ok ? () => { mutate(g => { g.diU = 0; }); return "Intervention annulée"; } : null);
});
onChange("#f-domain", t => { mutate(g => { g.domain = t.value; }); toast("Domaine changé : sorts de domaine et maîtrises d'armes et d'armures suivent ; langues et compétences du domaine sont à revoir dans Personnage"); });

// ---------- Création (étape Compétences) : domaine dès le niveau 1, choix propres (Savoir, Nature)
const KNOW_SK = ["arcana", "history", "nature", "religion"], NAT_SK = ["animal", "nature", "survival"];
const skN = k => (SKILLS.find(s => s[0] === k) || [k, k])[1];
const druidCantrips = () => SPELLS.filter(s => s.l === 0 && (s.cl || []).includes("druide")).sort(byName);
const creation = {
  html: c => { const x = c.cx || {};
    let h = `<div class="crcls"><span class="lusub">Domaine divin · dès le niveau 1</span><p class="help" style="margin:0">Sorts de domaine toujours préparés, maîtrises en plus, capacités aux niveaux 1, 2, 6, 8 et 17.</p>`;
    h += Object.entries(DOMAINS).map(([k, o]) => { const on = k === x.dom;
      let r = `<button class="subopt${on ? " on" : ""}" data-a="cr-cdom" data-v="${k}" aria-pressed="${on}"><span class="rd" aria-hidden="true"></span><span class="bd"><b>${esc(o.full)}${o.src ? ` <small>(${esc(o.src)})</small>` : ""}</b><small>${esc(o.sum)}</small></span></button>`;
      if (on) {
        r += `<div class="subx">`;
        if (k === "savoir") r += `<span class="lusub">Compétences à maîtrise doublée · ${(x.sk || []).length}/2</span><div class="chips">${KNOW_SK.map(s => { const sel = (x.sk || []).includes(s); return `<button class="chip" data-a="cr-cdsk" data-v="${s}" aria-pressed="${sel}"${!sel && (x.sk || []).length >= 2 ? " disabled" : ""}>${skN(s)}</button>`; }).join("")}</div>
          <span class="lusub">Langues · 2</span>${[0, 1].map(i => `<select data-crcdlang="${i}" aria-label="Langue ${i + 1}"><option value="">Langue…</option>${LANGS.map(l => `<option${(x.langs || [])[i] === l ? " selected" : ""}>${l}</option>`).join("")}</select>`).join("")}`;
        if (k === "nature") r += `<span class="lusub">Sort mineur de druide</span><select id="cr-cdcan" aria-label="Sort mineur de druide"><option value="">Choisir…</option>${druidCantrips().map(s => `<option value="${s.id}"${x.can === s.id ? " selected" : ""}>${esc(s.n)}</option>`).join("")}</select>
          <span class="lusub">Compétence</span><div class="chips">${NAT_SK.map(s => `<button class="chip" data-a="cr-cdnsk" data-v="${s}" aria-pressed="${x.nsk === s}">${skN(s)}</button>`).join("")}</div>`;
        const sp = o.sp[1].map(id => BY_ID[id] ? BY_ID[id].n : id).join(" et ");
        r += `<span class="fpprev">Ajouté à la fiche : ${[...(o.weapons ? ["armes de guerre"] : []), ...(o.armor ? ["armures lourdes"] : []), ...(o.tools || []).map(t => t.toLowerCase()), ...(o.cantrip ? ["sort mineur Lumière"] : [])].join(", ")}${o.weapons || o.armor || o.tools || o.cantrip ? " · " : ""}${sp} toujours préparés</span></div>`;
      }
      return r; }).join("");
    return h + `</div>`; },
  missing: c => { const x = c.cx || {}; if (!DOMAINS[x.dom]) return "choisis ton domaine divin";
    if (x.dom === "savoir" && ((x.sk || []).length < 2 || (x.langs || []).filter(Boolean).length < 2)) return "choisis les compétences et langues du Savoir";
    if (x.dom === "nature" && (!x.can || !x.nsk)) return "choisis le sort mineur et la compétence de la Nature"; return ""; },
  auto: c => { const x = c.cx || {}; return x.dom === "lumiere" ? ["light"] : x.dom === "nature" && x.can ? [x.can] : []; },
  apply: (g, c) => { const x = c.cx || {}, d = DOMAINS[x.dom]; if (!d) return; g.domain = x.dom;
    if (x.dom === "savoir") { (x.sk || []).forEach(k => { g.skills[k] = 2; }); g.langs = [...new Set([...g.langs, ...(x.langs || []).filter(Boolean)])]; }
    if (x.dom === "nature" && x.nsk) g.skills[x.nsk] = Math.max(1, g.skills[x.nsk] || 0);
    creation.auto(c).forEach(id => { if (!g.cantrips.includes(id)) g.cantrips.push(id); });
    (d.tools || []).forEach(t => { g.tools[t] = Math.max(1, g.tools[t] || 0); }); },
};
const crUpd = fn => { if (!S.cr) return; S.cr.cx = S.cr.cx || {}; fn(S.cr.cx); S.luKeep = true; render(); };
onClick("cr-cdom", (b) => crUpd(x => { if (x.dom !== b.dataset.v) { Object.keys(x).forEach(k => delete x[k]); x.dom = b.dataset.v; S.cr.cantrips = S.cr.cantrips.filter(id => id !== "light"); } }));
onClick("cr-cdsk", (b) => crUpd(x => { const s = x.sk || [], v = b.dataset.v; x.sk = s.includes(v) ? s.filter(y => y !== v) : s.length < 2 ? [...s, v] : s; }));
onClick("cr-cdnsk", (b) => crUpd(x => { x.nsk = b.dataset.v; }));
onChange(t => t.dataset.crcdlang != null, t => crUpd(x => { const l = [...(x.langs || [])]; l[+t.dataset.crcdlang] = t.value; x.langs = l; }));
onChange("#cr-cdcan", t => crUpd(x => { x.can = t.value || null; if (S.cr) S.cr.cantrips = S.cr.cantrips.filter(id => id !== t.value); }));

// ---------- Onglet Règles
function rulesHTML(g) {
  const d = dom(g);
  return `<div class="cols rules">
  <div><div class="rubric" style="margin-top:4px"><h3>Préparer</h3></div>
  <p>Après un repos long, choisis <b>${R.prepMax(g)} sorts</b> dans toute la liste du clerc (modificateur de Sagesse + niveau), parmi les niveaux que tu peux lancer. Les <b>sorts de domaine</b> (${esc(d.full)}) sont toujours préparés, en plus. Tes <b>${R.cantrips(g)} sorts mineurs</b> se lancent à volonté.</p>
  <div class="rubric"><h3>Rituels</h3></div>
  <p>Un sort <b>préparé</b> marqué <span class="tag r">R</span> se lance en 10 minutes de plus, sans dépenser d'emplacement.</p>
  ${castingRules(g)}
  ${concentrationRules()}</div>
  <div><div class="rubric" style="margin-top:4px"><h3>Conduit divin</h3></div>
  <p><b>${CLE.cd(g) || 1} fois</b> par repos court ou long (dès le niveau 2 ; 2 au niveau 6, 3 au 18) : <b>Renvoi des morts-vivants</b> (JdS SAG, DD ${DD(g)}, 9 m) ou une option du domaine (${d.cd.map(x => esc(x.n)).join(", ")}).</p>
  <div class="rubric"><h3>Destruction des morts-vivants</h3></div>
  <p>Dès le niveau 5, un mort-vivant qui rate son jet contre le Renvoi est détruit si son FP est faible : 1/2 (niveau 5), 1 (8), 2 (11), 3 (14), 4 (17).</p>
  <div class="rubric"><h3>Intervention divine</h3></div>
  <p>Dès le niveau 10, action : 1d100 ≤ ton niveau, ta divinité intervient (automatique au niveau 20). Ensuite 7 jours d'attente ; en cas d'échec, nouvel essai après un repos long.</p>
  <div class="rubric"><h3>Récupérer</h3></div>
  <p><b>Repos long :</b> emplacements, Conduit divin${d.res ? `, ${esc(d.res.n)}` : ""}. <b>Repos court :</b> Conduit divin.</p>
  <p class="muted">Sources : Manuel des joueurs 2014 (clerc et domaines)${d.src ? `, ${esc(d.src)} (${esc(d.full)})` : ""}. Résumés rédigés pour la table, à vérifier dans le livre en cas de doute.</p></div></div>`;
}
// ---------- Fiche imprimable
function printSheet(g) {
  const prof = R.prof(g.level), mod = R.am(g), dd = DD(g), d = dom(g), pMax = R.prepMax(g), cd = CLE.cd(g), ds = domainSpells(g).map(id => BY_ID[id]).sort((a, b) => a.l - b.l || byName(a, b));
  return `${pHeader(g, `Clerc, niveau ${g.level} · ${esc(d.full)}`, [[signed(mod), "MOD. SAGESSE"], [dd, "DD DES SORTS"], [signed(prof + mod), "ATTAQUE DE SORT"], [pMax, "SORTS PRÉPARÉS"], [R.cantrips(g), "SORTS MINEURS"]])}
${pSlots(g)}
<h2>Ressources <small>cocher à l'usage</small></h2>
${cd ? `<div class="res"><span class="l">Conduit divin</span>${pDots(cd)}<span class="r">repos court ou long</span></div>
<div class="callout"><b>Renvoi des morts-vivants</b> : JdS SAG DD ${dd}, 9 m, 1 minute${CLE.destroy(g.level) ? ` · détruit si FP ${CLE.destroy(g.level)} ou moins` : ""}.${cdOpts(g).filter(x => x.k !== "turn").map(x => `<br><b>${esc(x.n)}</b> : ${x.e(g).replace(/<[^>]+>/g, "")}`).join("")}</div>` : `<div class="res"><span class="l" style="color:#9aa0ae">Conduit divin</span>${pDots(1, true)}<span class="r">au niveau 2</span></div>`}
${d.res ? `<div class="res"><span class="l">${esc(d.res.n)}</span>${pDots(d.res.max(g))}<span class="r">repos long</span></div>` : ""}
${g.level >= 10 ? `<div class="res"><span class="l">Intervention divine</span>${pDots(1)}<span class="r">${g.level >= 20 ? "automatique" : `d100 ≤ ${g.level}`} · 7 jours si elle réussit</span></div>` : ""}
<h2>Capacités de classe <small>${esc(d.full)} · niveau ${g.level}</small></h2>
<table>${feats(g).filter(f => f.lv <= g.level).map(f => `<tr><td class="n">${f.n}</td><td>${esc(f.d(g))}</td></tr>`).join("")}</table>
${pCantrips(g)}
${pExtras(g)}
${pConc()}
<div class="brk"></div>
<h2 style="margin-top:0">Sorts de domaine <small>${esc(d.full)} · toujours préparés, hors limite</small></h2>
<table><tr><th>Sort</th><th>Incantation · composantes</th><th>Effet</th></tr>${ds.map(s => pSpellRow(g, s, false)).join("")}</table>
<h2>Sorts de clerc <small>sorts préparés aujourd'hui : ____ / ${pMax}</small></h2>
${pClassList(g, domainSpells(g))}
<div class="callout"><span class="tag">C</span> concentration · <span class="tag r">R</span> rituel : un sort préparé se lance en 10 minutes de plus, sans emplacement.</div>
${pNotes(g)}
${pFoot("CLERC")}`;
}

// ---------- Définition de la classe (contrat : voir docs/ARCHITECTURE.md) ----------
const row = (l, o, n, cls) => `<div class="${o === n ? "same" : ""}"><span>${l}</span><span class="old">${o}</span><span class="ar">→</span><b${cls && o !== n ? ` style="color:var(${cls})"` : ""}>${n}</b></div>`;
export default {
  n: "Clerc", ab: "wis", abN: "Sagesse", abArticle: "la Sagesse", slots: SLOTS, top: 9, hitDie: "1d8",
  saves: ["wis", "cha"],
  weaponProf: g => ["simple", ...(dom(g).weapons || [])], armorProf: g => ["light", "medium", "shield", ...(dom(g).armor || [])],
  tools: g => dom(g).tools || [],
  cantrips: lv => lv >= 10 ? 5 : lv >= 4 ? 4 : 3,
  cantripBonus: g => dom(g).cantrip || g.domain === "nature" ? 1 : 0,   // Lumière (Lumière), sort de druide (Nature) : en plus
  prep: (g, m) => Math.max(1, m + g.level),
  ritualNeedsPrep: true, canRitual: prepared => prepared,
  defaults: () => ({ domain: "vie", ccdU: 0, dresU: 0, diU: 0 }),
  normalize(o) { if (!DOMAINS[o.domain]) o.domain = "vie"; ["ccdU", "dresU", "diU"].forEach(k => { o[k] = Math.max(0, +o[k] || 0); }); },
  subclass: { lv: 1, label: "Domaine divin", field: "domain", opts: () => Object.entries(DOMAINS).map(([k, d]) => [k, d.full, d.sum]) },
  subline: g => `Clerc niveau ${g.level} · ${esc(dom(g).full)}`,
  subclassField: g => `<div class="field"><label for="f-domain">Domaine divin</label><select id="f-domain">${Object.entries(DOMAINS).map(([k, d]) => `<option value="${k}"${k === g.domain ? " selected" : ""}>${d.n}</option>`).join("")}</select></div>`,
  heroStats: g => { const cMax = R.cantrips(g); return `<div class="stat ${g.cantrips.length > cMax ? "alert" : ""}" role="listitem"><div class="v">${g.cantrips.length}<small>/${cMax}</small></div>${statLabel("Sorts mineurs", "Mineurs")}</div>
    <div class="stat" role="listitem"><div class="v">${CLE.cd(g) ? `${CLE.cd(g) - Math.min(CLE.cd(g), g.ccdU)}<small>/${CLE.cd(g)}</small>` : "—"}</div>${statLabel("Conduit divin", "Conduit")}</div>`; },
  tabs: g => [["grimoire", "Sorts"], ["biblio", "Bibliothèque", classSpells(g).length]],
  moreTabs: () => [["regles", "Règles"], ["imprimer", "Imprimer"]],
  panels: { imprimer: g => printHTML(g), regles: g => rulesHTML(g) },
  print: g => printSheet(g),
  printTitle: g => `Fiche de sorts de ${g.name}`,
  printDesc: "Elle contient le tableau de bord (emplacements, Conduit divin et ressources à cocher), les capacités du clerc et du domaine, les sorts mineurs, les sorts de domaine, la liste du clerc avec des cases « préparé » et le rappel des règles.",
  alwaysPrepared: g => domainSpells(g),
  alwaysPreparedInfo: g => ({ title: "Sorts de domaine", aside: `toujours préparés · ${esc(dom(g).n)}`, origin: `Sort de domaine · ${esc(dom(g).full)}`, tip: "Sort de domaine : toujours préparé, hors limite", aria: "Sort de domaine, toujours préparé" }),
  features: g => feats(g),
  resources: g => cleResHTML(g),
  resourceMax: { ccd: g => CLE.cd(g), dres: g => dom(g).res ? dom(g).res.max(g) : 0, di: () => 1 },
  // Disciple de la vie : soins + 2 + niveau du sort ; Incantation puissante (Lumière, Savoir, niveau 8) : + SAG aux sorts mineurs à dégâts
  dmgBonus: (g, s) => dom(g).heal && s.l >= 1 && /^f:Soigne \d/.test(s.p || "") ? 2 + s.l : dom(g).potent && g.level >= 8 && s.l === 0 && (s.p || "").startsWith("d:") ? R.am(g) : 0,
  acBonus: (g, armor) => g.domain === "forge" && g.level >= 6 && armor && armor.cat === "heavy" ? [["Âme de la forge", 1]] : [],
  halfDamage: g => g.level >= 17 && (g.domain === "guerre" || g.domain === "forge") ? "résistance aux dégâts C/P/T non magiques" : "",
  attackNotes: g => [g.level >= 8 && dom(g).feats.some(f => f.n === "Frappe divine") ? `<b>Frappe divine</b> : 1 fois par tour, +${CLE.strike(g)} ${dom(g).feats.find(f => f.n === "Frappe divine").pill(g).replace(/^\+\S+ /, "").replace(" · 1 fois par tour", "")}.` : "",
    g.domain === "guerre" ? `<b>Prêtre de guerre</b> : une attaque d'arme en action bonus après l'action Attaquer (${WIS(g)} fois par repos long).` : ""].filter(Boolean),
  longRest: g => { g.ccdU = 0; g.dresU = 0; },
  shortRest: g => CLE.cd(g) ? { field: "ccdU", label: "Conduit divin", done: "récupéré" } : null,
  creation,
  levelUp: {
    rowsAfter: (g, b) => row("Sorts mineurs connus", R.cantrips(g), R.cantrips(b), "--rubric") + (CLE.cd(b) ? row("Conduit divin", CLE.cd(g), CLE.cd(b), "--ok") : "") + (CLE.destroy(b.level) ? row("Destruction", CLE.destroy(g.level) ? `FP ${CLE.destroy(g.level)}` : "—", `FP ${CLE.destroy(b.level)}`, "--pd-fg") : ""),
    summaryExtra(g, b) {
      const nw = domainSpells(b).filter(id => !domainSpells(g).includes(id));
      return nw.length ? `<div style="display:grid;gap:6px"><span class="lusub" style="color:var(--gold)">Nouveaux sorts de domaine · toujours préparés</span>${nw.map(id => BY_ID[id]).map(s => `<div class="lucan"><span style="color:var(--gold)">★</span><span class="n">${esc(s.n)}</span><span class="kps">${keyPills(s, b)}</span></div>`).join("")}</div>` : "";
    },
    notes: (g, to) => [to === 10 ? `<span><b>Intervention divine</b> : dans les ressources du clerc (Implorer).</span>` : ""].filter(Boolean),
    recapAfter: (g, b) => { const n = domainSpells(b).length - domainSpells(g).length; return n ? `<div><span class="n">Sorts de domaine</span><small>+ ${n}</small></div>` : ""; },
  },
};
export { DOMAINS, CLE, domainSpells };
