// Registre des actions : chaque partie de l'application déclare ce que font ses boutons et ses champs.
// Les éléments portent data-a="nom-de-l-action" (boutons) ou un id (champs). Un seul écouteur par type d'évènement.





const clicks = new Map();   // data-a → fn(bouton, nom, évènement)
const changes = [];         // [test, fn(champ, évènement)], dans l'ordre de déclaration
const inputs = [];
const submits = new Map();  // data-a du formulaire → fn(formulaire, évènement)
const keys = [];            // fn(évènement) → true si la touche a été traitée
const changeNames = new Set();
let beforeClick = () => {};

/** Valeur à renvoyer par un gestionnaire de « change » pour laisser la main au suivant. */
export const NEXT = Symbol("suivant");

/** « nom » vise data-a="nom", « #id » vise un champ par son id ; une fonction est un test libre. */
const test = m => typeof m === "function" ? m : m.startsWith("#") ? (t => t.id === m.slice(1)) : (t => t.dataset.a === m);

/** Bouton (ou tout élément) portant data-a : un ou plusieurs noms pour le même gestionnaire. */
export function onClick(names, fn) {
  for (const n of [].concat(names)) {
    if (clicks.has(n)) throw new Error("Action déclarée deux fois : " + n);
    clicks.set(n, fn);
  }
}
/** Case à cocher, liste ou champ validé (évènement « change »). */
export function onChange(match, fn) {
  if (typeof match === "string" && !match.startsWith("#")) changeNames.add(match); // le clic sur ces cases n'est pas une action
  changes.push([test(match), fn]);
}
/** Saisie au clavier dans un champ (évènement « input »). */
export function onInput(match, fn) { inputs.push([test(match), fn]); }
/** Envoi d'un formulaire portant data-a. */
export function onSubmit(name, fn) { submits.set(name, fn); }
/** Touche du clavier (Échap, Entrée…). */
export function onKey(fn) { keys.push(fn); }
/** Traitement commun avant chaque action de clic (ex. annuler une confirmation en attente). */
export function beforeEachClick(fn) { beforeClick = fn; }

/** Branche les écouteurs sur la page (une fois, au démarrage). */
export function startActions() {
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-a]"); if (!b || b.tagName === "FORM") return;
    const a = b.dataset.a;
    if (changeNames.has(a)) return;
    beforeClick(a);
    const fn = clicks.get(a); if (fn) fn(b, a, e);
  });
  document.addEventListener("change", e => {
    for (const [ok, fn] of changes) if (ok(e.target) && fn(e.target, e) !== NEXT) return;
  });
  document.addEventListener("input", e => {
    for (const [ok, fn] of inputs) if (ok(e.target)) { fn(e.target, e); return; }
  });
  document.addEventListener("submit", e => {
    const fn = submits.get(e.target.dataset.a); if (fn) { e.preventDefault(); fn(e.target, e); }
  });
  document.addEventListener("keydown", e => { for (const fn of keys) if (fn(e)) return; });
}
