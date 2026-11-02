// Section « Attaques » : armes équipées et mains nues, avec les options de la classe (Rage, Attaque téméraire…).
// Lanceurs de sorts : onglet Personnage (En jeu). Classes sans sorts : onglet Capacités.
import { C } from "../classes/index.js";
import { esc, signed } from "../core/format.js";
import { onChange, onClick } from "../core/actions.js";
import { G, S } from "../core/state.js";
import { mutate } from "../core/store.js";
import { render, toast } from "../core/ui.js";
import { R } from "../rules/common.js";
import { FEATS, featsOf } from "../rules/feats.js";
import { attacks } from "../rules/equipment.js";
import { ammoOf } from "../rules/inventory.js";
import { foldHead, isFold } from "../ui/components.js";

// Munitions de l'arme (onglet d'action) : stock, Tir · −1, puis Ramasser la moitié des munitions tirées après le combat (propriété Munitions)
function ammoHTML(g, a) {
  if (a.offhand) return "";
  const i = ammoOf(g, a.gid); if (i == null) return "";
  if (i < 0) return `<small class="aw">Pas de munitions dans l'inventaire (ajoute-les : Flèches, Carreaux, Billes de fronde…).</small>`;
  const x = g.items[i], back = Math.floor((x.shot || 0) / 2);
  return `<div class="ammo"><span>${esc(x.n)} <b>${x.q}</b>${x.shot ? ` <small>· ${x.shot} tirée${x.shot > 1 ? "s" : ""} ce combat</small>` : ""}</span><button class="btn sm cast-go" data-a="ammo-shot" data-i="${i}"${x.q ? "" : " disabled"}>Tir · −1</button></div>
    ${x.shot ? `<div class="ammo2"><small>Fin du combat : 1 minute pour récupérer la moitié des munitions tirées.</small><button class="btn sm" data-a="ammo-pick" data-i="${i}">Ramasser +${back}</button></div>` : ""}`;
}
function attacksHTML(g) {
  const fo = featsOf(g).filter(id => FEATS[id].opt).map(id => `<label class="check"><input type="checkbox" data-a="opt-feat" data-v="${id}"${S.opt && S.opt[id] ? " checked" : ""}> ${FEATS[id].opt.label}</label>`).join("");
  const opts = (C(g).attackOptions ? C(g).attackOptions(g) : "") + (fo ? `<div class="atkopts">${fo}</div>` : ""); // cases de la classe (Attaque téméraire…) et des dons
  const list = attacks(g), notes = [...(C(g).attackNotes ? C(g).attackNotes(g) : []), ...featsOf(g).map(id => FEATS[id].note).filter(Boolean)];
  const nA = C(g).attacksPerAction ? C(g).attacksPerAction(g) : 1; // Attaque supplémentaire
  let h = foldHead("ch-atk", "", "Attaques", `${nA > 1 ? `<b class="natk">${nA} attaques / action</b> · ` : ""}FOR ${signed(R.ab(g, "str"))} · DEX ${signed(R.ab(g, "dex"))} · maîtrise ${signed(R.prof(g.level))}`, list.map(a => a.n).join(", "));
  if (isFold("ch-atk")) return h;
  h += `<div class="chbox atkbox">${list.map(a => `<div class="atk"><div class="ah"><b>${esc(a.n)}${a.q > 1 ? ` ×${a.q}` : ""}</b><span class="kp a" title="Bonus pour toucher (${a.ab === "dex" ? "DEX" : "FOR"}${a.prof ? " + maîtrise" : ", arme non maîtrisée"})">${signed(a.hit)}</span><span class="kp d">${esc(a.dmg)}</span></div>
    ${a.pills.length ? `<div class="ap">${a.pills.map(p => `<span class="kp n">${esc(p)}</span>`).join("")}</div>` : ""}${ammoHTML(g, a)}${!a.prof ? `<small class="aw">Arme non maîtrisée : pas de bonus de maîtrise.</small>` : ""}${a.notes.map(n => `<small>${esc(n)}</small>`).join("")}</div>`).join("")}
    ${opts}${notes.length ? `<div class="atknotes">${notes.map(n => `<span>${n}</span>`).join("")}</div>` : ""}
    ${list.length === 1 ? `<p class="chhelp" style="margin:4px 0 0">Ajoute tes armes dans l'équipement (mode Gérer) et coche « équipé » : elles apparaîtront ici.</p>` : ""}</div>`;
  return h;
}
onClick("ammo-shot", (b) => { mutate(g => { const x = g.items[+b.dataset.i]; if (x && x.q > 0) { x.q--; x.shot = (x.shot || 0) + 1; } }); });
onClick("ammo-pick", (b) => { const g = G(), x = g && g.items[+b.dataset.i]; if (!x || !x.shot) return; const k = Math.floor(x.shot / 2), prev = { q: x.q, shot: x.shot };
  mutate(g => { const y = g.items[+b.dataset.i]; y.q += k; delete y.shot; }); toast(`${esc(x.n)} : <b>+${k}</b> ramassée${k > 1 ? "s" : ""}`, () => { mutate(g => { Object.assign(g.items[+b.dataset.i], prev); }); return "Annulé"; }); });
onChange("opt-feat", t => { S.opt = { ...(S.opt || {}), [t.dataset.v]: t.checked }; render(); });

export { attacksHTML };
