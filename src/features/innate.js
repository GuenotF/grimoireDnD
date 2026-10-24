// Sorts innés : race (tieffelin, drow, haut-elfe, gnome des forêts) et dons (Initié à la magie, Mage offensif,
// Magie rituelle). Section de l'onglet d'action (En jeu), pour toutes les classes. Chaque sort garde sa caractéristique
// d'incantation (race, ou classe choisie pour le don), son niveau d'accès et son usage : à volonté (sort mineur),
// une fois par repos long sans emplacement, ou en rituel seulement (livre de rituels). Race réglable dans ✎ Modifier.
import { onChange, onClick } from "../core/actions.js";
import { esc, signed } from "../core/format.js";
import { fxKey } from "../core/schema.js";
import { G, S } from "../core/state.js";
import { mutate } from "../core/store.js";
import { toast } from "../core/ui.js";
import { C } from "../classes/index.js";
import { BY_ID } from "../data.js";
import { R } from "../rules/common.js";
import { RACES } from "../rules/creation.js";
import { FEATS, SPELL_CLASSES, featSpellPool } from "../rules/feats.js";
import { foldHead, isFold } from "../ui/components.js";
import { concOf, slotsLeft } from "./cast.js";
import { pText, tags } from "./spells.js";

const ABN = { int: "INT", wis: "SAG", cha: "CHA" };
const raceDef = g => { const r = g.race && RACES[g.race.id]; if (!r) return null; return { r, s: (r.subs || []).find(x => x.id === g.race.sub) || null }; };
/** Sorts innés accessibles au niveau du personnage : [{ s (sort), ab, rest, ritual, at (niveau de lancement), src, ti (trait du don) }]. */
function innateSpells(g) {
  const d = raceDef(g), out = [];
  if (d) [...(d.r.spells || []), ...((d.s && d.s.spells) || [])].map(x => ({ ...x, id: x.choice === "cantrip" ? g.race.cantrip : x.id }))
    .filter(x => BY_ID[x.id] && g.level >= (x.lv || 1)).forEach(x => out.push({ s: BY_ID[x.id], ab: x.ab, rest: x.rest || null, at: x.at || BY_ID[x.id].l, src: g.race.n || d.r.n }));
  (g.traits || []).forEach((t, ti) => { const f = FEATS[t.feat]; if (!f || !f.spells || !t.ch || !SPELL_CLASSES[t.ch.cls]) return;
    const ab = SPELL_CLASSES[t.ch.cls][1];
    (t.ch.spells || []).filter(id => BY_ID[id]).forEach(id => { const s = BY_ID[id];
      out.push({ s, ab, rest: f.spells.l1 && s.l === 1 ? "long" : null, ritual: !!f.spells.ritual, at: s.l, src: f.n, ti }); }); });
  // Classe (occultiste : manifestations, Arcanum mystique, faveur de pacte) : will = à volonté, slot = avec un emplacement de pacte
  if (C(g).innate) C(g).innate(g).filter(x => x.s).forEach(x => out.push({ at: x.s.l, ...x, cls: true }));
  return out;
}
/** Pastilles calculées avec la caractéristique de la race. */
function pills(g, x) {
  const s = x.s, m = R.ab(g, x.ab), prof = R.prof(g.level);
  let v = pText(s, g.level);
  if (x.at > s.l && /d\d+/.test(v) && /\+1d\d+ par niveau/.test(s.up || "")) v = v.replace(/^(\d+)d/, (_, n) => `${+n + x.at - s.l}d`); // lancé à un niveau plus élevé (Représailles infernales : niveau 2)
  let h = v ? `<span class="kp ${s.p.startsWith("d:") ? "d" : "f"}">${esc(v)}</span>` : "";
  if (s.j === "atk") h += `<span class="kp a" title="Attaque de sort (${ABN[x.ab]})">${signed(prof + m)}</span>`;
  else if (s.j && s.j !== "auto") h += `<span class="kp s" title="Jet de sauvegarde de la cible">${s.j} ${8 + prof + m}</span>`;
  return h;
}
function innateHTML(g) {
  const list = innateSpells(g).filter(x => !x.cls); if (!list.length) return "";
  return innateBlock(g, list, "act-inn", "Sorts innés", `${esc([...new Set(list.map(x => x.src))].join(", "))} · sans emplacement`);
}
const useText = x => x.ritual ? "en rituel seulement (+10 minutes)" : x.s.l === 0 || x.will ? "à volonté" : x.slot ? "avec un emplacement de pacte, une fois par repos long" : `${x.at > x.s.l ? `niveau ${x.at}, ` : ""}une fois par repos long`;
/** Liste de sorts sans emplacement (ou une fois par repos long), avec bouton Lancer : race, dons, et sections de classe (occultiste). */
function innateBlock(g, list, key, title, aside) {
  let h = foldHead(key, "", title, aside, list.map(x => esc(x.s.n)).join(", "));
  if (isFold(key)) return h;
  const book = list.find(x => x.ritual && x.ti != null), addable = book ? ritualAddable(g, book.ti) : [];
  return h + list.map(x => {
    const used = x.rest && (g.innU || {})[x.s.id], open = S.open.has("inn:" + x.s.id), cur = concOf(g);
    const noSlot = x.slot && !used && !slotsLeft(g, R.maxLevel(g));
    const btn = x.ritual ? `<button class="btn cast-rit sm" data-a="inn-cast" data-id="${x.s.id}">Rituel</button>` : used ? `<button class="btn cast-none sm" disabled>Utilisé</button>` : noSlot ? `<button class="btn cast-none sm" disabled>Plus d'emplacement</button>` : `<button class="btn cast-go sm" data-a="inn-cast" data-id="${x.s.id}">Lancer</button>`;
    return `<div class="jrow inn"><div class="jline"><div class="jmain"><button class="jname" data-a="row" data-id="inn:${x.s.id}" aria-expanded="${open}">${esc(x.s.n)}${tags(x.s)}<span class="chev">${open ? "▴" : "▾"}</span></button>${cur && cur.id === x.s.id ? `<span class="live">◉ en cours</span>` : ""}</div><span class="kps">${pills(g, x)}</span>${btn}</div>
      <div class="innsub">${esc(x.src)} · ${ABN[x.ab]} · ${useText(x)}${x.rest && !x.ritual && !x.will && x.s.l ? `${x.rest ? ` <button class="pip${used ? " used" : ""}" data-a="inn-pip" data-id="${x.s.id}" aria-label="${esc(x.s.n)} : ${used ? "utilisé" : "disponible"}"></button>` : ""}` : ""}</div>
      ${open ? `<div class="jbody"><div class="eff">${esc(x.s.e)}</div><div class="meta">${esc(x.s.t)} · ${esc(x.s.r)} · ${esc(x.s.d)}</div></div>` : ""}</div>`;
  }).join("") + (addable.length ? `<div class="innadd"><label for="inn-add">Copier un rituel dans le livre</label><select id="inn-add" data-ti="${book.ti}"><option value="">Choisir… (2 h et 50 po par niveau)</option>${addable.map(s => `<option value="${s.id}">${esc(s.n)} · niv. ${s.l}</option>`).join("")}</select></div>` : "");
}
onClick("inn-cast", (b) => {
  const g = G(), x = innateSpells(g).find(y => y.s.id === b.dataset.id); if (!x) return; const s = x.s;
  if (x.rest && !x.ritual && (g.innU || {})[s.id]) return;
  const pl = R.maxLevel(g); if (x.slot && !x.ritual && !slotsLeft(g, pl)) return;
  const cur = concOf(g), prev = JSON.parse(JSON.stringify({ innU: g.innU || {}, effects: g.effects, used: g.used }));
  mutate(g => {
    if (x.rest && !x.ritual) g.innU = { ...(g.innU || {}), [s.id]: 1 };
    if (x.slot && !x.ritual) g.used[pl] = (+(g.used[pl] || 0)) + 1;
    if (s.c) { g.effects = g.effects.filter(e => !e.c); g.effects.push({ k: fxKey(), id: s.id, name: s.n, d: s.d, c: true, note: "" }); }
    else if (!["Instantanée", "Jusqu'à dissipation", "Spéciale"].includes(s.d)) g.effects.push({ k: fxKey(), id: s.id, name: s.n, d: s.d, c: false, note: "" });
  });
  toast(`<b>${esc(s.n)}</b> lancé · ${x.ritual ? "en rituel, 10 minutes de plus" : x.slot ? `emplacement de pacte (niveau ${pl}), une fois par repos long` : x.will ? "à volonté, sans emplacement" : x.rest ? "une fois par repos long" : "sort mineur"}${s.c && cur && cur.id !== s.id ? ` · fin de ${esc(cur.name)}` : ""}`, () => { mutate(g => Object.assign(g, prev)); return "Annulé"; });
});
// Magie rituelle : rituels copiés ensuite (niveau au plus la moitié du niveau du personnage, arrondi au supérieur)
function ritualAddable(g, ti) {
  const t = g.traits[ti]; if (!t) return []; const max = Math.ceil(g.level / 2), have = t.ch.spells || [];
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(l => l <= max).flatMap(l => featSpellPool("ritual-caster", t.ch.cls, l)).filter(s => !have.includes(s.id));
}
onChange("#inn-add", t => { const id = t.value, ti = +t.dataset.ti; if (!BY_ID[id]) return;
  mutate(g => { const tr = g.traits[ti]; if (tr && tr.ch) tr.ch = { ...tr.ch, spells: [...(tr.ch.spells || []), id] }; });
  toast(`<b>${esc(BY_ID[id].n)}</b> copié dans le livre de rituels`); });
onClick("inn-pip", (b) => { mutate(g => { const u = { ...(g.innU || {}) }; if (u[b.dataset.id]) delete u[b.dataset.id]; else u[b.dataset.id] = 1; g.innU = u; }); });

// ---------- Race dans ✎ Modifier (fiches créées sans l'assistant) : sorts innés et maîtrises, sans toucher aux valeurs
function raceField(g) {
  const cur = g.race ? `${g.race.id}${g.race.sub ? ":" + g.race.sub : ""}` : "";
  const opts = Object.values(RACES).flatMap(r => r.subs ? r.subs.map(s => [`${r.id}:${s.id}`, s.id === "standard" ? r.n : s.n]) : [[r.id, r.n]]);
  const d = raceDef(g), cantrip = d && d.s && (d.s.spells || []).some(x => x.choice === "cantrip");
  return `<div class="field"><label for="f-race">Race</label><select id="f-race"><option value="">Non précisée</option>${opts.map(([v, n]) => `<option value="${v}"${v === cur ? " selected" : ""}>${esc(n)}</option>`).join("")}</select></div>
  ${cantrip ? `<div class="field"><label for="f-rcantrip">Sort mineur de haut-elfe</label><select id="f-rcantrip"><option value="">Choisir…</option>${Object.values(BY_ID).filter(s => s.l === 0 && (s.cl || []).includes("magicien")).sort((a, b) => a.n.localeCompare(b.n, "fr")).map(s => `<option value="${s.id}"${g.race.cantrip === s.id ? " selected" : ""}>${esc(s.n)}</option>`).join("")}</select></div>` : ""}`;
}
onChange("#f-race", t => {
  mutate(g => {
    if (!t.value) { g.race = null; return; }
    const [rid, sid] = t.value.split(":"), r = RACES[rid], s = (r.subs || []).find(x => x.id === sid) || {};
    // Seulement ce qui ne figure pas déjà dans les valeurs de la fiche : nom, maîtrises d'armes et d'armures, PV par niveau, sorts innés
    g.race = { id: rid, sub: sid || null, n: s.n && s.id !== "standard" ? s.n : r.n, hpLv: s.hpLv || 0, weapons: [...(r.weapons || []), ...(s.weapons || [])], armor: [...(r.armor || []), ...(s.armor || [])] };
  });
  toast("Race enregistrée : sorts innés et maîtrises d'armes pris en compte (caractéristiques et traits inchangés)");
});
onChange("#f-rcantrip", t => { mutate(g => { if (g.race) g.race = { ...g.race, cantrip: t.value || undefined }; }); });
/** Repos long : sorts innés de nouveau disponibles. */
const innateRest = g => { g.innU = {}; };

export { innateSpells, innateHTML, innateBlock, raceField, innateRest };
