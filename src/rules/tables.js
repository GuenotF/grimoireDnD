// Tables de règles sans dépendance (Manuel des joueurs 2014) : écoles, emplacements des lanceurs complets et des demi-lanceurs.

const SCHOOLS = ["Abjuration","Divination","Enchantement","Évocation","Illusion","Invocation","Nécromancie","Transmutation"];
const SCHOOL_VAR = {"Abjuration":"--s-abj","Divination":"--s-div","Enchantement":"--s-enc","Évocation":"--s-evo","Illusion":"--s-ill","Invocation":"--s-inv","Nécromancie":"--s-nec","Transmutation":"--s-tra"};
// Emplacements du magicien (Manuel des joueurs 2014, tableau du magicien)
const SLOTS = {1:[2],2:[3],3:[4,2],4:[4,3],5:[4,3,2],6:[4,3,3],7:[4,3,3,1],8:[4,3,3,2],9:[4,3,3,3,1],10:[4,3,3,3,2],
  11:[4,3,3,3,2,1],12:[4,3,3,3,2,1],13:[4,3,3,3,2,1,1],14:[4,3,3,3,2,1,1],15:[4,3,3,3,2,1,1,1],16:[4,3,3,3,2,1,1,1],
  17:[4,3,3,3,2,1,1,1,1],18:[4,3,3,3,3,1,1,1,1],19:[4,3,3,3,3,2,1,1,1],20:[4,3,3,3,3,2,2,1,1]};
// Emplacements des demi-lanceurs (paladin), Manuel des joueurs 2014
const HALF = {1:[],2:[2],3:[3],4:[3],5:[4,2],6:[4,2],7:[4,3],8:[4,3],9:[4,3,2],10:[4,3,2],11:[4,3,3],12:[4,3,3],13:[4,3,3,1],14:[4,3,3,1],
  15:[4,3,3,2],16:[4,3,3,2],17:[4,3,3,3,1],18:[4,3,3,3,1],19:[4,3,3,3,2],20:[4,3,3,3,2]};
const LVL_NAME = ["Sorts mineurs","Niveau 1","Niveau 2","Niveau 3","Niveau 4","Niveau 5","Niveau 6","Niveau 7","Niveau 8","Niveau 9"];

// Caractéristiques : [code, abréviation, nom]. Les codes sont ceux des sauvegardes (abil.str…).
const ABILITIES = [["str","FOR","Force"],["dex","DEX","Dextérité"],["con","CON","Constitution"],["int","INT","Intelligence"],["wis","SAG","Sagesse"],["cha","CHA","Charisme"]];

// Les 18 compétences du Manuel des joueurs : [code, nom, caractéristique], dans l'ordre alphabétique français.
const SKILLS = [["acrobatics","Acrobaties","dex"],["arcana","Arcanes","int"],["athletics","Athlétisme","str"],["stealth","Discrétion","dex"],
  ["animal","Dressage","wis"],["sleight","Escamotage","dex"],["history","Histoire","int"],["intimidation","Intimidation","cha"],
  ["insight","Intuition","wis"],["investigation","Investigation","int"],["medicine","Médecine","wis"],["nature","Nature","int"],
  ["perception","Perception","wis"],["persuasion","Persuasion","cha"],["religion","Religion","int"],["performance","Représentation","cha"],
  ["deception","Supercherie","cha"],["survival","Survie","wis"]];

// Tiers de lanceur (Chevalier occulte, Escroc arcanique) : emplacements et sorts connus par niveau
const THIRD = { 3: [2], 4: [3], 5: [3], 6: [3], 7: [4, 2], 8: [4, 2], 9: [4, 2], 10: [4, 3], 11: [4, 3], 12: [4, 3], 13: [4, 3, 2], 14: [4, 3, 2], 15: [4, 3, 2], 16: [4, 3, 3], 17: [4, 3, 3], 18: [4, 3, 3], 19: [4, 3, 3, 1], 20: [4, 3, 3, 1] };
const THIRD_KNOWN = [0, 0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13];
/** Sorts d'une école libre (hors des deux écoles imposées) : un aux niveaux 3, 8, 14 et 20. */
const thirdFree = lv => [3, 8, 14, 20].filter(l => lv >= l).length;
/** Restriction d'école des tiers de lanceur : raison si le sort s n'est pas permis parmi les sorts connus ids. */
function thirdOk(lv, schools, s, ids, byId) {
  if (!s || s.l < 1 || schools.includes(s.s)) return "";
  const n = ids.map(id => byId[id]).filter(x => x && x.l >= 1 && !schools.includes(x.s) && x.id !== s.id).length, max = thirdFree(lv);
  return n >= max ? `${schools.join(" ou ").replace(/^./, c => c.toUpperCase())} : ${max} sort${max > 1 ? "s" : ""} d'une autre école au niveau ${lv} (niveaux 3, 8, 14, 20)` : "";
}
export { SCHOOLS, SCHOOL_VAR, SLOTS, HALF, LVL_NAME, ABILITIES, SKILLS, THIRD, THIRD_KNOWN, thirdFree, thirdOk };
