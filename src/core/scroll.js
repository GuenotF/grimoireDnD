// Position de défilement retenue par personnage, onglet et affichage (Gérer / En jeu), le temps de la session.
// Changer d'onglet : on retient la position de l'onglet quitté, on retrouve celle de l'onglet ouvert.
// Première visite : haut du contenu, juste sous la barre collée (ou position inchangée si l'en-tête était encore visible).
import { S } from "./state.js";

const at = {};
const key = () => `${S.cur}|${S.tab}|${S.view}`;
/** À appeler avant de changer d'onglet ou d'affichage. */
function keepSpot() { at[key()] = window.scrollY; }
/** À appeler après le dessin du nouvel onglet ou affichage. */
function goSpot() {
  const y = at[key()], hero = document.querySelector(".hero"), top = hero ? hero.offsetTop + hero.offsetHeight : 0;
  window.scrollTo({ top: y != null ? y : Math.min(window.scrollY, top), behavior: "instant" });
}

export { keepSpot, goSpot };
