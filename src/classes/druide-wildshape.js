// Druide du Cercle de la Lune : Forme sauvage (formes possibles, forme active, Changeforme de combat) et Bestiaire.
import { DRU } from "./druide.js";
import { onChange, onClick, onInput } from "../core/actions.js";
import { cap, esc, plural, signed } from "../core/format.js";
import { G, S } from "../core/state.js";
import { mutate } from "../core/store.js";
import { render, toast } from "../core/ui.js";
import { BEAST, BEASTS } from "../data.js";
import { concDD, concOf, slotsLeft } from "../features/cast.js";
import { R } from "../rules/common.js";
import { isFold } from "../ui/components.js";

const SIZES = { TP: "Très petite", P: "Petite", M: "Moyenne", G: "Grande", TG: "Très grande", Gig: "Gigantesque" };
const MV = { nage: "nage", escalade: "escalade", vol: "vol", creusement: "creusement" };
// Niveau de druide (Cercle de la Lune) qui ouvre une bête : Forme sauvage au niveau 2, FP 1 jusqu'au niveau 5 puis niveau ÷ 3, nage au niveau 4, vol au niveau 8
function wsNeed(b) {
  const c = [[2, "Forme sauvage"], [b.fpn > 1 ? 3 * b.fpn : 2, "FP " + b.fp], [b.v.nage ? 4 : 2, "Nage"], [b.v.vol ? 8 : 2, "Vol"]];
  return c.reduce((m, x) => x[0] > m[0] ? x : m);
}
const wsAllowed = (g, b) => g.level >= wsNeed(b)[0];
const spdTxt = b => [b.v.marche && b.v.marche !== "0" ? `${b.v.marche} m` : "", ...Object.keys(MV).filter(k => b.v[k]).map(k => `${k} ${b.v[k]} m`)].filter(Boolean).join(" · ");
const modOf = n => signed(Math.floor((n - 10) / 2));
const rchg = r => r ? `<span class="kp f rchg">${/repos/.test(r) ? "1 fois par repos" : esc(r.replace(/^Recharge/, "recharge"))}</span>` : "";
function beastActs(b, compact) {
  return b.ac.map(a => {
    if (a.b != null && a.d) {
      const reach = (a.t.match(/(?:allonge|portée) [\d,\/ ]+m(?:, [^.]+)?/) || [""])[0];
      let after = a.t.replace(/^.*?Touché ?: ?\d+(?: \([^)]*\))? dégâts? \S+/, "").replace(/^[,.]?\s*(?:et\s+)?/, "");
      if (after === a.t) after = "";
      const rest = [reach && cap(reach) + ".", after && cap(after)].filter(Boolean).join(" ");
      return `<div class="bact"><b>${esc(a.n)}</b>${rchg(a.r)}<span class="kp a">${signed(a.b)}</span><span class="kp d">${esc(a.d)}</span>${!compact && rest ? `<span class="brest">${esc(rest)}</span>` : ""}</div>`;
    }
    return `<div class="bact txt"><b>${esc(a.n)}</b>${rchg(a.r)} <span>${esc(compact && a.t.length > 90 ? a.t.slice(0, a.t.indexOf(".", 40) + 1 || 90) : a.t)}</span></div>`;
  }).join("");
}
function beastCard(g, b) {
  return `<div class="bcard"><span class="muted bsz">Bête de taille ${esc(SIZES[b.sz] || b.sz)}</span>
  <div class="kps"><span class="kp">CA ${b.ca}</span><span class="kp">PV ${b.pv} (${esc(b.pvd)})</span><span class="kp">${esc(spdTxt(b))}</span></div>
  <div class="bstats">${["FOR", "DEX", "CON"].map((l, i) => `<div><span>${l}</span><b>${b.st[i]} (${modOf(b.st[i])})</b></div>`).join("")}</div>
  <div class="bskill"><b>Compétences</b> ${b.cp ? b.cp.split(", ").map(x => `<span class="kp">${esc(x)}</span>`).join("") : `<span class="muted">aucune</span>`}</div>
  <span class="muted" style="font-size:12.5px">INT, SAG et CHA : les tiens. Tu gardes tes maîtrises de compétences et de sauvegardes ; si la bête a la même maîtrise avec un meilleur bonus, prends le sien. ${b.sens ? `Sens : ${esc(b.sens)}.` : ""}</span>
  ${b.tr.map(([n, d, r]) => `<div class="btr"><b>${esc(n)}.</b>${rchg(r)} ${esc(d)}</div>`).join("")}
  ${b.ac.length ? `<span class="lusub">Actions</span>${beastActs(b)}` : `<span class="muted">Aucune attaque.</span>`}</div>`;
}
function wsSheetHTML(g) {
  const F = S.ws, fpMax = DRU.fp(g), left = Math.max(0, DRU.ws(g) - (g.wsU || 0));
  const all = BEASTS.filter(b => wsAllowed(g, b));
  const q = (F.q || "").trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  const fps = [...new Set(all.map(b => b.fpn))].sort((a, b) => b - a), fpLbl = n => n === 0.125 ? "1/8" : n === 0.25 ? "1/4" : n === 0.5 ? "1/2" : String(n);
  const pass = b => (F.fp === "all" || (F.fp === "low" ? b.fpn <= 0.125 : b.fpn === +F.fp)) && (!F.mv || b.v[F.mv]) && (!q || b.n.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").includes(q));
  const list = all.filter(pass), favs = list.filter(b => g.favs.includes(b.id));
  const lim = g.level < 4 ? "ni nage ni vol" : g.level < 8 ? "nage autorisée, pas de vol" : "nage et vol autorisés";
  const row = b => {
    const key = "ws:" + b.id, open = S.open.has(key), fav = g.favs.includes(b.id);
    return `<div class="jrow wsrow"><div class="jline"><button class="wsfav${fav ? " on" : ""}" data-a="ws-fav" data-id="${b.id}" aria-pressed="${fav}" aria-label="${fav ? "Retirer des" : "Ajouter aux"} formes favorites">${fav ? "★" : "☆"}</button><div class="jmain"><button class="jname" data-a="row" data-id="${key}" aria-expanded="${open}">${esc(b.n)}<span class="chev">${open ? "▴" : "▾"}</span></button><span class="flv">FP ${esc(b.fp)}</span><span class="wsmini">PV ${b.pv}</span><span class="wsmini">CA ${b.ca}</span>${Object.keys(MV).filter(k => b.v[k]).map(k => `<span class="wsmini">${k} ${b.v[k]} m</span>`).join("")}</div></div>
    ${open ? `${beastCard(g, b)}<div class="cast"><button class="btn cast-go wsgo" data-a="ws-go" data-id="${b.id}"${left ? "" : " disabled"}>${left ? `Se transformer · 1 utilisation (reste ${left})` : "Plus d'utilisation : repos court"}</button></div>` : ""}</div>`;
  };
  let body = "";
  if (favs.length) body += `<div class="rubric oathr"><h3>★ Mes formes</h3></div>` + favs.map(row).join("");
  fps.forEach(n => { const grp = list.filter(b => b.fpn === n && !g.favs.includes(b.id)); if (grp.length) body += `<div class="rubric"><h3>FP ${fpLbl(n)}</h3><span class="aside">${plural(grp.length, "bête")}</span></div>` + grp.map(row).join(""); });
  if (!list.length) body += `<div class="empty">Aucune bête ne correspond à ces filtres.</div>`;
  return `<div class="lubox"><div class="luhead"><div class="t"><h2>Formes possibles</h2><button class="x" data-a="ws-close" aria-label="Fermer">✕</button></div>
    <span class="muted" style="font-size:13.5px">Niveau ${g.level} · FP ${fpLbl(fpMax)} maximum · ${lim} · ${plural(all.length, "bête")}</span>
    <div class="chips"><button class="chip" data-a="ws-fp" data-v="all" aria-pressed="${F.fp === "all"}">Toutes</button>${fps.filter(n => n > 0.125).map(n => `<button class="chip" data-a="ws-fp" data-v="${n}" aria-pressed="${F.fp === String(n)}">FP ${fpLbl(n)}</button>`).join("")}<button class="chip" data-a="ws-fp" data-v="low" aria-pressed="${F.fp === "low"}">FP ≤ 1/8</button></div>
    <div class="chips">${["nage", "escalade", "creusement", "vol"].filter(k => all.some(b => b.v[k])).map(k => `<button class="chip" data-a="ws-mv" data-v="${k}" aria-pressed="${F.mv === k}">${cap(k)}</button>`).join("")}<input id="ws-q" type="search" placeholder="Rechercher" value="${esc(F.q || "")}" aria-label="Rechercher une bête"></div></div>
    <div class="lubody wsbody">${body}<p class="muted" style="font-size:12.5px">Il faut avoir déjà vu la bête : c'est au MJ d'en juger. ★ garde tes formes en tête de liste.</p></div></div>`;
}
const fpLabel = n => n === 0.125 ? "1/8" : n === 0.25 ? "1/4" : n === 0.5 ? "1/2" : String(n);
const SZ_ORDER = ["TP", "P", "M", "G", "TG", "Gig"];
function bestiaryHTML(g) {
  const f = S.bf, nrm = s => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  const q = nrm(f.q.trim());
  const fps = [...new Set(BEASTS.map(b => b.fpn))].sort((a, b) => a - b), sizes = SZ_ORDER.filter(s => BEASTS.some(b => b.sz === s));
  const list = BEASTS.filter(b => (f.fp === "all" || b.fpn === +f.fp) && (!f.mv || b.v[f.mv]) && (!f.sz || b.sz === f.sz) && (!f.reach || wsAllowed(g, b)) && (!f.fav || g.favs.includes(b.id))
    && (!q || nrm([b.n, ...b.tr.map(x => x[0]), ...b.ac.map(a => a.n)].join(" ")).includes(q))).sort((a, b) => a.fpn - b.fpn || a.n.localeCompare(b.n, "fr"));
  const fpOpen = n => n > 1 ? 3 * n : 2;
  let h = `<div class="filters">
    <div class="chips" role="group" aria-label="Facteur de puissance"><button class="chip" data-a="bst-f" data-k="fp" data-v="all" aria-pressed="${f.fp === "all"}">Tous</button>${fps.map(n => `<button class="chip${g.level < fpOpen(n) ? " dim" : ""}" data-a="bst-f" data-k="fp" data-v="${n}" aria-pressed="${f.fp === String(n)}">FP ${fpLabel(n)}</button>`).join("")}</div>
    <div class="chips" role="group" aria-label="Déplacement">${["nage", "vol", "escalade", "creusement"].map(k => `<button class="chip" data-a="bst-f" data-k="mv" data-v="${k}" aria-pressed="${f.mv === k}">${cap(k)}</button>`).join("")}</div>
    <div class="chips" role="group" aria-label="Taille">${sizes.map(s => `<button class="chip" data-a="bst-f" data-k="sz" data-v="${s}" aria-pressed="${f.sz === s}">${SIZES[s]}</button>`).join("")}</div>
    <div class="frow"><div class="field"><label for="b-q">Recherche</label><input id="b-q" type="search" value="${esc(f.q)}" placeholder="Nom ou capacité (ex. « encre »)"></div></div>
    <div class="frow">
      <label class="check"><input type="checkbox" data-a="btog" data-v="reach"${f.reach ? " checked" : ""}> Accessibles à son niveau</label>
      <label class="check"><input type="checkbox" data-a="btog" data-v="fav"${f.fav ? " checked" : ""}> ★ Mes formes</label>
    </div></div>
    <p class="found">${plural(list.length, "bête")} · ${plural(BEASTS.filter(b => wsAllowed(g, b)).length, "forme accessible", "formes accessibles")} au niveau ${g.level}${q ? "" : " · touche une bête pour voir sa fiche, ou fais une recherche pour tout afficher"}</p>`;
  let cur = -1;
  list.forEach(b => {
    if (f.fp === "all" && b.fpn !== cur) { cur = b.fpn; const lk = g.level < fpOpen(b.fpn); h += `<div class="rubric${lk ? " locked" : ""}"><h3>FP ${fpLabel(b.fpn)}</h3><span class="aside">${!lk ? "accessible" : fpOpen(b.fpn) > 20 ? "au-delà du niveau 20 de druide" : `s'ouvre au niveau ${fpOpen(b.fpn)} de druide`}</span></div>`; }
    h += bstRow(g, b, !!q);
  });
  if (!list.length) h += `<div class="empty">Aucune bête ne correspond à ces filtres.</div>`;
  return h;
}
function bstRow(g, b, full) {
  const key = "bst:" + b.id, open = full || S.open.has(key), fav = g.favs.includes(b.id), ok = wsAllowed(g, b), need = wsNeed(b);
  const star = (!ok && !fav) ? `<span class="wsfav off" aria-hidden="true">☆</span>` : `<button class="wsfav${fav ? " on" : ""}" data-a="ws-fav" data-id="${b.id}" aria-pressed="${fav}" aria-label="${fav ? "Retirer des" : "Ajouter aux"} formes favorites">${fav ? "★" : "☆"}</button>`;
  const mark = ok ? "" : `<span class="libmark">${need[0] > 20 ? "Hors de portée" : `${need[1]} : niveau ${need[0]}`}</span>`;
  return `<div class="jrow wsrow${ok ? "" : " locked"}"><div class="jline">${star}<div class="jmain">${full ? `<span class="jname">${esc(b.n)}</span>` : `<button class="jname" data-a="row" data-id="${key}" aria-expanded="${open}">${esc(b.n)}<span class="chev">${open ? "▴" : "▾"}</span></button>`}<span class="flv">FP ${esc(b.fp)}</span><span class="wsmini">PV ${b.pv}</span><span class="wsmini">CA ${b.ca}</span>${Object.keys(MV).filter(k => b.v[k]).map(k => `<span class="wsmini">${k} ${b.v[k]} m</span>`).join("")}</div>${mark}</div>
  ${open ? beastCard(g, b) : ""}</div>`;
}
// Rappel du jet de concentration après des dégâts en forme de bête (la concentration continue en Forme sauvage)
function wsConcHTML(g) {
  const w = S.wsConc, cur = concOf(g); if (!w || !cur) { S.wsConc = null; return ""; }
  const con = w.con != null ? `avec la CON de la bête (${signed(w.con)})` : "avec ta propre CON (tu as repris ta forme)";
  return `<div class="concwarn wsconc" role="alert"><div><b>◉ ${esc(cur.name)}</b> : jet de sauvegarde de Constitution, <b>DD ${w.dd}</b> (${plural(w.n, "dégât")}), ${con}.</div>
  <div class="cast"><button class="btn" data-a="wsconc-ok">Réussi</button><button class="btn" data-a="conc-end" style="border-color:var(--rubric);color:var(--pa-fg)">Raté : concentration perdue</button></div></div>`;
}
function wsActiveHTML(g) {
  const f = g.wsForm, b = f && BEAST[f.id]; if (!b) return "";
  const pct = Math.round(100 * Math.max(0, f.hp) / f.max);
  const slots = R.slots(g).map((n, i) => [i + 1, slotsLeft(g, i + 1)]).filter(([, l]) => l > 0);
  const shut = isFold("ws");
  return `<section class="wsactive${shut ? " shut" : ""}" id="ws-active"><button class="wsh" data-a="fold" data-k="ws" aria-expanded="${!shut}"><span class="k"><span class="chev" aria-hidden="true">${shut ? "▸" : "▾"}</span> Forme active</span><span class="muted">${shut ? "déplier la fiche" : `jusqu'à ${DRU.hours(g)} h · replier`}</span></button>
  <div class="wsn"><b>${esc(b.n)}${shut ? `<small> · CA ${b.ca}</small>` : ""}</b><span class="hp">${f.hp}<small>/${f.max} PV</small></span></div>
  <div class="bar"><span style="width:${pct}%"></span></div>
  <div class="wsdmg"><label for="ws-n">PV</label><input id="ws-n" type="number" inputmode="numeric" min="0" placeholder="${S.wsDice ? S.wsDice : "0"}"><button class="btn cast-go sm" data-a="ws-dmg">Dégâts</button><button class="btn sm" data-a="ws-heal">Soins</button></div>
  ${S.wsDice ? `<div class="muted" style="font-size:13px">Lance <b>${S.wsDice}</b>, tape le résultat puis « Soins ».</div>` : ""}${wsConcHTML(g)}
  ${shut ? "" : `${g.level >= 6 ? `<div class="wsprimal"><span class="kp f">Frappe primitive</span> Tes attaques de bête comptent comme magiques (résistances et immunités aux attaques non magiques).</div>` : ""}${beastCard(g, b)}
  <div class="wscf"><span class="lusub">Changeforme de combat · action bonus</span>
    ${slots.length ? `<div class="cast"><button class="btn cast-go" data-a="ws-cf" data-l="${slots[0][0]}">Soin · niv. ${slots[0][0]} = ${slots[0][0]}d8 PV</button>${R.slots(g).length > 1 ? `<button class="btn cast-up" data-a="cast-open" data-id="ws-cf" aria-label="Se soigner avec un emplacement plus élevé" aria-expanded="${S.castOpen === "ws-cf"}">▲</button>` : ""}</div>
    ${S.castOpen === "ws-cf" ? `<div class="chooser"><span class="lbl">Dépenser un emplacement de</span><div class="lvls">${R.slots(g).map((n, i) => { const lv = i + 1, left = slotsLeft(g, lv);
      return `<button class="btn" data-a="ws-cf" data-l="${lv}"${left ? "" : " disabled"}><b>Niveau ${lv} · ${lv}d8</b><small>${left ? `${left} restant${left > 1 ? "s" : ""}` : "épuisé"}</small></button>`; }).join("")}</div><div class="hint">1d8 PV par niveau d'emplacement.</div><button class="btn ghost" data-a="cast-close" style="justify-self:start">Fermer</button></div>` : ""}`
    : `<span class="muted" style="font-size:13px">Plus d'emplacement pour te soigner.</span>`}</div>
  <div class="cast"><button class="btn sm" data-a="ws-end">Reprendre ma forme</button><button class="btn ghost sm" data-a="ws-open">Changer de forme</button></div>
  <p class="muted" style="font-size:12.5px;margin:0">À 0 PV, tu reprends ta forme et l'excédent de dégâts passe sur tes PV. ${g.level >= 18 ? "Sorts bestiaux : tu peux lancer tes sorts à composantes verbales et somatiques (pas de composante matérielle)" : "Pas de sort dans cette forme"} ; la concentration continue.</p>`}</section>`;
}
const newForms = (g, b) => BEASTS.filter(x => wsAllowed(b, x) && !wsAllowed(g, x));
onClick("bst-f", (b) => { const k = b.dataset.k, v = b.dataset.v; S.bf[k] = S.bf[k] === v && k !== "fp" ? "" : v; render(); });
onClick("wsconc-ok", () => { const w = S.wsConc; S.wsConc = null; render(); if (w) toast(`Concentration maintenue : <b>${esc((concOf(G()) || {}).name || "")}</b>`); });
onClick("ws-open", () => { S.ws = { fp: "all", mv: "", q: "" }; render(); const x = document.querySelector("#wssheet .x"); if (x) x.focus({ preventScroll: true }); });
onClick("ws-close", () => { S.ws = null; render(); });
onClick(["ws-fp", "ws-mv"], (b, a) => { if (!S.ws) return; const k = a === "ws-fp" ? "fp" : "mv", v = b.dataset.v; S.ws[k] = S.ws[k] === v ? (k === "fp" ? "all" : "") : v; S.wsTop = true; render(); });
onClick("ws-fav", (b) => { const id = b.dataset.id, g0 = G(); if (!g0 || !BEAST[id] || (!wsAllowed(g0, BEAST[id]) && !g0.favs.includes(id))) return; mutate(g => { g.favs = g.favs.includes(id) ? g.favs.filter(x => x !== id) : [...g.favs, id]; }); });
onClick("ws-go", (b) => {
  const g = G(), bt = BEAST[b.dataset.id]; if (!g || !bt || g.wsU >= DRU.ws(g)) return;
  const prev = { wsU: g.wsU, wsForm: g.wsForm }; S.ws = null; S.wsDice = ""; S.wsConc = null;
  mutate(g => { g.wsU += 1; g.wsForm = { id: bt.id, hp: bt.pv, max: bt.pv }; });
  window.scrollTo({ top: 0, behavior: "smooth" });
  toast(`<b>Forme sauvage</b> : ${esc(bt.n)} · ${bt.pv} PV · reste ${Math.max(0, DRU.ws(g) - prev.wsU - 1)}`, () => { mutate(g => { g.wsU = prev.wsU; g.wsForm = prev.wsForm; }); return "Transformation annulée"; });
});
onClick(["ws-dmg", "ws-heal"], (b, a) => {
  const g = G(), el = document.getElementById("ws-n"), n = Math.floor(+(el && el.value) || 0); if (!g || !g.wsForm || n < 1) { if (el) el.focus(); return; }
  const prev = { ...g.wsForm }, bt = BEAST[prev.id]; S.wsDice = "";
  const cc = a === "ws-dmg" && concOf(g); S.wsConc = cc ? { dd: concDD(n), n, beast: bt.n, con: n < prev.hp ? Math.floor((bt.st[2] - 10) / 2) : null } : S.wsConc;
  if (a === "ws-heal") { const hp = Math.min(prev.max, prev.hp + n); mutate(g => { g.wsForm.hp = hp; }); toast(`${esc(bt.n)} : +${hp - prev.hp} PV (${hp}/${prev.max})`, () => { mutate(g => { g.wsForm = prev; }); return "Soin annulé"; }); }
  else if (n < prev.hp) { mutate(g => { g.wsForm.hp = prev.hp - n; }); toast(`${esc(bt.n)} : −${n} PV (${prev.hp - n}/${prev.max})${cc ? ` · concentration : DD ${concDD(n)}` : ""}`, () => { S.wsConc = null; mutate(g => { g.wsForm = prev; }); return "Dégâts annulés"; }); }
  else { const over = n - prev.hp; mutate(g => { g.wsForm = null; }); toast(`${esc(bt.n)} à 0 PV : tu reprends ta forme${over ? `. <b>${over} dégât${over > 1 ? "s" : ""}</b> à retirer de tes PV` : ", sans dégât en plus"}`, () => { S.wsConc = null; mutate(g => { g.wsForm = prev; }); return "Forme rétablie"; }); }
});
onClick("ws-cf", (b) => {
  const g = G(), lv = +b.dataset.l; if (!g || !g.wsForm || slotsLeft(g, lv) < 1) return;
  S.castOpen = null; mutate(g => { g.used[lv] = (+(g.used[lv] || 0)) + 1; }); S.wsDice = `${lv}d8`; render();
  const el = document.getElementById("ws-n"); if (el) el.focus({ preventScroll: true });
  toast(`Changeforme de combat : emplacement niv. ${lv} dépensé · lance <b>${lv}d8</b>`, () => { S.wsDice = ""; mutate(g => { g.used[lv] = Math.max(0, (+(g.used[lv] || 0)) - 1); }); return "Emplacement rendu"; });
});
onClick("ws-end", () => { const g = G(); if (!g || !g.wsForm) return; const prev = g.wsForm; S.wsDice = ""; S.wsConc = null; mutate(g => { g.wsForm = null; }); toast(`Tu reprends ta forme de druide`, () => { mutate(g => { g.wsForm = prev; }); return "Forme rétablie"; }); });
onClick("ws-top", () => { const el = document.getElementById("ws-active"); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); else { S.tab = "grimoire"; render(); } });
onClick("lu-wsfav", (b) => { if (!S.lu) return; const id = b.dataset.id, f = S.lu.wsfav || (S.lu.wsfav = []); S.lu.wsfav = f.includes(id) ? f.filter(x => x !== id) : [...f, id]; S.luKeep = true; render(); });
onChange("btog", t => { S.bf[t.dataset.v] = t.checked; render(); });
onInput("#ws-q", t => { if (!S.ws) return; S.ws.q = t.value; const box = document.getElementById("wssheet"); box.innerHTML = wsSheetHTML(G()); const q = document.getElementById("ws-q"); q.focus(); q.setSelectionRange(t.value.length, t.value.length); });
onInput("#b-q", t => { S.bf.q = t.value; const p = document.getElementById("panel"); if (p) { p.innerHTML = bestiaryHTML(G()); const q = document.getElementById("b-q"); q.focus(); q.setSelectionRange(t.value.length, t.value.length); }; });

export { SIZES, MV, wsNeed, wsAllowed, spdTxt, modOf, rchg, beastActs, beastCard, wsSheetHTML, fpLabel, SZ_ORDER, bestiaryHTML, bstRow, wsConcHTML, wsActiveHTML, newForms };
