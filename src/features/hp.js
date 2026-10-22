// Suivi des points de vie : carte de l'onglet Personnage (En jeu), puce de la barre du bas, rappel de concentration.
// Les règles (dégâts, soins, jets contre la mort, dés de vie) sont dans rules/hp.js.
import { onClick } from "../core/actions.js";
import { esc, plural, signed } from "../core/format.js";
import { G, S } from "../core/state.js";
import { mutate } from "../core/store.js";
import { render, toast } from "../core/ui.js";
import { BEAST } from "../data.js";
import { hitDieSize, saveBonus } from "../rules/character.js";
import { R } from "../rules/common.js";
import { damage, deathSave, hdLeft, heal, hpCur, isDead, isDown, setTemp, spendHitDie } from "../rules/hp.js";
import { concDD, concOf } from "./cast.js";

const snap = g => JSON.parse(JSON.stringify({ hp: g.hp, hpTemp: g.hpTemp, death: g.death, hdU: g.hdU, effects: g.effects }));
const restore = prev => mutate(g => Object.assign(g, prev));

// Rappel du jet de concentration après des dégâts (hors Forme sauvage, qui a le sien)
function hpConcHTML(g) {
  const w = S.hpConc, cur = concOf(g); if (!w || !cur) { S.hpConc = null; return ""; }
  return `<div class="concwarn" role="alert"><div><b>◉ ${esc(cur.name)}</b> : jet de sauvegarde de Constitution, <b>DD ${w.dd}</b> (${plural(w.n, "dégât")}), ton bonus <b>${signed(saveBonus(g, "con"))}</b>.</div>
  <div class="cast"><button class="btn" data-a="hpconc-ok">Réussi</button><button class="btn" data-a="conc-end" style="border-color:var(--rubric);color:var(--pa-fg)">Raté : concentration perdue</button></div></div>`;
}
const dots = (n, cls) => Array.from({ length: 3 }, (_, i) => `<span class="dsd ${cls}${i < n ? " on" : ""}"></span>`).join("");

function hpCardHTML(g) {
  if (g.hpMax == null) return `<section class="hpcard"><div class="hph"><span class="k">Points de vie</span></div><p class="muted" style="margin:0">Saisis tes PV maximum (mode <button class="linkbtn" data-a="view" data-v="gerer">Gérer</button>) pour suivre tes points de vie.</p></section>`;
  const cur = hpCur(g), t = g.hpTemp || 0, d = g.death, down = isDown(g), dead = isDead(g);
  const pct = Math.round(100 * cur / g.hpMax), tpct = Math.min(100 - pct, Math.round(100 * t / g.hpMax));
  const state = dead ? "Mort" : down ? (d.stable ? "À terre · stabilisé" : "À terre · inconscient") : "Points de vie";
  const input = `<div class="hpin"><input id="hp-n" type="number" inputmode="numeric" min="0" placeholder="0" aria-label="Nombre de points de vie"><button class="btn cast-go sm" data-a="hp-dmg">Dégâts</button><button class="btn sm" data-a="hp-heal"${dead ? " disabled" : ""}>Soins</button>${down ? "" : `<button class="btn sm" data-a="hp-temp">PV temp.</button>`}</div>`;
  let h = `<section class="hpcard${down || dead ? " down" : ""}" id="hp-card"><div class="hph"><span class="k">${state}</span>${t ? `<span class="tmp">+${t} temp.</span>` : ""}<span class="v">${cur}<small>/${g.hpMax}</small></span></div>`;
  if (!down) h += `<div class="hpbar" aria-hidden="true"><i style="width:${pct}%"></i><i class="t" style="width:${tpct}%"></i></div>`;
  if (dead) return h + `<p class="hpnote">Trois échecs : ton personnage meurt. Seule la magie (Revivifier, Rappel à la vie…) peut le ramener.</p><div class="hpin"><button class="btn sm" data-a="hp-revive">Ramené à la vie (1 PV)</button></div></section>`;
  if (down) {
    h += `<div class="dsgrid"><span>Réussites</span><span class="dsr">${dots(d.s, "ok")}</span><span>Échecs</span><span class="dsr">${dots(d.f, "ko")}</span></div>`;
    if (!d.stable) h += `<div class="hpin"><button class="btn sm" data-a="ds" data-v="s">Réussite</button><button class="btn sm" data-a="ds" data-v="f">Échec</button><button class="btn sm" data-a="ds" data-v="20">20 naturel</button><button class="btn sm" data-a="ds" data-v="stab">Stabilisé</button></div>`;
    h += input + `<p class="hpnote">${d.stable ? "Stabilisé : plus de jets contre la mort. Tu reprends 1 PV au bout de 1d4 heures, ou dès qu'on te soigne." : "Au début de ton tour, jet de sauvegarde contre la mort (d20) : 10 ou plus = réussite, 3 réussites = stabilisé. 1 naturel = 2 échecs, 20 naturel = tu reprends 1 PV. Des dégâts à 0 PV = 1 échec (2 sur un coup critique). Un soin te relève."}</p></section>`;
    return h;
  }
  const hd = hdLeft(g);
  h += input + `<div class="hpdice"><span>Dés de vie <b>${hd}/${g.level} d${hitDieSize(g)}</b></span>${hd && cur < g.hpMax ? `<button class="btn ghost sm" data-a="hp-hd" title="Repos court : lance le dé, tape le résultat, puis touche ici">Dépenser 1 dé</button>` : ""}<span class="muted">${hd && cur < g.hpMax ? `repos court : lance 1d${hitDieSize(g)}, tape le résultat (CON ${signed(R.ab(g, "con"))} ajoutée)` : "la moitié revient au repos long"}</span></div>`;
  if (g.wsForm && BEAST[g.wsForm.id]) h += `<p class="hpnote">Tu es en <b>${esc(BEAST[g.wsForm.id].n)}</b> : les dégâts vont d'abord à la bête (carte Forme active, onglet Sorts). L'excédent revient ici tout seul.</p>`;
  return h + hpConcHTML(g) + `</section>`;
}

/** Puce de la barre du bas (onglet Sorts) : PV actuels, toucher pour ouvrir la fiche. */
function hpChipHTML(g) {
  if (g.hpMax == null) return "";
  const lbl = isDead(g) ? "Mort" : isDown(g) ? "À terre" : `${hpCur(g)}/${g.hpMax}${g.hpTemp ? ` +${g.hpTemp}` : ""}`;
  return `<button class="chip hp${isDown(g) ? " down" : ""}" data-a="hp-go" aria-label="Points de vie : ${lbl}">♥ ${lbl}</button>`;
}

/** Dégâts sur le personnage (aussi appelé par la Forme sauvage pour l'excédent). Renvoie le texte du message. */
function takeDamage(g, n, fromBeast) {
  const cc = concOf(g), r = damage(g, n);
  const parts = [];
  if (r.temp) parts.push(`${r.temp} absorbé${r.temp > 1 ? "s" : ""} par les PV temporaires`);
  if (r.lost) parts.push(`${r.lost} retiré${r.lost > 1 ? "s" : ""}`);
  let msg = `<b>−${n} PV</b>${fromBeast ? " (excédent de la forme de bête)" : ""}${parts.length ? ` : ${parts.join(", ")}` : ""} · ${hpCur(g)}/${g.hpMax}`;
  if (r.dead) msg = `<b>−${n} PV</b> : ${r.massive ? "les dégâts restants atteignent tes PV maximum" : "troisième échec"}, ton personnage meurt`;
  else if (r.down) msg += ` · <b>à terre</b>, jets contre la mort`;
  else if (r.fail) msg = `<b>Dégâts à 0 PV</b> : un échec au jet contre la mort (${g.death.f}/3)`;
  // Concentration : perdue à 0 PV ; sinon rappel du jet (seulement si des PV réels ou temporaires ont été touchés)
  if (cc && (r.down || r.dead || r.fail)) { g.effects = g.effects.filter(e => !e.c); msg += ` · concentration perdue (${esc(cc.name)})`; S.hpConc = null; }
  else if (cc && !fromBeast) S.hpConc = { dd: concDD(n), n };
  return msg;
}

const val = () => { const el = document.getElementById("hp-n"), n = Math.floor(+(el && el.value) || 0); if (n < 1 && el) el.focus(); return n; };
onClick("hp-dmg", () => { const g = G(), n = val(); if (!g || n < 1) return; const prev = snap(g); let msg = ""; mutate(g => { msg = takeDamage(g, n); }); toast(msg, () => { S.hpConc = null; restore(prev); return "Dégâts annulés"; }); });
onClick("hp-heal", () => { const g = G(), n = val(); if (!g || n < 1) return; const prev = snap(g), down = isDown(g); let got = 0; S.hpConc = null; mutate(g => { got = heal(g, n); }); toast(`<b>+${got} PV</b>${down ? " : tu te relèves" : ""} · ${hpCur(G())}/${g.hpMax}`, () => { restore(prev); return "Soin annulé"; }); });
onClick("hp-temp", () => { const g = G(), n = val(); if (!g || n < 1) return; const prev = snap(g); let up = false; mutate(g => { up = setTemp(g, n); }); toast(up ? `<b>${g.hpTemp} PV temporaires</b>` : `Tu gardes tes ${g.hpTemp} PV temporaires : ils ne se cumulent pas, on garde le plus élevé`, up ? () => { restore(prev); return "PV temporaires annulés"; } : null); });
onClick("hp-hd", () => {
  const g = G(), n = val(); if (!g || n < 1) return;
  if (n > hitDieSize(g)) { toast(`Un d${hitDieSize(g)} donne au plus ${hitDieSize(g)} : tape le résultat du dé`); return; }
  const prev = snap(g); let got = null; mutate(g => { got = spendHitDie(g, n); });
  if (got != null) toast(`Dé de vie : ${n} ${signed(R.ab(g, "con"))} CON → <b>+${got} PV</b> · ${hpCur(G())}/${g.hpMax} · reste ${hdLeft(G())}`, () => { restore(prev); return "Dé de vie annulé"; });
});
onClick("ds", (b) => {
  const g = G(); if (!g) return; const prev = snap(g); let r = "";
  mutate(g => { r = deathSave(g, b.dataset.v); });
  const m = { up: "20 naturel : tu reprends <b>1 PV</b> et tu te relèves", stable: "<b>Stabilisé</b> : inconscient, mais plus de jets contre la mort", s: `Réussite (${G().death.s}/3)`, f: `Échec (${G().death.f}/3)`, dead: "Troisième échec : ton personnage meurt" }[r];
  toast(m, () => { restore(prev); return "Jet annulé"; });
});
onClick("hp-revive", () => { const g = G(); if (!g) return; const prev = snap(g); mutate(g => { g.death = { s: 0, f: 0, stable: false }; g.hp = 1; }); toast("De retour à 1 PV", () => { restore(prev); return "Annulé"; }); });
onClick("hpconc-ok", () => { S.hpConc = null; render(); const c = concOf(G()); if (c) toast(`Concentration maintenue : <b>${esc(c.name)}</b>`); });
onClick("hp-go", () => {
  S.tab = "perso"; S.view = "jeu"; try { localStorage.setItem("grimoire.tab", S.tab); localStorage.setItem("grimoire.view", S.view); } catch (e) {}
  render(); const el = document.getElementById("hp-card"); if (el) el.scrollIntoView({ block: "center" });
});

export { hpCardHTML, hpChipHTML, takeDamage };
