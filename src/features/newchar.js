// Création d'un personnage : choix de la classe.
import { onClick, onInput } from "../core/actions.js";
import { esc } from "../core/format.js";
import { blank } from "../core/schema.js";
import { S } from "../core/state.js";
import { newId, save, setCur } from "../core/store.js";
import { render, toast } from "../core/ui.js";
import { CLASSES } from "../rules/common.js";

const CLASS_INFO = {
  magicien: { i: "M", col: "#2D4A9A", d: "Grimoire, sorts copiés, Restauration arcanique. Caractéristique : Intelligence.", tags: ["Lanceur complet", "Sorts niv. 1 à 9"] },
  druide: { i: "D", col: "#2F6B45", d: "Sorts préparés dans toute la liste, sorts mineurs, rituels, Forme sauvage. Caractéristique : Sagesse.", tags: ["Lanceur complet", "Sorts niv. 1 à 9"] },
  paladin: { i: "P", col: "#A2261C", d: "Sorts préparés dans toute la liste, sorts de serment, Imposition des mains, Châtiment divin. Caractéristique : Charisme.", tags: ["Demi-lanceur", "Sorts niv. 1 à 5"] },
};
function newHTML() {
  const k = S.newCls;
  return `<div class="grab"></div><div class="head"><h2>Nouveau personnage</h2><button class="btn ghost" data-a="nw-close" aria-label="Fermer">✕</button></div>
  <p class="help">Choisis sa classe : l'atelier adapte les règles, les sorts et les ressources.</p>
  <div class="nwcls" role="radiogroup" aria-label="Classe">${Object.entries(CLASS_INFO).map(([c, x]) => `<button class="nwcard" role="radio" data-a="nw-cls" data-v="${c}" aria-checked="${k === c}"><span class="ic" style="background:${x.col}">${x.i}</span><span class="tx"><b>${CLASSES[c].n}</b><span>${x.d}</span><span class="tg">${x.tags.map(z => `<i>${z}</i>`).join("")}</span></span></button>`).join("")}</div>
  <div class="field"><label for="nw-name">Nom</label><input id="nw-name" type="text" value="${esc(S.newName || "")}" placeholder="${k ? "Nom du " + CLASSES[k].n.toLowerCase() : "Nom du personnage"}" autocomplete="off"></div>
  <button class="btn primary nwgo" data-a="nw-go"${k ? "" : " disabled"}>${k ? "Créer le " + CLASSES[k].n.toLowerCase() : "Choisis une classe"}</button>
  <p class="help" style="text-align:center;margin:0">D'autres classes viendront. Un fichier importé garde sa classe.</p>`;
}
onClick("new", () => { S.newOpen = true; S.newCls = null; S.newName = ""; render(); });
onClick("nw-close", () => { S.newOpen = false; render(); });
onClick("nw-cls", (b) => { S.newCls = b.dataset.v; render(); const el = document.getElementById("nw-name"); if (el) el.focus({ preventScroll: true }); });
onClick("nw-go", () => {
  if (!CLASSES[S.newCls]) return;
  const g = blank((S.newName || "").trim(), S.newCls), id = newId(g.name);
  S.list[id] = g; S.newOpen = false; S.tab = "grimoire"; setCur(id); save(id); toast(`${esc(g.name)} créé`);
});
onInput("#nw-name", t => { S.newName = t.value; });

export { CLASS_INFO, newHTML };
