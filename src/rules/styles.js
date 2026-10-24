// Styles de combat (Manuel des joueurs 2014, textes AideDD) : communs au guerrier (6), au paladin (4) et au rôdeur (4).
// Calculés : Archerie (+2 au toucher à distance), Défense (+1 CA en armure), Duel (+2 dégâts, une arme de corps à corps et aucune autre),
// Combat à deux armes (modificateur aux dégâts de la seconde arme). Rappelés : Arme à deux mains, Protection.
import { acCalc } from "./equipment.js";
/** Une arme est tenue en main secondaire (case « main secondaire » de l'équipement) : pas de Duel. */
const offHand = g => (g.items || []).some(x => x.eq && x.oh);

const STYLES = {
  archerie: { n: "Archerie", k: "+2 à distance", d: "Tu obtiens un bonus de +2 aux jets d'attaque avec une arme à distance." },
  deuxmains: { n: "Arme à deux mains", k: "relance 1 et 2", d: "Quand tu obtiens 1 ou 2 à un dé de dégâts d'une attaque avec une arme de corps à corps tenue à deux mains, tu peux relancer le dé et tu dois garder le nouveau résultat, même un 1 ou un 2. L'arme doit avoir la propriété à deux mains ou polyvalente." },
  deuxarmes: { n: "Combat à deux armes", k: "mod. aux dégâts de la 2e arme", d: "Quand tu combats avec deux armes, tu ajoutes ton modificateur de caractéristique aux dégâts de la seconde attaque." },
  defense: { n: "Défense", k: "+1 CA", d: "Si tu portes une armure, tu obtiens un bonus de +1 à la CA." },
  duel: { n: "Duel", k: "+2 dégâts à une main", d: "Quand tu attaques avec une arme de corps à corps dans une main et aucune autre arme, tu obtiens un bonus de +2 aux dégâts avec cette arme." },
  protection: { n: "Protection", k: "réaction, bouclier", d: "Quand une créature que tu vois attaque une cible autre que toi à 1,50 m ou moins de toi, tu peux utiliser ta réaction pour imposer un désavantage à son jet d'attaque. Il faut porter un bouclier." },
};
/** Styles proposés par une classe, dans l'ordre donné. */
const stylesOf = keys => Object.fromEntries(keys.map(k => [k, STYLES[k]]));
/** Effet des styles actifs (list) sur une attaque : { hit, dmg, dmg2, offMod, pills }. */
function styleMods(g, list, w, off) {
  const x = { pills: [] };
  if (list.includes("archerie") && w.rng === "ranged") { x.hit = 2; x.pills.push("Archerie +2"); }
  if (list.includes("duel") && w.rng === "melee" && !w.two && w.id !== "unarmed" && !off && !offHand(g)) { x.dmg = 2; x.dmg2 = 0; x.pills.push("Duel : +2 à une main"); }
  if (list.includes("deuxmains") && w.rng === "melee" && (w.two || w.vers)) x.pills.push(`Arme à deux mains : relance 1-2${w.vers ? " (tenue à deux mains)" : ""}`);
  if (list.includes("deuxarmes") && off) { x.offMod = true; x.pills.push("Combat à deux armes : mod. aux dégâts"); }
  return x;
}
const styleAC = (list, armor) => list.includes("defense") && armor ? [["Style de combat : Défense", 1]] : [];
/** Rappels sous les attaques (Protection : seulement avec un bouclier porté). */
const styleNotes = (g, list) => [list.includes("protection") ? (acCalc(g).shield ? "<b>Protection</b> : réaction pour imposer un désavantage à une attaque contre une cible à 1,50 m de toi (bouclier porté)." : "<b>Protection</b> : il faut porter un bouclier.") : ""].filter(Boolean);

export { STYLES, stylesOf, styleMods, styleAC, styleNotes };
