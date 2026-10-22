// Onglet « Capacités » des classes sans sorts (barbare, roublard…) : carte de la ressource principale (Rage,
// Attaque sournoise), attaques, ressources, capacités de classe et repos. Gérer / En jeu, comme l'onglet Sorts.
import { C } from "../classes/index.js";
import { S } from "../core/state.js";
import { attacksHTML } from "./attacks.js";
import { featsHTML } from "./grimoire.js";
import { restBarHTML } from "./rest.js";

function abilitiesHTML(g) {
  const jeu = S.view === "jeu";
  let h = `<div class="viewsw" role="group" aria-label="Affichage des capacités"><button data-a="view" data-v="gerer" aria-pressed="${!jeu}">Gérer</button><button data-a="view" data-v="jeu" aria-pressed="${jeu}">En jeu</button></div>`;
  if (C(g).capsTop) h += C(g).capsTop(g);         // carte propre à la classe (Rage, Attaque sournoise…)
  if (jeu) h += attacksHTML(g);                    // en jeu : les attaques sous la main
  if (C(g).resources) h += C(g).resources(g);      // autres ressources (Ruse, Coup de chance…)
  h += featsHTML(g) + restBarHTML(g);
  return h;
}

export { abilitiesHTML };
