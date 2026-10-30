// Balayage horizontal : passe à l'onglet voisin de la rangée principale (vers la gauche : suivant ; vers la droite : précédent).
// Raccourci en plus des onglets, qui restent cliquables. Ignoré : départ près des bords (retour du navigateur sur iPhone),
// geste surtout vertical ou trop court, champ de saisie, zone qui défile déjà horizontalement, volet ouvert, texte sélectionné.
import { S } from "../core/state.js";

const EDGE = 24, MIN = 70, SLOPE = 2, MAXMS = 800; // px depuis le bord, distance minimale, rapport horizontal / vertical, durée maximale

function scrollsX(el) {
  for (; el && el !== document.body; el = el.parentElement) {
    if (el.scrollWidth > el.clientWidth + 2 && /(auto|scroll)/.test(getComputedStyle(el).overflowX)) return true;
  }
  return false;
}
// Un volet ou un assistant est ouvert : le message (toast) passe alors au-dessus, c'est le même repère ; plus les volets sans repère
const sheetOpen = () => document.getElementById("toast").classList.contains("on-top") || !!(S.concPanel || S.moreOpen || S.cr || S.lr || S.lu);

let t0 = null;
function start(e) {
  t0 = null;
  if (e.touches.length !== 1) return;
  const p = e.touches[0], el = e.target, w = window.innerWidth;
  if (p.clientX < EDGE || p.clientX > w - EDGE) return;
  if (!el.closest || !el.closest("#main") || el.closest("input, textarea, select, [contenteditable]") || scrollsX(el) || sheetOpen()) return;
  t0 = { x: p.clientX, y: p.clientY, t: Date.now() };
}
function end(e) {
  const s = t0; t0 = null;
  if (!s || e.changedTouches.length !== 1) return;
  const p = e.changedTouches[0], dx = p.clientX - s.x, dy = p.clientY - s.y;
  if (Math.abs(dx) < MIN || Math.abs(dx) < SLOPE * Math.abs(dy) || Date.now() - s.t > MAXMS) return;
  if (String(window.getSelection ? window.getSelection() : "").trim()) return;
  const tabs = [...document.querySelectorAll('.tabs > button.tab[data-a="tab"]')], i = tabs.findIndex(b => b.getAttribute("aria-selected") === "true");
  if (i < 0) return; // onglet du menu Plus : pas de balayage
  const next = tabs[i + (dx < 0 ? 1 : -1)];
  if (!next) return; // premier ou dernier onglet : on s'arrête là
  next.click();
  const pn = document.getElementById("panel");
  if (pn) { pn.classList.remove("swl", "swr"); void pn.offsetWidth; pn.classList.add(dx < 0 ? "swl" : "swr"); }
}
document.addEventListener("touchstart", start, { passive: true });
document.addEventListener("touchend", end, { passive: true });
document.addEventListener("touchcancel", () => { t0 = null; }, { passive: true });
