// Barbare (Manuel des joueurs 2014) : Rage, Défense sans armure, Attaque téméraire, voie primitive (Berserker).
// Classe sans sorts : onglet Capacités (features/abilities.js). Résumés rédigés pour la table, à vérifier dans le livre.
import { onChange, onClick } from "../core/actions.js";
import { esc, fmt, plural, signed } from "../core/format.js";
import { G, S } from "../core/state.js";
import { mutate } from "../core/store.js";
import { render, toast } from "../core/ui.js";
import { abilitiesHTML } from "../features/abilities.js";
import { pDots, pFoot, pHeader, printHTML } from "../features/print.js";
import { speedOf } from "../rules/character.js";
import { R } from "../rules/common.js";
import { acCalc } from "../rules/equipment.js";
import { statLabel } from "../ui/components.js";

// Voies primitives (Berserker pour l'instant)
const VOIES = { berserker: { n: "Berserker", full: "Voie du Berserker" } };
const BAR = {
  rage: g => g.level >= 20 ? 99 : g.level >= 17 ? 6 : g.level >= 12 ? 5 : g.level >= 6 ? 4 : g.level >= 3 ? 3 : 2, // utilisations par repos long
  dmg: g => g.level >= 16 ? 4 : g.level >= 9 ? 3 : 2,                                                                  // bonus de dégâts de rage
  brutal: g => g.level >= 17 ? 3 : g.level >= 13 ? 2 : g.level >= 9 ? 1 : 0,                                           // Critique brutal : dés en plus
};
const BAR_FEATS = [
  { id: "rage", lv: 1, n: "Rage", pill: g => `${BAR.rage(g) > 10 ? "illimitée" : BAR.rage(g) + " / repos long"} · +${BAR.dmg(g)} dégâts`, k: "d", d: g => `Action bonus, 1 minute. Avantage aux tests et jets de sauvegarde de Force ; +${BAR.dmg(g)} aux dégâts des attaques au corps à corps avec la Force ; résistance aux dégâts contondants, perforants et tranchants. Pas de sorts ni de concentration. Prend fin si tu tombes inconsciente, ou si à la fin de ton tour tu n'as ni attaqué une créature hostile ni subi de dégâts depuis ton tour précédent ; tu peux aussi y mettre fin (action bonus).` },
  { id: "unarmored", lv: 1, n: "Défense sans armure", pill: g => `CA ${10 + R.ab(g, "dex") + R.ab(g, "con")} sans armure`, k: "f", d: () => "Sans armure, ta CA est égale à 10 + modificateur de DEX + modificateur de CON. Le bouclier reste permis." },
  { id: "reckless", lv: 2, n: "Attaque téméraire", pill: () => "avantage / avantage contre toi", k: "f", d: () => "À ta première attaque du tour, tu peux attaquer de façon téméraire : avantage aux attaques au corps à corps avec la Force pendant ce tour, mais les attaques contre toi ont l'avantage jusqu'à ton prochain tour." },
  { id: "danger", lv: 2, n: "Sens du danger", pill: () => "avantage JdS DEX", k: "f", d: () => "Avantage aux jets de sauvegarde de Dextérité contre les effets que tu vois (pièges, sorts…), si tu n'es ni aveuglée, ni assourdie, ni neutralisée." },
  { id: "path", lv: 3, n: "Voie primitive", pill: g => VOIES[g.voie].full, k: "f", d: g => `Tu suis la ${VOIES[g.voie].full} ; ses capacités arrivent aux niveaux 3, 6, 10 et 14.` },
  { id: "frenzy", lv: 3, voie: "berserker", n: "Frénésie", pill: () => "attaque en action bonus", k: "d", d: () => "Quand tu entres en rage, tu peux choisir la frénésie : pendant toute la rage, à chacun de tes tours après celui-ci, une attaque au corps à corps en action bonus. À la fin de la rage, tu subis un niveau d'épuisement." },
  { id: "extra", lv: 5, n: "Attaque supplémentaire", pill: () => "2 attaques par action", k: "f", d: () => "Quand tu prends l'action Attaquer, tu attaques deux fois au lieu d'une." },
  { id: "fast", lv: 5, n: "Déplacement rapide", pill: () => "+3 m", k: "f", d: () => "+3 m à ta vitesse tant que tu ne portes pas d'armure lourde (compté dans ta vitesse affichée)." },
  { id: "mindless", lv: 6, voie: "berserker", n: "Rage aveugle", pill: () => "ni charmée ni effrayée en rage", k: "f", d: () => "En rage, tu ne peux pas être charmée ni effrayée ; un tel effet déjà présent est suspendu pendant la rage." },
  { id: "feral", lv: 7, n: "Instinct sauvage", pill: () => "avantage à l'initiative", k: "f", d: () => "Avantage aux jets d'initiative. Si tu es surprise au début d'un combat, tu peux agir normalement à ton premier tour en entrant en rage avant toute autre chose." },
  { id: "brutal", lv: 9, n: "Critique brutal", pill: g => `+${plural(BAR.brutal(g), "dé")} au critique`, k: "d", d: g => `Sur un coup critique au corps à corps, lance ${plural(BAR.brutal(g), "dé de dégâts de l'arme", "dés de dégâts de l'arme")} en plus (1 au niveau 9, 2 au niveau 13, 3 au niveau 17).` },
  { id: "presence", lv: 10, voie: "berserker", n: "Présence intimidante", pill: () => "action : effrayer", k: "s", d: g => `Action : une créature à 9 m qui te voit ou t'entend fait un jet de sauvegarde de Sagesse (DD ${8 + R.prof(g.level) + R.ab(g, "cha")}, 8 + maîtrise + CHA) ou est effrayée jusqu'à la fin de ton prochain tour ; tu peux prolonger l'effet par une action à chaque tour.` },
  { id: "relentless", lv: 11, n: "Rage implacable", pill: () => "JdS CON pour rester à 1 PV", k: "f", d: () => "En rage, si tu tombes à 0 PV sans mourir, jet de sauvegarde de Constitution DD 10 : réussi, tu restes à 1 PV. Le DD augmente de 5 à chaque utilisation et revient à 10 après un repos court ou long." },
  { id: "retaliation", lv: 14, voie: "berserker", n: "Représailles", pill: () => "réaction : attaque", k: "f", d: () => "Quand une créature à 1,5 m te blesse, tu peux utiliser ta réaction pour lui porter une attaque au corps à corps." },
  { id: "persistent", lv: 15, n: "Rage persistante", pill: () => "ne s'arrête plus d'elle-même", k: "f", d: () => "Ta rage ne prend fin plus tôt que si tu tombes inconsciente ou si tu y mets fin." },
  { id: "might", lv: 18, n: "Puissance indomptable", pill: () => "Force au moins la valeur", k: "f", d: () => "Si le total d'un test de Force est inférieur à ta valeur de Force, tu peux utiliser cette valeur à la place." },
  { id: "champion", lv: 20, n: "Champion primitif", pill: () => "FOR et CON +4 (max 24)", k: "f", d: () => "Ta Force et ta Constitution augmentent de 4, jusqu'à 24 au maximum (à reporter dans l'onglet Personnage)." },
];
const feats = g => BAR_FEATS.filter(f => !f.voie || f.voie === g.voie);
const rageLeft = g => Math.max(0, BAR.rage(g) - g.rageU);
const frenzyOn = g => g.raging && g.frenzy && g.level >= 3 && g.voie === "berserker";

// ---------- Carte Rage (onglet Capacités, Gérer et En jeu)
function rageCard(g) {
  const n = BAR.rage(g), u = Math.min(n, g.rageU);
  const pips = n > 10 ? `<span class="muted">illimitée</span>` : Array.from({ length: n }, (_, k) => `<button class="pip fire${k < u ? " used" : ""}" data-a="res-pip" data-r="rage" data-k="${k}" aria-label="Rage ${k + 1}, ${k < u ? "utilisée" : "disponible"}"></button>`).join("");
  if (g.raging) return `<section class="ragecard on" id="rage-card"><div class="rh"><b>🔥 En rage${frenzyOn(g) ? " · Frénésie" : ""}</b><span class="muted">1 minute</span></div>
    <div class="pills">${[["d", "Dégâts", `+${BAR.dmg(g)} FOR au corps à corps`], ["s", "Résistance", "contondant, perforant, tranchant"], ["n", "Force", "avantage tests et JdS"], ...(frenzyOn(g) ? [["f", "Frénésie", "attaque en action bonus"]] : []), ...(g.level >= 6 && g.voie === "berserker" ? [["f", "Rage aveugle", "ni charmée ni effrayée"]] : [])].map(([k, l, v]) => `<div class="pill ${k}"><span class="pl">${l}</span><span class="pv">${v}</span></div>`).join("")}</div>
    <p class="muted">Prend fin si tu tombes inconsciente, ou si tu n'as ni attaqué ni subi de dégâts depuis ton dernier tour. Pas de sorts ni de concentration.${g.level >= 11 ? " Rage implacable : à 0 PV, JdS CON DD 10 (+5 par utilisation) pour rester à 1 PV." : ""}</p>
    <div class="cast"><button class="btn" data-a="rage-end">Fin de la rage</button></div></section>`;
  return `<section class="ragecard" id="rage-card"><div class="rh"><b>Rage</b><span class="muted">repos long</span><span class="pips">${pips}</span></div>
    <p>Action bonus · 1 minute. <b>+${BAR.dmg(g)} dégâts</b> (attaques de FOR au corps à corps) · <b>résistance</b> contondant, perforant, tranchant · avantage aux tests et JdS de FOR.</p>
    <div class="cast"><button class="btn rage-go" data-a="rage-start"${rageLeft(g) || n > 10 ? "" : " disabled"}>🔥 Entrer en rage</button>${g.level >= 3 && g.voie === "berserker" ? `<label class="check"><input type="checkbox" data-a="rage-frenzy"${S.frenzyPick ? " checked" : ""}> avec Frénésie</label>` : ""}</div>
    ${g.level >= 3 && g.voie === "berserker" ? `<p class="muted">Frénésie : une attaque au corps à corps en action bonus à chaque tour ; un niveau d'épuisement à la fin de la rage.</p>` : ""}${rageLeft(g) || n > 10 ? "" : `<p class="muted">Plus de rage : elles reviennent au repos long.</p>`}</section>`;
}
onChange("rage-frenzy", t => { S.frenzyPick = t.checked; });
onClick("rage-start", () => {
  const g = G(); if (!g || g.raging) return; const prev = { rageU: g.rageU, raging: false, frenzy: false };
  const fr = !!S.frenzyPick && g.level >= 3; S.frenzyPick = false;
  mutate(g => { g.raging = true; g.frenzy = fr; if (BAR.rage(g) <= 10) g.rageU = Math.min(BAR.rage(g), g.rageU + 1); g.effects = g.effects.filter(e => !e.c); });
  toast(`<b>🔥 Rage</b>${fr ? " et Frénésie" : ""} · reste ${BAR.rage(g) > 10 ? "∞" : rageLeft(G())}`, () => { mutate(g => Object.assign(g, prev)); return "Rage annulée"; });
});
onClick("rage-end", () => {
  const g = G(); if (!g || !g.raging) return; const prev = { raging: true, frenzy: g.frenzy, exh: g.exh }, fr = frenzyOn(g);
  mutate(g => { g.raging = false; g.frenzy = false; if (fr) g.exh = Math.min(6, (g.exh || 0) + 1); });
  toast(`Fin de la rage${fr ? ` · Frénésie : <b>épuisement ${G().exh}</b>` : ""}`, () => { mutate(g => Object.assign(g, prev)); return "Rage reprise"; });
});
onClick("rage-top", () => { const el = document.getElementById("rage-card"); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); else { S.tab = "caps"; render(); } });
onChange("#f-voie", t => { mutate(g => { g.voie = t.value; }); });
onChange("opt-reckless", t => { S.reckless = t.checked; render(); });

// ---------- Onglet Règles
function rulesHTML(g) {
  const ac = 10 + R.ab(g, "dex") + R.ab(g, "con");
  return `<div class="cols rules">
  <div><div class="rubric" style="margin-top:4px"><h3>Rage</h3></div>
  <p><b>${BAR.rage(g) > 10 ? "Sans limite" : BAR.rage(g) + " fois"}</b> par repos long, en <b>action bonus</b>, pour 1 minute. Avantage aux tests et jets de sauvegarde de <b>Force</b>, <span class="kp d">+${BAR.dmg(g)} dégâts</span> aux attaques au corps à corps avec la Force, <b>résistance</b> (dégâts divisés par 2) contondant, perforant et tranchant.</p>
  <p>Pas de sorts ni de concentration. Fin : inconsciente, ou aucun ennemi attaqué ni dégât subi depuis ton dernier tour, ou à ta demande (action bonus).</p>
  <div class="rubric"><h3>Attaque téméraire</h3></div>
  <p>Décidée à ta première attaque du tour : <b>avantage</b> à tes attaques au corps à corps avec la Force ce tour-ci ; en échange, les attaques <b>contre toi</b> ont l'avantage jusqu'à ton prochain tour.</p>
  <div class="rubric"><h3>Défense sans armure</h3></div>
  <p>Sans armure : CA = 10 + DEX + CON (<b>${ac}</b> aujourd'hui), bouclier permis.</p></div>
  <div><div class="rubric" style="margin-top:4px"><h3>Voie du Berserker</h3></div>
  <p><b>Frénésie</b> (niveau 3) : en entrant en rage, attaque au corps à corps en action bonus à chaque tour ; un niveau d'<b>épuisement</b> à la fin de la rage.</p>
  <p><b>Épuisement</b> : 1 désavantage aux tests de caractéristique · 2 vitesse divisée par 2 · 3 désavantage aux attaques et sauvegardes · 4 PV max divisés par 2 · 5 vitesse 0 · 6 mort. Un repos long (avec nourriture et eau) retire un niveau.</p>
  <div class="rubric"><h3>Récupérer</h3></div>
  <p><b>Repos long :</b> toutes les rages, PV, moitié des dés de vie, un niveau d'épuisement. <b>Repos court :</b> dés de vie.</p>
  <p class="muted">Source : Manuel des joueurs 2014 (barbare, Voie du Berserker). Résumés rédigés pour la table, à vérifier dans le livre en cas de doute.</p></div></div>`;
}
// ---------- Fiche imprimable
function printSheet(g) {
  const n = BAR.rage(g), c = acCalc(g);
  return `${pHeader(g, `Barbare, niveau ${g.level}${g.level >= 3 ? ` · ${esc(VOIES[g.voie].full)}` : ""}`, [[n > 10 ? "∞" : n, "RAGES"], [`+${BAR.dmg(g)}`, "DÉGÂTS DE RAGE"], [c.total, "CA"], [signed(R.prof(g.level)), "MAÎTRISE"], [g.level >= 5 ? 2 : 1, "ATTAQUES / ACTION"]])}
<h2>Rage <small>action bonus · 1 minute · repos long</small></h2>
<div class="res"><span class="l">Utilisations</span>${n > 10 ? "illimitées" : pDots(n)}<span class="r">cocher à chaque rage</span></div>
<div class="callout"><b>En rage</b> : +${BAR.dmg(g)} dégâts (FOR au corps à corps) · résistance contondant, perforant, tranchant · avantage FOR · pas de sorts. Fin : inconsciente, ou ni attaque ni dégât depuis ton dernier tour.${g.voie === "berserker" && g.level >= 3 ? " <b>Frénésie</b> : attaque en action bonus, épuisement à la fin." : ""}</div>
<div class="res"><span class="l">Épuisement</span>${Array.from({ length: 6 }, () => '<span class="box"></span>').join(" ")}<span class="r">1 désav. tests · 2 vitesse ÷2 · 3 désav. attaques et JdS · 4 PV max ÷2 · 5 vitesse 0 · 6 mort</span></div>
<h2>Capacités de classe</h2>
<table>${feats(g).filter(f => f.lv <= g.level).map(f => `<tr><td class="n">${f.n}</td><td>${esc(f.d(g))}</td></tr>`).join("")}</table>
${pFoot("ATELIER DU GRIMOIRE · BARBARE")}`;
}

// ---------- Définition de la classe (contrat : voir docs/ARCHITECTURE.md) ----------
export default {
  n: "Barbare", noSpells: true, slots: {}, top: 0, cantrips: () => 0, prep: () => 0, hitDie: "1d12",
  fileLabel: "Barbare",
  saves: ["str", "con"],
  weaponProf: ["simple", "martial"], armorProf: ["light", "medium", "shield"],
  defaults: () => ({ voie: "berserker", rageU: 0, raging: false, frenzy: false }),
  normalize(o) {
    if (!VOIES[o.voie]) o.voie = "berserker";
    o.rageU = Math.max(0, +o.rageU || 0); o.raging = !!o.raging; o.frenzy = !!o.frenzy;
  },
  subline: g => `Barbare niveau ${g.level}${g.level >= 3 ? ` · ${esc(VOIES[g.voie].full)}` : ""}`,
  subclassField: g => `<div class="field"><label for="f-voie">Voie primitive</label><select id="f-voie">${Object.entries(VOIES).map(([k, o]) => `<option value="${k}"${k === g.voie ? " selected" : ""}>${o.n}</option>`).join("")}</select></div>`,
  heroStats: g => {
    const n = BAR.rage(g), st = (v, f, s, cls = "") => `<div class="stat${cls}" role="listitem"><div class="v">${v}</div>${statLabel(f, s)}</div>`;
    return st(n > 10 ? "∞" : `${rageLeft(g)}<small>/${n}</small>`, "Rages", "Rage", g.raging ? " fire" : "") + st(`+${BAR.dmg(g)}`, "Dégâts de rage", "Dégâts") + st(acCalc(g).total, "CA (calculée)", "CA")
      + st(`${fmt(speedOf(g))} m`, "Vitesse", "Vitesse") + st(g.level >= 5 ? 2 : 1, "Attaques par action", "Attaques") + st(signed(R.prof(g.level)), "Maîtrise", "Maîtrise");
  },
  tabs: () => [["caps", "Capacités"]],
  moreTabs: () => [["regles", "Règles"], ["imprimer", "Imprimer"]],
  panels: { caps: g => abilitiesHTML(g), regles: g => rulesHTML(g), imprimer: g => printHTML(g) },
  print: g => printSheet(g),
  printTitle: g => `Fiche de barbare de ${g.name}`,
  printDesc: "Elle contient la page Personnage, les rages et l'épuisement à cocher, et toutes les capacités de classe de ton niveau.",
  features: g => feats(g),
  capsTop: g => rageCard(g),
  resourceMax: { rage: g => Math.min(BAR.rage(g), 10) },
  longRest: g => { g.rageU = 0; g.raging = false; g.frenzy = false; },
  slotbarChips: g => g.raging ? `<button class="chip fire" data-a="rage-top">🔥 Rage${frenzyOn(g) ? " · Frénésie" : ""}</button>` : "",
  // Défense sans armure (bouclier permis) ; Déplacement rapide (niveau 5, sans armure lourde)
  acBase: g => [["Défense sans armure : 10 + DEX + CON", 10 + R.ab(g, "dex") + R.ab(g, "con")]],
  speedBonus: g => g.level >= 5 && (acCalc(g).armor || {}).cat !== "heavy" ? 3 : 0,
  // Rage : +dégâts aux attaques au corps à corps avec la Force ; Attaque téméraire cochée : avantage
  attackMods: (g, w, ab) => {
    const melee = ab === "str" && w.rng === "melee", x = { pills: [] };
    if (g.raging && melee) { x.dmg = BAR.dmg(g); x.pills.push(`rage +${BAR.dmg(g)}`); if (w.thrown) x.pills.push("lancée : sans bonus de rage"); }
    if (S.reckless && melee && g.level >= 2) x.pills.push("avantage (téméraire)");
    return x;
  },
  attackOptions: g => g.level >= 2 ? `<div class="atkopts"><label class="check"><input type="checkbox" data-a="opt-reckless"${S.reckless ? " checked" : ""}> Attaque téméraire</label>${S.reckless ? `<span class="warn">Les attaques contre toi ont l'avantage jusqu'à ton prochain tour.</span>` : ""}</div>` : "",
  extraAttacks: (g, list) => { if (!frenzyOn(g)) return; const m = list.find(a => a.melee); if (m) list.splice(list.indexOf(m) + 1, 0, { ...m, n: `${m.n} · Frénésie (action bonus)`, q: 1 }); },
  attackNotes: g => [g.level >= 5 ? "<b>Attaque supplémentaire</b> : deux attaques par action Attaquer." : "", g.level >= 9 ? `<b>Critique brutal</b> : +${plural(BAR.brutal(g), "dé")} de l'arme sur un critique au corps à corps.` : ""].filter(Boolean),
  // Carte des PV : en rage, bouton « dégâts réduits » (résistance contondant, perforant, tranchant)
  onDown: g => { if (!g.raging) return ""; const fr = frenzyOn(g); g.raging = false; g.frenzy = false; if (fr) g.exh = Math.min(6, (g.exh || 0) + 1); return `fin de la rage${fr ? ` (épuisement ${g.exh})` : ""}`; },
  halfDamage: g => g.raging ? "Rage : contondant, perforant, tranchant" : "",
  levelUp: {
    step2: "Choix",
    rowsAfter: (g, b) => ["Rages", "Dégâts de rage"].map((l, i) => { const o = i ? `+${BAR.dmg(g)}` : BAR.rage(g), nv = i ? `+${BAR.dmg(b)}` : BAR.rage(b); return `<div class="${o === nv ? "same" : ""}"><span>${l}</span><span class="old">${o > 10 ? "∞" : o}</span><span class="ar">→</span><b${o !== nv ? ' style="color:var(--pd-fg)"' : ""}>${nv > 10 ? "∞" : nv}</b></div>`; }).join(""),
    notes: (g, to) => to === 3 ? [`<span><b>Voie primitive</b> : vérifie la voie choisie dans ✎ Modifier (${esc(VOIES[g.voie].full)}).</span>`] : [],
  },
};
