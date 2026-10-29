// Onglet « Capacités » des classes sans sorts (barbare, roublard…). En jeu : le seul point d'entrée des actions
// (Rage, Attaque sournoise, attaques, objets, ressources, repos). Gérer : capacités et réglages seulement.
import { C } from "../classes/index.js";
import { S } from "../core/state.js";
import { attacksHTML } from "./attacks.js";
import { itemsActionHTML } from "./equipment.js";
import { featsPlayHTML } from "./featplay.js";
import { innateHTML } from "./innate.js";
import { featsHTML } from "./grimoire.js";
import { restBarHTML } from "./rest.js";

function abilitiesHTML(g) {
  const jeu = S.view === "jeu";
  let h = `<div class="viewsw" role="group" aria-label="Affichage des capacités"><button data-a="view" data-v="gerer" aria-pressed="${!jeu}">✎ Gérer</button><button data-a="view" data-v="jeu" aria-pressed="${jeu}">En jeu</button></div>`;
  if (!jeu) return h + featsHTML(g) + (C(g).capsSettings ? C(g).capsSettings(g) : ""); // Gérer : réglages seulement (capacités, style, manœuvres…), aucune action
  if (C(g).capsTop) h += C(g).capsTop(g);         // carte propre à la classe (Rage, Attaque sournoise…)
  if (C(g).resources) h += C(g).resources(g);      // autres ressources (Ruse, ki, dés de supériorité…)
  h += restBarHTML(g);                              // repos sous les ressources qu'ils rechargent, comme sous les emplacements dans l'onglet Sorts
  h += attacksHTML(g) + itemsActionHTML(g) + featsPlayHTML(g) + innateHTML(g); // attaques, objets, dons
  return h + featsHTML(g);
}

export { abilitiesHTML };
