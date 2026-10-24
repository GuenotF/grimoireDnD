// Moine (Manuel des joueurs 2014) : Arts martiaux, Défense et Déplacement sans armure, ki (chaque capacité retire ses points,
// comme un sort son emplacement), traditions de la Paume, de l'Ombre et des Quatre éléments (disciplines AideDD fournies par Fabien).
// Classe sans sorts : onglet Capacités. Résumés rédigés pour la table, à vérifier dans le livre.
import { onChange, onClick } from "../core/actions.js";
import { esc, signed } from "../core/format.js";
import { fxKey } from "../core/schema.js";
import { G, S } from "../core/state.js";
import { mutate } from "../core/store.js";
import { render, toast } from "../core/ui.js";
import { BY_ID } from "../data.js";
import { abilitiesHTML } from "../features/abilities.js";
import { NO_TRACK, concOf } from "../features/cast.js";
import { innateBlock, innateSpells } from "../features/innate.js";
import { pDots, pFoot, pHeader, printHTML } from "../features/print.js";
import { pText, upcast } from "../features/spells.js";
import { initiative, speedOf } from "../rules/character.js";
import { R } from "../rules/common.js";
import { TOOL_LISTS } from "../rules/creation.js";
import { acCalc } from "../rules/equipment.js";
import { heal, hpCur } from "../rules/hp.js";
import { ABILITIES } from "../rules/tables.js";
import { foldSec, pickRow, pillsRaw, statLabel } from "../ui/components.js";

// ---------- Tables
const MON = {
  die: lv => lv >= 17 ? "1d10" : lv >= 11 ? "1d8" : lv >= 5 ? "1d6" : "1d4",            // dé d'arts martiaux
  ki: g => g.level >= 2 ? g.level : 0,
  speed: lv => lv >= 18 ? 9 : lv >= 14 ? 7.5 : lv >= 10 ? 6 : lv >= 6 ? 4.5 : lv >= 2 ? 3 : 0,
  dd: g => 8 + R.prof(g.level) + R.ab(g, "wis"),
  discN: lv => lv >= 17 ? 5 : lv >= 11 ? 4 : lv >= 6 ? 3 : lv >= 3 ? 2 : 0,                // Lien élémentaire compris
  kiMax: lv => lv >= 17 ? 6 : lv >= 13 ? 5 : lv >= 9 ? 4 : lv >= 5 ? 3 : 2,                // ki au plus par discipline
};
const TRAD = {
  paume: { n: "Paume", full: "Voie de la paume", sum: "Technique de la paume (Déluge de coups : à terre, repoussé ou sans réaction), Plénitude physique (6), Tranquillité (11), Paume frémissante (17)." },
  ombre: { n: "Ombre", full: "Voie de l'ombre", sum: "Arts des ombres (2 ki : ténèbres, vision dans le noir, passage sans trace, silence ; illusion mineure), Foulée d'ombre (6), Linceul d'ombre (11), Opportuniste (17)." },
  elements: { n: "Quatre éléments", full: "Voie des quatre éléments", sum: "Disciplines élémentaires lancées avec du ki : Lien élémentaire et une discipline au niveau 3, puis 6, 11 et 17." },
};
// Disciplines élémentaires (AideDD) : cost = ki ; sp = sort lancé ; plus = ki en plus (« d10 » : +1d10 par ki ; « lv » : niveau de sort plus élevé)
const DISC = {
  crochets: { n: "Crochets du serpent de feu", cost: 1, plus: "hit", p: [["f", "allonge +3 m, feu"]], d: "Pendant l'action Attaquer : allonge de tes attaques à mains nues +3 m pour ce tour, dégâts de feu au lieu de contondants. +1 ki quand une attaque touche : +1d10 feu." },
  montagne: { n: "Défense de la montagne éternelle", lv: 17, cost: 5, sp: "stoneskin", d: "Peau de pierre sur toi." },
  destrier: { n: "Destrier des vents", lv: 11, cost: 4, sp: "fly", d: "Vol sur toi." },
  etreinte: { n: "Étreinte du vent du nord", lv: 6, cost: 3, sp: "hold-person", d: "Immobilisation de personne." },
  faconnage: { n: "Façonnage de la rivière", cost: 1, p: [["f", "eau ↔ glace, 9 m"], ["n", "36 m"]], d: "Action : dans une zone d'eau ou de glace de 9 m de côté à 36 m, change l'eau en glace (et inversement) et remodèle la glace (élévation, tranchée, mur, pilier) jusqu'à la moitié de la plus grande dimension ; pas de piège ni d'emprisonnement." },
  phenix: { n: "Flammes du phénix", lv: 11, cost: 4, sp: "fireball", d: "Boule de feu." },
  fouet: { n: "Fouet de l'onde", cost: 2, plus: "d10", p: [["d", "{n}d10 contondant"], ["s", "JdS DEX"], ["n", "9 m"]], d: "Action, une créature à 9 m : JdS de Dextérité ; échec : 3d10 contondants (+1d10 par ki en plus), à terre ou tirée de 7,50 m vers toi ; réussite : moitié des dégâts." },
  cendres: { n: "Frappe de cendres", cost: 2, sp: "burning-hands", d: "Mains brûlantes." },
  gong: { n: "Gong du sommet", lv: 6, cost: 3, sp: "shatter", d: "Fracassement." },
  lien: { n: "Lien élémentaire", cost: 0, p: [["f", "effet mineur, 9 m"]], d: "Action, à 9 m : effet sensoriel inoffensif (air, terre, feu, eau), allumer ou éteindre une petite flamme, refroidir ou réchauffer 500 g de matière pour 1 heure, ou modeler un cube de 30 cm d'élément pour 1 minute." },
  poing: { n: "Poing de l'air", cost: 2, plus: "d10", p: [["d", "{n}d10 contondant"], ["s", "JdS FOR"], ["n", "9 m"]], d: "Action, une créature à 9 m : JdS de Force ; échec : 3d10 contondants (+1d10 par ki en plus), repoussée de 6 m et à terre ; réussite : moitié des dégâts." },
  tonnerres: { n: "Poing des quatre tonnerres", cost: 2, sp: "thunderwave", d: "Vague tonnante." },
  brume: { n: "Posture de brume", lv: 11, cost: 4, sp: "gaseous-form", d: "Forme gazeuse sur toi." },
  ruee: { n: "Ruée des esprits du vent", cost: 2, sp: "gust-of-wind", d: "Bourrasque." },
  hiver: { n: "Souffle de l'hiver", lv: 17, cost: 6, sp: "cone-of-cold", d: "Cône de froid." },
  torrent: { n: "Torrent de flammes voraces", lv: 17, cost: 5, sp: "wall-of-fire", d: "Mur de feu." },
  vague: { n: "Vague de terre grondante", lv: 17, cost: 6, sp: "wall-of-stone", d: "Mur de pierre." },
};
Object.values(DISC).forEach(x => { if (x.sp && !x.plus && BY_ID[x.sp] && /par niveau d'emplacement/.test(BY_ID[x.sp].up || "") && BY_ID[x.sp].p.startsWith("d:")) x.plus = "lv"; });
const SHADOW = ["darkness", "darkvision", "pass-without-trace", "silence"];
const trad = g => g.level >= 3 ? g.mtrad : null;
const noArmor = g => { const a = acCalc(g); return !a.armor && !a.shield; };
const monkWeapon = w => w.id === "shortsword" || (w.cat === "simple" && w.rng === "melee" && !w.two && !w.heavy);
const avg = d => { const m = /(\d+)d(\d+)/.exec(d || ""); return m ? +m[1] * (+m[2] + 1) / 2 : 0; };
const kiLeft = g => Math.max(0, MON.ki(g) - (g.kiU || 0));
const known = g => trad(g) === "elements" ? ["lien", ...(g.disc || []).filter(k => DISC[k])] : [];

// ---------- Options de ki (En jeu) : chaque bouton retire ses points
const OPTS = [
  { id: "deluge", lv: 2, cost: 1, n: "Déluge de coups", p: () => [["d", "Attaques", "2 à mains nues"], ["n", "Temps", "action bonus"]], d: g => `Après l'action Attaquer : deux attaques à mains nues en action bonus.${trad(g) === "paume" ? ` Technique de la paume, à chaque coup : JdS DEX ${MON.dd(g)} ou à terre, JdS FOR ${MON.dd(g)} ou repoussée de 4,50 m, ou plus de réaction jusqu'à la fin de ton prochain tour.` : ""}` },
  { id: "patiente", lv: 2, cost: 1, n: "Défense patiente", p: () => [["f", "Effet", "Esquiver"], ["n", "Temps", "action bonus"]], d: () => "Action Esquiver en action bonus." },
  { id: "aerien", lv: 2, cost: 1, n: "Déplacement aérien", p: () => [["f", "Effet", "Se désengager ou Foncer"], ["n", "Temps", "action bonus"]], d: () => "Se désengager ou Foncer en action bonus ; distance de saut doublée pour ce tour." },
  { id: "renvoi", lv: 3, cost: 1, n: "Parade de projectiles : renvoyer", p: g => [["s", "Réduction (réaction)", `1d10 + ${R.ab(g, "dex") + g.level}`], ["a", "Attaque", signed(R.prof(g.level) + Math.max(R.ab(g, "dex"), R.ab(g, "str")))], ["d", "Dégâts", `${MON.die(g.level)} + DEX`], ["n", "Portée", "6/18 m"]], d: () => "Si la Parade réduit les dégâts à 0 et que tu as une main libre : attrape le projectile, et pour 1 ki renvoie-le (attaque de moine, maîtrisée)." },
  { id: "etourdir", lv: 5, cost: 1, n: "Frappe étourdissante", p: g => [["s", "JdS", `CON ${MON.dd(g)}`], ["f", "Effet", "étourdie"]], d: () => "Quand tu touches au corps à corps : la cible fait un JdS de Constitution ou est étourdie jusqu'à la fin de ton prochain tour." },
  { id: "ame", lv: 14, cost: 1, n: "Âme de diamant : relance", p: () => [["f", "Effet", "relance un JdS raté"]], d: () => "Relance un jet de sauvegarde raté ; tu dois garder le second résultat." },
  { id: "fremissante", lv: 17, c: "paume", cost: 3, n: "Paume frémissante", p: g => [["s", "JdS", `CON ${MON.dd(g)}`], ["d", "Effet", "0 PV, ou 10d10 nécrotique"]], d: g => `Quand tu touches à mains nues : vibrations pendant ${g.level} jours. Action plus tard (même plan) : JdS de Constitution ; échec : 0 PV ; réussite : 10d10 nécrotiques. Une seule créature à la fois.` },
  { id: "desertion", lv: 18, cost: 4, n: "Désertion de l'âme", p: () => [["f", "Effet", "invisible 1 min, résistance sauf force"], ["n", "Temps", "action"]], d: () => "Action : invisible 1 minute et résistance à tous les dégâts sauf de force." },
  { id: "astrale", lv: 18, cost: 8, n: "Désertion de l'âme : projection astrale", sp: "astral-projection", p: () => [["f", "Effet", "Projection astrale"]], d: () => "Projection astrale, sans composantes matérielles, sans emmener d'autres créatures." },
  ...SHADOW.map(sp => ({ id: "om-" + sp, lv: 3, c: "ombre", cost: 2, sp, shadow: true, n: BY_ID[sp] ? BY_ID[sp].n : sp, p: g => [["f", "Effet", pText(BY_ID[sp], g.level, g)], ["n", "Durée", BY_ID[sp].d + (BY_ID[sp].c ? " (conc.)" : "")]], d: () => BY_ID[sp].e })),
];
const optsOf = g => OPTS.filter(o => g.level >= o.lv && (!o.c || o.c === trad(g)));
/** Coût total d'une discipline avec le ki en plus choisi (plafonné par le niveau). */
const discExtra = (g, k) => { const x = DISC[k]; if (!x.plus) return 0; return Math.max(0, Math.min(+(S.kiX || {})[k] || 0, MON.kiMax(g.level) - x.cost, x.plus === "hit" ? 1 : 9)); };
function discPills(g, k, extra = 0) {
  const x = DISC[k], s = x.sp && BY_ID[x.sp];
  if (s) { let v = pText(s, g.level, g); if (extra && x.plus === "lv") v = upcast(v, s.up, extra); return [["f", s.l ? `Sort niv. ${s.l + extra}` : "Sort", s.n], ...(v ? [[s.p.startsWith("d:") ? "d" : "f", s.p.startsWith("d:") ? "Dégâts" : "Effet", v]] : []), ...(s.j && s.j !== "atk" && s.j !== "auto" ? [["s", "JdS", `${s.j} ${MON.dd(g)}`]] : [])]; }
  return (x.p || []).map(([c, t]) => [c, c === "d" ? "Dégâts" : c === "s" ? "JdS" : c === "n" ? "Portée" : "Effet", t.replace("{n}", 3 + extra).replace("JdS DEX", `DEX ${MON.dd(g)}`).replace("JdS FOR", `FOR ${MON.dd(g)}`).replace(/^JdS /, "")]);
}
const kiBtn = (id, cost, left, label = "Utiliser") => `<button class="btn cast-go sm" data-a="ki-use" data-v="${id}"${cost > left ? " disabled" : ""}>${label}${cost ? ` · ${cost} ki` : ""}</button>`;
/** Pastilles courtes (ligne repliée) : valeurs des deux premières pastilles. */
const kps = list => list.slice(0, 2).map(([k, , v]) => `<span class="kp ${k === "a" ? "a" : k}">${esc(v)}</span>`).join("");
/** Ligne d'action comme un sort en jeu : nom ▾ + pastilles + bouton ; détail (pastilles complètes, texte) au toucher du nom. */
function abRow(key, name, pills, btn, body) {
  const open = S.open.has(key);
  return `<div class="jrow"><div class="jline"><div class="jmain"><button class="jname" data-a="row" data-id="${key}" aria-expanded="${open}">${name}<span class="chev">${open ? "▴" : "▾"}</span></button><span class="kps">${pills}</span></div>${btn}</div>${open ? `<div class="jbody">${body}</div>` : ""}</div>`;
}
const conc = s => s && s.c ? `<span class="tag c" title="Concentration">C</span>` : "";
function resHTML(g) {
  let h = "";
  if (MON.ki(g)) {
    const n = MON.ki(g), u = Math.min(n, g.kiU || 0), left = kiLeft(g);
    // Points de ki : toujours visibles ; au-delà de 6 points, un compteur (−/+) plutôt qu'une rangée de cercles
    const pips = n <= 6 ? Array.from({ length: n }, (_, k) => `<button class="pip${k < u ? " used" : ""}" data-a="res-pip" data-r="ki" data-k="${k}" aria-label="Point de ki ${k + 1}, ${k < u ? "dépensé" : "disponible"}"></button>`).join("")
      : `<span class="kicnt"><button class="btn sm" data-a="ki-adj" data-d="1" aria-label="Dépenser un point de ki"${u >= n ? " disabled" : ""}>−</button><b aria-live="polite">${n - u}<small>/${n}</small></b><button class="btn sm" data-a="ki-adj" data-d="-1" aria-label="Rendre un point de ki"${u ? "" : " disabled"}>+</button></span>`;
    let r = `<div class="slots res"><div class="resrow"><span class="rn"><b>Points de ki</b><small>repos court · DD ${MON.dd(g)}</small></span><span class="pips">${pips}</span></div></div>`;
    r += optsOf(g).filter(o => !o.shadow).map(o => abRow("ki:" + o.id, esc(o.n), kps(o.p(g)), kiBtn(o.id, o.cost, left), `${pillsRaw(o.p(g))}<div class="eff">${esc(o.d(g))}</div>`)).join("");
    if (trad(g) === "paume" && g.level >= 6) r += abRow("ki:plen", "Plénitude physique", `<span class="kp f">${3 * g.level} PV</span><span class="kp n">repos long</span>`,
      `<button class="btn cast-go sm" data-a="mo-plen"${g.plU ? " disabled" : ""}>${g.plU ? "Utilisée" : `Se soigner · +${3 * g.level}`}</button>`, `${pillsRaw([["f", "Soins", `${3 * g.level} PV`], ["n", "Temps", "action"]])}<div class="eff">Une fois par repos long.</div>`);
    h += foldSec("res-ki", "Ki", `${left} / ${n} · DD ${MON.dd(g)} · repos court`, r);
  }
  // Voie de l'ombre : sorts pour 2 ki ; Illusion mineure à volonté
  if (trad(g) === "ombre") {
    const left = kiLeft(g);
    h += foldSec("res-ombre", "Arts des ombres", "2 ki · sans composantes matérielles", optsOf(g).filter(o => o.shadow).map(o => abRow("ki:" + o.id, esc(o.n) + conc(BY_ID[o.sp]), kps(o.p(g)), kiBtn(o.id, 2, left, "Lancer"), `${pillsRaw(o.p(g))}<div class="eff">${esc(o.d(g))}</div>`)).join(""));
    h += innateBlock(g, innateSpells(g).filter(x => x.cls), "mo-ill", "Sort mineur", "Arts des ombres · à volonté");
  }
  // Voie des quatre éléments : disciplines connues ; ki en plus (−/+) dans le détail, Lancer retire le total
  if (trad(g) === "elements") {
    const left = kiLeft(g);
    h += foldSec("res-disc", "Disciplines élémentaires", `${left} ki · ${MON.kiMax(g.level)} ki au plus par discipline`, known(g).map(k => { const x = DISC[k], e = discExtra(g, k), cost = x.cost + e, s = x.sp && BY_ID[x.sp];
      const room = x.plus ? Math.min(x.plus === "hit" ? 1 : 9, MON.kiMax(g.level) - x.cost) : 0, pl = discPills(g, k, x.plus === "hit" ? 0 : e);
      const step = room > 0 ? `<div class="cast"><span class="kistep" role="group" aria-label="Ki en plus pour ${esc(x.n)}"><button class="btn sm" data-a="ki-x" data-v="${k}" data-d="-1" aria-label="Un ki de moins"${e ? "" : " disabled"}>−</button><b>${x.plus === "hit" ? (e ? "+1d10" : "+0") : `+${e} ki`}</b><button class="btn sm" data-a="ki-x" data-v="${k}" data-d="1" aria-label="Un ki de plus"${e < room ? "" : " disabled"}>+</button></span><span class="muted" style="font-size:12.5px">${x.plus === "d10" ? "+1d10 par ki" : x.plus === "lv" ? "niveau de sort +1 par ki" : "+1d10 feu au toucher"}</span></div>` : "";
      return abRow("ki:d-" + k, esc(x.n) + conc(s), kps(pl.slice(s ? 1 : 0)), kiBtn("d-" + k, cost, left, x.cost ? "Lancer" : "Utiliser"), `${pillsRaw(pl)}<div class="eff">${esc(x.d)}</div>${step}`); }).join(""));
  }
  return h;
}
/** Sort lancé avec du ki : suivi de la concentration et de la durée, comme un sort lancé. */
function fxPush(g, s) {
  if (s.c) { g.effects = g.effects.filter(e => !e.c); g.effects.push({ k: fxKey(), id: s.id, name: s.n, d: s.d, c: true, note: "" }); }
  else if (!NO_TRACK.includes(s.d)) g.effects.push({ k: fxKey(), id: s.id, name: s.n, d: s.d, c: false, note: "" });
}
onClick("ki-use", (b) => {
  const g = G(), v = b.dataset.v; if (!g) return;
  const disc = v.startsWith("d-") ? v.slice(2) : null, o = disc ? null : OPTS.find(x => x.id === v), x = disc && DISC[disc]; if (!o && !x) return;
  const extra = x ? discExtra(g, disc) : 0, cost = x ? x.cost + extra : o.cost, sp = (x && x.sp) || (o && o.sp), s = sp && BY_ID[sp];
  if (cost > kiLeft(g)) { toast(`Pas assez de ki : ${kiLeft(g)} restant${kiLeft(g) > 1 ? "s" : ""}`); return; }
  const cur = concOf(g), prev = JSON.parse(JSON.stringify({ kiU: g.kiU || 0, effects: g.effects }));
  mutate(g => { g.kiU = (g.kiU || 0) + cost; if (s) fxPush(g, s); });
  if (S.kiX && disc) delete S.kiX[disc];
  const name = x ? x.n : o.n, more = x && extra ? (x.plus === "d10" ? ` · ${3 + extra}d10` : x.plus === "lv" ? ` · niveau ${s.l + extra}` : " · +1d10 feu") : "";
  toast(`<b>${esc(name)}</b>${s && x ? ` (${esc(s.n)})` : ""}${more}${cost ? ` : −${cost} ki · reste ${kiLeft(G())}` : ""}${s && s.c && cur && cur.id !== s.id ? ` · fin de ${esc(cur.name)}` : ""}`, () => { mutate(g => Object.assign(g, prev)); return cost ? "Ki rendu" : "Annulé"; });
});
onClick("ki-adj", (b) => { mutate(g => { g.kiU = Math.max(0, Math.min(MON.ki(g), (g.kiU || 0) + +b.dataset.d)); }); });
onClick("ki-x", (b) => { const k = b.dataset.v; S.kiX = S.kiX || {}; S.kiX[k] = Math.max(0, (+S.kiX[k] || 0) + +b.dataset.d); render(); });
onClick("mo-plen", () => { const g = G(); if (!g || g.plU) return; const prev = JSON.parse(JSON.stringify({ hp: g.hp, plU: g.plU, death: g.death })); let got = 0;
  mutate(g => { got = heal(g, 3 * g.level); g.plU = 1; });
  toast(`<b>Plénitude physique</b> : +${got} PV · ${hpCur(G())}/${g.hpMax}`, () => { mutate(g => Object.assign(g, prev)); return "Annulé"; }); });

// ---------- Capacités
const FEATS = [
  { lv: 1, n: "Défense sans armure", k: "f", pill: g => `CA ${10 + R.ab(g, "dex") + R.ab(g, "wis")} sans armure ni bouclier`, d: () => "Sans armure ni bouclier : CA = 10 + DEX + SAG (calculée)." },
  { lv: 1, n: "Arts martiaux", k: "d", pill: g => `${MON.die(g.level)} · DEX · action bonus`, d: g => `Sans armure ni bouclier, avec tes mains nues ou une arme de moine (épée courte, armes courantes de corps à corps sans les propriétés à deux mains ou lourde) : DEX au lieu de FOR, dégâts ${MON.die(g.level)} si c'est plus que l'arme, et une attaque à mains nues en action bonus après l'action Attaquer (calculé dans les attaques).` },
  { lv: 2, n: "Ki", k: "f", pill: g => `${MON.ki(g)} points · DD ${MON.dd(g)}`, d: g => `${MON.ki(g)} points de ki (= niveau), récupérés après un repos court ou long (30 minutes de méditation). Déluge de coups, Défense patiente, Déplacement aérien : 1 ki chacun. DD ${MON.dd(g)} (8 + maîtrise + SAG).` },
  { lv: 2, n: "Déplacement sans armure", k: "f", pill: g => `+${String(MON.speed(g.level)).replace(".", ",")} m`, d: g => `+${String(MON.speed(g.level)).replace(".", ",")} m de vitesse sans armure ni bouclier (calculé).${g.level >= 9 ? " Niveau 9 : tu peux te déplacer sur les parois verticales et sur les liquides pendant ton mouvement." : ""}` },
  { lv: 3, n: "Tradition monastique", k: "f", pill: g => TRAD[g.mtrad].full, d: g => `${TRAD[g.mtrad].full} : ${TRAD[g.mtrad].sum}` },
  { lv: 3, n: "Parade de projectiles", k: "f", pill: g => `−(1d10 + ${R.ab(g, "dex") + g.level}) dégâts`, d: g => `Réaction quand une attaque à distance te touche : dégâts réduits de 1d10 + DEX + niveau (1d10 + ${R.ab(g, "dex") + g.level}). S'ils tombent à 0, tu peux l'attraper et la renvoyer pour 1 ki.` },
  { lv: 3, c: "paume", n: "Technique de la paume", k: "f", pill: () => "Déluge : à terre, repoussé, sans réaction", d: g => `Chaque coup de Déluge de coups : JdS DEX ${MON.dd(g)} ou à terre ; JdS FOR ${MON.dd(g)} ou repoussée de 4,50 m ; ou pas de réaction jusqu'à la fin de ton prochain tour.` },
  { lv: 3, c: "ombre", n: "Arts des ombres", k: "f", pill: () => "sorts pour 2 ki, illusion mineure", d: () => "Action, 2 ki : ténèbres, vision dans le noir, passage sans trace ou silence, sans composantes matérielles. Sort mineur illusion mineure." },
  { lv: 3, c: "elements", n: "Disciple des éléments", k: "f", pill: g => `${MON.discN(g.level)} disciplines · ${MON.kiMax(g.level)} ki au plus`, d: g => `Disciplines connues : ${MON.discN(g.level)} (Lien élémentaire compris ; 2 au niveau 3, 3 au 6, 4 au 11, 5 au 17), une remplaçable à chaque nouvelle discipline. Sorts lancés avec ton DD de ki, sans composantes matérielles ; plus de ki pour un niveau de sort plus élevé, ${MON.kiMax(g.level)} ki au plus par discipline.` },
  { lv: 4, n: "Chute ralentie", k: "f", pill: g => `−${5 * g.level} dégâts de chute`, d: g => `Réaction : dégâts de chute réduits de ${5 * g.level} (5 × niveau).` },
  { lv: 5, n: "Attaque supplémentaire", k: "f", pill: () => "2 attaques par action", d: () => "Quand tu prends l'action Attaquer, tu attaques deux fois au lieu d'une." },
  { lv: 5, n: "Frappe étourdissante", k: "s", pill: g => `1 ki · JdS CON ${MON.dd(g)}`, d: g => `Quand tu touches au corps à corps, 1 ki : JdS de Constitution (DD ${MON.dd(g)}) ou la cible est étourdie jusqu'à la fin de ton prochain tour.` },
  { lv: 6, n: "Frappes de ki", k: "f", pill: () => "mains nues magiques", d: () => "Tes attaques à mains nues comptent comme magiques pour surmonter résistances et immunités." },
  { lv: 6, c: "paume", n: "Plénitude physique", k: "f", pill: g => `+${3 * g.level} PV · repos long`, d: g => `Action : tu regagnes ${3 * g.level} PV (3 × niveau). Une fois par repos long.` },
  { lv: 6, c: "ombre", n: "Foulée d'ombre", k: "f", pill: () => "téléport 18 m (action bonus)", d: () => "En lumière faible ou ténèbres, action bonus : téléportation de 18 m vers un espace sombre que tu vois ; avantage à ta première attaque au corps à corps de ce tour." },
  { lv: 7, n: "Esquive totale", k: "f", pill: () => "JdS DEX : 0 ou ½", d: () => "Effet de zone avec JdS de Dextérité pour moitié : aucun dégât si tu réussis, la moitié si tu rates." },
  { lv: 7, n: "Sérénité", k: "f", pill: () => "action : fin de charmé ou effrayé", d: () => "Action : mets fin à un effet qui te charme ou t'effraie." },
  { lv: 10, n: "Pureté physique", k: "f", pill: () => "immunité maladies et poison", d: () => "Immunité aux maladies et au poison." },
  { lv: 11, c: "paume", n: "Tranquillité", k: "f", pill: g => `sanctuaire · DD ${MON.dd(g)}`, d: g => `À la fin d'un repos long, effet de sanctuaire sur toi jusqu'au prochain repos long (DD ${MON.dd(g)}) ; il cesse si tu attaques ou lances un sort nuisible.` },
  { lv: 11, c: "ombre", n: "Linceul d'ombre", k: "f", pill: () => "action : invisible dans l'ombre", d: () => "En lumière faible ou ténèbres, action : invisible jusqu'à ce que tu attaques, lances un sort ou sois en lumière vive." },
  { lv: 13, n: "Langue du soleil et de la lune", k: "f", pill: () => "toutes les langues", d: () => "Tu comprends toutes les langues parlées, et toute créature qui comprend une langue te comprend." },
  { lv: 14, n: "Âme de diamant", k: "f", pill: () => "tous les JdS · relance 1 ki", d: () => "Maîtrise de tous les jets de sauvegarde (calculée) ; 1 ki pour relancer un JdS raté (second résultat)." },
  { lv: 15, n: "Jeunesse éternelle", k: "f", pill: () => "ni vieillissement magique, ni faim", d: () => "Tu ne vieillis plus par magie ; plus besoin de manger ni de boire." },
  { lv: 17, c: "paume", n: "Paume frémissante", k: "d", pill: () => "3 ki · 0 PV ou 10d10", d: g => `Quand tu touches à mains nues, 3 ki : vibrations pendant ${g.level} jours ; action plus tard : JdS CON (DD ${MON.dd(g)}), échec 0 PV, réussite 10d10 nécrotiques.` },
  { lv: 17, c: "ombre", n: "Opportuniste", k: "f", pill: () => "réaction : attaque", d: () => "Réaction : attaque au corps à corps contre une créature à 1,50 m qui vient d'être touchée par une autre que toi." },
  { lv: 18, n: "Désertion de l'âme", k: "f", pill: () => "4 ki invisible · 8 ki projection astrale", d: () => "Action, 4 ki : invisible 1 minute, résistance à tous les dégâts sauf de force. 8 ki : projection astrale sur toi seul, sans composantes matérielles." },
  { lv: 20, n: "Perfection de l'être", k: "f", pill: () => "4 ki à l'initiative", d: () => "Si tu n'as plus de ki quand tu lances l'initiative, tu en récupères 4." },
];
const feats = g => FEATS.filter(f => !f.c || f.c === g.mtrad).map((f, i) => ({ id: "m" + i, ...f }));

// ---------- Gérer et assistant : disciplines élémentaires (liste dépliable commune)
function discPicker(b, sel, max, lu) {
  return `<div class="luplist">${Object.entries(DISC).filter(([k]) => k !== "lien").sort((a, c) => a[1].n.localeCompare(c[1].n, "fr")).map(([k, x]) => { const s = x.sp && BY_ID[x.sp];
    return pickRow({ act: lu ? 'data-a="lu-mdisc"' : 'data-a="m-disc"', id: "disc-" + k, on: sel.includes(k), full: sel.length >= max, off: !!x.lv && b.level < x.lv && !sel.includes(k), why: x.lv ? `niveau ${x.lv}` : "", name: esc(x.n), label: x.n,
      pills: `<span class="kp p">${x.cost} ki</span>${s ? `<span class="kp n">${esc(s.n)}</span>` : ""}${x.lv ? `<span class="kp n">niveau ${x.lv}</span>` : ""}`, body: `<div class="eff">${esc(x.d)}</div>${s ? `<div class="eff muted">${esc(s.n)} : ${esc(s.e)}</div>` : ""}` }); }).join("")}</div>`;
}
function settingsHTML(g) {
  if (trad(g) !== "elements") return "";
  const n = MON.discN(g.level) - 1, sel = (g.disc || []).filter(k => DISC[k]), open = S.open.has("m:disc");
  return `<div class="rubric"><h2>Disciplines élémentaires</h2><span class="aside">Lien élémentaire + ${sel.length} sur ${n}</span></div>
  <div class="invlist">${["lien", ...sel].map(k => `<div class="invrow"><span class="invstar" aria-hidden="true">✦</span><b>${esc(DISC[k].n)}</b><span class="kp p">${DISC[k].cost} ki</span><small>${esc(DISC[k].d)}</small></div>`).join("")}</div>
  <button class="linkbtn" data-a="row" data-id="m:disc" aria-expanded="${open}">${open ? "Fermer le choix ▴" : sel.length < n ? `Choisir ${n - sel.length} discipline${n - sel.length > 1 ? "s" : ""} ▾` : "Modifier le choix ▾"}</button>
  ${open ? discPicker(g, sel, n, false) : ""}`;
}
onClick("m-disc", (b) => { const g = G(), k = b.dataset.id.replace("disc-", ""); if (!g || !DISC[k]) return; const s = g.disc || [], want = !s.includes(k), n = MON.discN(g.level) - 1;
  if (want && DISC[k].lv && g.level < DISC[k].lv) { toast(`${DISC[k].n} : niveau ${DISC[k].lv}`); return; }
  if (want && s.length >= n) { toast(`${n} discipline${n > 1 ? "s" : ""} en plus du Lien élémentaire : retire d'abord une discipline`); return; }
  mutate(g => { g.disc = want ? [...s, k] : s.filter(x => x !== k); }); });
function luChoices(g, b, L) {
  if (b.mtrad !== "elements" || b.level < 3) return "";
  const n = MON.discN(b.level) - 1, old = trad(g) === "elements" ? g.disc || [] : [], sel = L.mdisc || old, gone = old.filter(k => !sel.includes(k)).length;
  if (n <= old.length && b.level !== 3 && MON.discN(b.level) === MON.discN(g.level)) return `<div class="luprep"><h3>Disciplines élémentaires</h3><span class="muted">Pas de nouvelle discipline à ce niveau (la prochaine au niveau ${b.level < 6 ? 6 : b.level < 11 ? 11 : 17}).</span></div>`;
  return `<div class="luprep"><h3>Disciplines · Lien élémentaire + ${sel.length}/${n}</h3><span class="muted">${n > old.length ? `${n - old.length} à choisir. ` : ""}${old.length ? `Tu peux aussi en remplacer une : retire-la (✓) puis choisis-en une autre${gone ? ` (${gone} remplacée)` : ""}.` : "Touche un nom pour lire la discipline."}</span>${discPicker(b, sel, n, true)}</div>`;
}
onClick("lu-mdisc", (b) => { const L = S.lu, g = G(); if (!L || !g) return; const k = b.dataset.id.replace("disc-", ""), old = trad(g) === "elements" ? g.disc || [] : [], sel = L.mdisc || [...old], n = MON.discN(L.to) - 1;
  if (!sel.includes(k)) { if (DISC[k].lv && L.to < DISC[k].lv) { toast(`${DISC[k].n} : niveau ${DISC[k].lv}`); return; } if (sel.length >= n) { toast(`${n} discipline${n > 1 ? "s" : ""} à ce niveau : retire d'abord une discipline`); return; } L.mdisc = [...sel, k]; }
  else { if (old.includes(k) && old.filter(x => !sel.includes(x)).length >= 1) { toast("Une seule discipline remplacée par niveau"); return; } L.mdisc = sel.filter(x => x !== k); }
  S.luKeep = true; render(); });

// ---------- Création (étape Compétences) : outil d'artisan ou instrument de musique
const creation = {
  html: c => { const x = c.cx || {};
    return `<div class="crcls"><span class="lusub">Outil d'artisan ou instrument de musique · 1</span><select id="cr-mtool" aria-label="Outil d'artisan ou instrument de musique"><option value="">Choisir…</option><optgroup label="Outils d'artisan">${TOOL_LISTS.artisan.map(t => `<option${x.tool === t ? " selected" : ""}>${esc(t)}</option>`).join("")}</optgroup><optgroup label="Instruments de musique">${TOOL_LISTS.instrument.map(t => `<option${x.tool === t ? " selected" : ""}>${esc(t)}</option>`).join("")}</optgroup></select></div>`; },
  missing: c => (c.cx || {}).tool ? "" : "choisis ton outil ou ton instrument",
  apply: (g, c) => { const t = (c.cx || {}).tool; if (t) g.tools[t] = Math.max(1, g.tools[t] || 0); },
};
onChange("#cr-mtool", t => { if (!S.cr) return; S.cr.cx = { ...(S.cr.cx || {}), tool: t.value || "" }; S.luKeep = true; render(); });
onChange("#f-mtrad", t => { mutate(g => { g.mtrad = t.value; }); });

// ---------- Onglet Règles
function rulesHTML(g) {
  return `<div class="cols rules">
  <div><div class="rubric" style="margin-top:4px"><h3>Arts martiaux</h3></div>
  <p>Sans armure ni bouclier, à mains nues ou avec une arme de moine : <b>DEX</b> au lieu de FOR, dé <span class="kp d">${MON.die(g.level)}</span> si c'est plus que l'arme, et une <b>attaque à mains nues en action bonus</b> après l'action Attaquer.</p>
  <div class="rubric"><h3>Ki</h3></div>
  <p><b>${MON.ki(g)} points</b>, récupérés au repos court ou long. Chaque bouton retire ses points (annulable). DD de ki : <b>${MON.dd(g)}</b>.</p>
  <div class="rubric"><h3>Défense et déplacement</h3></div>
  <p>Sans armure ni bouclier : CA = 10 + DEX + SAG (${10 + R.ab(g, "dex") + R.ab(g, "wis")}) ; vitesse +${String(MON.speed(g.level)).replace(".", ",")} m.</p></div>
  <div><div class="rubric" style="margin-top:4px"><h3>${esc(TRAD[g.mtrad].full)}</h3></div><p>${esc(TRAD[g.mtrad].sum)}</p>
  ${g.mtrad === "elements" ? `<p>Ki au plus par discipline : 2 (niveaux 3-4), 3 (5-8), 4 (9-12), 5 (13-16), 6 (17-20).</p>` : ""}
  <p class="muted">Source : Manuel des joueurs 2014 (moine) ; disciplines d'après AideDD. Résumés rédigés pour la table, à vérifier dans le livre en cas de doute.</p></div></div>`;
}
// ---------- Fiche imprimable
function printSheet(g) {
  return `${pHeader(g, `Moine, niveau ${g.level}${g.level >= 3 ? ` · ${esc(TRAD[g.mtrad].full)}` : ""}`, [[MON.die(g.level), "ARTS MARTIAUX"], [MON.ki(g) || "—", "KI"], [MON.dd(g), "DD DE KI"], [acCalc(g).total, "CA"], [`${String(speedOf(g)).replace(".", ",")} m`, "VITESSE"]])}
${MON.ki(g) ? `<h2>Ki <small>repos court ou long</small></h2><div class="res"><span class="l">Points de ki</span>${pDots(MON.ki(g))}<span class="r">${optsOf(g).filter(o => !o.shadow).map(o => `${esc(o.n)} ${o.cost}`).join(" · ")}</span></div>` : ""}
${trad(g) === "paume" && g.level >= 6 ? `<div class="res"><span class="l">Plénitude physique</span>${pDots(1)}<span class="r">${3 * g.level} PV · repos long</span></div>` : ""}
<h2>Capacités de classe <small>niveau ${g.level}</small></h2>
<table>${feats(g).filter(f => f.lv <= g.level).map(f => `<tr><td class="n">${f.n}</td><td>${esc(f.d(g))}</td></tr>`).join("")}</table>
${trad(g) === "elements" ? `<h2>Disciplines élémentaires</h2><table>${known(g).map(k => `<tr><td class="n">${esc(DISC[k].n)} · ${DISC[k].cost} ki</td><td>${esc(DISC[k].d)}</td></tr>`).join("")}</table>` : ""}
${trad(g) === "ombre" ? `<h2>Arts des ombres <small>2 ki chacun</small></h2><table>${SHADOW.map(sp => `<tr><td class="n">${esc(BY_ID[sp].n)}</td><td>${esc(BY_ID[sp].e)}</td></tr>`).join("")}</table>` : ""}
${pFoot("ATELIER DU GRIMOIRE · MOINE")}`;
}

// ---------- Définition de la classe (contrat : voir docs/ARCHITECTURE.md) ----------
const row = (l, o, n, cls) => `<div class="${o === n ? "same" : ""}"><span>${l}</span><span class="old">${o}</span><span class="ar">→</span><b${cls && o !== n ? ` style="color:var(${cls})"` : ""}>${n}</b></div>`;
export default {
  n: "Moine", noSpells: true, slots: {}, top: 0, cantrips: () => 0, prep: () => 0, hitDie: "1d8",
  fileLabel: "Moine", ab: "wis", abN: "Sagesse", abArticle: "la Sagesse",
  saves: g => g.level >= 14 ? ABILITIES.map(([k]) => k) : ["str", "dex"],  // Âme de diamant
  weaponProf: ["simple", "shortsword"], armorProf: [],
  defaults: () => ({ mtrad: "paume", disc: [], kiU: 0, plU: 0 }),
  normalize(o) { if (!TRAD[o.mtrad]) o.mtrad = "paume"; o.disc = Array.isArray(o.disc) ? [...new Set(o.disc)].filter(k => DISC[k] && k !== "lien") : []; o.kiU = Math.max(0, +o.kiU || 0); o.plU = Math.max(0, +o.plU || 0); },
  subclass: { lv: 3, label: "Tradition monastique", field: "mtrad", opts: () => Object.entries(TRAD).map(([k, t]) => [k, t.full, t.sum]) },
  subline: g => `Moine niveau ${g.level}${g.level >= 3 ? ` · ${esc(TRAD[g.mtrad].full)}` : ""}`,
  subclassField: g => `<div class="field"><label for="f-mtrad">Tradition monastique</label><select id="f-mtrad">${Object.entries(TRAD).map(([k, t]) => `<option value="${k}"${k === g.mtrad ? " selected" : ""}>${t.n}</option>`).join("")}</select></div>`,
  heroStats: g => {
    const st = (v, f, s, cls = "") => `<div class="stat${cls}" role="listitem"><div class="v">${v}</div>${statLabel(f, s)}</div>`;
    return st(MON.ki(g) ? `${kiLeft(g)}<small>/${MON.ki(g)}</small>` : "—", "Points de ki", "Ki") + st(MON.die(g.level), "Arts martiaux", "Dé") + st(acCalc(g).total, "CA", "CA")
      + st(`${String(speedOf(g)).replace(".", ",")} m`, "Vitesse", "Vitesse") + st(MON.dd(g), "DD de ki", "DD") + st(signed(initiative(g)), "Initiative", "Init.");
  },
  tabs: () => [["caps", "Capacités"]],
  moreTabs: () => [["regles", "Règles"], ["imprimer", "Imprimer"]],
  panels: { caps: g => abilitiesHTML(g), regles: g => rulesHTML(g), imprimer: g => printHTML(g) },
  print: g => printSheet(g),
  printTitle: g => `Fiche de moine de ${g.name}`,
  printDesc: "Elle contient la page Personnage, le ki à cocher, toutes les capacités de ton niveau et ta tradition (disciplines, arts des ombres).",
  features: g => feats(g),
  capsSettings: g => settingsHTML(g),
  innate: g => trad(g) === "ombre" ? [{ s: BY_ID["minor-illusion"], ab: "wis", src: "Arts des ombres" }] : [],
  resources: g => resHTML(g),
  resourceMax: { ki: g => MON.ki(g), pl: () => 1 },
  shortRest: g => MON.ki(g) ? { field: "kiU", label: "points de ki", done: "récupérés" } : null,
  longOnly: g => [g.plU ? "Plénitude physique" : ""],
  longRest: g => { g.kiU = 0; g.plU = 0; },
  // Défense sans armure (pas de bouclier) ; Déplacement sans armure
  acBase: (g, shield) => shield ? [["Sans armure : 10 + DEX", 10 + R.ab(g, "dex")]] : [["Défense sans armure : 10 + DEX + SAG", 10 + R.ab(g, "dex") + R.ab(g, "wis")]],
  speedBonus: g => noArmor(g) ? MON.speed(g.level) : 0,
  // Arts martiaux : arme de moine (DEX, dé d'arts martiaux), mains nues, attaque en action bonus
  weaponAdjust: (g, w) => !monkWeapon(w) || !noArmor(g) ? w : { ...w, finesse: true, monk: true, dmg: avg(MON.die(g.level)) > avg(w.dmg) ? MON.die(g.level) : w.dmg },
  unarmed: g => noArmor(g) ? { die: MON.die(g.level), bonus: true, pills: ["arts martiaux", ...(g.level >= 6 ? ["magique (ki)"] : [])] } : null,
  attackMods: (g, w) => w.monk ? { pills: ["arme de moine"] } : {},
  attackNotes: g => [g.level >= 5 ? "<b>Attaque supplémentaire</b> : deux attaques par action Attaquer." : "",
    MON.ki(g) ? `<b>Déluge de coups</b> (1 ki) : deux attaques à mains nues en action bonus au lieu d'une.` : "",
    g.level >= 5 ? `<b>Frappe étourdissante</b> (1 ki) : au toucher au corps à corps, JdS CON ${MON.dd(g)}.` : "",
    noArmor(g) ? "" : "<b>Arts martiaux</b> : seulement sans armure ni bouclier."].filter(Boolean),
  creation,
  levelUp: {
    step2: "Choix",
    rowsAfter: (g, b) => row("Arts martiaux", MON.die(g.level), MON.die(b.level), "--pd-fg") + row("Points de ki", MON.ki(g), MON.ki(b), "--ok") + row("Vitesse sans armure", `+${MON.speed(g.level)} m`.replace(".", ","), `+${MON.speed(b.level)} m`.replace(".", ","), "--ok")
      + (b.mtrad === "elements" && b.level >= 3 ? row("Disciplines", trad(g) === "elements" ? MON.discN(g.level) : 0, MON.discN(b.level), "--ok") + row("Ki par discipline", trad(g) === "elements" ? MON.kiMax(g.level) : "—", MON.kiMax(b.level), "--ok") : ""),
    choices: (g, b, L) => luChoices(g, b, L),
    notes: (g, to) => [to === 3 ? `<span><b>Tradition monastique</b> : Paume, Ombre ou Quatre éléments, à choisir ci-dessus.</span>` : ""].filter(Boolean),
    recapBefore: (g, b, L) => L.mdisc ? `<div><span class="n">Disciplines</span><small>${[...L.mdisc.filter(k => !(g.disc || []).includes(k)).map(k => "+ " + esc(DISC[k].n)), ...(g.disc || []).filter(k => !L.mdisc.includes(k)).map(k => "− " + esc(DISC[k].n))].join(", ") || "inchangées"}</small></div>` : "",
    apply: (g, L) => { if (L.mdisc) g.disc = [...L.mdisc]; },
  },
};
export { MON, DISC, TRAD };
