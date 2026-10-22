// Onglet Personnage : outils (maîtrise ou expertise) et langues. La classe ajoute les siens d'office
// (C(g).tools : outils de voleur du roublard, kits de l'Assassin ; C(g).langs : Jargon des voleurs, druidique).
import { C } from "../classes/index.js";
import { onClick, onSubmit } from "../core/actions.js";
import { esc, signed } from "../core/format.js";
import { G } from "../core/state.js";
import { mutate } from "../core/store.js";
import { R } from "../rules/common.js";
import { foldHead, isFold } from "../ui/components.js";

const TOOLS = ["Outils de voleur", "Kit de déguisement", "Kit de contrefaçon", "Kit d'herboriste", "Matériel d'empoisonneur", "Matériel de navigateur", "Fournitures d'alchimiste", "Fournitures de brasseur", "Fournitures de calligraphe", "Fournitures de peintre", "Matériel de cartographe", "Outils de bricoleur", "Outils de charpentier", "Outils de cordonnier", "Outils de forgeron", "Outils de joaillier", "Outils de maçon", "Outils de menuisier", "Outils de potier", "Outils de souffleur de verre", "Outils de tanneur", "Outils de tisserand", "Ustensiles de cuisinier", "Jeu de dés", "Jeu de cartes", "Jeu d'échecs draconiques", "Instrument de musique", "Véhicules (terrestres)", "Véhicules (marins)"];
const LANGS = ["Commun", "Elfique", "Géant", "Gnome", "Gobelin", "Halfelin", "Nain", "Orc", "Abyssal", "Céleste", "Commun des profondeurs", "Draconique", "Infernal", "Primordial", "Profond", "Sylvestre"];
const TOOL_AB = { "Outils de voleur": "dex" }; // caractéristique habituelle du test (sinon : au choix du MJ)

const classTools = g => C(g).tools ? C(g).tools(g) : [];
const classLangs = g => C(g).langs ? C(g).langs(g) : [];
/** Outils du personnage : [nom, niveau (1 maîtrise, 2 expertise), donné par la classe]. */
const toolsOf = g => [...classTools(g).map(n => [n, Math.max(1, g.tools[n] || 1), true]), ...Object.entries(g.tools).filter(([n]) => !classTools(g).includes(n)).map(([n, l]) => [n, l, false])];
const toolBonus = (g, n, l) => { const ab = TOOL_AB[n], b = l * R.prof(g.level) + (ab ? R.ab(g, ab) : 0); return `${ab ? "DEX " : ""}${signed(b)}`; };
const dot = l => `<span class="skd l${l}" aria-hidden="true"></span>`;

function toolsGerer(g) {
  const tl = toolsOf(g), langs = [...classLangs(g), ...g.langs];
  let h = foldHead("ch-tl", "", "Outils et langues", "toucher pour changer", `${tl.length} outil${tl.length > 1 ? "s" : ""} · ${langs.length} langue${langs.length > 1 ? "s" : ""}`);
  if (isFold("ch-tl")) return h;
  h += `<div class="chbox tlbox">${tl.map(([n, l, cls]) => `<div class="tlrow"><button class="skrow" data-a="tool" data-v="${esc(n)}" aria-label="${esc(n)} : ${l === 2 ? "expertise" : "maîtrise"}">${dot(l)}<span class="n">${esc(n)}</span><span class="ab">${cls ? C(g).n.toLowerCase() : ""}</span><b>${toolBonus(g, n, l)}</b></button>${cls ? "" : `<button class="btn ghost sm" data-a="tool-del" data-v="${esc(n)}" aria-label="Retirer ${esc(n)}">✕</button>`}</div>`).join("") || `<p class="chhelp" style="margin:4px 0">Aucun outil maîtrisé pour l'instant.</p>`}
    <form class="itadd" data-a="tool-add"><input id="tool-new" type="text" list="tool-list" placeholder="Outil (ex. outils de voleur)" aria-label="Nouvel outil" autocomplete="off"><datalist id="tool-list">${TOOLS.map(t => `<option value="${esc(t)}">`).join("")}</datalist><button class="btn" type="submit">Ajouter</button></form>
    <div class="tlh">Langues</div><div class="defs">${classLangs(g).map(l => `<span class="defchip">${esc(l)}</span>`).join("")}${g.langs.map((l, i) => `<span class="defchip">${esc(l)}<button class="x" data-a="lang-del" data-i="${i}" aria-label="Retirer ${esc(l)}">✕</button></span>`).join("")}</div>
    <form class="itadd" data-a="lang-add"><input id="lang-new" type="text" list="lang-list" placeholder="Langue (ex. elfique)" aria-label="Nouvelle langue" autocomplete="off"><datalist id="lang-list">${LANGS.map(t => `<option value="${t}">`).join("")}</datalist><button class="btn" type="submit">Ajouter</button></form></div>
  <p class="chhelp">Bonus d'un outil : maîtrise (expertise : doublée) + la caractéristique du test, choisie par le MJ selon l'usage (DEX pour les outils de voleur).</p>`;
  return h;
}
function toolsJeu(g) {
  const tl = toolsOf(g), langs = [...classLangs(g), ...g.langs]; if (!tl.length && !langs.length) return "";
  let h = foldHead("ch-tlj", "", "Outils et langues", "", `${tl.length + langs.length}`);
  if (isFold("ch-tlj")) return h;
  return h + `<div class="tljeu">${tl.length ? `<p><b>Outils</b> ${tl.map(([n, l]) => `${esc(n)} <span class="kp n">${toolBonus(g, n, l)}${l === 2 ? " · expertise" : ""}</span>`).join(" · ")}</p>` : ""}${langs.length ? `<p><b>Langues</b> ${langs.map(esc).join(", ")}</p>` : ""}</div>`;
}
/** Ligne pour la fiche imprimable. */
const toolsPrint = g => { const tl = toolsOf(g), langs = [...classLangs(g), ...g.langs]; return tl.length || langs.length ? `<p class="trait">${tl.length ? `<b>Outils</b> · ${tl.map(([n, l]) => `${esc(n)} ${toolBonus(g, n, l)}${l === 2 ? " (expertise)" : ""}`).join(", ")}` : ""}${tl.length && langs.length ? "<br>" : ""}${langs.length ? `<b>Langues</b> · ${langs.map(esc).join(", ")}` : ""}</p>` : ""; };

onClick("tool", (b) => { const n = b.dataset.v; mutate(g => { const cls = classTools(g).includes(n), l = Math.max(cls ? 1 : 0, g.tools[n] || (cls ? 1 : 0)); g.tools[n] = l === 2 ? 1 : 2; if (cls && g.tools[n] === 1) delete g.tools[n]; }); });
onClick("tool-del", (b) => { mutate(g => { delete g.tools[b.dataset.v]; }); });
onSubmit("tool-add", () => { const el = document.getElementById("tool-new"), n = el.value.trim(); if (!n) return; mutate(g => { if (!g.tools[n] && !classTools(g).includes(n)) g.tools[n] = 1; }); const nx = document.getElementById("tool-new"); if (nx) nx.focus({ preventScroll: true }); });
onSubmit("lang-add", () => { const el = document.getElementById("lang-new"), n = el.value.trim(); if (!n) return; const g = G(); if ([...classLangs(g), ...g.langs].some(l => l.toLowerCase() === n.toLowerCase())) { el.value = ""; return; } mutate(g => { g.langs.push(n); }); const nx = document.getElementById("lang-new"); if (nx) nx.focus({ preventScroll: true }); });
onClick("lang-del", (b) => { mutate(g => { g.langs.splice(+b.dataset.i, 1); }); });

export { toolsGerer, toolsJeu, toolsPrint, toolsOf };
