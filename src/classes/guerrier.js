// Guerrier (Manuel des joueurs 2014) : style de combat, Second souffle, Fougue, Attaque supplémentaire, Indomptable ;
// archétypes Champion, Maître de guerre (manœuvres, textes AideDD fournis par Fabien) et Chevalier occulte (tiers de lanceur,
// sorts de magicien d'abjuration et d'évocation). Classe sans sorts sauf en Chevalier occulte (niveau 3) : onglet Capacités, puis Sorts.
// Résumés rédigés pour la table, à vérifier dans le livre.
import { onChange, onClick } from "../core/actions.js";
import { THIRD, THIRD_KNOWN, thirdFree, thirdOk } from "../rules/tables.js";
import { stylesOf, styleAC, styleMods, styleNotes } from "../rules/styles.js";
import { byName, esc, signed } from "../core/format.js";
import { G, S } from "../core/state.js";
import { mutate } from "../core/store.js";
import { render, toast } from "../core/ui.js";
import { BY_ID, SPELLS } from "../data.js";
import { abilitiesHTML } from "../features/abilities.js";
import { pCantrips, pDots, pFoot, pHeader, pSlots, pSpellRow, printHTML } from "../features/print.js";
import { castingRules, concentrationRules } from "../features/rules.js";
import { initiative } from "../rules/character.js";
import { R, classSpells } from "../rules/common.js";
import { TOOL_LISTS } from "../rules/creation.js";
import { acOf } from "../rules/equipment.js";
import { heal, hpCur } from "../rules/hp.js";
import { capRow, pickRow, pillsRaw, statLabel } from "../ui/components.js";

// ---------- Tables
const STYLES = stylesOf(["archerie", "deuxmains", "deuxarmes", "defense", "duel", "protection"]); // les six styles du guerrier (AideDD)
const ARCH = {
  champion: { n: "Champion", full: "Champion", sum: "Critique 19-20 (18-20 au niveau 15), Athlète remarquable, second style de combat (10), Survivant (18)." },
  mdg: { n: "Maître de guerre", full: "Maître de guerre", sum: "Dés de supériorité et manœuvres, Étudiant de la guerre (un outil d'artisan), Connaissez votre ennemi (7)." },
  ek: { n: "Chevalier occulte", full: "Chevalier occulte", sum: "Sorts de magicien (surtout abjuration et évocation), Arme liée, Magie de guerre (7), Frappe occulte (10), Charge arcanique (15)." },
};
// Manœuvres (AideDD) : pills = pastilles clés ({d} = dé de supériorité)
const MAN = {
  menacante: { n: "Attaque menaçante", p: [["d", "+{d} dégâts"], ["s", "JdS SAG"]], d: "Au toucher avec une arme : ajoute le dé aux dégâts ; la cible fait un JdS de Sagesse ou est effrayée jusqu'à la fin de ton prochain tour." },
  precise: { n: "Attaque précise", p: [["a", "+{d} au jet d'attaque"]], d: "Quand tu attaques avec une arme : ajoute le dé au jet d'attaque, avant ou après le jet, mais avant l'effet." },
  balayage: { n: "Balayage", p: [["d", "{d} à une 2e cible"]], d: "Au toucher au corps à corps : une autre créature à 1,50 m de la cible et à ta portée subit le dé en dégâts (même type) si ton jet d'attaque la touche aussi." },
  croc: { n: "Croc-en-jambe", p: [["d", "+{d} dégâts"], ["s", "JdS FOR"]], d: "Au toucher avec une arme : ajoute le dé aux dégâts ; si la cible est de taille G ou moins, elle fait un JdS de Force ou tombe à terre." },
  desarmement: { n: "Désarmement", p: [["d", "+{d} dégâts"], ["s", "JdS FOR"]], d: "Au toucher avec une arme : ajoute le dé aux dégâts ; la cible fait un JdS de Force ou lâche un objet de ton choix qu'elle tient (il tombe à ses pieds)." },
  diversion: { n: "Diversion", p: [["d", "+{d} dégâts"], ["f", "avantage à un allié"]], d: "Au toucher avec une arme : ajoute le dé aux dégâts ; la prochaine attaque contre la cible par un autre que toi a l'avantage, avant le début de ton prochain tour." },
  feinte: { n: "Feinte", p: [["f", "avantage"], ["n", "action bonus"]], d: "Action bonus, une créature à 1,50 m : avantage à ta prochaine attaque contre elle ce tour-ci ; si elle touche, ajoute le dé aux dégâts." },
  fente: { n: "Fente", p: [["f", "allonge +1,50 m"], ["d", "+{d} dégâts"]], d: "Attaque au corps à corps pendant ton tour : allonge augmentée de 1,50 m ; si elle touche, ajoute le dé aux dégâts." },
  instruction: { n: "Instruction", p: [["f", "attaque d'un allié"], ["n", "action bonus"]], d: "Pendant l'action Attaquer, renonce à une attaque et utilise une action bonus : un allié qui te voit ou t'entend fait une attaque d'arme avec sa réaction, en ajoutant le dé aux dégâts." },
  jeu: { n: "Jeu de jambes défensif", p: [["f", "+{d} CA pendant le déplacement"]], d: "Quand tu te déplaces : ajoute le dé à ta CA jusqu'à la fin de ce déplacement." },
  tactique: { n: "Manœuvre tactique", p: [["d", "+{d} dégâts"], ["f", "un allié se déplace"]], d: "Au toucher avec une arme : ajoute le dé aux dégâts ; un allié qui te voit ou t'entend peut, avec sa réaction, se déplacer de la moitié de sa vitesse sans provoquer d'attaque d'opportunité de la cible." },
  parade: { n: "Parade", p: [["f", "−({d} + DEX) dégâts"], ["n", "réaction"]], d: "Quand une créature te touche au corps à corps, réaction : réduis les dégâts du résultat du dé + ton modificateur de Dextérité." },
  provocation: { n: "Provocation", p: [["d", "+{d} dégâts"], ["s", "JdS SAG"]], d: "Au toucher avec une arme : ajoute le dé aux dégâts ; la cible fait un JdS de Sagesse ou a un désavantage aux attaques contre d'autres que toi jusqu'à la fin de ton prochain tour." },
  regain: { n: "Regain", p: [["f", "{d} + CHA PV temp."], ["n", "action bonus"]], d: "Action bonus : un allié qui te voit ou t'entend gagne des PV temporaires égaux au dé + ton modificateur de Charisme." },
  repousser: { n: "Repousser", p: [["d", "+{d} dégâts"], ["s", "JdS FOR"]], d: "Au toucher avec une arme : ajoute le dé aux dégâts ; si la cible est de taille G ou moins, elle fait un JdS de Force ou est repoussée de 4,50 m." },
  riposte: { n: "Riposte", p: [["d", "+{d} dégâts"], ["n", "réaction"]], d: "Quand une créature te rate au corps à corps, réaction : une attaque d'arme au corps à corps contre elle ; si elle touche, ajoute le dé aux dégâts." },
};
// Chevalier occulte : tiers de lanceur
const EK_SLOTS = THIRD, EK_KNOWN = THIRD_KNOWN;
const EK_SCHOOLS = ["Abjuration", "Évocation"];
const WIZ = () => SPELLS.filter(s => (s.cl || []).includes("magicien")).map(s => s.id);
const ek = g => g.garch === "ek" && g.level >= 3;
const mdg = g => g.garch === "mdg" && g.level >= 3;
const champ = g => g.garch === "champion" && g.level >= 3;
const GUE = {
  attacks: lv => lv >= 20 ? 4 : lv >= 11 ? 3 : lv >= 5 ? 2 : 1,
  surge: lv => lv >= 17 ? 2 : lv >= 2 ? 1 : 0,
  ind: lv => lv >= 17 ? 3 : lv >= 13 ? 2 : lv >= 9 ? 1 : 0,
  supN: lv => lv >= 15 ? 6 : lv >= 7 ? 5 : 4,
  supD: lv => lv >= 18 ? "d12" : lv >= 10 ? "d10" : "d8",
  manN: lv => lv >= 15 ? 9 : lv >= 10 ? 7 : lv >= 7 ? 5 : lv >= 3 ? 3 : 0,
  dd: g => 8 + R.prof(g.level) + Math.max(R.ab(g, "str"), R.ab(g, "dex")),
  crit: g => g.level >= 15 ? "18-20" : "19-20",
  free: lv => thirdFree(lv), // Chevalier occulte : sorts d'une école libre
};
const styles = g => [g.style, champ(g) && g.level >= 10 ? g.gstyle2 : ""].filter(k => STYLES[k]);
const manPills = (g, k) => MAN[k].p.map(([c, t]) => `<span class="kp ${c}">${esc(t.replace("{d}", GUE.supD(g.level)).replace("JdS SAG", `JdS SAG ${GUE.dd(g)}`).replace("JdS FOR", `JdS FOR ${GUE.dd(g)}`))}</span>`).join("");

// ---------- Capacités
const FEATS = [
  { lv: 1, n: "Style de combat", k: "f", control: g => styleSel("f-gstyle", g.style), pill: g => STYLES[g.style] ? `${STYLES[g.style].n} · ${STYLES[g.style].k}` : "à choisir", d: g => STYLES[g.style] ? STYLES[g.style].d : "Archerie, Défense, Duel, Arme à deux mains, Protection ou Combat à deux armes (mode Gérer)." },
  { lv: 1, n: "Second souffle", k: "f", pill: g => `1d10 + ${g.level} PV · repos court`, d: g => `Action bonus : tu regagnes 1d10 + ${g.level} PV. Une fois par repos court ou long.` },
  { lv: 2, n: "Fougue", k: "f", pill: g => `${GUE.surge(g.level)} action${GUE.surge(g.level) > 1 ? "s" : ""} de plus · repos court`, d: g => `À ton tour, une action de plus. Une fois par repos court ou long${g.level >= 17 ? " (deux fois au niveau 17, mais une seule par tour)" : ""}.` },
  { lv: 3, n: "Archétype martial", k: "f", pill: g => ARCH[g.garch].full, d: g => `${ARCH[g.garch].full} : ${ARCH[g.garch].sum}` },
  { lv: 3, c: "champion", n: "Critique amélioré", k: "d", pill: g => `critique ${GUE.crit(g)}`, d: g => `Tes attaques d'arme sont des coups critiques sur ${GUE.crit(g)} (19-20, puis 18-20 au niveau 15).` },
  { lv: 3, c: "mdg", n: "Supériorité martiale", k: "d", pill: g => `${GUE.supN(g.level)} ${GUE.supD(g.level)} · ${GUE.manN(g.level)} manœuvres`, d: g => `${GUE.supN(g.level)} dés de supériorité (${GUE.supD(g.level)}), récupérés au repos court ou long. ${GUE.manN(g.level)} manœuvres connues (3, puis 5 au 7, 7 au 10, 9 au 15) ; une remplaçable à chaque passage de niveau. DD ${GUE.dd(g)} (8 + maîtrise + FOR ou DEX).` },
  { lv: 3, c: "mdg", n: "Étudiant de la guerre", k: "f", control: g => `<select id="f-gtool" aria-label="Outil d'artisan"><option value="">Choisir un outil d'artisan…</option>${TOOL_LISTS.artisan.map(t => `<option${g.gtool === t ? " selected" : ""}>${esc(t)}</option>`).join("")}</select>`, pill: g => g.gtool || "outil à choisir", d: () => "Tu maîtrises un outil d'artisan de ton choix." },
  { lv: 3, c: "ek", n: "Incantation", k: "f", pill: g => `${EK_KNOWN[g.level]} sorts connus · INT`, d: g => `Sorts de magicien, Intelligence (DD ${8 + R.prof(g.level) + R.ab(g, "int")}). Abjuration ou évocation, sauf ${GUE.free(g.level)} sort${GUE.free(g.level) > 1 ? "s" : ""} d'une école libre (niveaux 3, 8, 14, 20). Sorts mineurs : ${g.level >= 10 ? 3 : 2}.` },
  { lv: 3, c: "ek", n: "Arme liée", k: "f", pill: () => "2 armes · action bonus", d: () => "Rituel d'une heure (repos court) : lie-toi à une arme (deux au plus). Tu ne peux pas être désarmé de cette arme, sauf si tu es neutralisé ; sur le même plan, action bonus pour la faire apparaître dans ta main." },
  { lv: 5, n: "Attaque supplémentaire", k: "f", pill: g => `${GUE.attacks(g.level)} attaques par action`, d: g => `Quand tu prends l'action Attaquer, tu attaques ${GUE.attacks(g.level)} fois (2 au niveau 5, 3 au 11, 4 au 20).` },
  { lv: 7, c: "champion", n: "Athlète remarquable", k: "f", pill: g => `+${Math.ceil(R.prof(g.level) / 2)} FOR, DEX, CON sans maîtrise`, d: g => `Moitié de ta maîtrise (arrondie au supérieur, +${Math.ceil(R.prof(g.level) / 2)}) aux tests de Force, Dextérité et Constitution sans maîtrise, calculée (initiative comprise). Saut en longueur avec élan : +${(0.3 * R.ab(g, "str")).toFixed(1).replace(".", ",")} m (30 cm par point de modificateur de FOR).` },
  { lv: 7, c: "mdg", n: "Connaissez votre ennemi", k: "f", pill: () => "1 minute d'observation", d: () => "Après une minute à observer une créature hors combat, le MJ te dit si elle t'est égale, supérieure ou inférieure sur deux critères : FOR, DEX, CON, CA, PV actuels, niveau de classe, niveaux de guerrier." },
  { lv: 7, c: "ek", n: "Magie de guerre", k: "f", pill: g => g.level >= 18 ? "sort + attaque (action bonus)" : "sort mineur + attaque (action bonus)", d: g => g.level >= 18 ? "Quand tu lances un sort avec ton action, tu peux faire une attaque d'arme en action bonus (Magie de guerre améliorée)." : "Quand tu lances un sort mineur avec ton action, tu peux faire une attaque d'arme en action bonus." },
  { lv: 9, n: "Indomptable", k: "f", pill: g => `${GUE.ind(g.level)} · repos long`, d: g => `Relance un jet de sauvegarde raté (le nouveau résultat compte). ${GUE.ind(g.level)} fois par repos long (2 au niveau 13, 3 au 17).` },
  { lv: 10, c: "champion", n: "Style de combat supplémentaire", k: "f", control: g => styleSel("f-gstyle2", g.gstyle2, g.style), pill: g => STYLES[g.gstyle2] ? `${STYLES[g.gstyle2].n} · ${STYLES[g.gstyle2].k}` : "à choisir", d: g => STYLES[g.gstyle2] ? STYLES[g.gstyle2].d : "Un second style de combat (mode Gérer)." },
  { lv: 10, c: "ek", n: "Frappe occulte", k: "f", pill: () => "désavantage au JdS contre ton sort", d: () => "Quand tu touches une créature avec une attaque d'arme, elle a un désavantage au prochain JdS contre un de tes sorts avant la fin de ton prochain tour." },
  { lv: 15, c: "ek", n: "Charge arcanique", k: "f", pill: () => "Fougue : téléport 9 m", d: () => "Quand tu utilises ta Fougue, tu peux te téléporter de 9 m vers un espace inoccupé que tu vois, avant ou après l'action supplémentaire." },
  { lv: 18, c: "champion", n: "Survivant", k: "f", pill: g => `+${5 + R.ab(g, "con")} PV par tour`, d: g => `Au début de chacun de tes tours, si tu as au plus la moitié de tes PV (et au moins 1), tu regagnes ${5 + R.ab(g, "con")} PV (5 + CON).` },
];
const feats = g => FEATS.filter(f => !f.c || f.c === g.garch).map((f, i) => ({ id: "g" + i, ...f }));
const styleSel = (id, cur, other) => `<select id="${id}" aria-label="Style de combat"><option value="">À choisir</option>${Object.entries(STYLES).filter(([k]) => k !== other).map(([k, s]) => `<option value="${k}"${cur === k ? " selected" : ""}>${s.n}</option>`).join("")}</select>`;
onChange("#f-gstyle", t => { mutate(g => { g.style = t.value; }); });
onChange("#f-gstyle2", t => { mutate(g => { g.gstyle2 = t.value; }); });
onChange("#f-garch", t => { mutate(g => { g.garch = t.value; }); });
onChange("#f-gtool", t => { mutate(g => { g.gtool = t.value || ""; }); });

// ---------- En jeu : Second souffle, Fougue, Indomptable, dés de supériorité
const pipRow = (r, n, u, lbl) => Array.from({ length: n }, (_, k) => `<button class="pip${k < Math.min(n, u) ? " used" : ""}" data-a="res-pip" data-r="${r}" data-k="${k}" aria-label="${lbl} ${k + 1}, ${k < u ? "utilisé" : "disponible"}"></button>`).join("");
function swBody(g) {
  const used = g.swU >= 1;
  return `${pillsRaw([["f", "Soins", `1d10 + ${g.level} PV`], ["n", "Temps", "action bonus"]])}
  ${used ? `<span class="muted" style="font-size:12.5px">Déjà utilisé : il revient au repos court ou long.</span>` : `<div class="hpin"><input id="sw-n" type="number" inputmode="numeric" min="1" max="10" placeholder="1d10" aria-label="Résultat du d10"><button class="btn cast-go sm" data-a="sw-go">Se soigner</button></div><span class="muted" style="font-size:12.5px">Tape le résultat du d10 : ${g.level} s'ajoute et tes PV sont mis à jour.</span>`}`;
}
function supBody(g) {
  const left = GUE.supN(g.level) - Math.min(GUE.supN(g.level), g.supU), list = (g.mano || []).filter(k => MAN[k]);
  if (!list.length) return `<span class="muted">Aucune manœuvre connue : choisis-les dans Gérer.</span>`;
  return list.map(k => `<div class="capopt"><b>${esc(MAN[k].n)}</b><span class="kps">${manPills(g, k)}</span><div class="eff">${esc(MAN[k].d)}</div><div class="cast"><button class="btn cast-go sm" data-a="man-use" data-v="${k}"${left ? "" : " disabled"}>Utiliser · ${GUE.supD(g.level)}</button></div></div>`).join("")
    + `<span class="muted" style="font-size:12.5px">${left} dé${left > 1 ? "s" : ""} restant${left > 1 ? "s" : ""} · DD ${GUE.dd(g)} · repos court ou long.</span>`;
}
function resHTML(g) {
  let h = `<div class="rubric"><h2>Ressources du guerrier</h2></div><div class="slots res">`;
  h += capRow(g, "sw", "Second souffle", "repos court", pipRow("sw", 1, g.swU, "Second souffle"), false, swBody);
  if (GUE.surge(g.level)) h += capRow(g, "surge", "Fougue", "repos court", pipRow("surge", GUE.surge(g.level), g.surgeU, "Fougue"), true, () => `<div class="eff">Une action de plus à ce tour.${ek(g) && g.level >= 15 ? " Charge arcanique : téléport de 9 m avant ou après." : ""}</div>`);
  if (mdg(g)) h += capRow(g, "sup", `Dés de supériorité <span class="kp p">${GUE.supD(g.level)}</span>`, "repos court", pipRow("sup", GUE.supN(g.level), g.supU, "Dé de supériorité"), true, supBody);
  if (GUE.ind(g.level)) h += capRow(g, "ind", "Indomptable", "repos long", pipRow("ind", GUE.ind(g.level), g.indU, "Indomptable"), true, () => `<div class="eff">Relance un jet de sauvegarde raté ; le nouveau résultat compte.</div>`);
  return h + `</div>`;
}
onClick("sw-go", () => { const g = G(), el = document.getElementById("sw-n"), n = Math.floor(+(el && el.value) || 0); if (!g || g.swU) return;
  if (n < 1 || n > 10) { toast("Tape le résultat du d10 (1 à 10)"); if (el) el.focus(); return; }
  const prev = JSON.parse(JSON.stringify({ hp: g.hp, swU: g.swU, death: g.death })); let got = 0;
  mutate(g => { got = heal(g, n + g.level); g.swU = 1; });
  toast(`<b>Second souffle</b> : ${n} + ${g.level} → <b>+${got} PV</b> · ${hpCur(G())}/${g.hpMax}`, () => { mutate(g => Object.assign(g, prev)); return "Second souffle annulé"; }); });
onClick("man-use", (b) => { const g = G(), k = b.dataset.v; if (!g || !MAN[k] || g.supU >= GUE.supN(g.level)) return; const prev = g.supU;
  mutate(g => { g.supU = prev + 1; });
  toast(`<b>${esc(MAN[k].n)}</b> : lance le ${GUE.supD(g.level)} · reste ${GUE.supN(g.level) - prev - 1}`, () => { mutate(g => { g.supU = prev; }); return "Dé de supériorité rendu"; }); });

// ---------- Gérer : manœuvres (liste dépliable commune)
function manPicker(g, sel, max, lu, locked = []) {
  return `<div class="luplist">${Object.entries(MAN).sort((a, b) => a[1].n.localeCompare(b[1].n, "fr")).map(([k, m]) => pickRow({ act: lu ? 'data-a="lu-gman"' : 'data-a="g-man"', id: "man-" + k, on: sel.includes(k), full: sel.length >= max || locked.length > 0, name: esc(m.n), label: m.n, pills: manPills(g, k), body: `<div class="eff">${esc(m.d)}</div>` })).join("")}</div>`;
}
function settingsHTML(g) {
  if (!mdg(g)) return "";
  const n = GUE.manN(g.level), sel = (g.mano || []).filter(k => MAN[k]), open = S.open.has("g:man");
  return `<div class="rubric"><h2>Manœuvres</h2><span class="aside">${sel.length} sur ${n} · DD ${GUE.dd(g)}</span></div>
  <div class="invlist">${sel.map(k => `<div class="invrow"><span class="invstar" aria-hidden="true">✦</span><b>${esc(MAN[k].n)}</b><span class="kps">${manPills(g, k)}</span><small>${esc(MAN[k].d)}</small></div>`).join("") || `<div class="empty">Aucune manœuvre choisie.</div>`}</div>
  <button class="linkbtn" data-a="row" data-id="g:man" aria-expanded="${open}">${open ? "Fermer le choix ▴" : sel.length < n ? `Choisir ${n - sel.length} manœuvre${n - sel.length > 1 ? "s" : ""} ▾` : "Modifier le choix ▾"}</button>
  ${open ? manPicker(g, sel, n, false) : ""}`;
}
onClick("g-man", (b) => { const g = G(), k = b.dataset.id.replace("man-", ""); if (!g || !MAN[k]) return; const s = g.mano || [], want = !s.includes(k);
  if (want && s.length >= GUE.manN(g.level)) { toast(`${GUE.manN(g.level)} manœuvres : retire d'abord une manœuvre`); return; }
  mutate(g => { g.mano = want ? [...s, k] : s.filter(x => x !== k); }); });

// ---------- Assistant de niveau : manœuvres (gagnées, une à remplacer), outil, second style (Champion 10)
function luChoices(g, b, L) {
  let h = "";
  if (b.garch === "mdg" && b.level >= 3) { const n = GUE.manN(b.level), old = g.level >= 3 && g.garch === "mdg" ? g.mano || [] : [], sel = L.gman || old, gone = old.filter(k => !sel.includes(k)).length;
    h += `<div class="luprep"><h3>Manœuvres · ${sel.length}/${n}</h3><span class="muted">${n > old.length ? `${n - old.length} à choisir. ` : ""}${old.length ? `Tu peux aussi en remplacer une : retire-la (✓) puis choisis-en une autre${gone ? ` (${gone} remplacée)` : ""}.` : "Touche un nom pour lire la manœuvre."}</span>${manPicker(b, sel, n, true)}</div>`;
    if (b.level === 3) h += `<div class="luprep"><h3>Étudiant de la guerre · outil d'artisan</h3><select id="lu-gtool" aria-label="Outil d'artisan"><option value="">Choisir…</option>${TOOL_LISTS.artisan.map(t => `<option${L.gtool === t ? " selected" : ""}>${esc(t)}</option>`).join("")}</select></div>`; }
  if (b.garch === "champion" && b.level === 10) h += `<div class="luprep"><h3>Style de combat supplémentaire</h3><div class="chips">${Object.entries(STYLES).filter(([k]) => k !== g.style).map(([k, s]) => `<button class="chip" data-a="lu-gstyle2" data-v="${k}" aria-pressed="${L.gstyle2 === k}">${s.n}</button>`).join("")}</div>${STYLES[L.gstyle2] ? `<span class="muted" style="font-size:13px">${esc(STYLES[L.gstyle2].d)}</span>` : ""}</div>`;
  return h;
}
onClick("lu-gman", (b) => { const L = S.lu, g = G(); if (!L || !g) return; const k = b.dataset.id.replace("man-", ""), old = g.level >= 3 && g.garch === "mdg" ? g.mano || [] : [], sel = L.gman || [...old], n = GUE.manN(L.to);
  if (!sel.includes(k)) { if (sel.length >= n) { toast(`${n} manœuvres à ce niveau : retire d'abord une manœuvre`); return; } L.gman = [...sel, k]; }
  else { if (old.includes(k) && old.filter(x => !sel.includes(x)).length >= 1) { toast("Une seule manœuvre remplacée par niveau"); return; } L.gman = sel.filter(x => x !== k); }
  S.luKeep = true; render(); });
onChange("#lu-gtool", t => { if (!S.lu) return; S.lu.gtool = t.value || ""; S.luKeep = true; render(); });
onClick("lu-gstyle2", (b) => { if (!S.lu) return; S.lu.gstyle2 = b.dataset.v; S.luKeep = true; render(); });

// ---------- Création (étape Compétences) : style de combat du niveau 1
const creation = {
  html: c => { const x = c.cx || {};
    return `<div class="crcls"><span class="lusub">Style de combat · dès le niveau 1</span><div class="chips">${Object.entries(STYLES).map(([k, s]) => `<button class="chip" data-a="cr-gstyle" data-v="${k}" aria-pressed="${x.style === k}">${s.n}</button>`).join("")}</div>${STYLES[x.style] ? `<span class="fpprev">${esc(STYLES[x.style].d)}</span>` : ""}</div>`; },
  missing: c => STYLES[(c.cx || {}).style] ? "" : "choisis ton style de combat",
  apply: (g, c) => { const x = c.cx || {}; if (STYLES[x.style]) g.style = x.style; },
};
onClick("cr-gstyle", (b) => { if (!S.cr) return; S.cr.cx = { ...(S.cr.cx || {}), style: b.dataset.v }; S.luKeep = true; render(); });

// ---------- Onglet Règles
function rulesHTML(g) {
  return `<div class="cols rules">
  <div><div class="rubric" style="margin-top:4px"><h3>Second souffle et Fougue</h3></div>
  <p><b>Second souffle</b> (action bonus) : 1d10 + ${g.level} PV, une fois par repos court. <b>Fougue</b> (niveau 2) : une action de plus à ton tour, une fois par repos court (deux au niveau 17).</p>
  <div class="rubric"><h3>Attaques</h3></div><p><b>${GUE.attacks(g.level)} attaque${GUE.attacks(g.level) > 1 ? "s" : ""}</b> par action Attaquer (2 au niveau 5, 3 au 11, 4 au 20). Styles de combat : ${styles(g).map(k => `<b>${STYLES[k].n}</b> (${esc(STYLES[k].d)})`).join(" ; ") || "à choisir"}.</p>
  <div class="rubric"><h3>Indomptable</h3></div><p>Dès le niveau 9 : relance un jet de sauvegarde raté, 1 fois par repos long (2 au 13, 3 au 17).</p></div>
  <div><div class="rubric" style="margin-top:4px"><h3>${esc(ARCH[g.garch].full)}</h3></div><p>${esc(ARCH[g.garch].sum)}</p>
  ${g.garch === "mdg" ? `<p>Dés de supériorité : <b>${GUE.supN(g.level)} ${GUE.supD(g.level)}</b>, repos court. Manœuvres : DD ${GUE.dd(g)}.</p>` : ""}
  ${g.garch === "ek" && g.level >= 3 ? `<p>Sorts connus : ${R.prepMax(g)}, en abjuration ou évocation sauf ${GUE.free(g.level)} d'une école libre. Intelligence pour les sorts.</p>${castingRules(g)}${concentrationRules()}` : ""}
  <p class="muted">Source : Manuel des joueurs 2014 (guerrier) ; manœuvres d'après AideDD. Résumés rédigés pour la table, à vérifier dans le livre en cas de doute.</p></div></div>`;
}
// ---------- Fiche imprimable
function printSheet(g) {
  const known = ek(g) ? g.prepared.map(id => BY_ID[id]).filter(Boolean).sort((a, b) => a.l - b.l || byName(a, b)) : [];
  return `${pHeader(g, `Guerrier, niveau ${g.level}${g.level >= 3 ? ` · ${esc(ARCH[g.garch].full)}` : ""}`, [[GUE.attacks(g.level), "ATTAQUES / ACTION"], [acOf(g) ?? "?", "CA"], [signed(R.prof(g.level)), "MAÎTRISE"], [champ(g) ? GUE.crit(g) : "20", "CRITIQUE"], ...(mdg(g) ? [[`${GUE.supN(g.level)} ${GUE.supD(g.level)}`, "SUPÉRIORITÉ"]] : ek(g) ? [[8 + R.prof(g.level) + R.ab(g, "int"), "DD DES SORTS"]] : [])])}
${ek(g) ? pSlots(g) : ""}
<h2>Ressources <small>à cocher</small></h2>
<div class="res"><span class="l">Second souffle</span>${pDots(1)}<span class="r">1d10 + ${g.level} PV · repos court</span></div>
${GUE.surge(g.level) ? `<div class="res"><span class="l">Fougue</span>${pDots(GUE.surge(g.level))}<span class="r">repos court</span></div>` : ""}
${mdg(g) ? `<div class="res"><span class="l">Dés de supériorité (${GUE.supD(g.level)})</span>${pDots(GUE.supN(g.level))}<span class="r">repos court · DD ${GUE.dd(g)}</span></div>` : ""}
${GUE.ind(g.level) ? `<div class="res"><span class="l">Indomptable</span>${pDots(GUE.ind(g.level))}<span class="r">repos long</span></div>` : ""}
<h2>Capacités de classe <small>niveau ${g.level}</small></h2>
<table>${feats(g).filter(f => f.lv <= g.level).map(f => `<tr><td class="n">${f.n}</td><td>${esc(f.d(g))}</td></tr>`).join("")}</table>
${mdg(g) && (g.mano || []).length ? `<h2>Manœuvres</h2><table>${g.mano.filter(k => MAN[k]).map(k => `<tr><td class="n">${esc(MAN[k].n)}</td><td>${esc(MAN[k].d)}</td></tr>`).join("")}</table>` : ""}
${ek(g) ? `${pCantrips(g)}<h2>Sorts connus <small>${known.length} / ${R.prepMax(g)}</small></h2>${known.length ? `<table><tr><th>Sort</th><th>Incantation · composantes</th><th>Effet</th></tr>${known.map(s => pSpellRow(g, s, false)).join("")}</table>` : "<p>Aucun sort connu pour l'instant.</p>"}` : ""}
${pFoot("ATELIER DU GRIMOIRE · GUERRIER")}`;
}

// ---------- Définition de la classe (contrat : voir docs/ARCHITECTURE.md) ----------
const row = (l, o, n, cls) => `<div class="${o === n ? "same" : ""}"><span>${l}</span><span class="old">${o}</span><span class="ar">→</span><b${cls && o !== n ? ` style="color:var(${cls})"` : ""}>${n}</b></div>`;
const SHORT = ["swU", "surgeU", "supU"];
export default {
  n: "Guerrier", fileLabel: "Guerrier", hitDie: "1d10",
  noSpells: g => !ek(g),                                              // sorts seulement en Chevalier occulte (niveau 3)
  ab: "int", abN: "Intelligence", abArticle: "l'Intelligence",
  slots: g => g.garch === "ek" ? EK_SLOTS : {}, top: 4,
  cantrips: () => 0, cantripBonus: g => g.garch === "ek" && g.level >= 3 ? (g.level >= 10 ? 3 : 2) : 0,
  known: lv => EK_KNOWN[lv] || 0, prep: () => 0,
  extraList: g => g.garch === "ek" ? WIZ() : [],                     // liste du magicien
  knownOk: (g, s, ids) => g.garch === "ek" ? thirdOk(g.level, EK_SCHOOLS, s, ids, BY_ID) : "",
  saves: ["str", "con"],
  weaponProf: ["simple", "martial"], armorProf: ["light", "medium", "heavy", "shield"],
  asiLevels: [4, 6, 8, 12, 14, 16, 19],
  tools: g => g.garch === "mdg" && g.level >= 3 && g.gtool ? [g.gtool] : [],
  halfProf: (g, ab) => champ(g) && g.level >= 7 && ["str", "dex", "con"].includes(ab) ? "up" : false, // Athlète remarquable
  defaults: () => ({ garch: "champion", style: "", gstyle2: "", mano: [], gtool: "", swU: 0, surgeU: 0, supU: 0, indU: 0 }),
  normalize(o) { if (!ARCH[o.garch]) o.garch = "champion"; if (typeof o.style !== "string") o.style = ""; if (!STYLES[o.gstyle2]) o.gstyle2 = "";
    o.mano = Array.isArray(o.mano) ? [...new Set(o.mano)].filter(k => MAN[k]) : []; o.gtool = typeof o.gtool === "string" ? o.gtool : "";
    ["swU", "surgeU", "supU", "indU"].forEach(f => { o[f] = Math.max(0, +o[f] || 0); }); },
  subclass: { lv: 3, label: "Archétype martial", field: "garch", opts: () => Object.entries(ARCH).map(([k, a]) => [k, a.full, a.sum]) },
  subline: g => `Guerrier niveau ${g.level}${g.level >= 3 ? ` · ${esc(ARCH[g.garch].full)}` : ""}`,
  subclassField: g => `<div class="field"><label for="f-garch">Archétype martial</label><select id="f-garch">${Object.entries(ARCH).map(([k, o]) => `<option value="${k}"${k === g.garch ? " selected" : ""}>${o.n}</option>`).join("")}</select></div>`,
  heroStats: g => {
    const st = (v, f, s, cls = "") => `<div class="stat${cls}" role="listitem"><div class="v">${v}</div>${statLabel(f, s)}</div>`;
    const sw = st(`${1 - Math.min(1, g.swU)}<small>/1</small>`, "Second souffle", "Souffle"), atk = st(GUE.attacks(g.level), "Attaques par action", "Attaques");
    if (ek(g) && S.tab !== "caps") return atk + sw; // en-tête des sorts (onglet Sorts) : 4 cases de sorts + 2
    return atk + st(acOf(g) ?? "?", "CA", "CA") + sw + (mdg(g) ? st(`${GUE.supN(g.level) - Math.min(GUE.supN(g.level), g.supU)}<small>/${GUE.supN(g.level)}</small>`, `Dés de supériorité (${GUE.supD(g.level)})`, GUE.supD(g.level))
      : st(champ(g) ? GUE.crit(g) : "20", "Critique", "Critique")) + st(signed(initiative(g)), "Initiative", "Initiative") + st(signed(R.prof(g.level)), "Maîtrise", "Maîtrise");
  },
  tabs: g => [["caps", "Capacités"], ...(ek(g) ? [["grimoire", "Sorts"], ["biblio", "Bibliothèque", classSpells(g).length]] : [])],
  moreTabs: () => [["regles", "Règles"], ["imprimer", "Imprimer"]],
  panels: { caps: g => abilitiesHTML(g), regles: g => rulesHTML(g), imprimer: g => printHTML(g) },
  print: g => printSheet(g),
  printTitle: g => `Fiche de guerrier de ${g.name}`,
  printDesc: "Elle contient la page Personnage, les ressources à cocher (Second souffle, Fougue, dés de supériorité, Indomptable), toutes les capacités de ton niveau, les manœuvres ou les sorts du Chevalier occulte.",
  features: g => feats(g),
  capsSettings: g => settingsHTML(g),
  resources: g => resHTML(g),
  resourceMax: { sw: () => 1, surge: g => GUE.surge(g.level), sup: g => GUE.supN(g.level), ind: g => GUE.ind(g.level) },
  shortRest: () => ({ fields: SHORT, label: "Second souffle, Fougue et dés de supériorité", done: "récupérés", reset: g => { SHORT.forEach(f => { g[f] = 0; }); } }),
  longOnly: g => [g.indU ? "Indomptable" : ""],
  longRest: g => { SHORT.forEach(f => { g[f] = 0; }); g.indU = 0; },
  acBonus: (g, armor) => styleAC(styles(g), armor),
  attackMods: (g, w, ab, off) => { const x = styleMods(g, styles(g), w, off); if (champ(g)) x.pills.push(`critique ${GUE.crit(g)}`); return x; },
  attackNotes: g => [GUE.attacks(g.level) > 1 ? `<b>Attaque supplémentaire</b> : ${GUE.attacks(g.level)} attaques par action Attaquer.` : "",
    ...styleNotes(g, styles(g)),
    ek(g) && g.level >= 7 ? `<b>Magie de guerre</b> : ${g.level >= 18 ? "après un sort" : "après un sort mineur"} lancé avec ton action, une attaque d'arme en action bonus.` : "",
    ek(g) && g.level >= 10 ? "<b>Frappe occulte</b> : la cible touchée a un désavantage à son prochain JdS contre ton sort." : "",
    champ(g) && g.level >= 18 ? `<b>Survivant</b> : à moitié de tes PV ou moins, +${5 + R.ab(g, "con")} PV au début de ton tour.` : ""].filter(Boolean),
  speedBonus: () => 0,
  creation,
  levelUp: {
    step2: "Choix",
    rowsAfter: (g, b) => row("Attaques par action", GUE.attacks(g.level), GUE.attacks(b.level), "--ok") + (b.level >= 9 ? row("Indomptable", GUE.ind(g.level), GUE.ind(b.level), "--ok") : "")
      + (b.garch === "mdg" && b.level >= 3 ? row("Dés de supériorité", g.level >= 3 ? `${GUE.supN(g.level)} ${GUE.supD(g.level)}` : "—", `${GUE.supN(b.level)} ${GUE.supD(b.level)}`, "--ok") + row("Manœuvres", g.level >= 3 ? GUE.manN(g.level) : 0, GUE.manN(b.level), "--ok") : ""),
    choices: (g, b, L) => luChoices(g, b, L),
    notes: (g, to) => [to === 3 ? `<span><b>Archétype martial</b> : Champion, Maître de guerre ou Chevalier occulte, à choisir ci-dessus.</span>` : ""].filter(Boolean),
    recapBefore: (g, b, L) => [L.gman ? `<div><span class="n">Manœuvres</span><small>${[...L.gman.filter(k => !(g.mano || []).includes(k)).map(k => "+ " + esc(MAN[k].n)), ...(g.mano || []).filter(k => !L.gman.includes(k)).map(k => "− " + esc(MAN[k].n))].join(", ") || "inchangées"}</small></div>` : "",
      L.gtool ? `<div><span class="n">Outil</span><small>${esc(L.gtool)}</small></div>` : "", L.gstyle2 ? `<div><span class="n">Second style</span><small>${esc(STYLES[L.gstyle2].n)}</small></div>` : ""].join(""),
    apply: (g, L) => { if (L.gman) g.mano = [...L.gman]; if (L.gtool) g.gtool = L.gtool; if (L.gstyle2) g.gstyle2 = L.gstyle2; },
  },
};
export { GUE, MAN, STYLES as GUE_STYLES, EK_SLOTS };
