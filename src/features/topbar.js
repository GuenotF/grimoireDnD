// Barre permanente, collée en haut sur tous les onglets : PV, CA, initiative, puces en cours (forme, rage, concentration, effets),
// puis les six modificateurs. Toucher une caractéristique ouvre son volet : jet de sauvegarde, test et compétences liées.
import { C } from "../classes/index.js";
import { onClick } from "../core/actions.js";
import { esc, signed } from "../core/format.js";
import { S } from "../core/state.js";
import { render } from "../core/ui.js";
import { R } from "../rules/common.js";
import { halfProf, initiative, passivePerception, saveBonus, saveProf, skillBonus, skillLevel } from "../rules/character.js";
import { acOf } from "../rules/equipment.js";
import { ABILITIES, SKILLS } from "../rules/tables.js";
import { concOf } from "./cast.js";
import { hpChipHTML } from "./hp.js";

const FULL = { str: "Force", dex: "Dextérité", con: "Constitution", int: "Intelligence", wis: "Sagesse", cha: "Charisme" };
const LV = ["", "maîtrise", "expertise"];

function topbarHTML(g) {
  const cur = concOf(g), others = g.effects.filter(e => !e.c), cls = C(g).barChips ? C(g).barChips(g) : "";
  const fx = cls + (cur ? `<button class="chip conc" data-a="conc-panel" aria-expanded="${!!S.concPanel}" title="Concentration : ${esc(cur.name)}">◉ ${esc(cur.name)}</button>` : "")
    + (others.length ? `<button class="chip more" data-a="fx-open" aria-label="${others.length} effet${others.length > 1 ? "s" : ""} en cours">✦ ${others.length} effet${others.length > 1 ? "s" : ""}</button>` : "");
  const st = (v, l) => `<span class="tbst"><b>${v}</b><span>${l}</span></span>`;
  const abs = ABILITIES.map(([k, a, n]) => { const p = saveProf(g, k); return `<button class="tbab${S.abOpen === k ? " on" : ""}" data-a="ab-open" data-v="${k}" aria-label="${n} ${signed(R.ab(g, k))}${p ? ", jet de sauvegarde maîtrisé" : ""}" aria-expanded="${S.abOpen === k}"><span class="l${p ? " js" : ""}">${a}${p ? `<i aria-hidden="true"></i>` : ""}</span><b>${signed(R.ab(g, k))}</b></button>`; }).join("");
  return `<div class="topbar" id="topbar"><div class="tbrow">${hpChipHTML(g)}${st(acOf(g) ?? "?", "CA")}${st(signed(initiative(g)), "Init")}<div class="fx">${fx}</div></div>
  <div class="tbabs" role="group" aria-label="Caractéristiques">${abs}</div></div>`;
}
// Ligne des emplacements (onglet principal, lanceurs de sorts) : toucher descend aux emplacements
function slotLineHTML(g) {
  if (!R.slots(g).length) return "";
  return `<button class="slotline" data-a="to-slots" aria-label="Aller aux emplacements de sorts"><span class="grp">${R.slots(g).map((n, i) => {
    if (!n) return ""; // magie de pacte
    const used = Math.min(n, +(g.used[i + 1] || 0));
    return `<span class="lv" aria-label="Niveau ${i + 1} : ${n - used} sur ${n}"><b>${i + 1}</b>${Array.from({ length: n }, (_, k) => `<span class="d${k < used ? " u" : ""}"></span>`).join("")}</span>`;
  }).join("")}</span>${S.view !== "jeu" && R.maxLevel(g) ? `<span class="prepc${g.prepared.length > R.prepMax(g) ? " over" : ""}">${C(g).known ? "Connus" : "Préparés"} <b>${g.prepared.length}</b>/${R.prepMax(g)}</span>` : ""}<span class="go">Emplacements ⌃</span></button>`;
}
function abSheetHTML(g) {
  const k = S.abOpen, p = saveProf(g, k), half = halfProf(g, k);
  const row = (n, v, on, sub) => `<div class="abrow${on ? " on" : ""}"><span class="mk" aria-hidden="true">${on === 2 ? "◉" : on ? "●" : ""}</span><span class="n">${n}${sub ? ` <small>${sub}</small>` : ""}</span><b>${signed(v)}</b></div>`;
  const sk = SKILLS.filter(s => s[2] === k);
  return `<div class="grab"></div><div class="head"><h2>${FULL[k]}</h2><span class="abv">valeur ${g.abil[k]} <b>${signed(R.ab(g, k))}</b></span></div>
  ${row("Jet de sauvegarde", saveBonus(g, k), p ? 1 : 0, p ? "maîtrisé" : "")}
  ${row(`Test de ${FULL[k]}`, R.ab(g, k) + half, 0, half ? "Touche-à-tout" : "")}
  ${sk.length ? `<div class="abcap">Compétences</div>${sk.map(([id, n]) => row(n, skillBonus(g, id), skillLevel(g, id), [LV[skillLevel(g, id)], id === "perception" ? `passive ${passivePerception(g)}` : ""].filter(Boolean).join(" · "))).join("")}` : ""}
  <button class="btn ghost" data-a="ab-close" style="justify-self:end">Fermer</button>`;
}
onClick("ab-open", (b) => { S.abOpen = S.abOpen === b.dataset.v ? null : b.dataset.v; S.hpOpen = false; S.concPanel = false; S.fxOpen = false; render(); });
onClick("ab-close", () => { S.abOpen = null; render(); });

export { topbarHTML, slotLineHTML, abSheetHTML };
