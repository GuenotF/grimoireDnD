// Onglet Sauvegarde : export, partage au MJ, import, suppression.
import { onChange, onClick } from "../core/actions.js";
import { esc } from "../core/format.js";
import { isIOS } from "../core/pwa.js";
import { norm } from "../core/schema.js";
import { G, S } from "../core/state.js";
import { newId, pickCurrent, removeDoc, save, setCur } from "../core/store.js";
import { render, toast } from "../core/ui.js";
import { C, isWiz } from "../rules/common.js";

function saveHTML(g) {
  return `<div class="rubric" style="margin-top:4px"><h2>Exporter</h2></div>
  <p style="max-width:65ch">Enregistre ${esc(g.name)} dans un fichier : c'est ta sauvegarde, et c'est ce fichier qu'on importe sur un autre appareil.${canShareFiles() ? " « Envoyer au MJ » ouvre le menu de partage du téléphone avec le fichier déjà joint : choisis la conversation de ton MJ." : ""}</p>
  <div class="frow">${canShareFiles() ? `<button class="btn primary" data-a="share-json">Envoyer au MJ</button><button class="btn" data-a="dl-json">Exporter (.json)</button>` : `<button class="btn primary" data-a="dl-json">Exporter ${esc(g.name)} (.json)</button>`}</div>
  <div class="rubric"><h3>Importer</h3></div>
  <p style="max-width:65ch">Ajoute un personnage à partir d'un fichier .json ou .txt exporté depuis l'atelier ; sa classe est reconnue d'elle-même. L'import crée un nouveau personnage : il ne remplace pas celui qui est affiché.</p>
  <div class="frow"><label class="btn" for="f-import">Choisir un fichier…</label><input id="f-import" type="file" accept=".json,.txt,application/json,text/plain" hidden></div>
  <div class="rubric"><h3>Supprimer</h3></div>
  <p style="max-width:65ch">La suppression est définitive sur cet appareil. Exporte le grimoire avant si tu veux pouvoir le récupérer.</p>
  ${S.confirm === "del" ? `<button class="btn confirm" data-a="del">Supprimer définitivement ${esc(g.name)} ?</button> <button class="btn ghost" data-a="cancel">Annuler</button>` : `<button class="btn" data-a="del">Supprimer ${isWiz(g) ? "ce grimoire" : "ce personnage"}</button>`}`;
}
// Nom des fichiers de sauvegarde, datés pour qu'ils se rangent d'eux-mêmes : « Grimoire - Némeia - 2026-10-19 »
function backupName(g) {
  const d = new Date(), p = n => String(n).padStart(2, "0");
  return `${isWiz(g) ? "Grimoire" : C(g).n} - ${g.name} - ${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
const exportJSON = g => JSON.stringify({ format: "grimoire-5e", version: 1, grimoire: g }, null, 2);
// Partage par le menu du téléphone (Web Share).
function canShareFiles() {
  if (!navigator.share || !navigator.canShare) return false;
  try { return navigator.canShare({ files: [new File(["{}"], "test.txt", { type: "text/plain" })] }); } catch (e) { return false; }
}
function shareToGM(g) {
  const json = exportJSON(g), base = backupName(g);
  // Safari partage le .json ; Chrome (Android) n'accepte de façon fiable que le .txt (même contenu, réimportable).
  const json1 = new File([json], base + ".json", { type: "application/json" }), txt = new File([json], base + ".txt", { type: "text/plain" });
  const files = isIOS() ? [json1, txt] : [txt, json1];
  const file = files.find(f => { try { return navigator.canShare({ files: [f] }); } catch (e) { return false; } });
  if (!file) { offer(base + ".json", json); return; }
  navigator.share({ files: [file] })
    .then(() => toast("Fichier partagé"))
    .catch(e => {
      if (e && e.name === "AbortError") return; // menu fermé sans choisir d'application
      offer(base + ".json", json); // jamais sans sauvegarde : téléchargement à la place
      setTimeout(() => toast(`Partage refusé par le navigateur (${(e && e.name) || "erreur"}) : le fichier a été téléchargé à la place.`), 2700);
    });
}
function offer(filename, data) { // téléchargement direct par le navigateur
  try {
    const url = URL.createObjectURL(new Blob([data], { type: filename.endsWith(".json") ? "application/json" : "text/html" }));
    const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000); toast("Fichier téléchargé");
  } catch (e) { toast("Téléchargement impossible dans ce navigateur."); }
}
onClick("dl-json", () => { const g = G(); offer(backupName(g) + ".json", exportJSON(g)); });
onClick("share-json", () => { shareToGM(G()); });
onClick("del", () => {
  if (S.confirm !== "del") { S.confirm = "del"; render(); return; }
  S.confirm = null; const id = S.cur; const n = G().name; S.cur = null; removeDoc(id); pickCurrent(); S.tab = "grimoire"; render(); toast(`${esc(n)} supprimé`);
});
onClick("cancel", () => { S.confirm = null; render(); });
onChange(t => t.id === "f-import" && t.files && t.files[0], t => {
  const r = new FileReader();
  r.onload = () => { try { const j = JSON.parse(r.result); const g = norm(j.grimoire || j); const id = newId(g.name); S.list[id] = g; S.tab = "grimoire"; setCur(id); save(id); toast(`${esc(g.name)} importé`); } catch (err) { toast("Ce fichier n'est pas un grimoire valide (.json exporté depuis cet atelier)."); } };
  r.readAsText(t.files[0]);
});

export { saveHTML, backupName, exportJSON, canShareFiles, shareToGM, offer };
