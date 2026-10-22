// Onglet Règles : rubriques communes à toutes les classes (lancer un sort, concentration).
// Chaque classe compose son onglet avec ces rubriques et les siennes ; les valeurs sont celles du personnage.
import { C } from "../classes/index.js";
import { signed } from "../core/format.js";
import { R } from "../rules/common.js";

/** Lancer un sort : emplacements, jet de sauvegarde (DD) et attaque de sort, avec les pastilles de l'application. */
export function castingRules(g) {
  const prof = R.prof(g.level), mod = R.am(g), dd = 8 + prof + mod, atk = prof + mod, ab = C(g).abN;
  return `<div class="rubric"><h3>Lancer un sort</h3></div>
  <p><b>Emplacement.</b> Lancer un sort dépense un emplacement de son niveau <b>ou supérieur</b> ; certains sorts gagnent quelque chose à un niveau plus élevé (bouton ▲). Les sorts mineurs ne dépensent rien.</p>
  <p><b>Jet de sauvegarde</b> <span class="kp s">DEX ${dd}</span> — la cible lance un d20 + son modificateur dans la caractéristique indiquée. En dessous de ton <b>DD de ${dd}</b> (8 + maîtrise ${signed(prof)} + ${ab} ${signed(mod)}), elle subit l'effet complet ; sinon, l'effet réduit écrit sous la pastille (souvent la moitié des dégâts, ou aucun effet).</p>
  <p><b>Attaque de sort</b> <span class="kp a">${signed(atk)}</span> — tu lances un d20 ${signed(atk)} (maîtrise ${signed(prof)} + ${ab} ${signed(mod)}) contre la CA de la cible : touché si tu l'égales ou la dépasses. Un 20 naturel est un coup critique (dés de dégâts doublés), un 1 naturel un échec.</p>
  <p><b>Pastilles.</b> <span class="kp d">dégâts</span> ce que subit la cible, <span class="kp f">effet</span> ce que fait le sort, <span class="kp s">sauvegarde</span> le jet de la cible, <span class="kp a">attaque</span> ton jet pour toucher.</p>`;
}

/** Concentration : un seul sort à la fois, jet de Constitution en cas de dégâts. extra : précision propre à la classe. */
export function concentrationRules(extra = "") {
  return `<div class="rubric"><h3>Concentration</h3></div>
  <p>Un sort marqué <span class="tag c">C</span> dure tant que tu restes concentré. <b>Un seul à la fois</b> : en lancer un autre met fin au premier.</p>
  <p><b>Dégâts subis :</b> jet de sauvegarde de Constitution, <b>DD 10 ou la moitié des dégâts</b> si c'est plus (un jet par source de dégâts). Raté : le sort prend fin. Être neutralisé ou tué y met fin aussi.${extra}</p>`;
}
