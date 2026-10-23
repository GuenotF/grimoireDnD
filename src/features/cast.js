// Lancer un sort, emplacements restants (barre du bas), concentration, sorts en cours.
import { C } from "../classes/index.js";
import { onChange, onClick, onInput } from "../core/actions.js";
import { esc } from "../core/format.js";
import { fxKey } from "../core/schema.js";
import { G, S } from "../core/state.js";
import { mutate } from "../core/store.js";
import { render, toast } from "../core/ui.js";
import { BY_ID } from "../data.js";
import { R } from "../rules/common.js";

const NO_TRACK = ["Instantanée", "Jusqu'à dissipation", "Spéciale"]; // durées non suivies dans « En cours »
const slotsLeft = (g, lv) => Math.max(0, (R.slots(g)[lv - 1] || 0) - (+(g.used[lv] || 0)));
const firstFree = (g, s) => { for (let lv = s.l; lv <= R.maxLevel(g); lv++) if (slotsLeft(g, lv) > 0) return lv; return 0; };
function castHTML(g, s, prepared) {
  // Sort mineur : pas d'emplacement ; bouton seulement s'il demande la concentration (suivi dans la barre du bas)
  if (s.l === 0) return s.c ? `<div class="cast"><button class="btn cast-go" data-a="cast" data-id="${s.id}" data-l="0">Lancer · concentration</button></div>` : "";
  let h = "";
  if (prepared) {
    const lv = firstFree(g, s), higher = !!s.up && R.maxLevel(g) > s.l; // ▲ seulement si le sort gagne quelque chose à monter
    h += lv ? `<button class="btn cast-go" data-a="cast" data-id="${s.id}" data-l="${lv}">Lancer · niv. ${lv}</button>` : `<button class="btn cast-none" disabled>Plus d'emplacement</button>`;
    if (higher && lv) h += `<button class="btn cast-up" data-a="cast-open" data-id="${s.id}" aria-label="Lancer ${esc(s.n)} à un niveau supérieur" aria-expanded="${S.castOpen === s.id}">▲</button>`;
  }
  if (s.ri && C(g).canRitual && C(g).canRitual(prepared)) h += `<button class="btn cast-rit" data-a="cast-rit" data-id="${s.id}">Rituel · +10 min</button>`;
  if (!h) return "";
  h = `<div class="cast">${h}</div>`;
  if (prepared && S.castOpen === s.id) {
    const lvls = []; for (let lv = s.l; lv <= R.maxLevel(g); lv++) lvls.push(lv);
    h += `<div class="chooser"><span class="lbl">Lancer avec un emplacement de</span><div class="lvls">${lvls.map(lv => {
      const left = slotsLeft(g, lv);
      return `<button class="btn" data-a="cast" data-id="${s.id}" data-l="${lv}"${left ? "" : " disabled"}><b>Niveau ${lv}</b><small>${left ? `${left} restant${left > 1 ? "s" : ""}` : "épuisé"}</small></button>`;
    }).join("")}</div>${s.up ? `<div class="hint">Emplacement plus élevé : ${esc(s.up)}</div>` : ""}<button class="btn ghost" data-a="cast-close" style="justify-self:start">Fermer</button></div>`;
  }
  return h;
}
// pre : puces placées en tête (PV, fournis par app.js)
function slotbarHTML(g, pre = "") {
  const cur = concOf(g);
  const others = g.effects.filter(e => !e.c);
  const wf = pre + (C(g).slotbarChips ? C(g).slotbarChips(g) : ""); // ex. druide : forme active
  const fx = g.effects.length || wf ? `<div class="fx">${wf}${cur ? `<button class="chip conc" data-a="conc-panel" aria-expanded="${S.concPanel}">◉ ${esc(cur.name)} · conc.</button>` : ""}${others.map(e => `<button class="chip" data-a="fx-open">${esc(e.name)} · ${esc(e.d)}</button>`).join("")}${g.effects.length > 1 || (g.effects.length && !cur) ? `<button class="chip" data-a="fx-open" style="background:transparent;border-color:var(--rule);color:var(--muted)">Tout voir</button>` : ""}</div>` : "";
  if (!R.slots(g).length) return fx; // classe sans sorts (ou pas encore d'emplacement) : seulement les puces
  return `${fx}<button class="line" data-a="to-slots" aria-label="Aller aux emplacements de sorts"><span class="grp">${R.slots(g).map((n, i) => {
    const used = Math.min(n, +(g.used[i + 1] || 0));
    return `<span class="lv" aria-label="Niveau ${i + 1} : ${n - used} sur ${n}"><b>${i + 1}</b>${Array.from({ length: n }, (_, k) => `<span class="d${k < used ? " u" : ""}"></span>`).join("")}</span>`;
  }).join("")}</span>${S.view !== "jeu" && R.maxLevel(g) ? `<span class="prepc${g.prepared.length > R.prepMax(g) ? " over" : ""}">Préparés <b>${g.prepared.length}</b>/${R.prepMax(g)}</span>` : ""}<span class="go">Emplacements ⌃</span></button>`;
}
const concOf = g => (g.effects || []).find(e => e.c);
const concDD = dmg => Math.max(10, Math.floor((+dmg || 0) / 2));
function concPanelHTML(cur) {
  return `<div class="head"><b>Concentration : ${esc(cur.name)}</b><span class="muted" style="font-size:13px">jusqu'à ${esc(cur.d)}</span></div>
  <p>Tu subis des dégâts ? Jet de sauvegarde de <b>Constitution</b>, DD 10 ou la moitié des dégâts si c'est plus.</p>
  <div class="row"><label for="conc-dmg">Dégâts subis</label><input id="conc-dmg" type="number" inputmode="numeric" min="0" placeholder="0"><span class="kp s" id="conc-dd">JdS CON · DD 10</span></div>
  <div class="row"><button class="btn" data-a="conc-end" style="border-color:var(--rubric);color:var(--pa-fg)">Concentration perdue</button><button class="btn ghost" data-a="conc-close">Fermer</button></div>`;
}
function concWarnHTML(g, s) {
  const w = S.concWarn, cur = concOf(g);
  if (!w || w.id !== s.id || !cur) return "";
  return `<div class="concwarn" role="alert"><div><b>${esc(s.n)} demande ta concentration.</b> ${w.rit ? "Le lancer en rituel" : "Le lancer"} met fin à <b>${esc(cur.name)}</b>.</div>
  <div class="cast"><button class="btn cast-go" data-a="cast-force" data-id="${s.id}" data-l="${w.lv}" data-rit="${w.rit ? 1 : 0}">Lancer quand même</button><button class="btn" data-a="conc-cancel">Annuler</button></div></div>`;
}
function fxSheetHTML(g) {
  const list = [...g.effects].sort((a, b) => (b.c ? 1 : 0) - (a.c ? 1 : 0));
  return `<div class="grab"></div><div class="head"><h2>En cours</h2><button class="btn ghost" data-a="fx-all">Tout terminer</button></div>
  <p class="help">Ajoutés quand tu lances un sort qui dure. La durée est un rappel en temps de jeu, pas un minuteur. Le repos long vide la liste.</p>
  <div>${list.map(e => `<div class="fxitem"><span class="dot${e.c ? " c" : ""}"></span><div><div class="n">${esc(e.name)}</div><div class="sub">${e.c ? "<b>Concentration</b> · jusqu'à " : ""}${esc(e.d)}</div></div><button class="btn" data-a="fx-end" data-k="${e.k}">Terminer</button>
  <input type="text" id="fx-note-${e.k}" data-k="${e.k}" class="fxnote" value="${esc(e.note || "")}" placeholder="Note facultative (cible, détail…)" aria-label="Note pour ${esc(e.name)}"></div>`).join("")}</div>
  <button class="btn" data-a="fx-close" style="justify-self:end">Fermer</button>`;
}
const liveMark = (g, s) => { const c = concOf(g); return c && c.id === s.id ? `<span class="live">◉ en cours</span>` : ""; };
onClick(["cast", "cast-rit", "cast-force"], (b, a, e) => {
  const s = BY_ID[b.dataset.id], g = G(); if (!g || !s) return;
  const rit = a === "cast-rit" || b.dataset.rit === "1", lv = rit ? 0 : +b.dataset.l, free = rit || s.l === 0; // rituel et sort mineur : aucun emplacement
  if (!free && slotsLeft(g, lv) < 1) return;
  const cur = concOf(g);
  if (a !== "cast-force" && s.c && cur && cur.id !== s.id) { S.concWarn = { id: s.id, lv, rit }; S.castOpen = null; render(); return; }
  S.concWarn = null; S.castOpen = null;
  const prev = JSON.parse(JSON.stringify({ used: g.used, effects: g.effects }));
  mutate(g => {
    if (!free) g.used[lv] = (+(g.used[lv] || 0)) + 1;
    if (s.c) { g.effects = g.effects.filter(e => !e.c); g.effects.push({ k: fxKey(), id: s.id, name: s.n, d: s.d, c: true, note: "" }); }
    else if (!NO_TRACK.includes(s.d)) g.effects.push({ k: fxKey(), id: s.id, name: s.n, d: s.d, c: false, note: "" });
  });
  const ended = s.c && cur && cur.id !== s.id ? ` · fin de ${esc(cur.name)}` : "";
  toast((rit ? `<b>${esc(s.n)}</b> lancé en rituel : +10 min, aucun emplacement` : s.l === 0 ? `<b>${esc(s.n)}</b> lancé · sort mineur, concentration suivie` : `<b>${esc(s.n)}</b> lancé · emplacement de niveau ${lv}`) + ended,
    () => mutate(g => { g.used = prev.used; g.effects = prev.effects; }));
});
onClick("cast-open", (b) => { S.castOpen = S.castOpen === b.dataset.id ? null : b.dataset.id; render(); });
onClick("cast-close", () => { S.castOpen = null; render(); });
onClick("conc-cancel", () => { S.concWarn = null; render(); });
onClick("conc-panel", () => { S.concPanel = !S.concPanel; S.hpOpen = false; render(); if (S.concPanel) { const i = document.getElementById("conc-dmg"); if (i) i.focus(); } });
onClick("conc-close", () => { S.concPanel = false; render(); });
onClick("conc-end", (b, a, e) => {
  const g = G(), cur = g && concOf(g); if (!cur) return; S.concPanel = false; S.wsConc = null;
  const prev = JSON.parse(JSON.stringify(g.effects));
  mutate(g => { g.effects = g.effects.filter(e => !e.c); });
  toast(`Concentration perdue : <b>${esc(cur.name)}</b> prend fin`, () => mutate(g => { g.effects = prev; }));
});
onClick("fx-open", () => { S.fxOpen = true; S.concPanel = false; S.hpOpen = false; render(); });
onClick("fx-close", () => { S.fxOpen = false; render(); });
onClick(["fx-end", "fx-all"], (b, a, e) => {
  const g = G(); if (!g) return; const prev = JSON.parse(JSON.stringify(g.effects));
  const gone = a === "fx-all" ? null : g.effects.find(e => e.k === b.dataset.k);
  mutate(g => { g.effects = a === "fx-all" ? [] : g.effects.filter(e => e.k !== b.dataset.k); });
  toast(a === "fx-all" ? "Tous les sorts en cours sont terminés" : `<b>${esc(gone ? gone.name : "Sort")}</b> terminé`, () => mutate(g => { g.effects = prev; }));
});
onClick("to-slots", () => { const el = document.getElementById("slots-top"); if (el) el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); });
onChange(t => t.classList.contains("fxnote"), t => { mutate(g => { const e = g.effects.find(e => e.k === t.dataset.k); if (e) e.note = t.value.trim(); }, false); });
onInput("#conc-dmg", t => { const el = document.getElementById("conc-dd"); if (el) el.textContent = `JdS CON · DD ${concDD(t.value)}`; });

export { NO_TRACK, slotsLeft, firstFree, castHTML, slotbarHTML, concOf, concDD, concPanelHTML, concWarnHTML, fxSheetHTML, liveMark };
