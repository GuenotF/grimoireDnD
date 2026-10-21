// Outils d'interface communs : rendu (fourni par l'application), message d'annulation, statut d'enregistrement.
import { S } from "./state.js";

let renderer = () => {};
/** L'application déclare sa fonction de rendu complète au démarrage. */
export function setRenderer(fn) { renderer = fn; }
/** Redessine l'écran à partir de l'état. */
export function render() { renderer(); }

function setStatus(t, err) { const el = document.getElementById("status"); if (el) { el.textContent = t; el.classList.toggle("err", !!err); } S.statusText = t; S.statusErr = !!err; }
let toastT;
function toast(t, undo) {
  const el = document.getElementById("toast");
  el.innerHTML = `<span>${t}</span>${undo ? `<button class="undo" data-a="undo">Annuler</button>` : ""}`;
  S.undo = undo || null; el.hidden = false; clearTimeout(toastT);
  toastT = setTimeout(() => { el.hidden = true; S.undo = null; }, undo ? 5000 : 2600);
}

export { setStatus, toast };
