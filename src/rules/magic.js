// Objets magiques (saisie libre) : bonus +1 à +3 (armes et armures du Manuel), dégâts en plus, harmonisation (3 au plus),
// charges et recharge. Calculs purs.

const REC = [["aube", "à l'aube"], ["long", "repos long"], ["court", "repos court ou long"], ["", "pas de recharge"]];
const recLabel = r => (REC.find(x => x[0] === r) || REC[3])[1];
const MAX_ATT = 3;
/** Un objet qui demande l'harmonisation n'a d'effet magique qu'harmonisé. */
const usable = x => !x.att || x.attuned;
const isMagic = x => !!(x.bonus || x.xdmg || x.att || x.chMax);
const attunedCount = g => g.items.filter(x => x.att && x.attuned).length;
/** Recharge des charges : repos long (« à l'aube » compté au repos long), ou repos court pour les objets qui le permettent. */
function rechargeItems(g, kind) {
  let n = 0;
  g.items.forEach(x => { if (x.chMax && x.chU && (kind === "long" ? x.rec !== "" : x.rec === "court")) { x.chU = 0; n++; } });
  return n;
}

export { REC, recLabel, MAX_ATT, usable, isMagic, attunedCount, rechargeItems };
