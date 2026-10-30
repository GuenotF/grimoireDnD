// Rôdeur (Manuel des joueurs 2014) : sorts connus, Ennemi juré, Explorateur-né, style de combat, Chasseur, Maître des bêtes.
// Résumés rédigés pour la table, à vérifier dans le livre. Compagnon (Maître des bêtes) : rodeur-compagnon.js.
import { onChange, onClick, onInput } from "../core/actions.js";
import { stylesOf, styleAC, styleMods } from "../rules/styles.js";
import { byName, esc, signed } from "../core/format.js";
import { G, S } from "../core/state.js";
import { mutate } from "../core/store.js";
import { render } from "../core/ui.js";
import { BEAST, BY_ID } from "../data.js";
import { pConc, pExtras, pFoot, pHeader, pNotes, pSlots, pSpellRow, printHTML } from "../features/print.js";
import { castingRules, concentrationRules } from "../features/rules.js";
import { R, classSpells } from "../rules/common.js";
import { HALF } from "../rules/tables.js";
import { PET_OK, petBeasts, petChips, petGererHTML, petMax, petPlayHTML, petPrint } from "./rodeur-compagnon.js";

// Sorts connus par niveau de rôdeur (le rôdeur n'a pas de sort mineur)
const KNOWN = [0, 0, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11];
const FOES = { aberrations: "Aberrations", betes: "Bêtes", celestes: "Célestes", artificielles: "Créatures artificielles", dragons: "Dragons", elementaires: "Élémentaires",
  fees: "Fées", fielons: "Fiélons", geants: "Géants", monstruosites: "Monstruosités", mortsvivants: "Morts-vivants", plantes: "Plantes", vases: "Vases", humanoides: "Deux races d'humanoïdes" };
const TERRS = { arctique: "Arctique", cote: "Côte", desert: "Désert", foret: "Forêt", marais: "Marais", montagne: "Montagne", prairie: "Prairie", outreterre: "Outreterre" };
const STYLES = stylesOf(["archerie", "defense", "duel", "deuxarmes"]); // les quatre styles du rôdeur
const ARCH = {
  chasseur: { n: "Chasseur", full: "Chasseur", sum: "Une technique à choisir aux niveaux 3, 7, 11 et 15 : Proie du chasseur (Tueur de colosses…), Tactiques défensives, Attaques multiples, Défense supérieure." },
  betes: { n: "Maître des bêtes", full: "Maître des bêtes", sum: "Un compagnon animal (taille M au plus, FP 1/4 au plus) qui gagne ta maîtrise, combat sur tes ordres et progresse avec toi." },
};
// Chasseur : une option à chaque palier
const HUNT = {
  3: { n: "Proie du chasseur", o: {
    colosse: { n: "Tueur de colosses", k: "+1d8 · 1 fois par tour", d: "Une fois par tour, quand tu touches une créature qui n'a plus tous ses PV : +1d8 dégâts." },
    geants: { n: "Tueur de géants", k: "réaction contre G ou plus", d: "Quand une créature de taille Grande ou plus à 1,5 m te touche ou te rate, ta réaction : une attaque contre elle juste après." },
    hordes: { n: "Briseur de hordes", k: "attaque sur une 2e cible", d: "Une fois par tour, quand tu attaques avec une arme : une attaque de plus contre une autre créature à 1,5 m de la cible et à ta portée." } } },
  7: { n: "Tactiques défensives", o: {
    horde: { n: "Échapper à la horde", k: "attaques d'opportunité ×désav.", d: "Les attaques d'opportunité contre toi ont un désavantage." },
    multi: { n: "Défense contre les attaques multiples", k: "+4 CA contre la même créature", d: "Quand une créature te touche, tu as +4 à la CA contre toutes ses autres attaques de ce tour." },
    acier: { n: "Moral d'acier", k: "avantage contre l'effroi", d: "Avantage aux jets de sauvegarde contre l'état effrayé." } } },
  11: { n: "Attaques multiples", o: {
    volee: { n: "Volée", k: "une attaque par créature à 3 m d'un point", d: "Action : une attaque à distance contre chaque créature à 3 m d'un point que tu vois, à portée de ton arme (une munition par cible, un jet d'attaque chacune)." },
    tourbillon: { n: "Attaque tourbillonnante", k: "toutes les créatures à 1,5 m", d: "Action : une attaque au corps à corps contre chaque créature à 1,5 m de toi, avec un jet d'attaque pour chacune." } } },
  15: { n: "Défense supérieure du chasseur", o: {
    esquive: { n: "Esquive totale", k: "JdS DEX : 0 ou ½", d: "Contre un effet qui permet un JdS de Dextérité pour moitié des dégâts : aucun dégât si tu réussis, la moitié si tu échoues." },
    retour: { n: "Retour de bâton", k: "réaction : l'attaque ratée vise un autre", d: "Quand une créature te rate au corps à corps, ta réaction l'oblige à refaire l'attaque contre une autre créature de ton choix (autre qu'elle)." },
    instinct: { n: "Esquive instinctive", k: "réaction : dégâts ½", d: "Quand un attaquant que tu vois te touche, ta réaction divise par deux les dégâts de cette attaque (bouton « Dégâts ½ » de la carte des PV)." } } },
};
const RNG = {
  foes: lv => lv >= 14 ? 3 : lv >= 6 ? 2 : 1,                 // Ennemi juré : 1 choix, puis 6 et 14
  terrs: lv => lv >= 10 ? 3 : lv >= 6 ? 2 : 1,                // Explorateur-né : 1 terrain, puis 6 et 10
  dd: g => 8 + R.prof(g.level) + R.am(g),
};
const huntOf = (g, lv) => { const h = HUNT[lv], k = (g.hunt || {})[lv]; return h && h.o[k] ? h.o[k] : null; };
const foeList = g => (g.foes || []).map(k => k === "humanoides" ? (g.foeH ? `Humanoïdes : ${g.foeH}` : FOES.humanoides) : FOES[k]).filter(Boolean);
const terrList = g => (g.terrs || []).map(k => TERRS[k]).filter(Boolean);
const huntCtl = lv => g => `<select id="f-hunt${lv}" aria-label="${HUNT[lv].n}"><option value="">À choisir</option>${Object.entries(HUNT[lv].o).map(([k, o]) => `<option value="${k}"${(g.hunt || {})[lv] === k ? " selected" : ""}>${o.n}</option>`).join("")}</select>`;
const huntFeat = lv => ({ id: "hunt" + lv, lv, arch: "chasseur", n: HUNT[lv].n, control: huntCtl(lv), k: "f",
  pill: g => huntOf(g, lv) ? `${huntOf(g, lv).n} · ${huntOf(g, lv).k}` : "à choisir (Gérer)",
  d: g => huntOf(g, lv) ? `${huntOf(g, lv).n} : ${huntOf(g, lv).d}` : `Choisis une option en mode Gérer : ${Object.values(HUNT[lv].o).map(o => o.n).join(", ")}.` });

const RNG_FEATS = [
  { id: "foe", lv: 1, n: "Ennemi juré", k: "f", pill: g => foeList(g).join(", ") || "à choisir (Gérer)",
    d: g => `${foeList(g).length ? `Ennemis jurés : ${foeList(g).join(" ; ")}. ` : "À choisir en mode Gérer (réglages du rôdeur). "}Avantage aux tests de Sagesse (Survie) pour les pister et aux tests d'Intelligence pour te souvenir d'informations à leur sujet. Tu apprends une langue qu'ils parlent (à ajouter dans Outils et langues). Un choix de plus aux niveaux 6 et 14.` },
  { id: "explorer", lv: 1, n: "Explorateur-né", k: "f", pill: g => terrList(g).join(", ") || "à choisir (Gérer)",
    d: g => `${terrList(g).length ? `Terrains favoris : ${terrList(g).join(", ")}. ` : "À choisir en mode Gérer (réglages du rôdeur). "}Pour un test d'Intelligence ou de Sagesse lié à ce terrain avec une compétence maîtrisée, ton bonus de maîtrise est doublé (à appliquer toi-même : l'appli ne sait pas où tu es). En voyage d'une heure ou plus dans ce terrain : le terrain difficile ne ralentit pas le groupe, impossible de se perdre (sauf magie), toujours vigilant, discrétion à allure normale en solitaire, deux fois plus de nourriture, et tu sais combien de créatures tu pistes. Un terrain de plus aux niveaux 6 et 10.` },
  { id: "style", lv: 2, n: "Style de combat", k: "f", control: g => `<select id="f-rstyle" aria-label="Style de combat"><option value="">À choisir</option>${Object.entries(STYLES).map(([k, s]) => `<option value="${k}"${g.style === k ? " selected" : ""}>${s.n}</option>`).join("")}</select>`,
    pill: g => STYLES[g.style] ? `${STYLES[g.style].n} · ${STYLES[g.style].k}` : "à choisir", d: g => STYLES[g.style] ? STYLES[g.style].d : "Choisis-le en mode Gérer : Archerie, Défense, Duel ou Combat à deux armes." },
  { id: "aware", lv: 3, n: "Vigilance primitive", k: "f", pill: () => "1 emplacement · 1 min par niveau", d: () => "Action : dépense un emplacement de sort. Pendant 1 minute par niveau de l'emplacement, tu sens si des aberrations, célestes, dragons, élémentaires, fées, fiélons ou morts-vivants sont à 1,5 km (9 km dans un terrain favori). Ni leur nombre ni leur position." },
  { id: "arch", lv: 3, n: "Archétype de rôdeur", k: "f", pill: g => ARCH[g.rarch].full, d: g => `Tu suis l'archétype ${ARCH[g.rarch].full} ; ses capacités arrivent aux niveaux 3, 7, 11 et 15.` },
  huntFeat(3),
  { id: "companion", lv: 3, arch: "betes", n: "Compagnon du rôdeur", k: "f", pill: g => g.pet && BEAST[g.pet.id] ? `${g.pet.name || BEAST[g.pet.id].n} · ${petMax(g)} PV max` : "à choisir (Gérer)",
    d: g => `Une bête de taille Moyenne au plus et de FP 1/4 au plus. Elle ajoute ta maîtrise (${signed(R.prof(g.level))}) à sa CA, à ses jets d'attaque et de dégâts, et à ses jets de sauvegarde et compétences maîtrisés ; PV max : les siens ou 4 × ton niveau (le plus élevé). Elle agit à ton initiative : tu la déplaces librement, et ton action lui fait Attaquer, Foncer, Se désengager, Esquiver ou Aider ; sans ordre, elle Esquive. Si elle meurt : un autre compagnon après 8 heures de lien.` },
  { id: "extra", lv: 5, n: "Attaque supplémentaire", k: "f", pill: () => "2 attaques par action", d: () => "Quand tu prends l'action Attaquer, tu attaques deux fois au lieu d'une." },
  huntFeat(7),
  { id: "training", lv: 7, arch: "betes", n: "Entraînement exceptionnel", k: "f", pill: () => "action bonus : Foncer, Aider…", d: () => "Si ton compagnon n'attaque pas pendant ton tour, ton action bonus peut lui faire Foncer, Se désengager, Esquiver ou Aider. Ses attaques comptent comme magiques." },
  { id: "stride", lv: 8, n: "Foulée tellurique", k: "f", pill: () => "terrain difficile ignoré", d: () => "Le terrain difficile non magique ne te coûte pas de mouvement supplémentaire ; tu traverses les plantes non magiques sans être ralenti ni blessé. Avantage aux jets de sauvegarde contre les plantes créées ou manipulées par magie pour gêner les mouvements." },
  { id: "camo", lv: 10, n: "Camouflage naturel", k: "f", pill: () => "+10 en Discrétion, immobile", d: () => "1 minute pour te camoufler avec de la boue, des feuilles… Tant que tu restes immobile contre une surface naturelle assez grande, +10 aux tests de Dextérité (Discrétion). Bouger ou agir met fin au camouflage." },
  huntFeat(11),
  { id: "fury", lv: 11, arch: "betes", n: "Fureur bestiale", k: "f", pill: () => "compagnon : 2 attaques", d: () => "Quand tu ordonnes à ton compagnon d'Attaquer, il attaque deux fois (ou utilise son action Attaques multiples)." },
  { id: "vanish", lv: 14, n: "Disparition", k: "f", pill: () => "Se cacher en action bonus", d: () => "Tu peux Se cacher en action bonus. On ne peut pas te pister par des moyens non magiques, sauf si tu laisses une piste." },
  huntFeat(15),
  { id: "share", lv: 15, arch: "betes", n: "Partage des sorts", k: "f", pill: () => "tes sorts personnels, aussi au compagnon", d: () => "Quand tu lances un sort qui ne cible que toi, il peut aussi cibler ton compagnon s'il est à 9 m ou moins." },
  { id: "feral", lv: 18, n: "Sens sauvages", k: "f", pill: () => "invisibles à 9 m", d: () => "Sans voir une créature, tu n'as pas de désavantage pour l'attaquer. Tu sais où sont les créatures invisibles à 9 m, si elles ne sont pas cachées et si tu n'es ni aveuglé ni assourdi." },
  { id: "slayer", lv: 20, n: "Tueur implacable", k: "f", pill: g => `${signed(R.am(g))} contre un ennemi juré`, d: g => `Une fois par tour, ajoute ton modificateur de Sagesse (${signed(R.am(g))}) au jet d'attaque ou de dégâts d'une attaque contre un de tes ennemis jurés, avant ou après le jet.` },
];
const feats = g => RNG_FEATS.filter(f => !f.arch || f.arch === g.rarch);

// ---------- Réglages (mode Gérer) : ennemis jurés, terrains favoris, compagnon
function settingsHTML(g) {
  const nf = RNG.foes(g.level), nt = RNG.terrs(g.level), foes = g.foes || [], terrs = g.terrs || [];
  let h = `<div class="rubric"><h2>Rôdeur</h2><span class="aside">réglages</span></div><div class="rgset">`;
  h += `<div class="rgbox"><span class="lusub">Ennemi juré · ${foes.length}/${nf}${g.level < 14 ? ` <small>(${g.level < 6 ? "2 au niveau 6, " : ""}3 au niveau 14)</small>` : ""}</span>
    <div class="chips">${Object.entries(FOES).map(([k, n]) => { const on = foes.includes(k); return `<button class="chip" data-a="rg-foe" data-v="${k}" aria-pressed="${on}"${!on && foes.length >= nf ? " disabled" : ""}>${esc(n)}</button>`; }).join("")}</div>
    ${foes.includes("humanoides") ? `<input id="rg-foeh" type="text" value="${esc(g.foeH || "")}" placeholder="Deux races, ex. gobelinoïdes et orcs" aria-label="Races d'humanoïdes">` : ""}
    <small class="muted">Une langue de tes ennemis jurés : à ajouter dans Personnage › Outils et langues.</small></div>`;
  h += `<div class="rgbox"><span class="lusub">Explorateur-né · terrain favori · ${terrs.length}/${nt}${g.level < 10 ? ` <small>(${g.level < 6 ? "2 au niveau 6, " : ""}3 au niveau 10)</small>` : ""}</span>
    <div class="chips">${Object.entries(TERRS).map(([k, n]) => { const on = terrs.includes(k); return `<button class="chip" data-a="rg-terr" data-v="${k}" aria-pressed="${on}"${!on && terrs.length >= nt ? " disabled" : ""}>${esc(n)}</button>`; }).join("")}</div></div>`;
  if (g.level >= 3 && g.rarch === "betes") h += petGererHTML(g);
  return h + `</div>`;
}
const toggleIn = (arr, v, max) => arr.includes(v) ? arr.filter(x => x !== v) : arr.length < max ? [...arr, v] : arr;
onClick("rg-foe", (b) => { mutate(g => { g.foes = toggleIn(g.foes || [], b.dataset.v, RNG.foes(g.level)); }); });
onClick("rg-terr", (b) => { mutate(g => { g.terrs = toggleIn(g.terrs || [], b.dataset.v, RNG.terrs(g.level)); }); });
onInput("#rg-foeh", t => { mutate(g => { g.foeH = t.value; }, false); });
onChange("#f-rstyle", t => { mutate(g => { g.style = t.value; }); });
onChange("#f-rarch", t => { mutate(g => { g.rarch = t.value; }); });
onChange(t => /^f-hunt\d+$/.test(t.id), t => { const lv = t.id.slice(6); mutate(g => { g.hunt = { ...(g.hunt || {}), [lv]: t.value || undefined }; }); });

// ---------- Assistant de niveau : choix qui arrivent avec le niveau
function luChoices(g, b, L) {
  let h = "";
  if (!g.style && b.level >= 2) h += `<div class="luprep"><h3>Style de combat</h3><span class="muted">Pas encore choisi : c'est le moment.</span>
    <div class="chips">${Object.entries(STYLES).map(([k, s]) => `<button class="chip" data-a="lu-rstyle" data-v="${k}" aria-pressed="${L.style === k}">${s.n}</button>`).join("")}</div>
    ${STYLES[L.style] ? `<span class="muted" style="font-size:13px">${esc(STYLES[L.style].n)} : ${esc(STYLES[L.style].d)}</span>` : ""}</div>`;
  const nf = RNG.foes(b.level), nt = RNG.terrs(b.level);
  if (nf > (g.foes || []).length) { const sel = L.foes || g.foes || [];
    h += `<div class="luprep"><h3>Ennemi juré · ${sel.length}/${nf}</h3>${nf > RNG.foes(g.level) ? `<span class="muted">Un ennemi juré de plus au niveau ${b.level}.</span>` : ""}<div class="chips">${Object.entries(FOES).map(([k, n]) => { const on = sel.includes(k), old = (g.foes || []).includes(k); return `<button class="chip" data-a="lu-rfoe" data-v="${k}" aria-pressed="${on}"${old || (!on && sel.length >= nf) ? " disabled" : ""}>${esc(n)}</button>`; }).join("")}</div></div>`; }
  if (nt > (g.terrs || []).length) { const sel = L.terrs || g.terrs || [];
    h += `<div class="luprep"><h3>Terrain favori · ${sel.length}/${nt}</h3>${nt > RNG.terrs(g.level) ? `<span class="muted">Un terrain favori de plus au niveau ${b.level}.</span>` : ""}<div class="chips">${Object.entries(TERRS).map(([k, n]) => { const on = sel.includes(k), old = (g.terrs || []).includes(k); return `<button class="chip" data-a="lu-rterr" data-v="${k}" aria-pressed="${on}"${old || (!on && sel.length >= nt) ? " disabled" : ""}>${esc(n)}</button>`; }).join("")}</div></div>`; }
  [7, 11, 15].filter(lv => lv === b.level && b.rarch === "chasseur").forEach(lv => {
    h += `<div class="luprep"><h3>${HUNT[lv].n}</h3><div class="chips">${Object.entries(HUNT[lv].o).map(([k, o]) => `<button class="chip" data-a="lu-rhunt" data-v="${k}" aria-pressed="${L.hunt === k}">${o.n}</button>`).join("")}</div>
    ${HUNT[lv].o[L.hunt] ? `<span class="muted" style="font-size:13px">${esc(HUNT[lv].o[L.hunt].d)}</span>` : ""}</div>`; });
  if (b.level >= 3 && b.rarch === "betes" && !g.pet) {
    h += `<div class="luprep"><h3>Compagnon</h3><span class="muted">Bête de taille M au plus, FP 1/4 au plus (${petBeasts().length} possibles). Tu pourras le changer dans Gérer.</span>
    <select id="lu-rpet" aria-label="Compagnon"><option value="">Plus tard</option>${petBeasts().map(x => `<option value="${x.id}"${L.pet === x.id ? " selected" : ""}>${esc(x.n)} · FP ${esc(x.fp)} · CA ${x.ca + R.prof(b.level)} · ${Math.max(x.pv, 4 * b.level)} PV</option>`).join("")}</select></div>`;
  }
  return h;
}
onClick("lu-rstyle", (b) => { if (!S.lu) return; S.lu.style = b.dataset.v; S.luKeep = true; render(); });
onClick(["lu-rfoe", "lu-rterr"], (b, a) => { const L = S.lu, g = G(); if (!L || !g) return; const k = a === "lu-rfoe" ? "foes" : "terrs", max = (a === "lu-rfoe" ? RNG.foes : RNG.terrs)(L.to);
  L[k] = toggleIn(L[k] || [...(g[k] || [])], b.dataset.v, max); S.luKeep = true; render(); });
onClick("lu-rhunt", (b) => { if (!S.lu) return; S.lu.hunt = b.dataset.v; S.luKeep = true; render(); });
onChange("#lu-rpet", t => { if (!S.lu) return; S.lu.pet = t.value || null; S.luKeep = true; render(); });

// ---------- Création (étape Compétences) : ennemi juré et terrain favori du niveau 1
const creation = {
  html: c => { const x = c.cx || {}, f = x.foes || [], t = x.terrs || [];
    return `<div class="crcls"><span class="lusub">Ennemi juré · ${f.length}/1</span><div class="chips">${Object.entries(FOES).map(([k, n]) => `<button class="chip" data-a="cr-rfoe" data-v="${k}" aria-pressed="${f.includes(k)}"${!f.includes(k) && f.length >= 1 ? " disabled" : ""}>${esc(n)}</button>`).join("")}</div>
    ${f.includes("humanoides") ? `<input id="cr-rfoeh" type="text" value="${esc(x.foeH || "")}" placeholder="Deux races, ex. gobelinoïdes et orcs" aria-label="Races d'humanoïdes">` : ""}
    <span class="lusub">Explorateur-né · terrain favori · ${t.length}/1</span><div class="chips">${Object.entries(TERRS).map(([k, n]) => `<button class="chip" data-a="cr-rterr" data-v="${k}" aria-pressed="${t.includes(k)}"${!t.includes(k) && t.length >= 1 ? " disabled" : ""}>${esc(n)}</button>`).join("")}</div>
    <small class="muted">Avantage pour pister tes ennemis jurés et te souvenir d'eux ; maîtrise doublée pour les tests d'INT et de SAG liés au terrain favori. Une langue de tes ennemis : à choisir avec les langues (Personnage).</small></div>`; },
  missing: c => { const x = c.cx || {}; return !(x.foes || []).length ? "choisis ton ennemi juré" : !(x.terrs || []).length ? "choisis ton terrain favori" : ""; },
  apply: (g, c) => { const x = c.cx || {}; g.foes = [...(x.foes || [])]; g.terrs = [...(x.terrs || [])]; g.foeH = x.foeH || ""; },
};
onClick(["cr-rfoe", "cr-rterr"], (b, a) => { const c = S.cr; if (!c) return; c.cx = c.cx || {}; const k = a === "cr-rfoe" ? "foes" : "terrs"; c.cx[k] = toggleIn(c.cx[k] || [], b.dataset.v, 1); S.luKeep = true; render(); });
onInput("#cr-rfoeh", t => { if (S.cr) { S.cr.cx = S.cr.cx || {}; S.cr.cx.foeH = t.value; } });

// ---------- Onglet Règles
function rulesHTML(g) {
  const dd = RNG.dd(g);
  return `<div class="cols rules">
  <div><div class="rubric" style="margin-top:4px"><h3>Sorts connus</h3></div>
  <p>Le rôdeur ne prépare pas ses sorts : il en <b>connaît ${R.prepMax(g) || "2 (au niveau 2)"}</b>, tous lançables. À chaque niveau gagné, il peut <b>remplacer un</b> sort connu par un autre de sa liste, d'un niveau qu'il peut lancer. Pas de sort mineur, pas de rituel.</p>
  ${castingRules(g)}
  ${concentrationRules()}
  <div class="rubric"><h3>Marque du chasseur</h3></div>
  <p>Action bonus, concentration : <span class="kp d">+1d6</span> aux dégâts de tes attaques d'arme contre la cible marquée (rappelé sur chaque attaque tant que le sort est actif). Si elle tombe à 0 PV, action bonus pour marquer une autre créature.</p></div>
  <div><div class="rubric" style="margin-top:4px"><h3>Ennemi juré et Explorateur-né</h3></div>
  <p>Avantage pour <b>pister</b> un ennemi juré (Survie) et pour te <b>souvenir</b> d'informations à son sujet (Intelligence). Dans un <b>terrain favori</b>, maîtrise doublée aux tests d'INT et de SAG liés au terrain, avec une compétence maîtrisée : c'est à toi de l'appliquer selon le lieu.</p>
  <div class="rubric"><h3>Style de combat</h3></div>
  <p>${Object.values(STYLES).map(s => `<b>${s.n}</b> : ${esc(s.d)}`).join("<br>")}</p>
  <div class="rubric"><h3>${esc(ARCH[g.rarch].full)}</h3></div>
  <p>${g.rarch === "betes" ? `Le compagnon agit à ton initiative. <b>Ton action</b> lui fait Attaquer, Foncer, Se désengager, Esquiver ou Aider ; sans ordre, il Esquive. Il ajoute ta maîtrise à sa CA, ses attaques, ses dégâts, ses sauvegardes et compétences maîtrisées. Ses PV max : les siens ou 4 × ton niveau.` : `Une technique par palier (3, 7, 11, 15). Tueur de colosses : +1d8 une fois par tour contre une cible blessée.`} Jets de sauvegarde de tes sorts : DD ${dd}.</p>
  <div class="rubric"><h3>Récupérer</h3></div>
  <p><b>Repos long :</b> emplacements, PV${g.rarch === "betes" ? ", PV du compagnon" : ""}. <b>Repos court :</b> dés de vie.</p>
  <p class="muted">Source : Manuel des joueurs 2014 (rôdeur, Chasseur, Maître des bêtes). Résumés rédigés pour la table, à vérifier dans le livre en cas de doute.</p></div></div>`;
}
// ---------- Fiche imprimable
function printSheet(g) {
  const prof = R.prof(g.level), mod = R.am(g), dd = 8 + prof + mod, known = g.prepared.map(id => BY_ID[id]).filter(Boolean).sort((a, b) => a.l - b.l || byName(a, b));
  const fl = feats(g).filter(f => f.lv <= g.level);
  return `${pHeader(g, `Rôdeur, niveau ${g.level}${g.level >= 3 ? ` · ${esc(ARCH[g.rarch].full)}` : ""}`, [[signed(mod), "MOD. SAGESSE"], [dd, "DD DES SORTS"], [signed(prof + mod), "ATTAQUE DE SORT"], [R.maxLevel(g) ? R.prepMax(g) : 0, "SORTS CONNUS"], [foeList(g).length || "—", "ENNEMIS JURÉS"]])}
${pSlots(g)}
<h2>Capacités de classe <small>niveau ${g.level}</small></h2>
<table>${fl.map(f => `<tr><td class="n">${f.n}</td><td>${esc(f.d(g))}</td></tr>`).join("")}</table>
${g.level >= 3 && g.rarch === "betes" ? petPrint(g) : ""}
${pExtras(g)}
${pConc()}
<div class="brk"></div>
<h2 style="margin-top:0">Sorts connus <small>${known.length} / ${R.maxLevel(g) ? R.prepMax(g) : 0} · tous lançables</small></h2>
${known.length ? `<table><tr><th>Sort</th><th>Incantation · composantes</th><th>Effet</th></tr>${known.map(s => pSpellRow(g, s, false)).join("")}</table>` : `<p>${R.maxLevel(g) ? "Aucun sort connu pour l'instant." : `Le rôdeur apprend ses sorts à partir du niveau ${R.unlockAt(g, 1)}.`}</p>`}
${pNotes(g)}
${pFoot("RÔDEUR")}`;
}

// ---------- Définition de la classe (contrat : voir docs/ARCHITECTURE.md) ----------
const row = (l, o, n, cls) => `<div class="${o === n ? "same" : ""}"><span>${l}</span><span class="old">${o}</span><span class="ar">→</span><b${cls && o !== n ? ` style="color:var(${cls})"` : ""}>${n}</b></div>`;
export default {
  n: "Rôdeur", ab: "wis", abN: "Sagesse", abArticle: "la Sagesse", slots: HALF, top: 5, hitDie: "1d10",
  saves: ["str", "dex"],
  weaponProf: ["simple", "martial"], armorProf: ["light", "medium", "shield"],
  cantrips: () => 0,
  known: lv => KNOWN[lv] || 0,          // sorts connus (rangés dans g.prepared) : voir R.prepMax
  prep: () => 0,
  defaults: () => ({ rarch: "chasseur", style: "", foes: [], foeH: "", terrs: [], hunt: {}, pet: null }),
  normalize(o) {
    if (!ARCH[o.rarch]) o.rarch = "chasseur";
    if (typeof o.style !== "string") o.style = "";
    o.foes = Array.isArray(o.foes) ? o.foes.filter(k => FOES[k]) : []; o.foeH = typeof o.foeH === "string" ? o.foeH : "";
    o.terrs = Array.isArray(o.terrs) ? o.terrs.filter(k => TERRS[k]) : [];
    o.hunt = o.hunt && typeof o.hunt === "object" ? Object.fromEntries(Object.entries(o.hunt).filter(([lv, k]) => HUNT[lv] && HUNT[lv].o[k])) : {};
    o.pet = o.pet && BEAST[o.pet.id] && PET_OK(BEAST[o.pet.id]) ? { id: o.pet.id, name: typeof o.pet.name === "string" ? o.pet.name : "", hp: o.pet.hp == null ? null : Math.max(0, Math.floor(+o.pet.hp) || 0) } : null;
  },
  acBonus: (g, armor) => g.level >= 2 ? styleAC([g.style], armor) : [],
  attackMods: (g, w, ab, off) => g.level >= 2 ? styleMods(g, [g.style], w, off) : {},
  attacksPerAction: g => g.level >= 5 ? 2 : 1,
  attackNotes: g => [
    g.level >= 3 && g.rarch === "chasseur" && huntOf(g, 3) ? `<b>${esc(huntOf(g, 3).n)}</b> : ${esc(huntOf(g, 3).d)}` : "",
    foeList(g).length ? `<b>Ennemi juré</b> (${esc(foeList(g).join(", "))}) : avantage pour les pister et te souvenir d'eux.` : ""].filter(Boolean),
  halfDamage: g => g.level >= 15 && g.rarch === "chasseur" && (g.hunt || {})[15] === "instinct" ? "Esquive instinctive (réaction, attaquant visible)" : "",
  subclass: { lv: 3, label: "Archétype de rôdeur", field: "rarch", opts: () => Object.entries(ARCH).map(([k, a]) => [k, a.full, a.sum]),
    extra: (g, k, x) => k !== "chasseur" ? null : { label: HUNT[3].n, opts: Object.entries(HUNT[3].o).map(([o, v]) => [o, v.n, v.d]), cur: x || (g.hunt || {})[3] || "colosse" },
    apply: (g, x) => { if (x && g.rarch === "chasseur") g.hunt = { ...(g.hunt || {}), 3: x }; } },
  subline: g => `Rôdeur niveau ${g.level}${g.level >= 3 ? ` · ${esc(ARCH[g.rarch].full)}` : ""}`,
  subclassField: g => `<div class="field"><label for="f-rarch">Archétype de rôdeur</label><select id="f-rarch">${Object.entries(ARCH).map(([k, o]) => `<option value="${k}"${k === g.rarch ? " selected" : ""}>${o.n}</option>`).join("")}</select></div>`,
  tabs: g => [["grimoire", "Sorts"], ["biblio", "Bibliothèque", classSpells(g).length]],
  moreTabs: () => [["regles", "Règles"], ["imprimer", "Imprimer"]],
  panels: { imprimer: g => printHTML(g), regles: g => rulesHTML(g) },
  print: g => printSheet(g),
  printTitle: g => `Fiche de rôdeur de ${g.name}`,
  printDesc: "Elle contient le tableau de bord (emplacements), les capacités de classe avec tes choix (ennemis jurés, terrains, archétype), la fiche du compagnon (Maître des bêtes) avec ses PV à remplir, et tes sorts connus.",
  features: g => feats(g),
  settings: g => settingsHTML(g),
  afterAttacks: g => g.level >= 3 && g.rarch === "betes" ? petPlayHTML(g) : "",
  barChips: g => g.level >= 3 && g.rarch === "betes" ? petChips(g) : "",
  longRest: g => { if (g.pet) g.pet.hp = null; },
  creation,
  levelUp: {
    step2: "Choix",
    rowsAfter: (g, b) => row("Ennemis jurés", RNG.foes(g.level), RNG.foes(b.level), "--ok") + row("Terrains favoris", RNG.terrs(g.level), RNG.terrs(b.level), "--ok"),
    notes: (g, to) => [to === 3 ? `<span><b>Archétype</b> : Chasseur ou Maître des bêtes, à choisir ci-dessus.</span>` : ""].filter(Boolean),
    choices: (g, b, L) => luChoices(g, b, L),
    recapBefore: (g, b, L) => [L.style && !g.style ? `<div><span class="n">Style de combat</span><small>${esc(STYLES[L.style].n)}</small></div>` : "",
      L.foes && L.foes.length > (g.foes || []).length ? `<div><span class="n">Ennemi juré</span><small>+ ${L.foes.filter(k => !(g.foes || []).includes(k)).map(k => esc(FOES[k])).join(", ")}</small></div>` : "",
      L.terrs && L.terrs.length > (g.terrs || []).length ? `<div><span class="n">Terrain favori</span><small>+ ${L.terrs.filter(k => !(g.terrs || []).includes(k)).map(k => esc(TERRS[k])).join(", ")}</small></div>` : "",
      L.hunt && HUNT[b.level] ? `<div><span class="n">${esc(HUNT[b.level].n)}</span><small>${esc(HUNT[b.level].o[L.hunt].n)}</small></div>` : "",
      L.pet && BEAST[L.pet] ? `<div><span class="n">Compagnon</span><small>${esc(BEAST[L.pet].n)}</small></div>` : ""].join(""),
    apply: (g, L) => {
      if (L.style) g.style = L.style;
      if (L.foes) g.foes = [...L.foes];
      if (L.terrs) g.terrs = [...L.terrs];
      if (L.hunt && HUNT[g.level]) g.hunt = { ...(g.hunt || {}), [g.level]: L.hunt };
      if (L.pet && BEAST[L.pet] && !g.pet) g.pet = { id: L.pet, name: "", hp: null };
    },
  },
};
export { RNG, FOES, TERRS, HUNT };
