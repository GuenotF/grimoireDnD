// Druide : cercles, Forme sauvage (utilisations, FP), capacités.
import { onChange } from "../core/actions.js";
import { mutate } from "../core/store.js";
import { capRow } from "../ui/components.js";

const DRU_FEATS = [
  { id: "druidic", lv: 1, n: "Druidique", pill: () => "langue secrète", k: "f", d: () => "Tu connais le druidique, la langue secrète des druides, et peux y laisser des messages cachés." },
  { id: "ritual", lv: 1, n: "Incantation rituelle", pill: () => "sorts préparés", k: "f", d: () => "Tu peux lancer en rituel (+10 minutes, sans emplacement) un sort rituel que tu as préparé." },
  { id: "combat", lv: 2, circle: "lune", n: "Changeforme de combat", pill: () => "action bonus · soin 1d8/niv.", k: "f", d: () => "Forme sauvage en action bonus. En forme de bête, action bonus : dépense un emplacement pour regagner 1d8 PV par niveau d'emplacement." },
  { id: "forms", lv: 2, circle: "lune", n: "Formes du cercle", pill: g => `FP ${DRU.fp(g)} maximum`, k: "f", d: g => `Bêtes de FP ${DRU.fp(g)} maximum (FP 1 jusqu'au niveau 5, puis niveau ÷ 3). Pas de nage avant le niveau 4, pas de vol avant le niveau 8.` },
  { id: "primal", lv: 6, circle: "lune", n: "Frappe primitive", pill: () => "attaques magiques", k: "f", d: () => "En forme de bête, tes attaques comptent comme magiques pour surmonter les résistances et immunités." },
  { id: "elem", lv: 10, circle: "lune", n: "Forme sauvage élémentaire", pill: () => "2 utilisations · élémentaire", k: "f", d: () => "Dépense deux utilisations de Forme sauvage pour devenir un élémentaire de l'air, de la terre, du feu ou de l'eau." },
  { id: "thousand", lv: 14, circle: "lune", n: "Mille formes", pill: () => "Modification d'apparence à volonté", k: "f", d: () => "Tu peux lancer Modification d'apparence à volonté." },
  { id: "timeless", lv: 18, n: "Jeunesse éternelle, Sorts bestiaux", pill: () => "sorts en forme de bête", k: "f", d: () => "Tu vieillis dix fois moins vite. En forme de bête, tu peux lancer des sorts (composantes verbales et somatiques), sans composante matérielle." },
  { id: "arch", lv: 20, n: "Archidruide", pill: () => "Forme sauvage illimitée", k: "f", d: () => "Forme sauvage illimitée ; tu ignores les composantes verbales, somatiques et matérielles sans coût de tes sorts de druide." },
];
function druResHTML(g) {
  const n = DRU.ws(g); if (!n) return "";
  const u = Math.min(n, g.wsU);
  const pips = n > 10 ? `<span class="muted">illimitée</span>` : Array.from({ length: n }, (_, k) => `<button class="pip${k < u ? " used" : ""}" data-a="res-pip" data-r="ws" data-k="${k}" aria-label="Forme sauvage ${k + 1}, ${k < u ? "utilisée" : "disponible"}"></button>`).join("");
  return `<div class="rubric"><h2>Ressources du druide</h2></div><div class="slots res">${capRow(g, "ws", "Forme sauvage", "repos court", pips)}</div>`;
}
onChange("#f-circle", t => { mutate(g => { g.circle = t.value; }); });
// Cercles du druide (Cercle de la Lune pour l'instant)
const CIRCLES = { lune: { n: "Lune", full: "Cercle de la Lune" } };
const DRU = {
  ws: g => g.level >= 20 ? 99 : g.level >= 2 ? 2 : 0,          // Forme sauvage : 2 utilisations, repos court (illimitée au niveau 20)
  fp: g => g.level >= 6 ? Math.floor(g.level / 3) : 1,          // Cercle de la Lune : FP 1, puis niveau ÷ 3 dès le niveau 6
  hours: g => Math.floor(g.level / 2),
};

export { DRU_FEATS, druResHTML, CIRCLES, DRU };
