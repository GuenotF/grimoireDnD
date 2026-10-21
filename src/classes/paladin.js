// Paladin : serments, Imposition des mains, Perception divine, Conduit divin, Châtiment divin, capacités.
import { onChange, onClick } from "../core/actions.js";
import { signed } from "../core/format.js";
import { fxKey } from "../core/schema.js";
import { G, S } from "../core/state.js";
import { mutate } from "../core/store.js";
import { render, toast } from "../core/ui.js";
import { BY_ID } from "../data.js";
import { slotsLeft } from "../features/cast.js";
import { R, isPal, isWiz } from "../rules/common.js";
import { capRow } from "../ui/components.js";

function palResHTML(g) {
  const pool = PAL.loh(g), left = Math.max(0, pool - g.loh), ds = PAL.ds(g), cd = PAL.cd(g);
  const pips = (r, n, u, lbl) => Array.from({ length: n }, (_, k) => `<button class="pip${k < u ? " used" : ""}" data-a="res-pip" data-r="${r}" data-k="${k}" aria-label="${lbl} ${k + 1}, ${k < u ? "utilisée" : "disponible"}"></button>`).join("");
  return `<div class="rubric"><h2>Ressources du paladin</h2></div><div class="slots res">
  <div class="resrow"><span class="rn"><b>Imposition des mains</b><small>réserve · repos long</small></span><span class="rv">${left}<small>/${pool}</small></span><button class="btn cast-go sm" data-a="loh-open"${(left ? "" : " disabled")}>Soigner</button></div>
  <div class="bar"><span style="width:${pool ? Math.round(100 * left / pool) : 0}%"></span></div>
  ${capRow(g, "ds", "Perception divine", "repos long", pips("ds", ds, Math.min(ds, g.dsU), "Perception divine"), true)}
  ${cd ? capRow(g, "cd", "Conduit divin", "repos court", pips("cd", cd, Math.min(cd, g.cdU), "Conduit divin")) : ""}
  </div>`;
}
const STYLES = {
  defense: { n: "Défense", k: "+1 CA", d: "+1 à la CA quand tu portes une armure." },
  duel: { n: "Duel", k: "+2 dégâts à une main", d: "+2 aux dégâts avec une arme de corps à corps tenue à une main, sans autre arme." },
  deuxmains: { n: "Arme à deux mains", k: "relance 1 et 2", d: "Avec une arme à deux mains ou polyvalente tenue à deux mains, relance les 1 et 2 des dés de dégâts (une fois)." },
  protection: { n: "Protection", k: "réaction, bouclier", d: "Avec un bouclier, réaction : désavantage à une attaque contre une créature à 1,5 m de toi." },
};
const auraR = g => g.level >= 18 ? "9 m" : "3 m";
const PAL_FEATS = [
  { id: "style", lv: 2, n: "Style de combat", pill: g => STYLES[g.style] ? `${STYLES[g.style].n} · ${STYLES[g.style].k}` : "à choisir", k: "f", d: g => STYLES[g.style] ? STYLES[g.style].d : "Choisis-le en mode Gérer : Défense, Duel, Arme à deux mains ou Protection." },
  { id: "health", lv: 3, n: "Santé divine", pill: () => "Immunisé aux maladies", k: "f", d: () => "La magie divine qui t'habite te rend immunisé contre les maladies." },
  { id: "extra", lv: 5, n: "Attaque supplémentaire", pill: () => "2 attaques par action", k: "f", d: () => "Quand tu prends l'action Attaquer, tu attaques deux fois au lieu d'une." },
  { id: "aprot", lv: 6, n: "Aura de protection", pill: g => `${signed(Math.max(1, R.am(g)))} aux JdS · ${auraR(g)}`, k: "s", d: g => `Toi et les créatures amicales à ${auraR(g)} ou moins ajoutez ton mod. de Charisme (${signed(Math.max(1, R.am(g)))}) à vos jets de sauvegarde, tant que tu es conscient.${g.level < 18 ? " 9 m au niveau 18." : ""}` },
  { id: "aconq", lv: 7, oath: "conquete", n: "Aura de conquête", pill: g => `${Math.floor(g.level / 2)} psychiques · ${auraR(g)}`, k: "d", d: g => `Une créature effrayée par toi qui commence son tour à ${auraR(g)} ou moins a une vitesse de 0 et subit ${Math.floor(g.level / 2)} dégâts psychiques (moitié de ton niveau de paladin). Se combine avec Présence conquérante.` },
  { id: "acour", lv: 10, n: "Aura de courage", pill: g => `pas d'effroi · ${auraR(g)}`, k: "s", d: g => `Toi et les créatures amicales à ${auraR(g)} ou moins ne pouvez pas être effrayés tant que tu es conscient.` },
  { id: "ismite", lv: 11, n: "Châtiment divin amélioré", pill: () => "+1d8 radiant à chaque coup", k: "d", d: () => "Chaque coup au corps à corps avec une arme inflige 1d8 dégâts radiants de plus (cumulable avec le Châtiment divin)." },
  { id: "cleanse", lv: 14, n: "Contact purifiant", pill: g => `${Math.max(1, R.am(g))} fois · repos long`, k: "f", d: g => `Action : mets fin à un sort qui affecte toi ou une créature consentante que tu touches. ${Math.max(1, R.am(g))} fois par repos long (mod. de Charisme).` },
  { id: "rebuke", lv: 15, oath: "conquete", n: "Réprimande méprisante", pill: g => `${Math.max(1, R.am(g))} psychiques à qui te frappe`, k: "d", d: g => `Quand une créature te touche avec une attaque, elle subit ${Math.max(1, R.am(g))} dégâts psychiques (mod. de Charisme), si tu n'es pas neutralisé.` },
  { id: "aura18", lv: 18, n: "Améliorations des auras", pill: () => "auras à 9 m", k: "f", d: () => "La portée de tes auras passe à 9 m." },
  { id: "invinc", lv: 20, oath: "conquete", n: "Conquérant invincible", pill: () => "1 fois · repos long", k: "f", d: () => "Action, 1 minute : résistance à tous les dégâts, une attaque de plus par action Attaquer, critique sur 19 ou 20. Une fois par repos long." },
];
// Volet Imposition des mains
function lohHTML(g) {
  const pool = PAL.loh(g), left = Math.max(0, pool - g.loh), n = Math.max(0, Math.min(left, S.lohAmt || 0));
  return `<div class="grab"></div><div class="head"><h2>Imposition des mains</h2><button class="btn ghost" data-a="loh-close" aria-label="Fermer">✕</button></div>
  <div class="lohv"><b>${left}</b> / ${pool} PV dans la réserve</div><div class="bar"><span style="width:${pool ? Math.round(100 * left / pool) : 0}%"></span></div>
  <span class="lusub">Soigner (action, au contact)</span>
  <div class="lohrow"><button class="btn" data-a="loh-dec" aria-label="Un PV de moins"${n > 1 ? "" : " disabled"}>−</button><span class="lohn" aria-live="polite">${n}</span><button class="btn" data-a="loh-inc" aria-label="Un PV de plus"${n < left ? "" : " disabled"}>+</button><span style="flex:1"></span><button class="btn cast-go" data-a="loh-go"${n ? "" : " disabled"}>Soigner ${n} PV</button></div>
  <div class="chips">${[5, 10].filter(v => v < left).map(v => `<button class="chip" data-a="loh-set" data-v="${v}">${v}</button>`).join("")}${left ? `<button class="chip" data-a="loh-set" data-v="${left}">Tout (${left})</button>` : ""}</div>
  <div class="lohcure"><span>Guérir une maladie ou neutraliser un poison</span><button class="btn" data-a="loh-cure"${left >= 5 ? "" : " disabled"}>−5 PV</button></div>
  <p class="help">Sans effet sur les morts-vivants et les artificiels. La réserve revient au repos long.</p>`;
}
function smiteHTML(g) {
  const slots = R.slots(g); if (!slots.length) return "";
  const ud = !!S.smiteUndead;
  return `<div class="smite"><div class="sh"><b>Châtiment divin</b><span class="muted">après un coup au corps à corps · radiant</span></div>
  <div class="sb">${slots.map((n, i) => { const lv = i + 1, left = slotsLeft(g, lv), d = PAL.smite(lv) + (ud ? 1 : 0);
    return `<button class="btn cast-go" data-a="smite" data-l="${lv}"${left ? "" : " disabled"}><b>Niv. ${lv} · ${d}d8</b><small>${left ? `${left} restant${left > 1 ? "s" : ""}` : "épuisé"}</small></button>`; }).join("")}</div>
  <label class="check"><input type="checkbox" data-a="smite-ud"${ud ? " checked" : ""}> Mort-vivant ou fiélon : +1d8 · critique : dés doublés</label></div>`;
}
onClick("ds-use", () => {
  const g = G(); if (!g || g.dsU >= PAL.ds(g)) return; const prev = g.dsU;
  mutate(g => { g.dsU = prev + 1; });
  toast(`<b>Perception divine</b> : célestes, fiélons et morts-vivants à 18 m · reste ${PAL.ds(g) - prev - 1}`, () => { mutate(g => { g.dsU = prev; }); return "Perception divine annulée"; });
});
onClick("cd-use", (b) => {
  const g = G(); if (!g || g.cdU >= PAL.cd(g)) return; const x = (OATHS[g.oath].cd || []).find(o => o.k === b.dataset.v); if (!x) return;
  const prev = JSON.parse(JSON.stringify({ cdU: g.cdU, effects: g.effects }));
  mutate(g => { g.cdU += 1; if (x.fx) g.effects.push({ k: fxKey(), id: "cd-" + x.k, name: x.n, d: x.fx, c: false, note: "" }); });
  toast(`<b>${x.n}</b> : Conduit divin utilisé${x.k === "guided" ? " · +10 au jet d'attaque" : ""}`, () => { mutate(g => { g.cdU = prev.cdU; g.effects = prev.effects; }); return "Conduit divin annulé"; });
});
onClick("loh-open", () => { const g = G(); if (!g) return; const left = PAL.loh(g) - g.loh; S.lohAmt = Math.min(5, left); S.lohOpen = true; render(); });
onClick("loh-close", () => { S.lohOpen = false; render(); });
onClick(["loh-inc", "loh-dec"], (b, a) => { const g = G(), left = PAL.loh(g) - g.loh; S.lohAmt = Math.max(1, Math.min(left, (S.lohAmt || 0) + (a === "loh-inc" ? 1 : -1))); render(); });
onClick("loh-set", (b) => { S.lohAmt = +b.dataset.v; render(); });
onClick(["loh-go", "loh-cure"], (b, a) => {
  const g = G(); if (!g) return; const left = PAL.loh(g) - g.loh, n = a === "loh-cure" ? 5 : Math.min(left, S.lohAmt || 0); if (n < 1 || n > left) return;
  const prev = g.loh; S.lohOpen = false;
  mutate(g => { g.loh += n; });
  toast(a === "loh-cure" ? "Imposition des mains : maladie ou poison neutralisé (−5 PV de réserve)" : `Imposition des mains : <b>${n} PV</b> soignés · reste ${left - n}`, () => { mutate(g => { g.loh = prev; }); return "Soin annulé"; });
});
onClick("smite", (b) => {
  const g = G(), lv = +b.dataset.l; if (!g || slotsLeft(g, lv) < 1) return;
  const d = PAL.smite(lv) + (S.smiteUndead ? 1 : 0), prev = JSON.parse(JSON.stringify(g.used));
  mutate(g => { g.used[lv] = (+(g.used[lv] || 0)) + 1; });
  toast(`<b>Châtiment divin</b> · niv. ${lv} : <b>${d}d8</b> radiants (critique : ${2 * d}d8)`, () => { mutate(g => { g.used = prev; }); return "Châtiment annulé"; });
});
onChange("smite-ud", t => { S.smiteUndead = t.checked; render(); });
onChange("#f-oath", t => { mutate(g => { g.oath = t.value; }); });
onChange("#f-style", t => { mutate(g => { g.style = t.value; }); });
// Serments du paladin : sorts toujours préparés, par niveau de paladin (Guide de Xanathar pour la Conquête)
const OATHS = {
  conquete: { n: "Conquête", full: "Serment de la conquête",
    cd: [
      { k: "presence", n: "Présence conquérante", fx: "1 minute", pills: g => [["f", "Effet", "Effrayée"], ["s", "Jet de la cible", `JdS SAG · DD ${8 + R.prof(g.level) + R.am(g)}`, "nouveau jet à chaque fin de tour"], ["n", "Zone", "9 m"], ["n", "Durée", "1 minute"]],
        e: "Action. Chaque créature de ton choix à 9 m ou moins qui rate son jet est effrayée." },
      { k: "guided", n: "Frappe guidée", btn: "Frappe guidée · +10", e: "+10 à un jet d'attaque, après avoir vu le d20 mais avant de savoir s'il touche." },
    ],
    sp: {3: ["armor-of-agathys", "command"], 5: ["hold-person", "spiritual-weapon"], 9: ["bestow-curse", "fear"], 13: ["dominate-beast", "stoneskin"], 17: ["cloudkill", "dominate-person"]} },
};
const oathSpells = g => { const o = isPal(g) && OATHS[g.oath]; if (!o) return []; return Object.entries(o.sp).filter(([lv]) => g.level >= +lv).flatMap(([, ids]) => ids).filter(id => BY_ID[id]); };
const isOath = (g, s) => !isWiz(g) && oathSpells(g).includes(s.id);
const PAL = {
  loh: g => 5 * g.level,                                   // Imposition des mains : réserve de PV
  ds: g => Math.max(1, 1 + R.am(g)),                       // Perception divine : 1 + mod. CHA, repos long
  cd: g => g.level >= 3 ? 1 : 0,                           // Conduit divin : 1, repos court
  smite: lv => Math.min(5, lv + 1),                        // Châtiment divin : 2d8 au niv. 1, +1d8 par niveau, 5d8 max
};

export { palResHTML, STYLES, auraR, PAL_FEATS, lohHTML, smiteHTML, OATHS, oathSpells, isOath, PAL };
