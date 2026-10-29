// Suivi des points de vie : carte de l'onglet Personnage (En jeu), puce de la barre du haut, rappel de concentration.
// Les règles (dégâts, soins, jets contre la mort, dés de vie) sont dans rules/hp.js.
import { C } from "../classes/index.js";
import { onClick } from "../core/actions.js";
import { esc, plural, signed } from "../core/format.js";
import { G, S } from "../core/state.js";
import { mutate } from "../core/store.js";
import { render, toast } from "../core/ui.js";
import { BEAST } from "../data.js";
import { hitDieSize, saveBonus } from "../rules/character.js";
import { acCalc } from "../rules/equipment.js";
import { concAdv, hasFeat } from "../rules/feats.js";
import { damage, deathSave, hdLeft, heal, hpCur, isDead, isDown, setTemp } from "../rules/hp.js";
import { concDD, concOf } from "./cast.js";

const snap = g => JSON.parse(JSON.stringify({ hp: g.hp, hpTemp: g.hpTemp, death: g.death, hdU: g.hdU, effects: g.effects, ...("wardHp" in g ? { wardHp: g.wardHp } : {}) }));
const restore = prev => mutate(g => Object.assign(g, prev));

// Rappel du jet de concentration après des dégâts (hors Forme sauvage, qui a le sien)
function hpConcHTML(g) {
  const w = S.hpConc, cur = concOf(g); if (!w || !cur) { S.hpConc = null; return ""; }
  return `<div class="concwarn" role="alert"><div><b>◉ ${esc(cur.name)}</b> : jet de sauvegarde de Constitution, <b>DD ${w.dd}</b> (${plural(w.n, "dégât")}), ton bonus <b>${signed(saveBonus(g, "con"))}</b>${concAdv(g) ? ` · <b class="adv">avantage (Mage de guerre)</b>` : ""}.</div>
  <div class="cast"><button class="btn" data-a="hpconc-ok">Réussi</button><button class="btn" data-a="conc-end" style="border-color:var(--rubric);color:var(--pa-fg)">Raté : concentration perdue</button></div></div>`;
}
const dots = (n, cls) => Array.from({ length: 3 }, (_, i) => `<span class="dsd ${cls}${i < n ? " on" : ""}"></span>`).join("");

const EXH = ["désavantage aux tests", "vitesse ÷ 2", "désavantage attaques et JdS", "PV max ÷ 2", "vitesse 0", "mort"];
/** Résistance applicable : capacité de la classe (Rage) ou résistances saisies dans les défenses. */
const halfLabel = g => (C(g).halfDamage && C(g).halfDamage(g)) || (g.defs.some(d => d.t === "res") ? `résistance (${g.defs.filter(d => d.t === "res").map(d => d.v).join(", ")})` : "");
/** Maître des armures lourdes, en armure lourde : −3 aux dégâts physiques non magiques. */
const ham = g => hasFeat(g, "heavy-armor-master") && (acCalc(g).armor || {}).cat === "heavy";
function hpCardHTML(g, panel = false) { // panel : volet ouvert depuis la barre du haut (sans dés de vie ni épuisement)
  if (g.hpMax == null) return `<section class="hpcard"><div class="hph"><span class="k">Points de vie</span></div><p class="muted" style="margin:0">Saisis tes PV maximum (mode <button class="linkbtn" data-a="view" data-v="gerer">Gérer</button>) pour suivre tes points de vie.</p></section>`;
  const cur = hpCur(g), t = g.hpTemp || 0, d = g.death, down = isDown(g), dead = isDead(g);
  const pct = Math.round(100 * cur / g.hpMax), tpct = Math.min(100 - pct, Math.round(100 * t / g.hpMax));
  const state = dead ? "Mort" : down ? (d.stable ? "À terre · stabilisé" : "À terre · inconscient") : "Points de vie";
  const half = halfLabel(g); // résistance active (Rage…) ou défenses de la fiche : dégâts divisés par 2
  const input = `<div class="hpin"><input id="hp-n" type="number" inputmode="numeric" min="0" placeholder="0" aria-label="Nombre de points de vie"><button class="btn cast-go sm" data-a="hp-dmg">Dégâts</button>${half && !down ? `<button class="btn sm half" data-a="hp-dmg" data-half="1" title="${esc(half)}">Dégâts ½</button>` : ""}${ham(g) && !down ? `<button class="btn sm half" data-a="hp-dmg" data-minus="3" title="Maître des armures lourdes : contondant, perforant, tranchant non magiques">Dégâts −3</button>` : ""}<button class="btn sm" data-a="hp-heal"${dead ? " disabled" : ""}>Soins</button>${down ? "" : `<button class="btn sm" data-a="hp-temp">PV temp.</button>`}</div>`;
  let h = `<section class="hpcard${down || dead ? " down" : ""}${panel ? " inpanel" : ""}"${panel ? "" : ' id="hp-card"'}><div class="hph"><span class="k">${state}</span>${t ? `<span class="tmp">+${t} temp.</span>` : ""}<span class="v">${cur}<small>/${g.hpMax}</small></span></div>`;
  if (!down) h += `<div class="hpbar" aria-hidden="true"><i style="width:${pct}%"></i><i class="t" style="width:${tpct}%"></i></div>`;
  const foot = panel ? `<div class="hpfoot">${down || dead ? "" : `<button class="linkbtn" data-a="hp-sheet">Repos et dés de vie : fiche du personnage ›</button>`}<button class="btn ghost sm" data-a="hp-close">Fermer</button></div>` : "";
  if (dead) return h + `<p class="hpnote">Trois échecs : ton personnage meurt. Seule la magie (Revivifier, Rappel à la vie…) peut le ramener.</p><div class="hpin"><button class="btn sm" data-a="hp-revive">Ramené à la vie (1 PV)</button></div>${foot}</section>`;
  if (down) {
    h += `<div class="dsgrid"><span>Réussites</span><span class="dsr">${dots(d.s, "ok")}</span><span>Échecs</span><span class="dsr">${dots(d.f, "ko")}</span></div>`;
    if (!d.stable) h += `<div class="hpin"><button class="btn sm" data-a="ds" data-v="s">Réussite</button><button class="btn sm" data-a="ds" data-v="f">Échec</button><button class="btn sm" data-a="ds" data-v="20">20 naturel</button><button class="btn sm" data-a="ds" data-v="stab">Stabilisé</button></div>`;
    h += input + `<p class="hpnote">${d.stable ? "Stabilisé : plus de jets contre la mort. Tu reprends 1 PV au bout de 1d4 heures, ou dès qu'on te soigne." : "Au début de ton tour, jet de sauvegarde contre la mort (d20) : 10 ou plus = réussite, 3 réussites = stabilisé. 1 naturel = 2 échecs, 20 naturel = tu reprends 1 PV. Des dégâts à 0 PV = 1 échec (2 sur un coup critique). Un soin te relève."}</p>${foot}</section>`;
    return h;
  }
  const hd = hdLeft(g);
  if (half) h += `<p class="hpnote">Dégâts ½ : ${esc(half)} (arrondi à l'inférieur).</p>`;
  h += input + (panel ? "" : `<div class="hpdice"><span>Dés de vie <b>${hd}/${g.level} d${hitDieSize(g)}</b></span><span class="muted">à dépenser au repos court</span></div>`);
  if (g.exh && !panel) h += `<div class="hpexh"><b>Épuisement ${g.exh}</b><span>${EXH.slice(0, g.exh).join(" · ")}</span><button class="btn ghost sm" data-a="exh" data-v="-1" aria-label="Un niveau d'épuisement en moins">−</button><button class="btn ghost sm" data-a="exh" data-v="1" aria-label="Un niveau d'épuisement en plus"${g.exh >= 6 ? " disabled" : ""}>+</button></div>`;
  if (g.wsForm && BEAST[g.wsForm.id]) h += `<p class="hpnote">Tu es en <b>${esc(BEAST[g.wsForm.id].n)}</b> : les dégâts vont d'abord à la bête (carte Forme active, onglet Sorts). L'excédent revient ici tout seul.</p>`;
  return h + hpConcHTML(g) + foot + `</section>`;
}

/** Puce de la barre du haut (onglet d'action) : PV actuels, toucher pour ouvrir le volet des PV sur place. */
function hpChipHTML(g) {
  if (g.hpMax == null) return "";
  const lbl = isDead(g) ? "Mort" : isDown(g) ? "À terre" : `${hpCur(g)}/${g.hpMax}${g.hpTemp ? ` +${g.hpTemp}` : ""}`;
  return `<button class="chip hp${isDown(g) ? " down" : ""}" data-a="hp-go" aria-expanded="${!!S.hpOpen}" aria-label="Points de vie : ${lbl}">♥ ${lbl}</button>`;
}

/** Dégâts sur le personnage (aussi appelé par la Forme sauvage pour l'excédent). Renvoie le texte du message. */
function takeDamage(g, n, fromBeast) {
  const cc = concOf(g), ward = C(g).absorb ? C(g).absorb(g, n) : 0; // Protection arcanique (abjuration) : avant les PV
  const r = n - ward > 0 ? damage(g, n - ward) : { temp: 0, lost: 0 };
  const parts = [];
  if (ward) parts.push(`${ward} absorbé${ward > 1 ? "s" : ""} par la Protection arcanique (${g.wardHp} restant${g.wardHp > 1 ? "s" : ""})`);
  if (r.temp) parts.push(`${r.temp} absorbé${r.temp > 1 ? "s" : ""} par les PV temporaires`);
  if (r.lost) parts.push(`${r.lost} retiré${r.lost > 1 ? "s" : ""}`);
  let msg = `<b>−${n} PV</b>${fromBeast ? " (excédent de la forme de bête)" : ""}${parts.length ? ` : ${parts.join(", ")}` : ""} · ${hpCur(g)}/${g.hpMax}`;
  if (r.dead) msg = `<b>−${n} PV</b> : ${r.massive ? "les dégâts restants atteignent tes PV maximum" : "troisième échec"}, ton personnage meurt`;
  else if (r.down) msg += ` · <b>à terre</b>, jets contre la mort`;
  else if (r.fail) msg = `<b>Dégâts à 0 PV</b> : un échec au jet contre la mort (${g.death.f}/3)`;
  if ((r.down || r.dead) && C(g).onDown) { const m = C(g).onDown(g); if (m) msg += ` · ${m}`; } // ex. la rage prend fin
  // Concentration : perdue à 0 PV ; sinon rappel du jet (seulement si des PV réels ou temporaires ont été touchés)
  if (cc && (r.down || r.dead || r.fail)) { g.effects = g.effects.filter(e => !e.c); msg += ` · concentration perdue (${esc(cc.name)})`; S.hpConc = null; }
  else if (cc && !fromBeast) S.hpConc = { dd: concDD(n), n };
  return msg;
}

const val = () => { const el = document.getElementById("hp-n"), n = Math.floor(+(el && el.value) || 0); if (n < 1 && el) el.focus(); return n; };
onClick("hp-dmg", (b) => { const g = G(), raw = val(), n = b.dataset.half ? Math.floor(raw / 2) : b.dataset.minus ? Math.max(0, raw - +b.dataset.minus) : raw; if (!g || raw < 1) return; if (n === 0) { toast("Aucun dégât : Maître des armures lourdes (−3)"); return; } const prev = snap(g); let msg = ""; mutate(g => { msg = takeDamage(g, n); }); toast(msg, () => { S.hpConc = null; restore(prev); return "Dégâts annulés"; }); });
onClick("hp-heal", () => { const g = G(), n = val(); if (!g || n < 1) return; const prev = snap(g), down = isDown(g); let got = 0; S.hpConc = null; mutate(g => { got = heal(g, n); }); toast(`<b>+${got} PV</b>${down ? " : tu te relèves" : ""} · ${hpCur(G())}/${g.hpMax}`, () => { restore(prev); return "Soin annulé"; }); });
onClick("hp-temp", () => { const g = G(), n = val(); if (!g || n < 1) return; const prev = snap(g); let up = false; mutate(g => { up = setTemp(g, n); }); toast(up ? `<b>${g.hpTemp} PV temporaires</b>` : `Tu gardes tes ${g.hpTemp} PV temporaires : ils ne se cumulent pas, on garde le plus élevé`, up ? () => { restore(prev); return "PV temporaires annulés"; } : null); });
onClick("ds", (b) => {
  const g = G(); if (!g) return; const prev = snap(g); let r = "";
  mutate(g => { r = deathSave(g, b.dataset.v); });
  const m = { up: "20 naturel : tu reprends <b>1 PV</b> et tu te relèves", stable: "<b>Stabilisé</b> : inconscient, mais plus de jets contre la mort", s: `Réussite (${G().death.s}/3)`, f: `Échec (${G().death.f}/3)`, dead: "Troisième échec : ton personnage meurt" }[r];
  toast(m, () => { restore(prev); return "Jet annulé"; });
});
onClick("exh", (b) => { mutate(g => { g.exh = Math.min(6, Math.max(0, (g.exh || 0) + +b.dataset.v)); }); });
onClick("hp-revive", () => { const g = G(); if (!g) return; const prev = snap(g); mutate(g => { g.death = { s: 0, f: 0, stable: false }; g.hp = 1; }); toast("De retour à 1 PV", () => { restore(prev); return "Annulé"; }); });
onClick("hpconc-ok", () => { S.hpConc = null; render(); const c = concOf(G()); if (c) toast(`Concentration maintenue : <b>${esc(c.name)}</b>`); });
onClick("hp-go", () => {
  const card = S.tab === "perso" && document.getElementById("hp-card"); // Personnage : la carte des PV est déjà là, on y descend
  if (card) { S.hpOpen = false; card.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" }); return; }
  S.hpOpen = !S.hpOpen; S.concPanel = false; S.fxOpen = false; S.abOpen = null; render();
}); // pas de focus d'office : le clavier ne s'ouvre qu'en touchant le champ
onClick("hp-close", () => { S.hpOpen = false; S.hpConc = null; render(); });
onClick("hp-sheet", () => {
  S.hpOpen = false; S.tab = "perso"; S.view = "jeu"; try { localStorage.setItem("grimoire.tab", S.tab); localStorage.setItem("grimoire.view", S.view); } catch (e) {}
  render(); const el = document.getElementById("hp-card"); if (el) el.scrollIntoView({ block: "center" });
});

export { hpCardHTML, hpChipHTML, takeDamage };
