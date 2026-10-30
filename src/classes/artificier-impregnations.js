// Artificier : imprégnations (AideDD, version d'Eberron fournie par Fabien, octobre 2026). Connues : g.infK (identifiants ;
// une réplique d'objet magique s'écrit "rep:<nom>"). Actives : l'objet de l'inventaire porte inf (identifiant) et infAt (ordre),
// pour survivre au rangement de la liste. Au-delà du nombre d'objets imprégnés, la plus ancienne prend fin.
import { esc } from "../core/format.js";
import { gearOf } from "../rules/equipment.js";

// Réplique d'objet magique : tables par niveau d'artificier [nom, lien]
const REP = {
  2: [["Cruche alchimique", 0], ["Sac sans fond", 0], ["Capuchon de respiration aquatique", 0], ["Lunettes de nuit", 0], ["Corde d'escalade", 0], ["Pierres de communication à distance", 0], ["Baguette de détection de la magie", 0], ["Baguette des secrets", 0]],
  6: [["Bottes elfiques", 0], ["Cape elfique", 1], ["Cape de la raie manta", 0], ["Yeux de charme", 1], ["Gants de cambrioleur", 0], ["Lanterne de révélation", 0], ["Flûte terrifiante", 0], ["Anneau de marche sur l'eau", 0]],
  10: [["Bottes de marche et de saut", 1], ["Bottes des contrées hivernales", 1], ["Bracelets d'archer", 1], ["Broche de protection", 1], ["Cape de protection", 1], ["Yeux de lynx", 1], ["Gantelets de puissance d'ogre", 1], ["Gants antiprojectiles", 1], ["Gants de nage et d'escalade", 1], ["Chapeau de déguisement", 1], ["Bandeau d'intelligence", 1], ["Heaume de télépathie", 1], ["Médaillon des pensées", 1], ["Amulette de cicatrisation", 1], ["Flûte des égouts", 1], ["Carquois d'Ehlonna", 0], ["Anneau de saut", 1], ["Anneau de protection mentale", 1], ["Chaussons de pattes d'araignée", 1], ["Bottes ailées", 1]],
  14: [["Amulette de santé", 1], ["Ceinturon de force de géant des collines", 1], ["Bottes de lévitation", 1], ["Bottes de rapidité", 1], ["Bracelets de défense", 1], ["Cape de la chauve-souris", 1], ["Menottes dimensionnelles", 0], ["Gemme de vision", 1], ["Cor de destruction", 0], ["Anneau d'action libre", 1], ["Anneau de protection", 1], ["Anneau du bélier", 1]],
};
const isWeapon = x => { const w = gearOf(x); return !!w && w.kind === "weapon" && (w.cat === "simple" || w.cat === "martial"); };
const isArmorOrShield = x => { const a = gearOf(x); return !!a && a.kind === "armor"; };
const lvBonus = g => g.level >= 10 ? 2 : 1;
// Imprégnations : n, lv (prérequis), obj (objet demandé), lien, ok (objets de l'inventaire acceptés), atk / ac (bonus), d (texte AideDD)
const INF = {
  "arme": { n: "Arme améliorée", obj: "une arme courante ou de guerre", ok: isWeapon, atk: lvBonus, pill: g => `+${lvBonus(g)} toucher et dégâts`,
    d: "Octroie un bonus de +1 aux jets d'attaque et de dégâts effectués avec cette arme magique. Le bonus passe à +2 lorsque vous atteignez le niveau 10 dans cette classe." },
  "boomerang": { n: "Arme boomerang", obj: "une arme courante ou de guerre avec la propriété lancer", ok: x => isWeapon(x) && !!gearOf(x).thrown, atk: () => 1, pill: () => "+1, revient en main",
    d: "Octroie un bonus de +1 aux jets d'attaque et de dégâts effectués avec cette arme magique, qui retourne dans la main de son porteur immédiatement après avoir effectué une attaque à distance." },
  "defense": { n: "Défense améliorée", obj: "une armure ou un bouclier", ok: isArmorOrShield, ac: lvBonus, pill: g => `+${lvBonus(g)} CA`,
    d: "Une créature reçoit un bonus de +1 à sa Classe d'Armure lorsqu'elle porte l'objet imprégné (armure ou bouclier). Le bonus passe à +2 lorsque vous atteignez le niveau 10 dans cette classe." },
  "focal": { n: "Focaliseur arcanique amélioré", obj: "une baguette, un bâton ou un sceptre", lien: true, ok: () => true, pill: g => `+${lvBonus(g)} attaque de sort`,
    d: "Tant qu'elle tient cet objet, une créature gagne un bonus de +1 aux jets d'attaque avec un sort. De plus, la créature ignore les abris partiels lorsqu'elle effectue une attaque avec un sort. Le bonus passe à +2 lorsque vous atteignez le niveau 10 dans cette classe." },
  "homoncule": { n: "Serviteur homoncule", obj: "une gemme ou un cristal d'au moins 100 po", ok: () => true, pill: () => "homoncule (carte en jeu)",
    d: "L'objet imprégné sert de cœur à un homoncule qui vous sert : amical envers vous et vos compagnons, il obéit à vos ordres. Il partage votre initiative et joue juste après vous ; il ne fait que l'action Esquiver, sauf si vous lui donnez un ordre par une action bonus (une action de son bloc, ou Aider, Chercher, Foncer, Se cacher, Se désengager). Réparation lui rend 2d6 PV. S'il meurt, il disparaît en laissant son cœur." },
  "bottes": { n: "Bottes du sentier sinueux", lv: 6, obj: "une paire de bottes", lien: true, ok: () => true, pill: () => "téléport 4,50 m (action bonus)",
    d: "Une créature qui porte ces bottes peut se téléporter par une action bonus jusqu'à une distance de 4,50 m dans un espace inoccupé qu'elle peut voir. La créature doit avoir occupé cet espace à un moment donné au cours du tour en cours." },
  "radiante": { n: "Arme radiante", lv: 6, obj: "une arme courante ou de guerre", lien: true, ok: isWeapon, atk: () => 1, ch: 4, pill: () => "+1, lumière, 4 charges",
    d: "Bonus de +1 aux jets d'attaque et de dégâts. Action bonus : lumière vive sur 9 m et faible sur 9 m de plus (action bonus pour l'arrêter). 4 charges : par une réaction, juste après avoir été touché par une attaque, dépense 1 charge ; l'attaquant est aveuglé jusqu'à la fin de son prochain tour, sauf JdS de Constitution réussi contre le DD de vos sorts. Récupère 1d4 charges à l'aube." },
  "repulsif": { n: "Bouclier répulsif", lv: 6, obj: "un bouclier", lien: true, ok: x => { const a = gearOf(x); return !!a && a.cat === "shield"; }, ac: () => 1, ch: 4, pill: () => "+1 CA, 4 charges",
    d: "Bonus de +1 à la CA. 4 charges : par une réaction, juste après avoir été touché par une attaque au corps à corps, dépense 1 charge pour repousser l'attaquant jusqu'à 4,50 m. Récupère 1d4 charges à l'aube." },
  "resistante": { n: "Armure résistante", lv: 6, obj: "une armure", lien: true, ok: x => { const a = gearOf(x); return !!a && a.kind === "armor" && a.cat !== "shield"; }, pill: x => x && x.infOpt ? `résistance : ${x.infOpt}` : "résistance au choix",
    d: "Une créature qui porte cette armure obtient la résistance à un des types de dégâts suivants, choisi au moment d'imprégner l'objet : acide, feu, force, foudre, froid, nécrotique, poison, psychique, radiant ou tonnerre." },
};
const RES_TYPES = ["acide", "feu", "force", "foudre", "froid", "nécrotique", "poison", "psychique", "radiant", "tonnerre"];
const REP_D = "Reproduit l'objet magique (voir sa description dans le Guide du maître).";
/** Fiche d'une imprégnation connue (identifiant, ou "rep:<nom>"). */
function infOf(k) {
  if (INF[k]) return { k, ...INF[k] };
  const m = /^rep:(.+)$/.exec(k || ""); if (!m) return null;
  const lv = +Object.keys(REP).find(l => REP[l].some(([n]) => n === m[1]));
  if (!lv) return null;
  const lien = REP[lv].find(([n]) => n === m[1])[1];
  return { k, n: `Réplique · ${m[1]}`, rep: m[1], lv: lv > 2 ? lv : 0, obj: "l'objet à reproduire", lien: !!lien, ok: () => true, pill: () => `niv. ${lv}${lien ? " · lien" : " · sans lien"}`, d: REP_D };
}
/** Toutes les imprégnations proposées (prérequis compris, pour les griser). */
const allInf = () => [...Object.keys(INF), ...Object.values(REP).flat().map(([n]) => "rep:" + n)].map(infOf);
const infKnown = lv => lv >= 18 ? 12 : lv >= 14 ? 10 : lv >= 10 ? 8 : lv >= 6 ? 6 : lv >= 2 ? 4 : 0;
const infItems = lv => lv >= 18 ? 6 : lv >= 14 ? 5 : lv >= 10 ? 4 : lv >= 6 ? 3 : lv >= 2 ? 2 : 0;
const infPills = (g, k, x) => { const f = infOf(k); return f ? `<span class="kp f">${esc(f.pill(f.k === "resistante" ? x : g))}</span>${f.lien ? `<span class="kp n">lien</span>` : ""}${f.lv ? `<span class="kp n">niv. ${f.lv}</span>` : ""}` : ""; };

export { INF, REP, RES_TYPES, infOf, allInf, infKnown, infItems, infPills };
