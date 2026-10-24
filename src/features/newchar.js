// Création d'un personnage : choix de la classe.
import { CLASSES } from "../classes/index.js";
import { onClick, onInput } from "../core/actions.js";
import { esc } from "../core/format.js";
import { blank } from "../core/schema.js";
import { S } from "../core/state.js";
import { newId, save, setCur } from "../core/store.js";
import { render, toast } from "../core/ui.js";
import { crStart } from "./creation.js";

const CLASS_INFO = {
  barbare: { i: "B", col: "#C2410C", d: "Rage, Défense sans armure, Attaque téméraire ; voie primitive au niveau 3. Pas de sorts.", tags: ["Combattant", "Dé de vie d12"] },
  clerc: { i: "C", col: "#8A6516", d: "Sorts préparés dans toute la liste, domaine divin dès le niveau 1 (sorts de domaine), Conduit divin, Renvoi des morts-vivants. Caractéristique : Sagesse.", tags: ["Lanceur complet", "Sorts niv. 1 à 9"] },
  druide: { i: "D", col: "#2F6B45", d: "Sorts préparés dans toute la liste, sorts mineurs, rituels, Forme sauvage. Caractéristique : Sagesse.", tags: ["Lanceur complet", "Sorts niv. 1 à 9"] },
  ensorceleur: { i: "E", col: "#6B3FA0", d: "Sorts connus, points de sorcellerie (créer des emplacements), métamagie ; origine dès le niveau 1 (Lignée draconique, Magie sauvage). Caractéristique : Charisme.", tags: ["Lanceur complet", "Sorts niv. 1 à 9"] },
  magicien: { i: "M", col: "#2D4A9A", d: "Grimoire, sorts copiés, Restauration arcanique. Caractéristique : Intelligence.", tags: ["Lanceur complet", "Sorts niv. 1 à 9"] },
  paladin: { i: "P", col: "#A2261C", d: "Sorts préparés dans toute la liste, sorts de serment, Imposition des mains, Châtiment divin. Caractéristique : Charisme.", tags: ["Demi-lanceur", "Sorts niv. 1 à 5"] },
  rodeur: { i: "R", col: "#22573A", d: "Sorts connus (pas de préparation), Ennemi juré, Explorateur-né ; Chasseur ou Maître des bêtes au niveau 3. Caractéristique : Sagesse.", tags: ["Demi-lanceur", "Sorts niv. 1 à 5"] },
  roublard: { i: "R", col: "#4B5563", d: "Attaque sournoise, Expertise, Ruse ; archétype au niveau 3. Pas de sorts.", tags: ["Combattant", "Dé de vie d8"] },
};
function newHTML() {
  const k = S.newCls;
  return `<div class="grab"></div><div class="head"><h2>Nouveau personnage</h2><button class="btn ghost" data-a="nw-close" aria-label="Fermer">✕</button></div>
  <p class="help">Choisis sa classe : l'atelier adapte les règles, les sorts et les ressources.</p>
  <div class="nwcls" role="radiogroup" aria-label="Classe">${Object.entries(CLASS_INFO).filter(([c]) => CLASSES[c]).map(([c, x]) => `<button class="nwcard" role="radio" data-a="nw-cls" data-v="${c}" aria-checked="${k === c}"><span class="ic" style="background:${x.col}">${x.i}</span><span class="tx"><b>${CLASSES[c].n}</b><span>${x.d}</span><span class="tg">${x.tags.map(z => `<i>${z}</i>`).join("")}</span></span></button>`).join("")}</div>
  <div class="field"><label for="nw-name">Nom</label><input id="nw-name" type="text" value="${esc(S.newName || "")}" placeholder="${k ? "Nom du " + CLASSES[k].n.toLowerCase() : "Nom du personnage"}" autocomplete="off"></div>
  <button class="btn primary nwnext" data-a="nw-wizard"${k ? "" : " disabled"}>${k ? "Créer pas à pas : race, caractéristiques… →" : "Choisis une classe"}</button>
  <button class="btn nwgo" data-a="nw-go"${k ? "" : " disabled"}>${k ? "Fiche vierge (je recopie une feuille existante)" : "Fiche vierge"}</button>
  <p class="help" style="text-align:center;margin:0">Un fichier importé garde sa classe.</p>`;
}
onClick("new", () => { S.newOpen = true; S.newCls = null; S.newName = ""; render(); });
onClick("nw-close", () => { S.newOpen = false; render(); });
onClick("nw-cls", (b) => { S.newCls = b.dataset.v; render(); }); // pas de focus d'office : le clavier ne s'ouvre qu'en touchant le champ Nom
onClick("nw-go", () => { // on commence par recopier la fiche : onglet Personnage, mode Gérer
  if (!CLASSES[S.newCls]) return;
  const g = blank((S.newName || "").trim(), S.newCls), id = newId(g.name);
  S.list[id] = g; S.newOpen = false; S.tab = "perso"; S.view = "gerer"; setCur(id); save(id); toast(`${esc(g.name)} créé`);
});
onInput("#nw-name", t => { S.newName = t.value; });
onClick("nw-wizard", () => { if (!CLASSES[S.newCls]) return; crStart(S.newCls, (S.newName || "").trim()); S.newOpen = false; render(); }); // assistant de création

export { CLASS_INFO, newHTML };
