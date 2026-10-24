// Affichage d'un sort (pastilles, détail, marques) et notes personnelles par sort.
import { onClick, onInput } from "../core/actions.js";
import { cap, esc, fr, signed } from "../core/format.js";
import { G, S } from "../core/state.js";
import { mutate } from "../core/store.js";
import { render, toast } from "../core/ui.js";
import { C } from "../classes/index.js";
import { R } from "../rules/common.js";
import { SCHOOL_VAR } from "../rules/tables.js";

function metaLine(s) {
  return `<span class="school" style="--sc: var(${SCHOOL_VAR[s.s]})">${s.s}</span> · ${esc(s.t)} · ${esc(s.v.replace(/,/g, ", "))}${s.g ? ` · <span class="cost">composante ${fr(s.g)} po${s.x ? ", consommée" : ""}</span>` : ""}`;
}
// Pastilles : dégâts ou effet → jet → portée / zone → durée
function pillData(s, g) {
  const out = [];
  if (s.p) out.push(s.p.startsWith("d:") ? { k: "d", l: "Dégâts", v: pText(s, g.level, g) } : { k: "f", l: "Effet", v: pText(s, g.level) });
  if (s.j === "atk") out.push({ k: "a", l: "Ton jet", v: `Attaque ${signed(R.prof(g.level) + R.am(g))}`, sub: s.ok, short: "contre la CA" });
  else if (s.j === "auto") out.push({ k: "n", l: "Jet", v: "Aucun", sub: s.ok });
  else if (s.j) {
    const fixed = /^DD (\d+) fixe · ?/.exec(s.ok || "");
    out.push({ k: "s", l: "Jet de la cible", v: `JdS ${s.j} · DD ${fixed ? fixed[1] : 8 + R.prof(g.level) + R.am(g)}`, sub: fixed ? s.ok.slice(fixed[0].length) : s.ok });
  }
  const self = /^Personnelle \((.+)\)$/.exec(s.r);
  if (self) out.push({ k: "n", l: "Zone", v: cap(self[1]) });
  else { out.push({ k: "n", l: "Portée", v: s.r }); if (s.z) out.push({ k: "n", l: "Zone", v: cap(s.z) }); }
  out.push({ k: "n", l: "Durée", v: s.d, sub: s.c ? "concentration" : "", conc: s.c });
  return out;
}
// Sorts mineurs à dégâts : un dé de plus aux niveaux 5, 11 et 17
const tier = lv => 1 + (lv >= 5) + (lv >= 11) + (lv >= 17);
function pText(s, lv, g) {
  if (!s.p) return ""; let v = s.p.slice(2);
  if (s.l === 0 && s.p.startsWith("d:") && s.up) v = v.replace(/^(\d+)d/, (m, n) => (n * tier(lv)) + "d");
  const at = g && s.l > 0 && C(g).pact && C(g).pact(g) ? R.maxLevel(g) : 0; // magie de pacte : toujours lancé au niveau du pacte
  if (at > s.l && s.p.startsWith("d:")) v = upcast(v, s.up, at - s.l);
  const b = g && C(g).dmgBonus ? C(g).dmgBonus(g, s) : 0; // ex. Évocation améliorée : + INT à un jet de dégâts
  if (b && !v.includes("×")) v = v.replace(/(\d+d\d+)/, `$1 ${b > 0 ? "+" : "−"} ${Math.abs(b)}`);
  return g && C(g).pillText ? C(g).pillText(g, s, v) : v; // ex. Décharge occulte : nombre de rayons
}
/** Dégâts à un niveau d'emplacement plus élevé (n niveaux au-dessus) : « +1d6 par niveau » ou « +1 rayon par niveau ». */
function upcast(v, up, n) {
  let m = /^\+(\d+)d(\d+)[^,;]* par niveau d'emplacement/.exec(up || "");
  if (m) return v.replace(new RegExp(`(\\d+)d${m[2]}`), (_, k) => `${+k + n * +m[1]}d${m[2]}`);
  m = /^\+(\d+) (rayon|fléchette|cible)s? par niveau d'emplacement/.exec(up || "");
  if (m && /^\d+ ×/.test(v)) return v.replace(/^(\d+)/, k => +k + n * +m[1]);
  return v;
}
function pillsHTML(s, g) {
  return `<div class="pills">${pillData(s, g).map(p => `<div class="pill ${p.k}"><span class="pl">${p.l}</span><span class="pv">${esc(p.v)}</span>${p.sub ? `<span class="ps${p.conc ? " conc" : ""}">${esc(p.sub)}</span>` : ""}</div>`).join("")}</div>`;
}
function spellBody(s, g, prefix) {
  return `<div class="meta">${prefix || ""}${metaLine(s)}</div>${pillsHTML(s, g)}<div class="eff">${esc(s.e)}</div>${s.up ? `<div class="up">${s.l === 0 ? "Progression" : "Emplacement plus élevé"} : ${esc(s.up)}</div>` : ""}`;
}
function tags(s) { return `${s.c ? `<span class="tag c" title="Concentration">C</span>` : ""}${s.ri ? `<span class="tag r" title="Rituel">R</span>` : ""}`; }
const noteOf = (g, s) => (g.snotes && g.snotes[s.id]) || "";
function notePen(g, s) {
  const has = !!noteOf(g, s), ed = S.noteEdit === s.id;
  return `<button class="npen${has ? " has" : ""}${ed ? " on" : ""}" data-a="note-edit" data-id="${s.id}" aria-label="${has ? "Modifier la note" : "Ajouter une note"} : ${esc(s.n)}" aria-expanded="${ed}">✎</button>`;
}
function noteGerer(g, s) {
  const n = noteOf(g, s);
  if (S.noteEdit === s.id) {
    const v = S.ndraft != null ? S.ndraft : n;
    return `<div class="nedit"><textarea id="n-edit" rows="3" maxlength="600" placeholder="Rappel, règle de table, phrase préparée…" aria-label="Note pour ${esc(s.n)}">${esc(v)}</textarea>
    <div class="cast"><button class="btn cast-go sm" data-a="note-save" data-id="${s.id}">Enregistrer</button><button class="btn sm" data-a="note-cancel">Annuler</button>${n ? `<span style="flex:1"></span><button class="linkbtn" data-a="note-clear" data-id="${s.id}">Effacer</button>` : ""}</div></div>`;
  }
  return "";
}
// En jeu : petit repère doré quand une note existe ; la note se lit en dépliant le sort
const noteMark = (g, s) => noteOf(g, s) ? `<span class="nmark" title="Ce sort a une note" aria-label="note">✎</span>` : "";
const noteBox = (g, s) => `<div class="nbox">${esc(noteOf(g, s))}</div>`;
function keyPills(s, g) {
  let h = "";
  if (s.p) h += `<span class="kp ${s.p.startsWith("d:") ? "d" : "f"}">${esc(pText(s, g.level, g))}</span>`;
  if (s.j === "atk") h += `<span class="kp a" title="Attaque de sort">${signed(R.prof(g.level) + R.am(g))}</span>`;
  else if (s.j && s.j !== "auto") { const fixed = /^DD (\d+) fixe/.exec(s.ok || ""); h += `<span class="kp s" title="Jet de sauvegarde de la cible">${s.j} ${fixed ? fixed[1] : 8 + R.prof(g.level) + R.am(g)}</span>`; }
  return h;
}
onClick("note-edit", (b) => {
  const id = b.dataset.id; S.noteEdit = S.noteEdit === id ? null : id; S.ndraft = null; render();
  if (S.noteEdit) { const el = document.getElementById("n-edit"); if (el) { el.focus({ preventScroll: true }); el.setSelectionRange(el.value.length, el.value.length); } }
});
onClick("note-save", (b) => {
  const id = b.dataset.id, el = document.getElementById("n-edit"), v = el ? el.value.trim() : "";
  S.noteEdit = null; S.ndraft = null;
  mutate(g => { if (v) g.snotes[id] = v; else delete g.snotes[id]; });
  toast(v ? "Note enregistrée" : "Note effacée");
});
onClick("note-cancel", () => { S.noteEdit = null; S.ndraft = null; render(); });
onClick("note-clear", (b) => {
  const id = b.dataset.id, g = G(), old = g && g.snotes[id]; S.noteEdit = null; S.ndraft = null;
  mutate(g => { delete g.snotes[id]; });
  toast("Note effacée", () => { mutate(g => { g.snotes[id] = old; }); return "Note rétablie"; });
});
onInput("#n-edit", t => { S.ndraft = t.value; });

export { metaLine, pillData, tier, pText, pillsHTML, spellBody, tags, noteOf, notePen, noteGerer, noteMark, noteBox, keyPills };
