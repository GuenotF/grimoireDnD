// Règles communes et tables par classe (Manuel des joueurs 2014).
// Étape 3 du plan : ce fichier sera réparti en un fichier par classe (src/classes/).
import { SPELLS, BY_ID } from "../data.js";

const SCHOOLS = ["Abjuration","Divination","Enchantement","Évocation","Illusion","Invocation","Nécromancie","Transmutation"];
const SCHOOL_VAR = {"Abjuration":"--s-abj","Divination":"--s-div","Enchantement":"--s-enc","Évocation":"--s-evo","Illusion":"--s-ill","Invocation":"--s-inv","Nécromancie":"--s-nec","Transmutation":"--s-tra"};
// Emplacements du magicien (Manuel des joueurs 2014, tableau du magicien)
const SLOTS = {1:[2],2:[3],3:[4,2],4:[4,3],5:[4,3,2],6:[4,3,3],7:[4,3,3,1],8:[4,3,3,2],9:[4,3,3,3,1],10:[4,3,3,3,2],
  11:[4,3,3,3,2,1],12:[4,3,3,3,2,1],13:[4,3,3,3,2,1,1],14:[4,3,3,3,2,1,1],15:[4,3,3,3,2,1,1,1],16:[4,3,3,3,2,1,1,1],
  17:[4,3,3,3,2,1,1,1,1],18:[4,3,3,3,3,1,1,1,1],19:[4,3,3,3,3,2,1,1,1],20:[4,3,3,3,3,2,2,1,1]};
// Emplacements des demi-lanceurs (paladin), Manuel des joueurs 2014
const HALF = {1:[],2:[2],3:[3],4:[3],5:[4,2],6:[4,2],7:[4,3],8:[4,3],9:[4,3,2],10:[4,3,2],11:[4,3,3],12:[4,3,3],13:[4,3,3,1],14:[4,3,3,1],
  15:[4,3,3,2],16:[4,3,3,2],17:[4,3,3,3,1],18:[4,3,3,3,1],19:[4,3,3,3,2],20:[4,3,3,3,2]};
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
// Classes : caractéristique d'incantation, table d'emplacements, préparation, sous-classe
const CLASSES = {
  magicien: { n: "Magicien", ab: "int", abN: "Intelligence", slots: SLOTS, top: 9, book: true,
    cantrips: lv => lv >= 10 ? 5 : lv >= 4 ? 4 : 3, prep: (g, m) => Math.max(1, m + g.level) },
  paladin: { n: "Paladin", ab: "cha", abN: "Charisme", slots: HALF, top: 5, book: false,
    cantrips: () => 0, prep: (g, m) => Math.max(1, m + Math.floor(g.level / 2)) },
  druide: { n: "Druide", ab: "wis", abN: "Sagesse", slots: SLOTS, top: 9, book: false,
    cantrips: lv => lv >= 10 ? 4 : lv >= 4 ? 3 : 2, prep: (g, m) => Math.max(1, m + g.level) },
};
const isPal = g => !!g && g.cls === "paladin", isDru = g => !!g && g.cls === "druide";
// Cercles du druide (Cercle de la Lune pour l'instant)
const CIRCLES = { lune: { n: "Lune", full: "Cercle de la Lune" } };
const DRU = {
  ws: g => g.level >= 20 ? 99 : g.level >= 2 ? 2 : 0,          // Forme sauvage : 2 utilisations, repos court (illimitée au niveau 20)
  fp: g => g.level >= 6 ? Math.floor(g.level / 3) : 1,          // Cercle de la Lune : FP 1, puis niveau ÷ 3 dès le niveau 6
  hours: g => Math.floor(g.level / 2),
};
const C = g => CLASSES[g && g.cls] || CLASSES.magicien;
const isWiz = g => C(g) === CLASSES.magicien;
const inClass = (g, s) => (s.cl || ["magicien"]).includes(g.cls || "magicien");
const classSpells = g => SPELLS.filter(s => inClass(g, s));
const oathSpells = g => { const o = isPal(g) && OATHS[g.oath]; if (!o) return []; return Object.entries(o.sp).filter(([lv]) => g.level >= +lv).flatMap(([, ids]) => ids).filter(id => BY_ID[id]); };
const isOath = (g, s) => !isWiz(g) && oathSpells(g).includes(s.id);
// Sorts lançables en jeu : préparés (+ sorts de serment pour le paladin)
function castable(g) {
  if (isWiz(g)) { const pr = new Set(g.prepared); return g.spells.map(x => BY_ID[x.id]).filter(s => s && pr.has(s.id)); }
  const ids = [...new Set([...oathSpells(g), ...g.prepared])];
  return ids.map(id => BY_ID[id]).filter(s => s && s.l <= R.maxLevel(g));
}
const PAL = {
  loh: g => 5 * g.level,                                   // Imposition des mains : réserve de PV
  ds: g => Math.max(1, 1 + R.am(g)),                       // Perception divine : 1 + mod. CHA, repos long
  cd: g => g.level >= 3 ? 1 : 0,                           // Conduit divin : 1, repos court
  smite: lv => Math.min(5, lv + 1),                        // Châtiment divin : 2d8 au niv. 1, +1d8 par niveau, 5d8 max
};
const LVL_NAME = ["Sorts mineurs","Niveau 1","Niveau 2","Niveau 3","Niveau 4","Niveau 5","Niveau 6","Niveau 7","Niveau 8","Niveau 9"];

// ---------- Règles ----------
const R = {
  prof: lv => 2 + Math.floor((lv - 1) / 4),
  mod: sc => Math.floor((sc - 10) / 2),
  am: g => R.mod(+g[C(g).ab] || 10), // modificateur de la caractéristique d'incantation
  slots: (g, lv = g.level) => C(g).slots[lv] || [],
  maxLevel: (g, lv = g.level) => (C(g).slots[lv] || []).length,
  unlockAt: (g, sl) => { for (let lv = 1; lv <= 20; lv++) if ((C(g).slots[lv] || []).length >= sl) return lv; return 21; },
  cantrips: (g, lv = g.level) => C(g).cantrips(lv),
  prepMax: g => C(g).prep(g, R.am(g)),
  expected: lv => 6 + 2 * (lv - 1),
  arcane: lv => Math.ceil(lv / 2),
  savant: (g, s) => g.level >= 2 && s.s === g.school,
  copy: (g, s) => { const k = R.savant(g, s) ? 0.5 : 1; return { h: 2 * s.l * k, po: 50 * s.l * k }; },
};

export { SCHOOLS, SCHOOL_VAR, SLOTS, HALF, OATHS, CLASSES, isPal, CIRCLES, DRU, C, isWiz, inClass, classSpells, oathSpells, isOath, castable, PAL, LVL_NAME, R, isDru };
