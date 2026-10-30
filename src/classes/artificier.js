// Artificier (version d'Eberron, textes AideDD fournis par Fabien, octobre 2026) : demi-lanceur arrondi au supérieur (Intelligence),
// imprégnations (classes/artificier-impregnations.js), spécialités au niveau 3 : Alchimiste (élixirs expérimentaux),
// Artilleur (canon occulte, PV suivis), Forgeron de guerre (défenseur d'acier, PV suivis ; Apte au combat).
// Résumés rédigés pour la table d'après ces textes.
import { onChange, onClick } from "../core/actions.js";
import { byName, esc, signed } from "../core/format.js";
import { G, S } from "../core/state.js";
import { mutate } from "../core/store.js";
import { render, toast } from "../core/ui.js";
import { BY_ID } from "../data.js";
import { R, classSpells } from "../rules/common.js";
import { TOOL_LISTS } from "../rules/creation.js";
import { isMagic } from "../rules/magic.js";
import { capRow, foldSec, pickRow, pillsRaw } from "../ui/components.js";
import { INF, RES_TYPES, allInf, infItems, infKnown, infOf, infPills } from "./artificier-impregnations.js";

// ---------- Table de l'artificier (emplacements de sorts par niveau)
const SLOTS = { 1: [2], 2: [2], 3: [3], 4: [3], 5: [4, 2], 6: [4, 2], 7: [4, 3], 8: [4, 3], 9: [4, 3, 2], 10: [4, 3, 2], 11: [4, 3, 3], 12: [4, 3, 3],
  13: [4, 3, 3, 1], 14: [4, 3, 3, 1], 15: [4, 3, 3, 2], 16: [4, 3, 3, 2], 17: [4, 3, 3, 3, 1], 18: [4, 3, 3, 3, 1], 19: [4, 3, 3, 3, 2], 20: [4, 3, 3, 3, 2] };
const INT = g => Math.max(1, R.ab(g, "int"));
const dd = g => 8 + R.prof(g.level) + R.ab(g, "int"), atk = g => R.prof(g.level) + R.ab(g, "int");
const SPEC = {
  alchimiste: { n: "Alchimiste", full: "Alchimiste", tool: "Matériel d'alchimiste",
    sum: "Élixirs expérimentaux après chaque repos long, Érudit alchimique (5), Ingrédients revigorants (9), Maîtrise chimique (15).",
    sp: { 3: ["healing-word", "ray-of-sickness"], 5: ["melf-s-acid-arrow", "flaming-sphere"], 9: ["gaseous-form", "mass-healing-word"], 13: ["blight", "death-ward"], 17: ["cloudkill", "raise-dead"] } },
  artilleur: { n: "Artilleur", full: "Artilleur", tool: "Outils de menuisier",
    sum: "Canon occulte (lance-flammes, baliste de choc, protecteur), Arme à feu arcanique (5), Canon explosif (9), Position fortifiée (15).",
    sp: { 3: ["shield", "thunderwave"], 5: ["scorching-ray", "shatter"], 9: ["fireball", "wind-wall"], 13: ["ice-storm", "wall-of-fire"], 17: ["cone-of-cold", "wall-of-force"] } },
  forgeron: { n: "Forgeron de guerre", full: "Forgeron de guerre", tool: "Outils de forgeron",
    sum: "Apte au combat (armes de guerre, INT avec une arme magique), défenseur d'acier, Attaque supplémentaire (5), Décharge arcanique (9), Défenseur amélioré (15).",
    sp: { 3: ["heroism", "shield"], 5: ["branding-smite", "warding-bond"], 9: ["aura-of-vitality", "conjure-barrage"], 13: ["aura-of-purity", "fire-shield"], 17: ["banishing-smite", "mass-cure-wounds"] } },
};
const spec = g => g.level >= 3 && SPEC[g.aspec] ? g.aspec : null;
const specSpells = g => spec(g) ? Object.entries(SPEC[g.aspec].sp).filter(([lv]) => g.level >= +lv).flatMap(([, ids]) => ids).filter(id => BY_ID[id]) : [];
const ELIX = [null, ["Soins", g => `regagne 2d4 + ${R.ab(g, "int")} PV`], ["Rapidité", () => "vitesse +3 m pendant 1 heure"], ["Résilience", () => "+1 CA pendant 10 minutes"],
  ["Audace", () => "+1d4 aux jets d'attaque et de sauvegarde pendant 1 minute"], ["Vol", () => "vitesse de vol de 3 m pendant 10 minutes"], ["Transformation", () => "modification d'apparence, 10 minutes"]];
const elixN = lv => lv >= 15 ? 3 : lv >= 6 ? 2 : 1;
const CANON = {
  flamme: { n: "Lance-flammes", pills: g => [["d", "Dégâts", `${2 + (g.level >= 9)}d8 feu`], ["s", "Jet", `DEX ${dd(g)}`], ["n", "Zone", "cône de 4,50 m"]], d: "Cône adjacent de 4,50 m : jet de sauvegarde de Dextérité, dégâts de feu (moitié si réussi). Enflamme les objets inflammables non tenus ni portés." },
  baliste: { n: "Baliste de choc", pills: g => [["a", "Attaque", signed(atk(g))], ["d", "Dégâts", `${2 + (g.level >= 9)}d8 force`], ["n", "Portée", "36 m"]], d: "Attaque à distance avec un sort depuis le canon, une créature ou un objet à 36 m. Une créature touchée est repoussée de 1,50 m." },
  protect: { n: "Protecteur", pills: g => [["f", "PV temporaires", `1d8 + ${INT(g)}`], ["n", "Zone", "3 m"]], d: "Le canon et chaque créature de ton choix à 3 m gagnent des points de vie temporaires." },
};
const canMax = g => g.level >= 15 ? 2 : 1, canHp = g => 5 * g.level;
const sdMax = g => 2 + R.ab(g, "int") + 5 * g.level, homMax = g => 1 + R.ab(g, "int") + g.level;
const hasHom = g => (g.items || []).some(x => x.inf === "homoncule");

// ---------- Capacités (niveau, pastille, texte)
const FEATS = [
  { lv: 1, n: "Bricolage magique", k: "f", pill: g => `${INT(g)} objet${INT(g) > 1 ? "s" : ""} au plus`, d: g => `Avec des outils de bricoleur ou d'artisan en main, action : un objet non magique de taille TP gagne une propriété au choix (lumière vive 1,50 m et faible 1,50 m de plus ; message enregistré de 6 secondes au tapotement ; odeur ou son non verbal perceptible à 3 m ; image ou texte de 25 mots au plus). Dure indéfiniment ; une action pour y mettre fin. ${INT(g)} objet${INT(g) > 1 ? "s" : ""} au plus (modificateur d'Intelligence) : au-delà, la plus ancienne prend fin.` },
  { lv: 1, n: "Incantation", k: "f", pill: g => `INT · DD ${dd(g)} · ${signed(atk(g))}`, d: g => `Focaliseur requis : outils de voleur ou d'artisan maîtrisés (ou un objet que tu as imprégné, dès le niveau 2). Sorts préparés : modificateur d'Intelligence + moitié du niveau (minimum 1), à changer après un repos long. Rituel si le sort est préparé. DD ${dd(g)}, attaque ${signed(atk(g))}.` },
  { lv: 2, n: "Imprégnation d'objet", k: "f", pill: g => `${infKnown(g.level)} connues · ${infItems(g.level)} objets`, d: g => `À la fin d'un repos long, touche des objets non magiques pour les imprégner (un objet par imprégnation, une imprégnation par objet) : ${infItems(g.level)} objets au plus ; au-delà, la plus ancienne prend fin. Si tu meurs, elles disparaissent après autant de jours que ton modificateur d'Intelligence. Une imprégnation connue peut être remplacée à chaque niveau.` },
  { lv: 3, n: "Spécialité d'artificier", k: "f", pill: g => spec(g) ? SPEC[g.aspec].full : "à choisir", d: g => spec(g) ? `${SPEC[g.aspec].full} : ${SPEC[g.aspec].sum}` : "Alchimiste, Artilleur ou Forgeron de guerre ; capacités aux niveaux 3, 5, 9 et 15." },
  { lv: 3, n: "Outil de circonstance", k: "f", pill: () => "1 h · outils d'artisan", d: () => "Avec des outils de bricoleur en main, 1 heure de travail (peut coïncider avec un repos) : crée magiquement des outils d'artisan à 1,50 m. Non magiques, ils disparaissent quand tu réutilises cette capacité." },
  { lv: 6, n: "Expertise de l'outillage", k: "f", pill: () => "maîtrise doublée (outils)", d: () => "Ton bonus de maîtrise est doublé pour tout jet de caractéristique qui utilise ta maîtrise d'un outil." },
  { lv: 7, n: "Trait de génie", k: "f", pill: g => `+${INT(g)} · ${INT(g)} fois · repos long`, d: g => `Réaction : quand toi ou une créature que tu vois à 9 m fait un jet de caractéristique ou de sauvegarde, ajoute ton modificateur d'Intelligence (+${INT(g)}). ${INT(g)} fois par repos long.` },
  { lv: 10, n: "Adepte des objets magiques", k: "f", pill: () => "4 objets liés", d: () => "Tu peux te lier à quatre objets magiques à la fois. Fabriquer un objet commun ou peu commun : un quart du temps, moitié du prix." },
  { lv: 11, n: "Objet de stockage de sort", k: "f", pill: g => `${Math.max(2, 2 * R.ab(g, "int"))} utilisations`, d: g => `À la fin d'un repos long, stocke un sort d'artificier de niveau 1 ou 2 lancé par une action (sans le préparer) dans une arme ou un focaliseur. Qui le tient l'utilise par une action, avec ta caractéristique d'incantation. ${Math.max(2, 2 * R.ab(g, "int"))} utilisations (deux fois ton modificateur d'Intelligence).` },
  { lv: 14, n: "Érudit des objets magiques", k: "f", pill: () => "5 objets liés", d: () => "Tu peux te lier à cinq objets magiques à la fois, et tu ignores les exigences de classe, de race, de sort et de niveau des objets magiques." },
  { lv: 18, n: "Maître des objets magiques", k: "f", pill: () => "6 objets liés", d: () => "Tu peux te lier à six objets magiques à la fois." },
  { lv: 20, n: "Âme de l'artifice", k: "f", pill: () => "+1 JdS par objet lié", d: () => "+1 à tous tes jets de sauvegarde par objet magique auquel tu es lié. Réduit à 0 PV sans être tué : réaction pour mettre fin à une de tes imprégnations et rester à 1 PV." },
  // Alchimiste
  { lv: 3, c: "alchimiste", n: "Élixir expérimental", k: "d", pill: g => `${elixN(g.level)} après chaque repos long`, d: g => `À la fin d'un repos long, ${elixN(g.level)} élixir${elixN(g.level) > 1 ? "s" : ""} (d6 pour l'effet), avec un matériel d'alchimiste ; d'autres en dépensant un emplacement (action, effet choisi). Boire ou administrer : une action. Dure jusqu'au prochain repos long. 1 Soins (2d4 + INT) · 2 Rapidité (+3 m, 1 h) · 3 Résilience (+1 CA, 10 min) · 4 Audace (+1d4 attaques et sauvegardes, 1 min) · 5 Vol (3 m, 10 min) · 6 Transformation (modification d'apparence, 10 min).` },
  { lv: 5, c: "alchimiste", n: "Érudit alchimique", k: "d", pill: g => `+${INT(g)} soins ou dégâts`, d: g => `Sort lancé avec ton matériel d'alchimiste comme focaliseur : +${INT(g)} à un jet qui rend des PV ou inflige des dégâts d'acide, de feu, nécrotiques ou de poison.` },
  { lv: 9, c: "alchimiste", n: "Ingrédients revigorants", k: "f", pill: g => `${INT(g)} restaurations · repos long`, d: g => `Un élixir bu donne aussi 2d6 + ${INT(g)} PV temporaires. Restauration partielle sans emplacement ni préparation (matériel d'alchimiste), ${INT(g)} fois par repos long.` },
  { lv: 15, c: "alchimiste", n: "Maîtrise chimique", k: "f", pill: () => "résistance acide, poison", d: () => "Résistance à l'acide et au poison, immunité à l'état empoisonné. Restauration supérieure et guérison sans emplacement, préparation ni composantes matérielles (matériel d'alchimiste), chacun une fois par repos long." },
  // Artilleur
  { lv: 3, c: "artilleur", n: "Canon occulte", k: "d", pill: g => `CA 18 · ${canHp(g)} PV`, d: g => `Action, avec des outils de menuisier ou de forgeron : un canon TP (porté dans une main) ou P (occupe son espace) à 1,50 m. CA 18, ${canHp(g)} PV (5 × niveau), immunisé au poison, aux dégâts psychiques et à tous les états ; Réparation lui rend 2d6 PV. Disparaît à 0 PV ou au bout d'1 heure ; une action pour le révoquer. Une fois par repos long, puis en dépensant un emplacement de niveau 1+. Action bonus à 18 m : l'activer (et le déplacer de 4,50 m s'il a des jambes).` },
  { lv: 5, c: "artilleur", n: "Arme à feu arcanique", k: "d", pill: () => "+1d8 aux dégâts d'un sort", d: () => "À la fin d'un repos long, grave une baguette, un bâton ou un sceptre (outils de menuisier) : focaliseur de tes sorts d'artificier ; lancé à travers elle, un sort gagne +1d8 à l'un de ses jets de dégâts." },
  { lv: 9, c: "artilleur", n: "Canon explosif", k: "d", pill: () => "+1d8 · explosion 3d8", d: g => `Les dégâts du canon augmentent de 1d8. Action, à 18 m : il explose ; à 6 m, JdS de Dextérité (DD ${dd(g)}), 3d8 force, moitié si réussi.` },
  { lv: 15, c: "artilleur", n: "Position fortifiée", k: "f", pill: () => "deux canons · abri partiel 3 m", d: () => "Toi et tes alliés avez un abri partiel à 3 m de ton canon. Deux canons à la fois (même action, mais pas le même emplacement), activés par la même action bonus." },
  // Forgeron de guerre
  { lv: 3, c: "forgeron", n: "Apte au combat", k: "f", pill: () => "armes de guerre · INT (arme magique)", d: () => "Maîtrise des armes de guerre. Avec une arme magique, tu peux utiliser l'Intelligence au lieu de la Force ou de la Dextérité pour l'attaque et les dégâts." },
  { lv: 3, c: "forgeron", n: "Défenseur d'acier", k: "d", pill: g => `CA ${15 + (g.level >= 15 ? 2 : 0)} · ${sdMax(g)} PV`, d: () => "Compagnon fidèle : il partage ton initiative et joue juste après toi. Seule action par lui-même : Esquiver, sauf ordre en action bonus (une action de son bloc, ou Aider, Chercher, Foncer, Se cacher, Se désengager). Réparation lui rend 2d6 PV. Mort depuis moins d'une heure : action à 1,50 m avec des outils de forgeron et un emplacement de niveau 1+, il revient avec tous ses PV. Un nouveau à la fin d'un repos long." },
  { lv: 5, c: "forgeron", n: "Attaque supplémentaire", k: "f", pill: () => "2 attaques par action", d: () => "Deux attaques au lieu d'une quand tu prends l'action Attaquer." },
  { lv: 9, c: "forgeron", n: "Décharge arcanique", k: "d", pill: g => `${g.level >= 15 ? 4 : 2}d6 · ${INT(g)} fois · repos long`, d: g => `Quand tu touches avec une arme magique ou que ton défenseur touche : ${g.level >= 15 ? 4 : 2}d6 force en plus, ou ${g.level >= 15 ? 4 : 2}d6 PV rendus à une créature ou un objet à 9 m de la cible. ${INT(g)} fois par repos long, une fois par tour.` },
  { lv: 15, c: "forgeron", n: "Défenseur amélioré", k: "f", pill: () => "4d6 · CA +2", d: g => `Décharge arcanique : 4d6. Défenseur d'acier : +2 CA ; sa Parade d'attaque inflige 1d4 + ${R.ab(g, "int")} dégâts de force à l'attaquant.` },
];
const feats = g => FEATS.filter(f => !f.c || f.c === spec(g)).map((f, i) => ({ id: "a" + i, ...f }));

// ---------- Imprégnations : objets imprégnés (repos long, Gérer)
const known = g => (g.infK || []).filter(k => infOf(k));
const active = g => (g.items || []).map((x, i) => [x, i]).filter(([x]) => x.inf && infOf(x.inf));
/** Objets de l'inventaire acceptés par une imprégnation : bon type, non magiques par ailleurs. */
const eligible = (g, k) => { const f = infOf(k); return (g.items || []).map((x, i) => [x, i]).filter(([x]) => (x.inf === k || !x.inf) && !(isMagic({ ...x, inf: null }) && !x.inf) && f.ok(x)); };
function assignHTML(g, inStep) {
  const ks = known(g), n = active(g).length, max = infItems(g.level);
  if (!ks.length) return `<p class="muted" style="margin:0">Aucune imprégnation connue : choisis-les dans ✎ Gérer (onglet Sorts) ou au passage de niveau.</p>`;
  return `<div class="artcount"><b>Objets imprégnés</b><span class="${n === max ? "good" : n > max ? "over" : ""}">${n} / ${max}</span></div>
  ${inStep ? `<p class="muted lrnote">Touche chaque objet à la fin du repos. Une imprégnation par objet ; au-delà de ${max}, la plus ancienne prend fin.</p>` : ""}
  ${ks.map(k => { const f = infOf(k), cur = (g.items || []).findIndex(x => x.inf === k), list = eligible(g, k), x = g.items[cur];
    return `<div class="artinf"><div class="h"><b>${esc(f.n)}</b><span class="kps">${infPills(g, k, x)}</span></div>
    <select data-a="art-inf" data-k="${esc(k)}" aria-label="Objet imprégné : ${esc(f.n)}"><option value="">${list.length ? "Aucun objet" : `Aucun objet adapté (${esc(f.obj)})`}</option>${list.map(([y, i]) => `<option value="${i}"${i === cur ? " selected" : ""}>${esc(y.n)}</option>`).join("")}</select>
    ${k === "resistante" && x ? `<select data-a="art-res" aria-label="Type de résistance"><option value="">Résistance à…</option>${RES_TYPES.map(t => `<option${x.infOpt === t ? " selected" : ""}>${t}</option>`).join("")}</select>` : ""}</div>`; }).join("")}`;
}
onChange("art-inf", t => {
  const g = G(), k = t.dataset.k, f = infOf(k); if (!g || !f) return; const to = t.value === "" ? -1 : +t.value; let ended = "";
  mutate(g => {
    const clear = x => { delete x.inf; delete x.infAt; delete x.infOpt; if (x.infCh) { delete x.chMax; delete x.chU; delete x.rec; delete x.infCh; } };
    g.items.forEach(x => { if (x.inf === k) clear(x); });
    if (to < 0 || !g.items[to]) return;
    const x = g.items[to]; clear(x); x.inf = k; x.infAt = Date.now();
    if (f.ch && !x.chMax) { x.chMax = f.ch; x.chU = 0; x.rec = "aube"; x.infCh = 1; } // Arme radiante, Bouclier répulsif : 4 charges, 1d4 à l'aube
    const on = g.items.filter(y => y.inf), max = infItems(g.level);
    if (on.length > max) { const old = on.sort((a, b) => (a.infAt || 0) - (b.infAt || 0))[0]; ended = `${infOf(old.inf).n} (${old.n})`; clear(old); }
  });
  if (ended) toast(`Limite de ${infItems(g.level)} objets imprégnés : <b>${esc(ended)}</b> prend fin`);
});
onChange("art-res", t => { mutate(g => { const x = g.items.find(y => y.inf === "resistante"); if (x) x.infOpt = t.value || undefined; }); });

// Imprégnations connues : ligne de choix dépliable (Gérer et assistant de niveau)
function knownPicker(g, sel, max, lu) {
  return `<div class="luplist">${allInf().map(f => pickRow({ act: lu ? 'data-a="lu-ainf"' : 'data-a="art-infk"', id: "inf-" + f.k, on: sel.includes(f.k), full: sel.length >= max,
    off: !!f.lv && g.level < f.lv && !sel.includes(f.k), why: f.lv ? `artificier niveau ${f.lv}` : "", name: esc(f.n), label: f.n, pills: infPills(g, f.k),
    body: `<div class="meta">Objet : ${esc(f.obj)}${f.lien ? " · nécessite un lien" : ""}</div><div class="eff">${esc(f.d)}</div>` })).join("")}</div>`;
}
function settingsHTML(g) {
  if (g.level < 2) return "";
  const max = infKnown(g.level), sel = known(g), open = S.open.has("a:inf");
  return `<div class="rubric"><h2>Imprégnations</h2><span class="aside">${sel.length} connue${sel.length > 1 ? "s" : ""} sur ${max} · ${infItems(g.level)} objets</span></div>
  <div class="invlist">${sel.map(k => `<div class="invrow"><span class="invstar" aria-hidden="true">✦</span><b>${esc(infOf(k).n)}</b><span class="kps">${infPills(g, k)}</span></div>`).join("") || `<div class="empty">Aucune imprégnation connue.</div>`}</div>
  <button class="linkbtn" data-a="row" data-id="a:inf" aria-expanded="${open}">${open ? "Fermer le choix ▴" : sel.length < max ? `Choisir ${max - sel.length} imprégnation${max - sel.length > 1 ? "s" : ""} ▾` : "Modifier le choix ▾"}</button>
  ${open ? knownPicker(g, sel, max, false) : ""}
  <div class="artbox">${assignHTML(g, false)}<p class="muted" style="margin:0;font-size:12.5px">En principe à la fin d'un repos long (étape Imprégner) ; ici pour corriger.</p></div>`;
}
onClick("art-infk", (b) => { const g = G(), k = b.dataset.id.replace(/^inf-/, ""), f = infOf(k); if (!g || !f) return; const s = known(g), want = !s.includes(k);
  if (want && s.length >= infKnown(g.level)) { toast(`${infKnown(g.level)} imprégnations connues à ce niveau : retire-en d'abord une`); return; }
  if (want && f.lv && g.level < f.lv) { toast(`${esc(f.n)} : artificier niveau ${f.lv}`); return; }
  mutate(g => { g.infK = want ? [...s, k] : s.filter(x => x !== k); if (!want) g.items.forEach(x => { if (x.inf === k) { delete x.inf; delete x.infAt; delete x.infOpt; if (x.infCh) { delete x.chMax; delete x.chU; delete x.rec; delete x.infCh; } } }); }); });

// ---------- En jeu : imprégnations actives, spécialité, ressources
const hpBox = (key, cur, max, label) => `<div class="arthp"><span class="v"><b>${cur}</b>/${max} PV</span><input id="ahp-${key}" type="number" inputmode="numeric" min="0" placeholder="0" aria-label="${label}"><button class="btn sm" data-a="art-hp" data-k="${key}" data-v="-1">Dégâts</button><button class="btn sm" data-a="art-hp" data-k="${key}" data-v="1">Soins</button></div>`;
function infPlayHTML(g) {
  if (g.level < 2) return "";
  const on = active(g);
  return foldSec("art-inf", "Imprégnations", `${on.length} / ${infItems(g.level)} objets · repos long`, `<div class="artbox">${on.length ? on.map(([x]) => `<div class="artinf"><div class="h"><b>✦ ${esc(x.n)}</b><span class="kps">${infPills(g, x.inf, x)}</span></div><small>${esc(infOf(x.inf).n)}</small></div>`).join("")
    : `<p class="muted" style="margin:0">Aucun objet imprégné : au prochain repos long (étape Imprégner), ou dans ✎ Gérer.</p>`}</div>`, on.map(([x]) => esc(x.n)).join(", "));
}
function canonHTML(g) {
  const list = g.can || [], f = S.canForm;
  let h = list.map((c, i) => { const t = CANON[c.t] || CANON.flamme;
    return `<div class="artcard"><div class="h"><b>Canon · ${t.n}</b><span class="kp n">CA 18</span><span class="kp n">${c.sz === "P" ? "P" : "TP"}${c.legs ? " · jambes" : ""}</span><button class="btn ghost sm" data-a="can-end" data-i="${i}">Révoquer</button></div>
    ${hpBox("can" + i, Math.max(0, c.hp ?? canHp(g)), canHp(g), "Points de vie du canon")}
    <div class="capopt"><b>Activer · action bonus</b>${pillsRaw(t.pills(g))}<div class="eff">${t.d}${c.legs ? " Il peut aussi marcher ou grimper de 4,50 m." : ""}</div><div class="cast"><button class="btn cast-go sm" data-a="can-act" data-i="${i}">Activer</button>${g.level >= 9 ? `<button class="btn sm" data-a="can-boom" data-i="${i}">Explosion · 3d8 force, DEX ${dd(g)}</button>` : ""}</div></div></div>`; }).join("");
  if (list.length < canMax(g)) {
    const free = !g.canFree, lv = firstSlot(g);
    h += f ? `<div class="artcard"><div class="h"><b>Créer un canon</b><span class="muted" style="font-size:12.5px">action · outils de menuisier ou de forgeron</span></div>
      <div class="chips">${Object.entries(CANON).map(([k, t]) => `<button class="chip" data-a="can-t" data-v="${k}" aria-pressed="${f.t === k}">${t.n}</button>`).join("")}</div>
      ${CANON[f.t] ? `${pillsRaw(CANON[f.t].pills(g))}<div class="eff" style="font-size:13.5px">${CANON[f.t].d}</div>` : ""}
      <div class="chips"><button class="chip" data-a="can-sz" data-v="TP" aria-pressed="${f.sz !== "P"}">TP · porté dans une main</button><button class="chip" data-a="can-sz" data-v="P" aria-pressed="${f.sz === "P"}">P · occupe son espace</button></div>
      <label class="check"><input type="checkbox" data-a="can-legs"${f.legs ? " checked" : ""}> Avec des jambes (déplacement 4,50 m)</label>
      <div class="cast"><button class="btn cast-go sm" data-a="can-go"${CANON[f.t] && (free || lv) ? "" : " disabled"}>${free ? "Créer · gratuit" : lv ? `Créer · emplacement niv. ${lv}` : "Plus d'emplacement"}</button><button class="btn ghost sm" data-a="can-form">Annuler</button></div>
      <span class="muted" style="font-size:12.5px">${free ? "Gratuit une fois par repos long, ensuite un emplacement de niveau 1 ou plus." : "Création gratuite utilisée : il faut un emplacement de niveau 1 ou plus."}</span></div>`
      : `<button class="btn" data-a="can-form">＋ Créer un canon${free ? " (gratuit)" : ""}</button>`;
  }
  return foldSec("art-can", "Canon occulte", `${list.length ? `${list.length} actif${list.length > 1 ? "s" : ""} · 1 heure` : "pas de canon"} · ${g.canFree ? "création gratuite utilisée" : "1 gratuit par repos long"}`, `<div class="artbox">${h}</div>`);
}
const firstSlot = g => { const s = R.slots(g); for (let i = 0; i < s.length; i++) if ((s[i] || 0) - (+(g.used[i + 1] || 0)) > 0) return i + 1; return 0; };
function elixHTML(g) {
  const list = g.elix || [], free = elixN(g.level) - Math.min(elixN(g.level), g.elixFree || 0), lv = firstSlot(g);
  const h = list.map((e, i) => `<div class="artinf"><div class="h"><b>Élixir · ${ELIX[e][0]}</b><span class="kps"><span class="kp f">${esc(ELIX[e][1](g))}</span></span><button class="btn cast-go sm" data-a="elix-drink" data-i="${i}">Boire</button></div></div>`).join("")
    + (free ? `<div class="hpin"><input id="elix-d6" type="number" inputmode="numeric" min="1" max="6" placeholder="d6" aria-label="Résultat du d6"><button class="btn sm" data-a="elix-new">Créer · ${free} gratuit${free > 1 ? "s" : ""}</button></div>` : "")
    + `<div class="hpin"><select id="elix-pick" aria-label="Effet de l'élixir">${ELIX.slice(1).map((x, i) => `<option value="${i + 1}">${i + 1} · ${x[0]}</option>`).join("")}</select><button class="btn sm" data-a="elix-slot"${lv ? "" : " disabled"}>${lv ? `Créer · emplacement niv. ${lv}` : "Plus d'emplacement"}</button></div>`
    + `<span class="muted" style="font-size:12.5px">Après un repos long : lance un d6 par élixir gratuit (${elixN(g.level)}). Avec un emplacement : action, effet au choix. Un élixir dure jusqu'au prochain repos long${g.level >= 9 ? ` ; bu, il donne aussi 2d6 + ${INT(g)} PV temporaires` : ""}.</span>`;
  return foldSec("art-elix", "Élixirs expérimentaux", `${list.length} prêt${list.length > 1 ? "s" : ""} · repos long`, `<div class="artbox">${h}</div>`, list.map(e => ELIX[e][0]).join(", "));
}
function defenderHTML(g) {
  const ac = 15 + (g.level >= 15 ? 2 : 0), pb = R.prof(g.level), sd = g.sd || {}, hp = sd.hp ?? sdMax(g), rep = 3 - Math.min(3, sd.rep || 0);
  return foldSec("art-sd", "Défenseur d'acier", `CA ${ac} · ${hp}/${sdMax(g)} PV`, `<div class="artbox"><div class="artcard">
  ${hp <= 0 ? `<p style="margin:0"><b>Hors de combat.</b> Mort depuis moins d'une heure : action à 1,50 m avec des outils de forgeron et un emplacement de niveau 1+, il revient avec tous ses PV.</p><div class="cast"><button class="btn cast-go sm" data-a="sd-revive"${firstSlot(g) ? "" : " disabled"}>Le ramener · emplacement niv. ${firstSlot(g) || "—"}</button></div>` : hpBox("sd", hp, sdMax(g), "Points de vie du défenseur")}
  ${pillsRaw([["n", "CA", String(ac)], ["n", "Vitesse", "12 m"], ["n", "Initiative", "la tienne, juste après toi"]])}
  <div class="capopt"><b>Morsure de force · action (ordre en action bonus)</b>${pillsRaw([["a", "Attaque", signed(atk(g))], ["d", "Dégâts", `1d8 + ${pb} force`], ["n", "Allonge", "1,50 m"]])}</div>
  <div class="capopt"><b>Réparation · ${rep}/3 aujourd'hui</b><div class="eff">Restaure 2d8 + ${pb} PV sur lui-même, ou sur un artificiel ou un objet à 1,50 m.</div><div class="cast"><button class="btn sm" data-a="sd-rep"${rep ? "" : " disabled"}>Utiliser</button></div></div>
  <div class="capopt"><b>Parade d'attaque · réaction</b><div class="eff">Désavantage au jet d'attaque d'une créature qu'il voit à 1,50 m, contre une autre créature que lui.${g.level >= 15 ? ` L'attaquant subit 1d4 + ${R.ab(g, "int")} dégâts de force.` : ""}</div></div>
  <span class="muted" style="font-size:12.5px">FOR 14 · DEX 12 · CON 14 · INT 4 · SAG 10 · CHA 6. JdS DEX ${signed(1 + pb)}, CON ${signed(2 + pb)} ; Athlétisme ${signed(2 + pb)}, Perception ${signed(2 * pb)} ; immunisé au poison (charmé, empoisonné, épuisement) ; vision dans le noir 18 m ; ne peut être surpris. Réparation (sort) : +2d6 PV. Un nouveau défenseur à la fin d'un repos long.</span></div></div>`);
}
function homHTML(g) {
  const pb = R.prof(g.level), hp = (g.hom || {}).hp ?? homMax(g);
  return foldSec("art-hom", "Serviteur homoncule", `CA 13 · ${hp}/${homMax(g)} PV`, `<div class="artbox"><div class="artcard">${hpBox("hom", Math.max(0, hp), homMax(g), "Points de vie de l'homoncule")}
  ${pillsRaw([["n", "CA", "13"], ["n", "Vitesse", "6 m, vol 9 m"]])}
  <div class="capopt"><b>Frappe de force · action (ordre en action bonus)</b>${pillsRaw([["a", "Attaque", signed(atk(g))], ["d", "Dégâts", `1d4 + ${pb} force`], ["n", "Portée", "9 m"]])}</div>
  <div class="capopt"><b>Conduit magique · réaction</b><div class="eff">Délivre un sort de contact que tu lances, s'il est à 36 m de toi.</div></div>
  <span class="muted" style="font-size:12.5px">FOR 4 · DEX 15 · CON 12 · INT 10 · SAG 10 · CHA 7. JdS DEX ${signed(2 + pb)} ; Perception ${signed(2 * pb)}, Discrétion ${signed(2 + pb)} ; Évasion ; immunisé au poison (empoisonné, épuisement) ; vision dans le noir 18 m. S'il meurt, il disparaît en laissant son cœur.</span></div></div>`);
}
const pipRow = (r, n, u, lbl) => Array.from({ length: n }, (_, k) => `<button class="pip${k < Math.min(n, u) ? " used" : ""}" data-a="res-pip" data-r="${r}" data-k="${k}" aria-label="${lbl} ${k + 1}, ${k < u ? "utilisé" : "disponible"}"></button>`).join("");
function resHTML(g) {
  let h = infPlayHTML(g);
  if (spec(g) === "artilleur") h += canonHTML(g);
  if (spec(g) === "alchimiste") h += elixHTML(g);
  if (spec(g) === "forgeron") h += defenderHTML(g);
  if (hasHom(g)) h += homHTML(g);
  let r = "";
  if (g.level >= 7) r += capRow(g, "genie", "Trait de génie", "repos long", pipRow("genie", INT(g), g.genieU, "Trait de génie"), false, () => `<div class="eff">Réaction : +${INT(g)} au jet de caractéristique ou de sauvegarde d'une créature que tu vois à 9 m (toi compris).</div>`);
  if (spec(g) === "alchimiste" && g.level >= 9) r += capRow(g, "revig", "Restauration partielle", "repos long", pipRow("revig", INT(g), g.revigU, "Restauration partielle"), !!r, () => `<div class="eff">Sans emplacement ni préparation, avec ton matériel d'alchimiste comme focaliseur.</div>`);
  if (spec(g) === "forgeron" && g.level >= 9) r += capRow(g, "jolt", "Décharge arcanique", "repos long", pipRow("jolt", INT(g), g.joltU, "Décharge arcanique"), !!r, () => `<div class="eff">Arme magique ou défenseur qui touche : ${g.level >= 15 ? 4 : 2}d6 force en plus, ou ${g.level >= 15 ? 4 : 2}d6 PV rendus à une créature à 9 m de la cible. Une fois par tour.</div>`);
  return h + (r ? foldSec("res-cls", "Ressources de l'artificier", "", `<div class="slots res">${r}</div>`) : "");
}
// PV des créations : canon (can0, can1), défenseur (sd), homoncule (hom)
onClick("art-hp", (b) => {
  const g = G(), k = b.dataset.k, el = document.getElementById("ahp-" + k), n = Math.floor(+(el && el.value) || 0); if (!g) return;
  if (n < 1) { if (el) el.focus(); return; }
  const sign = +b.dataset.v, prev = JSON.parse(JSON.stringify({ can: g.can || [], sd: g.sd || {}, hom: g.hom || {} }));
  mutate(g => {
    if (k.startsWith("can")) { const c = g.can[+k.slice(3)]; if (!c) return; c.hp = Math.max(0, Math.min(canHp(g), (c.hp ?? canHp(g)) + sign * n)); if (c.hp === 0) g.can.splice(+k.slice(3), 1); }
    else if (k === "sd") { g.sd = { ...(g.sd || {}) }; g.sd.hp = Math.max(0, Math.min(sdMax(g), (g.sd.hp ?? sdMax(g)) + sign * n)); }
    else { g.hom = { ...(g.hom || {}) }; g.hom.hp = Math.max(0, Math.min(homMax(g), (g.hom.hp ?? homMax(g)) + sign * n)); }
  });
  toast(`${k.startsWith("can") ? "Canon" : k === "sd" ? "Défenseur d'acier" : "Homoncule"} : ${sign < 0 ? "−" : "+"}${n} PV${k.startsWith("can") && !(G().can || [])[+k.slice(3)] ? " · détruit" : ""}`, () => { mutate(g => Object.assign(g, prev)); return "Annulé"; });
});
onClick("can-form", () => { S.canForm = S.canForm ? null : { t: "", sz: "TP", legs: false }; render(); });
onClick("can-t", (b) => { if (S.canForm) { S.canForm.t = b.dataset.v; render(); } });
onClick("can-sz", (b) => { if (S.canForm) { S.canForm.sz = b.dataset.v; render(); } });
onChange("can-legs", t => { if (S.canForm) S.canForm.legs = t.checked; });
onClick("can-go", () => {
  const g = G(), f = S.canForm; if (!g || !f || !CANON[f.t] || (g.can || []).length >= canMax(g)) return;
  const free = !g.canFree, lv = free ? 0 : firstSlot(g); if (!free && !lv) return;
  const prev = JSON.parse(JSON.stringify({ can: g.can || [], canFree: !!g.canFree, used: g.used }));
  S.canForm = null;
  mutate(g => { g.can = [...(g.can || []), { t: f.t, sz: f.sz === "P" ? "P" : "TP", legs: !!f.legs, hp: canHp(g) }]; if (free) g.canFree = true; else g.used[lv] = (+(g.used[lv] || 0)) + 1; });
  toast(`<b>Canon · ${CANON[f.t].n}</b> créé (${canHp(g)} PV, 1 heure)${free ? " · création gratuite" : ` · emplacement de niveau ${lv}`}`, () => { mutate(g => Object.assign(g, prev)); return "Canon annulé"; });
});
onClick("can-act", (b) => { const g = G(), c = (g && g.can || [])[+b.dataset.i]; if (!c) return; const t = CANON[c.t];
  toast(`<b>${t.n}</b> : ${t.pills(g).map(([, l, v]) => `${l} ${v}`).join(" · ")}`); });
onClick("can-boom", (b) => { const g = G(), i = +b.dataset.i; if (!g || !(g.can || [])[i]) return; const prev = JSON.parse(JSON.stringify(g.can));
  mutate(g => { g.can.splice(i, 1); }); toast(`<b>Explosion</b> : à 6 m, JdS DEX ${dd(g)}, 3d8 force (moitié si réussi) · canon détruit`, () => { mutate(g => { g.can = prev; }); return "Explosion annulée"; }); });
onClick("can-end", (b) => { const g = G(), i = +b.dataset.i; if (!g || !(g.can || [])[i]) return; const prev = JSON.parse(JSON.stringify(g.can));
  mutate(g => { g.can.splice(i, 1); }); toast("Canon révoqué", () => { mutate(g => { g.can = prev; }); return "Canon rétabli"; }); });
onClick("elix-new", () => { const g = G(), el = document.getElementById("elix-d6"), n = Math.floor(+(el && el.value) || 0); if (!g) return;
  if (n < 1 || n > 6) { toast("Tape le résultat du d6 (1 à 6)"); if (el) el.focus(); return; }
  if ((g.elixFree || 0) >= elixN(g.level)) return; const prev = JSON.parse(JSON.stringify({ elix: g.elix || [], elixFree: g.elixFree || 0 }));
  mutate(g => { g.elix = [...(g.elix || []), n]; g.elixFree = (g.elixFree || 0) + 1; });
  toast(`Élixir · <b>${ELIX[n][0]}</b> : ${esc(ELIX[n][1](g))}`, () => { mutate(g => Object.assign(g, prev)); return "Élixir annulé"; }); });
onClick("elix-slot", () => { const g = G(), el = document.getElementById("elix-pick"), n = +(el && el.value) || 1, lv = g && firstSlot(g); if (!g || !lv) return;
  const prev = JSON.parse(JSON.stringify({ elix: g.elix || [], used: g.used }));
  mutate(g => { g.elix = [...(g.elix || []), n]; g.used[lv] = (+(g.used[lv] || 0)) + 1; });
  toast(`Élixir · <b>${ELIX[n][0]}</b> créé · emplacement de niveau ${lv}`, () => { mutate(g => Object.assign(g, prev)); return "Élixir annulé"; }); });
onClick("elix-drink", (b) => { const g = G(), i = +b.dataset.i, e = (g && g.elix || [])[i]; if (!e) return; const prev = [...g.elix];
  mutate(g => { g.elix.splice(i, 1); });
  toast(`<b>${ELIX[e][0]}</b> : ${esc(ELIX[e][1](g))}${g.level >= 9 ? ` · + 2d6 + ${INT(g)} PV temporaires` : ""}`, () => { mutate(g => { g.elix = prev; }); return "Élixir rendu"; }); });
onClick("sd-rep", () => { const g = G(); if (!g) return; mutate(g => { g.sd = { ...(g.sd || {}), rep: Math.min(3, ((g.sd || {}).rep || 0) + 1) }; });
  toast(`Réparation : 2d8 + ${R.prof(g.level)} PV`, () => { mutate(g => { g.sd.rep = Math.max(0, (g.sd.rep || 1) - 1); }); return "Réparation rendue"; }); });
onClick("sd-revive", () => { const g = G(), lv = g && firstSlot(g); if (!g || !lv) return; const prev = JSON.parse(JSON.stringify({ sd: g.sd || {}, used: g.used }));
  mutate(g => { g.sd = { ...(g.sd || {}), hp: sdMax(g) }; g.used[lv] = (+(g.used[lv] || 0)) + 1; });
  toast(`Défenseur d'acier ramené (${sdMax(g)} PV) · emplacement de niveau ${lv}`, () => { mutate(g => Object.assign(g, prev)); return "Annulé"; }); });

// ---------- Assistant de niveau : imprégnations gagnées (une remplaçable par niveau)
function luChoices(g, b, L) {
  if (b.level < 2) return "";
  const n = infKnown(b.level), old = g.level >= 2 ? known(g) : [], sel = L.ainf || old, gone = old.filter(k => !sel.includes(k)).length;
  return `<div class="luprep"><h3>Imprégnations · ${sel.length}/${n}</h3><span class="muted">${n > old.length ? `${n - old.length} à choisir. ` : ""}${old.length ? `Tu peux aussi en remplacer une : retire-la (✓) puis choisis-en une autre${gone ? ` (${gone} remplacée)` : ""}.` : "Touche un nom pour lire l'imprégnation."} Réplique d'objet magique : une ligne par objet.</span>${knownPicker(b, sel, n, true)}</div>`;
}
onClick("lu-ainf", (b) => { const L = S.lu, g = G(); if (!L || !g) return; const k = b.dataset.id.replace(/^inf-/, ""), f = infOf(k), old = g.level >= 2 ? known(g) : [], sel = L.ainf || [...old], n = infKnown(L.to);
  if (!sel.includes(k)) { if (sel.length >= n) { toast(`${n} imprégnations à ce niveau : retire-en d'abord une`); return; } if (f.lv && L.to < f.lv) return; L.ainf = [...sel, k]; }
  else { if (old.includes(k) && old.filter(x => !sel.includes(x)).length >= 1) { toast("Une seule imprégnation remplacée par niveau"); return; } L.ainf = sel.filter(x => x !== k); }
  S.luKeep = true; render(); });

// ---------- Création (étape Compétences) : un type d'outils d'artisan au choix
const creation = {
  html: c => { const x = c.cx || {};
    return `<div class="crcls"><span class="lusub">Outils d'artisan · un type au choix</span><select id="cr-atool" aria-label="Outils d'artisan"><option value="">Choisir…</option>${TOOL_LISTS.artisan.filter(t => t !== "Outils de bricoleur").map(t => `<option${x.atool === t ? " selected" : ""}>${esc(t)}</option>`).join("")}</select><span class="fpprev">En plus des outils de voleur et des outils de bricoleur. Ils te serviront de focaliseur d'incantation.</span></div>`; },
  missing: c => (c.cx || {}).atool ? "" : "choisis un type d'outils d'artisan",
  apply: (g, c) => { const x = c.cx || {}; if (x.atool) g.atool = x.atool; },
};
onChange("#cr-atool", t => { if (!S.cr) return; S.cr.cx = { ...(S.cr.cx || {}), atool: t.value || "" }; render(); });

// ---------- Définition de la classe (contrat : voir docs/ARCHITECTURE.md)
const row = (l, o, n, cls) => `<div class="${o === n ? "same" : ""}"><span>${l}</span><span class="old">${o}</span><span class="ar">→</span><b${cls && o !== n ? ` style="color:var(${cls})"` : ""}>${n}</b></div>`;
export default {
  n: "Artificier", ab: "int", abN: "Intelligence", abArticle: "l'Intelligence", slots: SLOTS, top: 5, hitDie: "1d8",
  saves: ["con", "int"],
  weaponProf: g => ["simple", ...(spec(g) === "forgeron" ? ["martial"] : [])], armorProf: ["light", "medium", "shield"],
  tools: g => ["Outils de voleur", "Outils de bricoleur", g.atool, spec(g) ? SPEC[g.aspec].tool : ""].filter(Boolean),
  cantrips: lv => lv >= 14 ? 4 : lv >= 10 ? 3 : 2,
  prep: (g, m) => Math.max(1, m + Math.floor(g.level / 2)),
  prepNote: " (sans compter la spécialité)",
  ritualNeedsPrep: true, canRitual: prepared => prepared,
  defaults: () => ({ aspec: "artilleur", atool: "", infK: [], can: [], canFree: false, elix: [], elixFree: 0, sd: {}, hom: {}, genieU: 0, revigU: 0, joltU: 0 }),
  normalize(o) {
    if (!SPEC[o.aspec]) o.aspec = "artilleur";
    if (typeof o.atool !== "string") o.atool = "";
    o.infK = (Array.isArray(o.infK) ? o.infK : []).filter((k, i, a) => infOf(k) && a.indexOf(k) === i);
    o.can = (Array.isArray(o.can) ? o.can : []).filter(c => c && CANON[c.t]).map(c => ({ t: c.t, sz: c.sz === "P" ? "P" : "TP", legs: !!c.legs, hp: Number.isFinite(+c.hp) ? Math.max(0, +c.hp) : null }));
    o.canFree = !!o.canFree; o.elix = (Array.isArray(o.elix) ? o.elix : []).map(Number).filter(n => n >= 1 && n <= 6);
    o.sd = o.sd && typeof o.sd === "object" ? { hp: Number.isFinite(+o.sd.hp) && o.sd.hp !== null ? +o.sd.hp : undefined, rep: Math.max(0, Math.min(3, +o.sd.rep || 0)) } : {};
    o.hom = o.hom && typeof o.hom === "object" && Number.isFinite(+o.hom.hp) && o.hom.hp !== null ? { hp: +o.hom.hp } : {};
    ["elixFree", "genieU", "revigU", "joltU"].forEach(k => { o[k] = Math.max(0, +o[k] || 0); });
  },
  subclass: { lv: 3, label: "Spécialité d'artificier", field: "aspec", opts: () => Object.entries(SPEC).map(([k, s]) => [k, s.full, `${s.sum} Sorts : ${s.sp[3].map(id => BY_ID[id] ? BY_ID[id].n : id).join(", ")}… (outils : ${s.tool.toLowerCase()})`]) },
  subline: g => `Artificier niveau ${g.level}${spec(g) ? ` · ${esc(SPEC[g.aspec].full)}` : ""}`,
  subclassField: g => `<div class="field"><label for="f-aspec">Spécialité</label><select id="f-aspec">${Object.entries(SPEC).map(([k, s]) => `<option value="${k}"${k === g.aspec ? " selected" : ""}>${s.n}</option>`).join("")}</select></div>`,
  tabs: g => [["grimoire", "Sorts"], ["biblio", "Bibliothèque", classSpells(g).length]],
  alwaysPrepared: g => specSpells(g),
  alwaysPreparedInfo: g => ({ title: "Sorts de spécialité", aside: `toujours préparés · ${esc(SPEC[g.aspec].n)}`, origin: `Sort de spécialité · ${esc(SPEC[g.aspec].full)}`,
    tip: "Sort de spécialité : toujours préparé, hors limite", aria: "Sort de spécialité, toujours préparé" }),
  features: g => feats(g),
  settings: g => settingsHTML(g),
  resources: g => resHTML(g),
  resourceMax: { genie: g => INT(g), revig: g => INT(g), jolt: g => INT(g) },
  longOnly: g => [g.genieU ? "Trait de génie" : "", g.revigU ? "Restauration partielle (Ingrédients revigorants)" : "", g.joltU ? "Décharge arcanique" : "", g.canFree ? "création gratuite du canon" : ""],
  // Repos long : canons dissipés (1 heure), création gratuite rendue, élixirs perdus, nouveau défenseur ; les imprégnations restent (étape Imprégner)
  longRest: g => { g.can = []; g.canFree = false; g.elix = []; g.elixFree = 0; g.sd = {}; g.hom = {}; g.genieU = 0; g.revigU = 0; g.joltU = 0; S.canForm = null; },
  lrStep: g => g.level >= 2 ? { label: "Imprégner", html: g => `<p class="lrlead">Imprégner des objets</p>${assignHTML(g, true)}${spec(g) === "alchimiste" ? `<p class="muted lrnote">Élixirs expérimentaux : crée-les dans l'onglet Sorts (carte Élixirs), ${elixN(g.level)} gratuit${elixN(g.level) > 1 ? "s" : ""}.</p>` : ""}` } : null,
  // Imprégnation sur l'objet : bonus au toucher et aux dégâts (armes) ou à la CA (armures, boucliers)
  itemMagic: (g, x) => { const f = x && x.inf && INF[x.inf]; return f ? { atk: f.atk ? f.atk(g) : 0, ac: f.ac ? f.ac(g) : 0, label: f.n } : x && x.inf && infOf(x.inf) ? { atk: 0, ac: 0, label: infOf(x.inf).n } : null; },
  // Apte au combat (Forgeron de guerre) : Intelligence avec une arme magique
  attackAb: (g, w, item) => spec(g) === "forgeron" && item && (isMagic(item) || item.inf) ? "int" : null,
  attacksPerAction: g => spec(g) === "forgeron" && g.level >= 5 ? 2 : 1,
  attackNotes: g => [
    spec(g) === "artilleur" && g.level >= 5 ? "<b>Arme à feu arcanique</b> : un sort lancé à travers elle gagne +1d8 à un jet de dégâts." : ""].filter(Boolean),
  creation,
  levelUp: {
    step2: "Choix",
    rowsAfter: (g, b) => (b.level >= 2 ? row("Imprégnations connues", infKnown(g.level), infKnown(b.level), "--ok") + row("Objets imprégnés", infItems(g.level), infItems(b.level), "--ok") : "")
      + (spec(b) === "artilleur" ? row("PV du canon", g.level >= 3 ? canHp(g) : "—", canHp(b), "--ok") : "") + (spec(b) === "forgeron" ? row("PV du défenseur", g.level >= 3 ? sdMax(g) : "—", sdMax(b), "--ok") : ""),
    choices: (g, b, L) => luChoices(g, b, L),
    notes: (g, to) => [to === 3 ? `<span><b>Spécialité d'artificier</b> : Alchimiste, Artilleur ou Forgeron de guerre, à choisir ci-dessus.</span>` : ""].filter(Boolean),
    summaryExtra(g, b) {
      const nw = specSpells(b).filter(id => !specSpells(g).includes(id));
      return nw.length ? `<div style="display:grid;gap:6px"><span class="lusub" style="color:var(--gold)">Nouveaux sorts de spécialité · toujours préparés</span>${nw.map(id => BY_ID[id]).sort(byName).map(s => `<div class="lucan"><span style="color:var(--gold)">★</span><span class="n">${esc(s.n)}</span></div>`).join("")}</div>` : "";
    },
    recapBefore: (g, b, L) => L.ainf ? `<div><span class="n">Imprégnations</span><small>${[...L.ainf.filter(k => !known(g).includes(k)).map(k => "+ " + esc(infOf(k).n)), ...known(g).filter(k => !L.ainf.includes(k)).map(k => "− " + esc(infOf(k).n))].join(", ") || "inchangées"}</small></div>` : "",
    apply: (g, L) => { if (L.ainf) { const gone = (g.infK || []).filter(k => !L.ainf.includes(k)); g.infK = [...L.ainf]; g.items.forEach(x => { if (gone.includes(x.inf)) { delete x.inf; delete x.infAt; delete x.infOpt; } }); } },
  },
};
onChange("#f-aspec", t => { mutate(g => { if (SPEC[t.value]) g.aspec = t.value; }); });
