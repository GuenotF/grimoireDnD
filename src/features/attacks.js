// Section « Attaques » : armes équipées et mains nues, avec les options de la classe (Rage, Attaque téméraire…).
// Lanceurs de sorts : onglet Personnage (En jeu). Classes sans sorts : onglet Capacités.
import { C } from "../classes/index.js";
import { esc, signed } from "../core/format.js";
import { R } from "../rules/common.js";
import { attacks } from "../rules/equipment.js";
import { foldHead, isFold } from "../ui/components.js";

function attacksHTML(g) {
  const opts = C(g).attackOptions ? C(g).attackOptions(g) : ""; // cases à cocher de la classe (Attaque téméraire…)
  const list = attacks(g), notes = C(g).attackNotes ? C(g).attackNotes(g) : [];
  let h = foldHead("ch-atk", "", "Attaques", `FOR ${signed(R.ab(g, "str"))} · DEX ${signed(R.ab(g, "dex"))} · maîtrise ${signed(R.prof(g.level))}`, list.map(a => a.n).join(", "));
  if (isFold("ch-atk")) return h;
  h += `<div class="chbox atkbox">${list.map(a => `<div class="atk"><div class="ah"><b>${esc(a.n)}${a.q > 1 ? ` ×${a.q}` : ""}</b><span class="kp a" title="Bonus pour toucher (${a.ab === "dex" ? "DEX" : "FOR"}${a.prof ? " + maîtrise" : ", arme non maîtrisée"})">${signed(a.hit)}</span><span class="kp d">${esc(a.dmg)}</span></div>
    ${a.pills.length ? `<div class="ap">${a.pills.map(p => `<span class="kp n">${esc(p)}</span>`).join("")}</div>` : ""}${!a.prof ? `<small class="aw">Arme non maîtrisée : pas de bonus de maîtrise.</small>` : ""}${a.notes.map(n => `<small>${esc(n)}</small>`).join("")}</div>`).join("")}
    ${opts}${notes.length ? `<div class="atknotes">${notes.map(n => `<span>${n}</span>`).join("")}</div>` : ""}
    ${list.length === 1 ? `<p class="chhelp" style="margin:4px 0 0">Ajoute tes armes dans l'équipement (mode Gérer) et coche « équipé » : elles apparaîtront ici.</p>` : ""}</div>`;
  return h;
}
export { attacksHTML };
