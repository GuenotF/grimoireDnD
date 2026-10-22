// Dons du Manuel des joueurs 2014 qui modifient les calculs de l'atelier. Les autres dons restent du texte (Dons et traits).
// Un don est relié à un trait par trait.feat. opt : option d'attaque à cocher (S.opt[id]) pour les armes concernées.
import { S } from "../core/state.js";

const FEATS = {
  alert: { n: "Vigilant", init: 5, d: "+5 à l'initiative ; tu ne peux pas être surpris tant que tu es conscient ; les créatures invisibles n'ont pas l'avantage contre toi." },
  gwm: { n: "Maître d'armes lourdes", d: "Après un coup critique au corps à corps ou si tu réduis une créature à 0 PV : une attaque au corps à corps en action bonus. Avant une attaque avec une arme lourde de corps à corps que tu maîtrises : −5 au toucher, +10 aux dégâts.",
    opt: { label: "Maître d'armes lourdes −5 / +10", test: (w, ab, prof) => w.heavy && w.rng === "melee" && prof, hit: -5, dmg: 10, pill: "MAL −5 / +10" },
    note: "<b>Maître d'armes lourdes</b> : après un critique au corps à corps ou une créature réduite à 0 PV, attaque au corps à corps en action bonus." },
  sharpshooter: { n: "Tireur d'élite", d: "Pas de désavantage à longue portée ; tu ignores les abris partiels et importants. Avant une attaque avec une arme à distance que tu maîtrises : −5 au toucher, +10 aux dégâts.",
    opt: { label: "Tireur d'élite −5 / +10", test: (w, ab, prof) => w.rng === "ranged" && prof, hit: -5, dmg: 10, pill: "TE −5 / +10" },
    note: "<b>Tireur d'élite</b> : pas de désavantage à longue portée, abris partiels et importants ignorés." },
};
/** Dons du personnage reliés au catalogue. */
const featsOf = g => (g.traits || []).map(t => t.feat).filter(id => FEATS[id]);
const hasFeat = (g, id) => featsOf(g).includes(id);
/** Bonus d'initiative des dons (Vigilant). */
const featInit = g => featsOf(g).reduce((t, id) => t + (FEATS[id].init || 0), 0);
/** Options d'attaque des dons : modificateurs pour une arme, selon les cases cochées. */
function featAttack(g, w, ab, prof) {
  const x = { hit: 0, dmg: 0, pills: [] };
  for (const id of featsOf(g)) { const o = FEATS[id].opt; if (o && S.opt && S.opt[id] && o.test(w, ab, prof)) { x.hit += o.hit; x.dmg += o.dmg; x.pills.push(o.pill); } }
  return x;
}

export { FEATS, featsOf, hasFeat, featInit, featAttack };
