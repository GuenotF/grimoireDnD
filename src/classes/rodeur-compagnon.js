// Rôdeur, Maître des bêtes : compagnon animal (choix dans le Bestiaire, statistiques avec la maîtrise du rôdeur, points de vie).
// Règle 2014 : bête de taille Moyenne au plus et de FP 1/4 au plus, quel que soit le niveau ; elle ajoute la maîtrise du rôdeur
// à sa CA, à ses attaques et dégâts, à ses jets de sauvegarde et compétences maîtrisés ; PV max = les siens ou 4 × niveau.
import { onClick, onInput } from "../core/actions.js";
import { esc, signed } from "../core/format.js";
import { G, S } from "../core/state.js";
import { mutate } from "../core/store.js";
import { render, toast } from "../core/ui.js";
import { BEAST, BEASTS } from "../data.js";
import { R } from "../rules/common.js";
import { foldHead, isFold } from "../ui/components.js";
import { SIZES, actRest, modOf, rchg, spdTxt } from "./druide-wildshape.js";

const PET_OK = b => b.fpn <= 0.25 && ["TP", "P", "M"].includes(b.sz);
const petBeasts = () => BEASTS.filter(PET_OK).sort((a, b) => a.n.localeCompare(b.n, "fr"));
const petMax = g => { const b = g.pet && BEAST[g.pet.id]; return b ? Math.max(b.pv, 4 * g.level) : 0; };
const petHp = g => g.pet ? (g.pet.hp == null ? petMax(g) : Math.min(g.pet.hp, petMax(g))) : 0;
const petName = g => g.pet ? (g.pet.name.trim() || BEAST[g.pet.id].n) : "";
/** Dégâts d'une attaque de bête avec la maîtrise : « 2d4 + 2 perforant » → « 2d4 + 5 perforant ». */
function dmgPlus(d, p) {
  const m = d.match(/^(\d+d\d+)(?: ?([+−-]) ?(\d+))?(.*)$/);
  if (m) { const n = (m[2] ? (m[2] === "+" ? 1 : -1) * +m[3] : 0) + p; return `${m[1]}${n ? ` ${n > 0 ? "+" : "−"} ${Math.abs(n)}` : ""}${m[4]}`; }
  const f = d.match(/^(\d+)(.*)$/); return f ? `${+f[1] + p}${f[2]}` : d;
}
/** Fiche du compagnon calculée pour ce rôdeur (b : la bête, lv : niveau du rôdeur). */
function petCard(g, b, lv = g.level) {
  const p = R.prof(lv), skills = b.cp ? b.cp.split(", ").map(x => x.replace(/([+−-])\s?(\d+)$/, (_, s, n) => signed((s === "+" ? 1 : -1) * +n + p))) : [];
  const acts = b.ac.map(a => a.b != null && a.d ? `<div class="bact"><b>${esc(a.n)}</b>${rchg(a.r)}<span class="kp a">${signed(a.b + p)}</span><span class="kp d">${esc(dmgPlus(a.d, p))}</span>${actRest(a) ? `<span class="brest">${esc(actRest(a))}</span>` : ""}</div>`
    : `<div class="bact txt"><b>${esc(a.n)}</b>${rchg(a.r)} <span>${esc(a.t)}</span></div>`).join("");
  return `<div class="bcard petstats"><span class="muted bsz">Bête de taille ${esc(SIZES[b.sz] || b.sz)} · FP ${esc(b.fp)}</span>
  <div class="kps"><span class="kp">CA ${b.ca + p}</span><span class="kp">PV max ${Math.max(b.pv, 4 * lv)}</span><span class="kp">${esc(spdTxt(b))}</span></div>
  <div class="bstats">${["FOR", "DEX", "CON"].map((l, i) => `<div><span>${l}</span><b>${b.st[i]} (${modOf(b.st[i])})</b></div>`).join("")}</div>
  <div class="bskill"><b>Compétences</b> ${skills.length ? skills.map(x => `<span class="kp">${esc(x)}</span>`).join("") : `<span class="muted">aucune</span>`}</div>
  ${b.sens ? `<span class="muted" style="font-size:12.5px">Sens : ${esc(b.sens)}.</span>` : ""}
  ${b.tr.map(([n, d, r]) => `<div class="btr"><b>${esc(n)}.</b>${rchg(r)} ${esc(d)}</div>`).join("")}
  ${b.ac.length ? `<span class="lusub">Actions</span>${acts}` : `<span class="muted">Aucune attaque.</span>`}
  <span class="petcalc">Calculé : maîtrise ${signed(p)} ajoutée à la CA, aux attaques et aux dégâts (et aux compétences maîtrisées) ; PV max = ${b.pv} ou 4 × ${lv}, le plus élevé.${lv >= 7 ? " Attaques magiques (Entraînement exceptionnel)." : ""}</span></div>`;
}
/** Ordres : rappel selon le niveau. */
const orders = g => `Agit à ton initiative ; tu le déplaces librement. <b>Ton action</b> : Attaquer${g.level >= 11 ? " (deux attaques, Fureur bestiale)" : ""}, Foncer, Se désengager, Esquiver ou Aider. Sans ordre, il Esquive.${g.level >= 7 ? " <b>Action bonus</b> (s'il n'a pas attaqué) : Foncer, Se désengager, Esquiver ou Aider." : ""}${g.level >= 15 ? " Tes sorts personnels peuvent aussi le cibler à 9 m (Partage des sorts)." : ""}`;

// ---------- En jeu (onglet Sorts, sous les attaques)
function petPlayHTML(g) {
  const b = g.pet && BEAST[g.pet.id];
  if (!b) return foldHead("pet", "", "Compagnon", "Maître des bêtes", "") + (isFold("pet") ? "" : `<div class="empty">Pas encore de compagnon : choisis-le en mode <button class="linkbtn" data-a="view" data-v="gerer">Gérer</button> (réglages du rôdeur).</div>`);
  const hp = petHp(g), max = petMax(g), pct = Math.round(100 * hp / max), down = hp <= 0;
  let h = foldHead("pet", "", "Compagnon", `${esc(b.n)} · FP ${esc(b.fp)}`, `${esc(petName(g))} · ${hp}/${max} PV`);
  if (isFold("pet")) return h;
  h += `<section class="hpcard petcard${down ? " down" : ""}" id="pet-card"><div class="hph"><span class="k">${esc(petName(g))}${g.pet.name.trim() ? ` · ${esc(b.n)}` : ""}${down ? " · à 0 PV" : ""}</span><span class="v">${hp}<small>/${max}</small></span></div>
  ${down ? "" : `<div class="hpbar" aria-hidden="true"><i style="width:${pct}%"></i></div>`}
  <div class="hpin"><input id="pet-n" type="number" inputmode="numeric" min="0" placeholder="0" aria-label="Points de vie du compagnon"><button class="btn cast-go sm" data-a="pet-dmg">Dégâts</button><button class="btn sm" data-a="pet-heal">Soins</button></div>
  ${down ? `<p class="hpnote">À 0 PV, une bête meurt (ou tombe inconsciente, selon le MJ). Un nouveau compagnon se lie après 8 heures (Gérer › Changer).</p>` : ""}
  <div class="petord">${orders(g)}</div></section>`;
  const open = S.open.has("pet:card");
  h += `<button class="linkbtn petmore" data-a="row" data-id="pet:card" aria-expanded="${open}">${open ? "Masquer la fiche ▴" : "Fiche du compagnon : attaques, compétences, traits ▾"}</button>`;
  return h + (open ? petCard(g, b) : petQuick(g, b));
}
/** Ligne courte des attaques (fiche repliée). */
const petQuick = (g, b) => { const p = R.prof(g.level), a = b.ac.filter(x => x.b != null && x.d);
  return `<div class="petquick"><span class="kp">CA ${b.ca + p}</span>${a.map(x => `<span class="pqa"><b>${esc(x.n)}</b> <span class="kp a">${signed(x.b + p)}</span> <span class="kp d">${esc(dmgPlus(x.d, p))}</span></span>`).join("")}</div>`; };
/** Puce de la barre du bas. */
const petChips = g => { const b = g.pet && BEAST[g.pet.id]; return b ? `<button class="chip ws" data-a="pet-top">🐾 ${esc(petName(g))} · ${petHp(g)}/${petMax(g)}</button>` : ""; };

// ---------- Gérer (réglages du rôdeur) : compagnon choisi, fiche dépliable, changement
function petGererHTML(g) {
  const b = g.pet && BEAST[g.pet.id], pick = !b || S.petPick;
  let h = `<div class="rgbox"><span class="lusub">Compagnon · bête de taille M au plus, FP 1/4 au plus</span>`;
  if (!pick) {
    const open = S.open.has("pet:g");
    h += `<div class="jrow petrow"><div class="jline"><div class="jmain"><button class="jname" data-a="row" data-id="pet:g" aria-expanded="${open}">${esc(petName(g))}<span class="chev">${open ? "▴" : "▾"}</span></button><span class="flv">${esc(b.n)} · FP ${esc(b.fp)}</span><span class="wsmini">CA ${b.ca + R.prof(g.level)}</span><span class="wsmini">${petMax(g)} PV</span></div><button class="btn sm" data-a="pet-change">Changer</button></div>
    ${open ? petCard(g, b) : ""}</div>
    <div class="field"><label for="pet-name">Nom du compagnon</label><input id="pet-name" type="text" value="${esc(g.pet.name)}" placeholder="${esc(b.n)}"></div>`;
    return h + `</div>`;
  }
  const nrm = s => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, ""), q = nrm((S.petQ || "").trim());
  const list = petBeasts().filter(x => !q || nrm(x.n).includes(q));
  h += `<input id="pet-q" type="search" value="${esc(S.petQ || "")}" placeholder="Chercher une bête (${petBeasts().length} possibles)" aria-label="Chercher une bête" autocomplete="off">
  <div class="petlist">${list.map(x => { const k = "petc:" + x.id, open = S.open.has(k);
    return `<div class="jrow petrow"><div class="jline"><div class="jmain"><button class="jname" data-a="row" data-id="${k}" aria-expanded="${open}">${esc(x.n)}<span class="chev">${open ? "▴" : "▾"}</span></button><span class="flv">FP ${esc(x.fp)}</span><span class="wsmini">CA ${x.ca + R.prof(g.level)}</span><span class="wsmini">${Math.max(x.pv, 4 * g.level)} PV</span></div><button class="btn sm cast-go" data-a="pet-pick" data-id="${x.id}">Choisir</button></div>${open ? petCard(g, x) : ""}</div>`; }).join("") || `<div class="empty">Aucune bête ne correspond.</div>`}</div>
  ${b ? `<button class="btn ghost sm" data-a="pet-cancel">Garder ${esc(petName(g))}</button>` : ""}
  <small class="muted">Si ton compagnon meurt : un autre après 8 heures de lien (tu peux aussi changer en cas d'erreur).</small>`;
  return h + `</div>`;
}

onClick("pet-pick", (b) => { const x = BEAST[b.dataset.id]; if (!x || !PET_OK(x)) return; const prev = G().pet; S.petPick = false; S.petQ = "";
  mutate(g => { g.pet = { id: x.id, name: prev && prev.id === x.id ? prev.name : "", hp: null }; });
  toast(`Compagnon : <b>${esc(x.n)}</b> · ${petMax(G())} PV`, () => { mutate(g => { g.pet = prev; }); return "Compagnon rétabli"; }); });
onClick("pet-change", () => { S.petPick = true; S.petQ = ""; render(); });
onClick("pet-cancel", () => { S.petPick = false; render(); });
onInput("#pet-q", t => { S.petQ = t.value; render(); });
onInput("#pet-name", t => { mutate(g => { if (g.pet) g.pet.name = t.value; }, false); });
onClick(["pet-dmg", "pet-heal"], (b, a) => {
  const g = G(), el = document.getElementById("pet-n"), n = Math.floor(+(el && el.value) || 0); if (!g || !g.pet || n < 1) { if (el) el.focus(); return; }
  const prev = { ...g.pet }, hp = petHp(g), max = petMax(g), nx = a === "pet-heal" ? Math.min(max, hp + n) : Math.max(0, hp - n);
  mutate(g => { g.pet.hp = nx >= max ? null : nx; });
  toast(`${esc(petName(g))} : ${a === "pet-heal" ? `+${nx - hp}` : `−${hp - nx}`} PV (${nx}/${max})${nx === 0 ? " · à 0 PV" : ""}`, () => { mutate(g => { g.pet = prev; }); return a === "pet-heal" ? "Soin annulé" : "Dégâts annulés"; });
});
onClick("pet-top", () => { const el = document.getElementById("pet-card"); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); else { S.tab = "grimoire"; S.view = "jeu"; render(); } });

export { PET_OK, petBeasts, petMax, petHp, petCard, petPlayHTML, petGererHTML, petChips, dmgPlus };
