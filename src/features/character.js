// Onglet Personnage : caractéristiques, combat (CA, vitesse, initiative, PV max) et jets de sauvegarde.
// Gérer : on recopie la feuille du joueur. En jeu : on consulte les valeurs calculées.
import { C } from "../classes/index.js";
import { onChange, onClick } from "../core/actions.js";
import { cap, fmt, signed } from "../core/format.js";
import { S } from "../core/state.js";
import { mutate } from "../core/store.js";
import { render } from "../core/ui.js";
import { hitDieSize, hpAverage, initiative, saveBonus, saveFromClass, saveProf, sheetIncomplete } from "../rules/character.js";
import { R } from "../rules/common.js";
import { ABILITIES } from "../rules/tables.js";
import { foldHead, isFold } from "../ui/components.js";

const viewSwitch = () => `<div class="viewsw" role="group" aria-label="Affichage de la fiche"><button data-a="view" data-v="gerer" aria-pressed="${S.view !== "jeu"}">Gérer</button><button data-a="view" data-v="jeu" aria-pressed="${S.view === "jeu"}">En jeu</button></div>`;
const speedTxt = g => `${fmt(g.speed)} m`;

function incompleteHTML(g) {
  if (!sheetIncomplete(g)) return "";
  return `<div class="chtodo"><b>Complète ta fiche</b> : recopie tes caractéristiques, ta classe d'armure et tes points de vie maximum depuis ta feuille de personnage.${S.view === "jeu" ? ` <button class="btn" data-a="view" data-v="gerer">Compléter</button>` : ""}</div>`;
}

// ---------- Gérer
function abilitiesGerer(g) {
  const sum = ABILITIES.map(([k, a]) => `${a} ${g.abil[k]}`).join(" · ");
  let h = foldHead("ch-ab", "", "Caractéristiques", "valeurs de ta feuille", sum);
  if (isFold("ch-ab")) return h;
  h += `<div class="abgrid">${ABILITIES.map(([k, a, n]) => `<label class="abcell${k === C(g).ab ? " mine" : ""}" title="${n}"><span class="abk">${a}</span><input id="ab-${k}" data-abil="${k}" type="number" inputmode="numeric" min="1" max="30" value="${g.abil[k]}" aria-label="${n}"><b class="abm">${signed(R.ab(g, k))}</b></label>`).join("")}</div>`;
  return h + `<p class="chhelp">Le modificateur se calcule seul. ${cap(C(g).abArticle || "l'" + C(g).abN)} sert aussi à tes sorts : DD, attaque et sorts préparés la lisent ici.</p>`;
}
function combatGerer(g) {
  const sum = `CA ${g.ac ?? "?"} · PV ${g.hpMax ?? "?"} · ${speedTxt(g)}`;
  let h = foldHead("ch-cb", "", "Combat", "", sum);
  if (isFold("ch-cb")) return h;
  const row = (id, label, input, hint = "") => `<div class="chrow"><label for="${id}">${label}</label>${hint ? `<span class="hint">${hint}</span>` : ""}${input}</div>`;
  const num = (id, v, attrs = "") => `<input id="${id}" type="number" inputmode="numeric" value="${v ?? ""}" placeholder="?" ${attrs}>`;
  return h + `<div class="chbox">
    ${row("f-ac", "Classe d'armure", num("f-ac", g.ac, 'min="0" max="40"'))}
    ${row("f-speed", "Vitesse", `<span class="unit">${num("f-speed", g.speed, 'min="0" max="60" step="1.5" inputmode="decimal"')} m</span>`)}
    ${row("f-init", "Initiative", `<input id="f-init" type="text" inputmode="numeric" value="${signed(initiative(g)).replace("−", "-")}">`, `DEX ${signed(R.ab(g, "dex"))}${g.initX ? `, bonus ${signed(g.initX)}` : ", bonus divers"}`)}
    ${row("f-hpmax", "PV maximum", num("f-hpmax", g.hpMax, 'min="1" max="999"'), `d${hitDieSize(g)} · niveau ${g.level} · moyenne ${hpAverage(g)}`)}
  </div>`;
}
function savesGerer(g) {
  let h = foldHead("ch-sv", "", "Jets de sauvegarde", "★ donnés par la classe", ABILITIES.filter(([k]) => saveProf(g, k)).map(a => a[1]).join(", "));
  if (isFold("ch-sv")) return h;
  return h + `<div class="svgrid">${ABILITIES.map(([k, , n]) => saveFromClass(g, k)
    ? `<div class="sv lock" title="Maîtrise donnée par la classe"><span class="mk">★</span><span class="n">${n}</span><b>${signed(saveBonus(g, k))}</b></div>`
    : `<button class="sv" data-a="save-tog" data-v="${k}" aria-pressed="${saveProf(g, k)}"><span class="mk" aria-hidden="true"></span><span class="n">${n}</span><b>${signed(saveBonus(g, k))}</b></button>`).join("")}</div>
  <p class="chhelp">Touche une sauvegarde pour ajouter une maîtrise (don Résilience, par exemple).</p>`;
}

// ---------- En jeu
function jeuHTML(g) {
  const st = (v, l, cls = "") => `<div class="chstat${cls}"><div class="v">${v}</div><div class="l">${l}</div></div>`;
  const stats = `<div class="chstats">${st(g.ac ?? "?", "CA")}${st(g.hpMax ?? "?", "PV max")}${st(signed(initiative(g)), "Initiative")}${st(speedTxt(g), "Vitesse")}${st(signed(R.prof(g.level)), "Maîtrise")}</div>`;
  return stats; // les caractéristiques sont dans l'en-tête (heroAbilities)
}

// En-tête de l'onglet Personnage : les six caractéristiques à la place des statistiques de sorts.
function heroAbilities(g) {
  return ABILITIES.map(([k, a, n]) => `<div class="stat ab${k === C(g).ab ? " mine" : ""}" role="listitem" title="${n}"><div class="l">${a}</div><div class="v">${signed(R.ab(g, k))}</div><div class="sc">${g.abil[k]} · <span class="js${saveProf(g, k) ? " on" : ""}" title="Jet de sauvegarde${saveProf(g, k) ? " maîtrisé" : ""}">JdS ${signed(saveBonus(g, k))}</span></div></div>`).join("");
}

function characterHTML(g) {
  return viewSwitch() + incompleteHTML(g) + (S.view === "jeu" ? jeuHTML(g) : abilitiesGerer(g) + combatGerer(g) + savesGerer(g));
}

// ---------- Actions
// Les champs enregistrent sans redessiner tout de suite : le dessin attend que le focus soit passé au champ suivant (Tab, « Suivant » sur mobile).
const later = fn => { mutate(fn, false); setTimeout(render); };
const intOrNull = v => { const n = parseInt(String(v).replace("−", "-"), 10); return isFinite(n) ? n : null; };
onChange(t => !!t.dataset.abil, t => later(g => { g.abil[t.dataset.abil] = Math.min(30, Math.max(1, intOrNull(t.value) ?? 10)); }));
onChange("#f-ac", t => later(g => { const n = intOrNull(t.value); g.ac = n == null ? null : Math.min(40, Math.max(0, n)); }));
onChange("#f-hpmax", t => later(g => { const n = intOrNull(t.value); g.hpMax = n == null ? null : Math.min(999, Math.max(1, n)); }));
onChange("#f-speed", t => later(g => { const n = parseFloat(String(t.value).replace(",", ".")); g.speed = isFinite(n) ? Math.min(60, Math.max(0, n)) : 9; }));
onChange("#f-init", t => later(g => { const n = intOrNull(t.value); g.initX = n == null ? 0 : Math.max(-20, Math.min(20, n - R.ab(g, "dex"))); }));
onClick("save-tog", (b) => { mutate(g => { const k = b.dataset.v; g.saveX = g.saveX.includes(k) ? g.saveX.filter(x => x !== k) : [...g.saveX, k]; }); });

export { characterHTML, heroAbilities };
