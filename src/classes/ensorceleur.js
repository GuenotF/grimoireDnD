// Ensorceleur (Manuel des joueurs 2014) : sorts connus, points de sorcellerie (Source de magie : créer et convertir des emplacements),
// métamagie au moment de lancer, Lignée draconique, Magie sauvage (sursauts, table d100 : ensorceleur-sauvage.js).
// Résumés rédigés pour la table (textes AideDD), à vérifier dans le livre.
import { onClick, onChange } from "../core/actions.js";
import { byName, esc, signed } from "../core/format.js";
import { fxKey } from "../core/schema.js";
import { G, S } from "../core/state.js";
import { mutate } from "../core/store.js";
import { render, toast } from "../core/ui.js";
import { BY_ID } from "../data.js";
import { slotsLeft } from "../features/cast.js";
import { pCantrips, pConc, pDots, pExtras, pFoot, pHeader, pNotes, pSlots, pSpellRow, printHTML } from "../features/print.js";
import { castingRules, concentrationRules } from "../features/rules.js";
import { R, classSpells } from "../rules/common.js";
import { SLOTS } from "../rules/tables.js";
import { capRow, pickRow, statLabel } from "../ui/components.js";
import { surge } from "./ensorceleur-sauvage.js";

// Sorts connus par niveau d'ensorceleur ; sorts mineurs 4, 5 (niveau 4), 6 (niveau 10)
const KNOWN = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15];
const COST = { 1: 2, 2: 3, 3: 5, 4: 6, 5: 7 };                 // Création de sort : points pour un emplacement
const ENS = {
  pts: g => g.level >= 2 ? g.level : 0,                        // points de sorcellerie = niveau
  left: g => Math.max(0, ENS.pts(g) - (g.spU || 0)),
  meta: lv => lv >= 17 ? 4 : lv >= 10 ? 3 : lv >= 3 ? 2 : 0,   // options de métamagie connues
  dd: g => 8 + R.prof(g.level) + R.am(g),
  cha: g => Math.max(1, R.am(g)),
};
const save = s => s.j && !["atk", "auto"].includes(s.j);
// Options de métamagie (noms et effets AideDD) : coût, sorts auxquels elles s'appliquent (approché d'après la fiche du sort)
const MM = {
  accelere: { n: "Sort accéléré", cost: () => 2, ok: s => s.t === "1 action", d: "Temps d'incantation de 1 action → 1 action bonus." },
  ample: { n: "Sort ample", cost: () => 1, ok: s => !/^Personnelle/.test(s.r), d: "Portée doublée (sort à 1,50 m ou plus), ou 9 m pour un sort de contact." },
  etendu: { n: "Sort étendu", cost: () => 1, ok: s => /^\d+ (minutes?|heures?|jours?)$/.test(s.d), d: "Durée doublée (sort de 1 minute ou plus), 24 heures au maximum." },
  intensifie: { n: "Sort intensifié", cost: () => 3, ok: save, d: "Une cible a le désavantage à son premier jet de sauvegarde contre le sort." },
  jumeau: { n: "Sort jumeau", cost: lv => Math.max(1, lv), ok: s => !/^Personnelle/.test(s.r) && !s.z, d: "Une deuxième créature à portée, pour un sort qui ne vise qu'une seule créature (pas Projectile magique ni Rayon ardent). Coût : le niveau du sort (1 pour un sort mineur)." },
  prevenant: { n: "Sort prévenant", cost: () => 1, ok: s => save(s) && !!s.z, d: "Jusqu'à mod. de CHA créatures réussissent automatiquement leur jet de sauvegarde." },
  renforce: { n: "Sort renforcé", cost: () => 1, ok: s => (s.p || "").startsWith("d:"), stack: true, d: "Relance jusqu'à mod. de CHA dés de dégâts (garde les nouveaux). Se cumule avec une autre option." },
  subtil: { n: "Sort subtil", cost: () => 1, ok: () => true, d: "Sans composantes verbales ni somatiques." },
};
const ANC = { rouge: ["Rouge", "feu"], or: ["Or", "feu"], airain: ["Airain", "feu"], bleu: ["Bleu", "foudre"], bronze: ["Bronze", "foudre"], blanc: ["Blanc", "froid"], argent: ["Argent", "froid"], noir: ["Noir", "acide"], cuivre: ["Cuivre", "acide"], vert: ["Vert", "poison"] };
const ORIG = {
  draco: { n: "Lignée draconique", sum: "Ancêtre dragon : draconique, +1 PV par niveau, CA 13 + DEX sans armure. Puis Affinité élémentaire (+ CHA aux dégâts du type de l'ancêtre), ailes, présence." },
  sauvage: { n: "Magie sauvage", sum: "Sursaut de magie sauvage (d20 après un sort de niveau 1+, table d100 sur un 1), Marée du chaos (avantage, 1 fois par repos long). Puis Chance forcée, Chaos contrôlé, Bombardement de sorts." },
};
const anc = g => ANC[g.anc] || ANC.rouge;
const metaN = g => (g.meta || []).filter(k => MM[k]).map(k => MM[k].n);
const FEATS = [
  { lv: 1, n: "Origine magique", k: "f", pill: g => ORIG[g.sorig].n, d: g => `${ORIG[g.sorig].n} : ${ORIG[g.sorig].sum}` },
  { lv: 1, o: "draco", n: "Ancêtre dragon", k: "f", pill: g => `${anc(g)[0]} · ${anc(g)[1]}`, d: g => `Dragon ${anc(g)[0].toLowerCase()} (dégâts de ${anc(g)[1]}). Tu parles, lis et écris le draconique ; avec les dragons, ton bonus de maîtrise est doublé pour les tests de Charisme.` },
  { lv: 1, o: "draco", n: "Résilience draconique", k: "f", pill: () => "+1 PV par niveau · CA 13 + DEX", d: () => "PV maximum +1 par niveau d'ensorceleur (compté au passage de niveau). Sans armure, ta CA vaut 13 + DEX (calculée)." },
  { lv: 1, o: "sauvage", n: "Sursaut de magie sauvage", k: "f", pill: () => "d20 après un sort de niveau 1+", d: () => "Juste après un sort de niveau 1 ou plus, le MJ peut te faire lancer un d20 : sur un 1, lance le d100 sur la table des sursauts (proposé dans l'appli après chaque sort)." },
  { lv: 1, o: "sauvage", n: "Marée du chaos", k: "f", pill: () => "avantage · repos long", d: () => "Avantage à un jet d'attaque, de caractéristique ou de sauvegarde. Une fois par repos long ; avant, le MJ peut te faire lancer sur la table des sursauts pour la récupérer." },
  { lv: 2, n: "Source de magie", k: "f", pill: g => `${ENS.pts(g)} points · repos long`, d: g => `${ENS.pts(g)} points de sorcellerie (ton niveau), récupérés au repos long. Action bonus : créer un emplacement (2, 3, 5, 6, 7 points pour les niveaux 1 à 5 ; il disparaît au repos long) ou convertir un emplacement en points (son niveau).` },
  { lv: 3, n: "Métamagie", k: "f", pill: g => metaN(g).join(", ") || `${ENS.meta(g.level)} options à choisir (Gérer)`, d: g => `${ENS.meta(g.level)} options (2 au niveau 3, 3 au 10, 4 au 17), une seule par sort (sauf Sort renforcé), proposées quand tu lances un sort : ${metaN(g).join(", ") || "à choisir en mode Gérer"}.` },
  { lv: 6, o: "draco", n: "Affinité élémentaire", k: "d", pill: g => `${signed(R.am(g))} aux dégâts de ${anc(g)[1]}`, d: g => `Quand tu lances un sort qui inflige des dégâts de ${anc(g)[1]}, tu ajoutes ton modificateur de Charisme (${signed(R.am(g))}) à un jet de dégâts (calculé dans les pastilles). 1 point de sorcellerie : résistance à ce type de dégâts pendant 1 heure.` },
  { lv: 6, o: "sauvage", n: "Chance forcée", k: "f", pill: () => "réaction, 2 points : ±1d4", d: () => "Réaction, quand une créature que tu vois fait un jet d'attaque, de caractéristique ou de sauvegarde : 2 points de sorcellerie pour lancer 1d4 et l'ajouter ou le retirer au jet (après le d20, avant le résultat). Peut provoquer un sursaut." },
  { lv: 14, o: "draco", n: "Ailes de dragon", k: "f", pill: () => "action bonus : vol = ta vitesse", d: () => "Action bonus : des ailes de dragon te donnent une vitesse de vol égale à ta vitesse, jusqu'à ce que tu les rentres (action bonus). Pas avec une armure non prévue pour." },
  { lv: 14, o: "sauvage", n: "Chaos contrôlé", k: "f", pill: () => "2 jets sur la table, au choix", d: () => "Sur la table des sursauts, tu lances deux fois et choisis l'effet (l'appli lance les deux d100)." },
  { lv: 18, o: "draco", n: "Présence draconique", k: "s", pill: g => `5 points · JdS SAG DD ${ENS.dd(g)} · 18 m`, d: g => `Action, 5 points de sorcellerie : aura de 18 m pendant 1 minute (concentration). Les créatures hostiles qui y commencent leur tour font un jet de Sagesse (DD ${ENS.dd(g)}) ou sont charmées (crainte révérencielle) ou effrayées, au choix, jusqu'à la fin de l'aura ; une créature qui réussit est immunisée pendant 24 heures.` },
  { lv: 18, o: "sauvage", n: "Bombardement de sorts", k: "d", pill: () => "un dé au max : relance et ajoute", d: () => "Quand tu lances les dégâts d'un sort et qu'un dé fait son maximum, relance ce dé et ajoute le résultat. Une fois par tour." },
  { lv: 20, n: "Restauration ensorcelée", k: "f", pill: () => "+4 points au repos court", d: () => "Tu récupères 4 points de sorcellerie à la fin d'un repos court (bouton dans les ressources)." },
];
const feats = g => FEATS.filter(f => !f.o || f.o === g.sorig).map((f, i) => ({ id: "e" + i, ...f }));

// ---------- Métamagie au moment de lancer (fiche dépliée du sort)
const selCost = (g, s, keys, lv = s.l) => keys.reduce((t, k) => t + MM[k].cost(lv), 0);
function castExtras(g, s) {
  if (g.level < 3 || !(g.meta || []).length) return "";
  const keys = S.mm && S.mm.id === s.id ? S.mm.keys : [], left = ENS.left(g), used = selCost(g, s, keys);
  return `<div class="mmbox"><span class="lusub">Métamagie · ${left} point${left > 1 ? "s" : ""}${used ? ` · −${used}` : ""}</span><div class="chips">${g.meta.filter(k => MM[k]).map(k => { const m = MM[k], on = keys.includes(k), c = m.cost(s.l), ok = m.ok(s), afford = on || used + c <= left;
    return `<button class="chip" data-a="mm-tog" data-id="${s.id}" data-v="${k}" aria-pressed="${on}"${!on && (!ok || !afford) ? " disabled" : ""} title="${esc(m.d)}">${esc(m.n.replace("Sort ", ""))} · ${k === "jumeau" ? (s.l ? c : 1) : c}</button>`; }).join("")}</div>
    ${keys.length ? `<span class="muted" style="font-size:12.5px">${keys.map(k => `<b>${esc(MM[k].n)}</b> : ${esc(MM[k].d)}`).join(" ")} Les points sont dépensés au lancer.</span>` : `<span class="muted" style="font-size:12.5px">Une option par sort (Sort renforcé se cumule). Grisée : ne s'applique pas à ce sort, ou pas assez de points.</span>`}</div>`;
}
onClick("mm-tog", (b) => {
  const id = b.dataset.id, k = b.dataset.v, cur = S.mm && S.mm.id === id ? S.mm.keys : [];
  let keys = cur.includes(k) ? cur.filter(x => x !== k) : [...(MM[k].stack ? cur : cur.filter(x => MM[x].stack)), k]; // une seule option, sauf Sort renforcé
  S.mm = { id, keys }; render();
});
function onCast(g, s, lv) {
  let msg = "";
  const keys = S.mm && S.mm.id === s.id ? S.mm.keys : [];
  if (keys.length) { const c = Math.min(ENS.left(g), selCost(g, s, keys, lv || s.l)); g.spU = (g.spU || 0) + c; msg += ` · ${keys.map(k => MM[k].n).join(" + ")} (−${c} point${c > 1 ? "s" : ""}, reste ${ENS.left(g)})`; }
  S.mm = null;
  if (g.sorig === "sauvage" && lv >= 1) S.wild = { n: s.n, l: lv };       // proposition de sursaut
  return msg;
}

// ---------- Magie sauvage : carte de sursaut (après un sort, ou sur demande du MJ)
const d = n => 1 + Math.floor(Math.random() * n);
function wildHTML(g) {
  const w = S.wild; if (!w || g.sorig !== "sauvage") return "";
  let h = `<section class="wildcard" id="wild-card">`;
  if (w.r == null && !w.table) h += `<b class="wh">Sursaut de magie sauvage ?</b><span>Tu viens de lancer <b>${esc(w.n)}</b>${w.l ? ` (niveau ${w.l})` : ""}. Si le MJ le demande : d20, un sursaut sur 1.</span><div class="cast"><button class="btn cast-go" data-a="wm-d20">Lancer le d20</button><button class="btn" data-a="wm-close">Pas de jet</button></div>`;
  else if (w.r !== 1 && !w.table) h += `<b class="wh">d20 : ${w.r} · pas de sursaut</b><div class="cast"><button class="btn" data-a="wm-close">Fermer</button></div>`;
  else {
    h += `<b class="wh">${w.table ? "Table des sursauts" : "d20 : 1 · sursaut !"}</b>${w.c.map((n, i) => { const [rg, t] = surge(n); return `<div class="wsurge${w.c.length > 1 ? " pick" : ""}"><span class="wn">d100 : <b>${n}</b> <small>${rg}</small></span><span>${esc(t)}</span></div>`; }).join("")}
    ${w.c.length > 1 ? `<span class="muted" style="font-size:12.5px">Chaos contrôlé : choisis l'un des deux effets.</span>` : ""}${w.tide ? `<span class="muted" style="font-size:12.5px">Marée du chaos récupérée.</span>` : ""}
    <div class="cast"><button class="btn" data-a="wm-close">Fermer</button></div>`;
  }
  return h + `</section>`;
}
const rollTable = g => g.level >= 14 ? [d(100), d(100)] : [d(100)];
onClick("wm-d20", () => { const g = G(); if (!g || !S.wild) return; const r = d(20); S.wild.r = r;
  if (r === 1) { S.wild.c = rollTable(g); if (g.tideU) { S.wild.tide = true; mutate(g => { g.tideU = 0; }); return; } } render(); });
onClick("wm-table", () => { const g = G(); if (!g) return; S.wild = { n: "", table: true, c: rollTable(g) }; if (g.tideU) { S.wild.tide = true; mutate(g => { g.tideU = 0; }); } else render(); const el = document.getElementById("wild-card"); if (el) el.scrollIntoView({ block: "center" }); });
onClick("wm-close", () => { S.wild = null; render(); });

// ---------- Ressources (En jeu) : Source de magie, options d'origine
function srcBody(g) {
  const left = ENS.left(g), mx = Math.min(5, R.maxLevel(g)), lvls = []; for (let lv = 1; lv <= mx; lv++) lvls.push(lv);
  return `<span class="lusub">Créer un emplacement · action bonus</span><div class="chips">${lvls.map(lv => `<button class="btn sm cast-go" data-a="sp-make" data-l="${lv}"${left >= COST[lv] ? "" : " disabled"}>Niv. ${lv} · ${COST[lv]} pts</button>`).join("")}</div>
  <span class="lusub">Convertir un emplacement en points · action bonus</span><div class="chips">${R.slots(g).map((n, i) => i + 1).map(lv => `<button class="btn sm" data-a="sp-conv" data-l="${lv}"${slotsLeft(g, lv) && g.spU > 0 ? "" : " disabled"}>Niv. ${lv} → +${Math.min(lv, g.spU || 0) || lv}</button>`).join("")}</div>
  <span class="muted" style="font-size:12.5px">Les emplacements créés (en pointillé) disparaissent au repos long. Pas plus de ${ENS.pts(g)} points, pas d'emplacement au-dessus du niveau ${mx}.</span>`;
}
function resHTML(g) {
  const pts = ENS.pts(g); if (!pts && g.sorig !== "sauvage") return "";
  let h = `<div class="rubric"><h2>Source de magie</h2><span class="aside">repos long</span></div><div class="slots res">`;
  if (pts) { const left = ENS.left(g);
    h += `<div class="resrow"><span class="rn"><b>Points de sorcellerie</b><small>repos long</small></span><span class="rv">${left}<small>/${pts}</small></span><button class="btn ghost sm" data-a="sp-adj" data-v="1" aria-label="Un point de moins"${left ? "" : " disabled"}>−</button><button class="btn ghost sm" data-a="sp-adj" data-v="-1" aria-label="Un point de plus"${left < pts ? "" : " disabled"}>+</button></div>
    <div class="bar"><span style="width:${Math.round(100 * left / pts)}%"></span></div>
    ${capRow(g, "src", "Créer ou convertir des emplacements", "action bonus", "", true, srcBody)}`; }
  if (g.sorig === "sauvage") {
    h += `<div class="resrow sep"><span class="rn"><b>Marée du chaos</b><small>avantage · repos long</small></span><span class="pips"><button class="pip${g.tideU ? " used" : ""}" data-a="res-pip" data-r="tide" data-k="0" aria-label="Marée du chaos, ${g.tideU ? "utilisée" : "disponible"}"></button></span></div>
    <div class="cast">${g.level >= 6 ? `<button class="btn sm" data-a="sp-spend" data-v="bend"${ENS.left(g) >= 2 ? "" : " disabled"}>Chance forcée · 2 pts</button>` : ""}<button class="btn sm" data-a="wm-table">Sursaut : lancer sur la table</button></div>`;
  }
  if (g.sorig === "draco" && g.level >= 6) h += `<div class="cast" style="margin-top:6px"><button class="btn sm" data-a="sp-spend" data-v="res"${ENS.left(g) >= 1 ? "" : " disabled"}>Résistance au ${anc(g)[1]} · 1 pt</button>${g.level >= 18 ? `<button class="btn sm" data-a="sp-spend" data-v="presence"${ENS.left(g) >= 5 ? "" : " disabled"}>Présence draconique · 5 pts</button>` : ""}</div>`;
  if (g.level >= 20) h += `<div class="cast" style="margin-top:6px"><button class="btn sm" data-a="sp-spend" data-v="restore"${g.spU ? "" : " disabled"}>Restauration ensorcelée · +4 (repos court)</button></div>`;
  if (g.level >= 3) h += `<div class="mmlist"><span class="lusub">Métamagie</span>${metaN(g).length ? metaN(g).map(n => `<span class="kp p">${esc(n)}</span>`).join("") : `<span class="muted">à choisir en mode Gérer</span>`}</div>`;
  return h + `</div>`;
}
const snap = g => JSON.parse(JSON.stringify({ spU: g.spU || 0, made: g.made || {}, used: g.used, effects: g.effects, tideU: g.tideU || 0 }));
const undo = prev => () => { mutate(g => Object.assign(g, prev)); return "Annulé"; };
onClick("sp-adj", (b) => { mutate(g => { g.spU = Math.max(0, Math.min(ENS.pts(g), (g.spU || 0) + +b.dataset.v)); }); });
onClick("sp-make", (b) => { const g = G(), lv = +b.dataset.l; if (!g || ENS.left(g) < COST[lv]) return; const prev = snap(g);
  mutate(g => { g.spU = (g.spU || 0) + COST[lv]; g.made = { ...(g.made || {}), [lv]: ((g.made || {})[lv] || 0) + 1 }; });
  toast(`Emplacement de niveau ${lv} créé (−${COST[lv]} points, reste ${ENS.left(G())}) · perdu au repos long`, undo(prev)); });
onClick("sp-conv", (b) => { const g = G(), lv = +b.dataset.l; if (!g || slotsLeft(g, lv) < 1 || !g.spU) return; const prev = snap(g), gain = Math.min(lv, g.spU);
  mutate(g => { g.used[lv] = (+(g.used[lv] || 0)) + 1; g.spU -= gain; });
  toast(`Emplacement de niveau ${lv} converti : +${gain} point${gain > 1 ? "s" : ""} (${ENS.left(G())}/${ENS.pts(g)})`, undo(prev)); });
onClick("sp-spend", (b) => { const g = G(), v = b.dataset.v; if (!g) return; const prev = snap(g);
  if (v === "restore") { mutate(g => { g.spU = Math.max(0, (g.spU || 0) - 4); }); toast(`Restauration ensorcelée : +4 points (${ENS.left(G())}/${ENS.pts(g)})`, undo(prev)); return; }
  const c = { bend: 2, res: 1, presence: 5 }[v]; if (ENS.left(g) < c) return;
  mutate(g => { g.spU = (g.spU || 0) + c; if (v === "res") g.effects.push({ k: fxKey(), id: "ens-res", name: `Résistance au ${anc(g)[1]}`, d: "1 heure", c: false, note: "" });
    if (v === "presence") { g.effects = g.effects.filter(e => !e.c); g.effects.push({ k: fxKey(), id: "ens-presence", name: "Présence draconique", d: "1 minute", c: true, note: "" }); } });
  toast(v === "bend" ? `<b>Chance forcée</b> : lance 1d4, ajoute-le ou retire-le au jet (−2 points, reste ${ENS.left(G())})` : v === "res" ? `Résistance au ${anc(g)[1]} pendant 1 heure (−1 point)` : `<b>Présence draconique</b> : aura de 18 m, JdS SAG DD ${ENS.dd(g)} (−5 points, concentration)`, undo(prev)); });

// ---------- Gérer : options de métamagie (réglages de la classe)
function settingsHTML(g) {
  if (g.level < 3) return "";
  const n = ENS.meta(g.level), sel = g.meta || [];
  return `<div class="rubric"><h2>Métamagie</h2><span class="aside">${sel.length} / ${n}${g.level < 17 ? ` · une de plus au niveau ${g.level < 10 ? 10 : 17}` : ""}</span></div>
  <div class="chips">${Object.entries(MM).map(([k, m]) => { const on = sel.includes(k); return `<button class="chip" data-a="mm-pick" data-v="${k}" aria-pressed="${on}"${!on && sel.length >= n ? " disabled" : ""}>${esc(m.n.replace("Sort ", ""))} · ${k === "jumeau" ? "niv." : m.cost(1)}</button>`; }).join("")}</div>
  ${sel.length ? `<div class="mmdesc">${sel.filter(k => MM[k]).map(k => `<p><b>${esc(MM[k].n)}</b> : ${esc(MM[k].d)}</p>`).join("")}</div>` : `<p class="muted" style="font-size:13px">Choisis ${n} options : elles seront proposées quand tu lanceras un sort.</p>`}`;
}
onClick("mm-pick", (b) => { mutate(g => { const s = g.meta || [], k = b.dataset.v; g.meta = s.includes(k) ? s.filter(x => x !== k) : s.length < ENS.meta(g.level) ? [...s, k] : s; }); });
onChange("#f-sorig", t => { mutate(g => { g.sorig = t.value; }); });
onChange("#f-anc", t => { mutate(g => { g.anc = t.value; }); });

// ---------- Création (étape Compétences) : origine dès le niveau 1
const creation = {
  html: c => { const x = c.cx || {};
    return `<div class="crcls"><span class="lusub">Origine magique · dès le niveau 1</span>${Object.entries(ORIG).map(([k, o]) => { const on = x.orig === k;
      return `<button class="subopt${on ? " on" : ""}" data-a="cr-sorig" data-v="${k}" aria-pressed="${on}"><span class="rd" aria-hidden="true"></span><span class="bd"><b>${esc(o.n)}</b><small>${esc(o.sum)}</small></span></button>${on && k === "draco" ? `<div class="subx"><span class="lusub">Ancêtre draconique</span><div class="chips">${Object.entries(ANC).map(([a, [n, t]]) => `<button class="chip" data-a="cr-sanc" data-v="${a}" aria-pressed="${x.anc === a}">${n} · ${t}</button>`).join("")}</div>${x.anc ? `<span class="fpprev">Ajouté à la fiche : draconique, PV +1 par niveau, CA 13 + DEX sans armure, dégâts de ${ANC[x.anc][1]}</span>` : ""}</div>` : ""}`; }).join("")}</div>`; },
  missing: c => { const x = c.cx || {}; return !ORIG[x.orig] ? "choisis ton origine magique" : x.orig === "draco" && !ANC[x.anc] ? "choisis ton ancêtre draconique" : ""; },
  apply: (g, c) => { const x = c.cx || {}; if (!ORIG[x.orig]) return; g.sorig = x.orig;
    if (x.orig === "draco") { g.anc = x.anc || "rouge"; g.langs = [...new Set([...g.langs, "Draconique"])]; if (g.hpMax != null) g.hpMax += 1; } },
};
onClick(["cr-sorig", "cr-sanc"], (b, a) => { const c = S.cr; if (!c) return; c.cx = c.cx || {}; if (a === "cr-sorig") { c.cx.orig = b.dataset.v; } else c.cx.anc = b.dataset.v; S.luKeep = true; render(); });

// ---------- Onglet Règles
function rulesHTML(g) {
  return `<div class="cols rules">
  <div><div class="rubric" style="margin-top:4px"><h3>Sorts connus</h3></div>
  <p>L'ensorceleur ne prépare pas ses sorts : il en <b>connaît ${R.prepMax(g)}</b>, tous lançables, et <b>${R.cantrips(g)} sorts mineurs</b>. À chaque niveau, il peut en remplacer un. Pas de rituel.</p>
  ${castingRules(g)}
  ${concentrationRules()}</div>
  <div><div class="rubric" style="margin-top:4px"><h3>Source de magie</h3></div>
  <p><b>${ENS.pts(g) || "Au niveau 2 :"} ${ENS.pts(g) ? "points de sorcellerie" : "points de sorcellerie = niveau"}</b>, récupérés au repos long. Action bonus : créer un emplacement (niv. 1 : 2 pts, 2 : 3, 3 : 5, 4 : 6, 5 : 7), qui disparaît au repos long ; ou convertir un emplacement en autant de points que son niveau.</p>
  <div class="rubric"><h3>Métamagie</h3></div>
  <p>${Object.values(MM).map(m => `<b>${m.n}</b> (${m === MM.jumeau ? "niveau du sort" : m.cost(1) + " pt" + (m.cost(1) > 1 ? "s" : "")}) : ${esc(m.d)}`).join("<br>")}</p>
  <div class="rubric"><h3>Récupérer</h3></div>
  <p><b>Repos long :</b> emplacements, points de sorcellerie${g.sorig === "sauvage" ? ", Marée du chaos" : ""} ; les emplacements créés disparaissent.${g.level >= 20 ? " <b>Repos court :</b> +4 points (Restauration ensorcelée)." : ""}</p>
  <p class="muted">Source : Manuel des joueurs 2014 (ensorceleur, Lignée draconique, Magie sauvage). Résumés rédigés pour la table, à vérifier dans le livre en cas de doute.</p></div></div>`;
}
// ---------- Fiche imprimable
function printSheet(g) {
  const prof = R.prof(g.level), mod = R.am(g), known = g.prepared.map(id => BY_ID[id]).filter(Boolean).sort((a, b) => a.l - b.l || byName(a, b));
  return `${pHeader(g, `Ensorceleur, niveau ${g.level} · ${esc(ORIG[g.sorig].n)}${g.sorig === "draco" ? ` (${anc(g)[0].toLowerCase()}, ${anc(g)[1]})` : ""}`, [[signed(mod), "MOD. CHARISME"], [ENS.dd(g), "DD DES SORTS"], [signed(prof + mod), "ATTAQUE DE SORT"], [ENS.pts(g) || "—", "POINTS DE SORCELLERIE"], [R.prepMax(g), "SORTS CONNUS"]])}
${pSlots(g)}
${ENS.pts(g) ? `<h2>Source de magie <small>repos long</small></h2><div class="res"><span class="l">Points de sorcellerie</span>${pDots(ENS.pts(g))}<span class="r">créer : 2 / 3 / 5 / 6 / 7 points (niv. 1 à 5) · convertir : niveau de l'emplacement</span></div>` : ""}
${g.sorig === "sauvage" ? `<div class="res"><span class="l">Marée du chaos</span>${pDots(1)}<span class="r">avantage · repos long</span></div>` : ""}
${metaN(g).length ? `<div class="callout"><b>Métamagie</b> : ${(g.meta || []).filter(k => MM[k]).map(k => `<b>${MM[k].n}</b> (${k === "jumeau" ? "niveau du sort" : MM[k].cost(1) + " pt"}) ${esc(MM[k].d)}`).join(" · ")}</div>` : ""}
<h2>Capacités de classe <small>niveau ${g.level}</small></h2>
<table>${feats(g).filter(f => f.lv <= g.level).map(f => `<tr><td class="n">${f.n}</td><td>${esc(f.d(g))}</td></tr>`).join("")}</table>
${pCantrips(g)}
${pExtras(g)}
${pConc()}
<div class="brk"></div>
<h2 style="margin-top:0">Sorts connus <small>${known.length} / ${R.prepMax(g)} · tous lançables</small></h2>
${known.length ? `<table><tr><th>Sort</th><th>Incantation · composantes</th><th>Effet</th></tr>${known.map(s => pSpellRow(g, s, false)).join("")}</table>` : "<p>Aucun sort connu pour l'instant.</p>"}
${pNotes(g)}
${pFoot("ENSORCELEUR")}`;
}

// ---------- Définition de la classe (contrat : voir docs/ARCHITECTURE.md) ----------
const row = (l, o, n, cls) => `<div class="${o === n ? "same" : ""}"><span>${l}</span><span class="old">${o}</span><span class="ar">→</span><b${cls && o !== n ? ` style="color:var(${cls})"` : ""}>${n}</b></div>`;
export default {
  n: "Ensorceleur", ab: "cha", abN: "Charisme", abArticle: "le Charisme", slots: SLOTS, top: 9, hitDie: "1d6",
  saves: ["con", "cha"],
  weaponProf: ["dagger", "dart", "sling", "quarterstaff", "crossbow-light"], armorProf: [],
  cantrips: lv => lv >= 10 ? 6 : lv >= 4 ? 5 : 4,
  known: lv => KNOWN[lv] || 0,
  prep: () => 0,
  langs: g => g.sorig === "draco" ? ["Draconique"] : [],
  defaults: () => ({ sorig: "draco", anc: "rouge", spU: 0, made: {}, meta: [], tideU: 0 }),
  normalize(o) {
    if (!ORIG[o.sorig]) o.sorig = "draco"; if (!ANC[o.anc]) o.anc = "rouge";
    o.spU = Math.max(0, +o.spU || 0); o.tideU = o.tideU ? 1 : 0;
    o.made = o.made && typeof o.made === "object" ? Object.fromEntries(Object.entries(o.made).filter(([lv, n]) => COST[lv] && n > 0).map(([lv, n]) => [lv, Math.floor(n)])) : {};
    o.meta = Array.isArray(o.meta) ? o.meta.filter(k => MM[k]) : [];
  },
  subclass: { lv: 1, label: "Origine magique", field: "sorig", opts: () => Object.entries(ORIG).map(([k, o]) => [k, o.n, o.sum]) },
  subline: g => `Ensorceleur niveau ${g.level} · ${esc(ORIG[g.sorig].n)}${g.sorig === "draco" ? ` (${anc(g)[0].toLowerCase()})` : ""}`,
  subclassField: g => `<div class="field"><label for="f-sorig">Origine magique</label><select id="f-sorig">${Object.entries(ORIG).map(([k, o]) => `<option value="${k}"${k === g.sorig ? " selected" : ""}>${o.n}</option>`).join("")}</select></div>
    ${g.sorig === "draco" ? `<div class="field"><label for="f-anc">Ancêtre</label><select id="f-anc">${Object.entries(ANC).map(([k, [n, t]]) => `<option value="${k}"${k === g.anc ? " selected" : ""}>${n} · ${t}</option>`).join("")}</select></div>` : ""}`,
  heroStats: g => { const cMax = R.cantrips(g); return `<div class="stat ${g.cantrips.length > cMax ? "alert" : ""}" role="listitem"><div class="v">${g.cantrips.length}<small>/${cMax}</small></div>${statLabel("Sorts mineurs", "Mineurs")}</div>
    <div class="stat" role="listitem"><div class="v">${ENS.pts(g) ? `${ENS.left(g)}<small>/${ENS.pts(g)}</small>` : "—"}</div>${statLabel("Points de sorcellerie", "Points")}</div>`; },
  tabs: g => [["grimoire", "Sorts"], ["biblio", "Bibliothèque", classSpells(g).length]],
  moreTabs: () => [["regles", "Règles"], ["imprimer", "Imprimer"]],
  panels: { imprimer: g => printHTML(g), regles: g => rulesHTML(g) },
  print: g => printSheet(g),
  printTitle: g => `Fiche d'ensorceleur de ${g.name}`,
  printDesc: "Elle contient le tableau de bord (emplacements, points de sorcellerie à cocher, métamagie), les capacités de l'origine, les sorts mineurs et les sorts connus.",
  features: g => feats(g),
  settings: g => settingsHTML(g),
  resources: g => resHTML(g),
  resourceMax: { tide: () => 1 },
  playTop: g => wildHTML(g),
  extraSlots: g => g.made || {},
  castExtras: (g, s) => castExtras(g, s),
  castSnap: ["spU", "made", "tideU"],
  onCast: (g, s, lv) => onCast(g, s, lv),
  // Affinité élémentaire (draconique, niveau 6) : + CHA aux dégâts du type de l'ancêtre
  dmgBonus: (g, s) => g.sorig === "draco" && g.level >= 6 && (s.p || "").startsWith("d:") && s.p.includes(anc(g)[1]) ? R.am(g) : 0,
  hpLv: g => g.sorig === "draco" ? 1 : 0,
  acBase: g => g.sorig === "draco" ? [["Résilience draconique : 13 + DEX", 13 + R.ab(g, "dex")]] : [],
  longOnly: g => [g.spU ? "points de sorcellerie" : "", g.tideU ? "Marée du chaos" : ""],
  longRest: g => { g.spU = 0; g.made = {}; g.tideU = 0; S.wild = null; },
  creation,
  levelUp: {
    rowsAfter: (g, b) => row("Sorts mineurs connus", R.cantrips(g), R.cantrips(b), "--rubric") + (ENS.pts(b) ? row("Points de sorcellerie", ENS.pts(g), ENS.pts(b), "--ok") : "") + (ENS.meta(b.level) ? row("Métamagie", ENS.meta(g.level), ENS.meta(b.level), "--ok") : ""),
    choices: (g, b, L) => { const n = ENS.meta(b.level); if (n <= (g.meta || []).length) return ""; const sel = L.mm || g.meta || [];
      return `<div class="luprep"><h3>Métamagie · ${sel.length}/${n}</h3><div class="luplist">${Object.entries(MM).map(([k, m]) => { const on = sel.includes(k), old = (g.meta || []).includes(k);
        return pickRow({ act: 'data-a="lu-mm"', id: k, on, full: sel.length >= n, off: old, why: "déjà connue", name: esc(m.n), label: m.n, pills: `<span class="kp f">${k === "jumeau" ? "points = niveau du sort" : `${m.cost(1)} point${m.cost(1) > 1 ? "s" : ""}`}</span>`, body: `<div class="eff">${esc(m.d)}</div>` }); }).join("")}</div></div>`; },
    recapBefore: (g, b, L) => L.mm && L.mm.length > (g.meta || []).length ? `<div><span class="n">Métamagie</span><small>+ ${L.mm.filter(k => !(g.meta || []).includes(k)).map(k => esc(MM[k].n)).join(", ")}</small></div>` : "",
    notes: (g, to) => [to === 2 ? `<span><b>Source de magie</b> : 2 points de sorcellerie, dans les ressources (En jeu).</span>` : ""].filter(Boolean),
    apply: (g, L) => { if (L.mm) g.meta = [...L.mm]; },
  },
};
onClick("lu-mm", (b) => { const L = S.lu, g = G(); if (!L || !g) return; const s = L.mm || [...(g.meta || [])], k = b.dataset.id;
  if ((g.meta || []).includes(k)) return; // déjà connue
  if (!s.includes(k) && s.length >= ENS.meta(L.to)) { toast(`${ENS.meta(L.to)} options de métamagie à ce niveau : retire d'abord une option`); return; }
  L.mm = s.includes(k) ? s.filter(x => x !== k) : [...s, k]; S.luKeep = true; render(); });
export { MM, ANC, ENS };
