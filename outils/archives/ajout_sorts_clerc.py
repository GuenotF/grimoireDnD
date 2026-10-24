"""Ajout des 22 sorts propres au clerc à data/spells.json et marquage « clerc » des sorts de sa liste (Manuel des joueurs 2014).

DÉJÀ APPLIQUÉ (octobre 2026) : gardé comme référence et comme modèle pour une prochaine classe.
Le relancer ne change rien (sorts déjà présents, marquage idempotent).
Noms français : AideDD (Manuel des joueurs). Textes courts rédigés pour la table, règles 2014.
Les sorts de domaine hors liste du clerc (Mains brûlantes, Grêle…) ne sont pas marqués : ils sont toujours préparés par le domaine.
"""
import json, os
P = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "spells.json")
def sp(id, en, n, l, s, t, r, d, c, v, e, p, j="", ok="", z="", up="", ri=False):
    return {"en": en, "l": l, "s": s, "t": t, "r": r, "d": d, "c": c, "ri": ri, "v": v, "g": 0, "x": False, "n": n, "e": e, "id": id, "p": p, "j": j, "ok": ok, "z": z, "up": up, "cl": ["clerc"]}
NEW = [
 sp("sacred-flame", "Sacred Flame", "Flamme sacrée", 0, "Évocation", "1 action", "18 m", "Instantanée", False, "V,S", "Une créature que tu vois : un abri ne lui donne aucun bonus au jet.", "d:1d8 radiant", "DEX", "réussite : aucun dégât", up="2d8 au niveau 5, 3d8 au 11, 4d8 au 17"),
 sp("spare-the-dying", "Spare the Dying", "Épargner les mourants", 0, "Nécromancie", "1 action", "Contact", "Instantanée", False, "V,S", "Une créature vivante à 0 PV devient stable. Sans effet sur les morts-vivants et les artificiels.", "f:Stabilisée"),
 sp("guiding-bolt", "Guiding Bolt", "Éclair traçant", 1, "Évocation", "1 action", "36 m", "1 round", False, "V,S", "Touché : le prochain jet d'attaque contre la cible, avant la fin de ton prochain tour, a l'avantage.", "d:4d6 radiant", "atk", "contre la CA", up="+1d6 par niveau d'emplacement"),
 sp("inflict-wounds", "Inflict Wounds", "Blessure", 1, "Nécromancie", "1 action", "Contact", "Instantanée", False, "V,S", "Attaque de sort au corps à corps contre une créature que tu peux toucher.", "d:3d10 nécrotique", "atk", "contre la CA", up="+1d10 par niveau d'emplacement"),
 sp("augury", "Augury", "Augure", 2, "Divination", "1 minute", "Personnelle", "Instantanée", False, "V,S,M", "Présage sur une action prévue dans les 30 minutes : bonheur, malheur, les deux, ou rien. Plusieurs lancements avant un repos long : 25 % de chances d'un présage au hasard.", "f:Présage", ri=True),
 sp("calm-emotions", "Calm Emotions", "Apaisement des émotions", 2, "Enchantement", "1 action", "18 m", "1 minute", True, "V,S", "Humanoïdes d'une sphère de 6 m : effets de charme ou d'effroi suspendus, ou hostilité calmée (indifférents) tant qu'ils ne sont pas attaqués.", "f:Apaisés", "CHA", "réussite : aucun effet", z="sphère de 6 m de rayon"),
 sp("prayer-of-healing", "Prayer of Healing", "Prière de guérison", 2, "Évocation", "10 minutes", "9 m", "Instantanée", False, "V", "Jusqu'à 6 créatures que tu vois. Sans effet sur les morts-vivants et les artificiels.", "f:Soigne 2d8 + mod.", up="+1d8 par niveau d'emplacement"),
 sp("warding-bond", "Warding Bond", "Lien de protection", 2, "Abjuration", "1 action", "Contact", "1 heure", False, "V,S,M", "Une créature consentante : +1 CA et JdS, résistance à tous les dégâts ; tu subis les mêmes dégâts qu'elle. Fin si vous êtes à plus de 18 m.", "f:+1 CA et JdS, résistance"),
 sp("mass-healing-word", "Mass Healing Word", "Mot de guérison de groupe", 3, "Évocation", "1 action bonus", "18 m", "Instantanée", False, "V", "Jusqu'à 6 créatures que tu vois. Sans effet sur les morts-vivants et les artificiels.", "f:Soigne 1d4 + mod.", up="+1d4 par niveau d'emplacement"),
 sp("speak-with-dead", "Speak with Dead", "Communication avec les morts", 3, "Nécromancie", "1 action", "3 m", "10 minutes", False, "V,S,M", "Un cadavre qui a une bouche répond à 5 questions, avec ce qu'il savait de son vivant. Pas deux fois le même corps en 10 jours.", "f:5 questions"),
 sp("spirit-guardians", "Spirit Guardians", "Esprits gardiens", 3, "Invocation", "1 action", "Personnelle (rayon de 4,5 m)", "10 minutes", True, "V,S,M", "Des esprits t'entourent : vitesse divisée par 2 pour les ennemis dans la zone. JdS quand une créature y entre ou y commence son tour (radiant si tu es bon ou neutre, nécrotique si tu es mauvais).", "d:3d8 radiant", "SAG", "réussite : moitié des dégâts", z="sphère de 4,5 m de rayon", up="+1d8 par niveau d'emplacement"),
 sp("hallow", "Hallow", "Sanctification", 5, "Évocation", "24 heures", "Contact", "Jusqu'à dissipation", False, "V,S,M", "Zone de 18 m de rayon : célestes, élémentaires, fées, fiélons et morts-vivants ne peuvent ni y entrer ni y charmer, effrayer ou posséder. Un effet de plus au choix (courage, ténèbres, lumière, vulnérabilité…).", "f:Zone sacrée", z="rayon de 18 m"),
 sp("blade-barrier", "Blade Barrier", "Barrière de lames", 6, "Évocation", "1 action", "27 m", "10 minutes", True, "V,S", "Mur de lames tournoyantes (30 m × 6 m ou anneau de 18 m) : abri important, terrain difficile. JdS pour une créature qui y entre ou y commence son tour.", "d:6d10 tranchant", "DEX", "réussite : moitié des dégâts"),
 sp("forbiddance", "Forbiddance", "Interdiction", 6, "Abjuration", "10 minutes", "Contact", "1 jour", False, "V,S,M", "Jusqu'à 3 700 m² : aucune téléportation ni voyage planaire. Les types choisis (célestes, fiélons, morts-vivants…) y subissent 5d10 radiants ou nécrotiques en entrant ou en commençant leur tour.", "d:5d10 radiant", ri=True),
 sp("harm", "Harm", "Mise à mal", 6, "Nécromancie", "1 action", "18 m", "Instantanée", False, "V,S", "Une créature : ses PV maximum baissent des dégâts subis (1 au minimum restant) jusqu'au repos long. Ne peut pas réduire ses PV max sous 1.", "d:14d6 nécrotique", "CON", "réussite : moitié des dégâts"),
 sp("planar-ally", "Planar Ally", "Allié planaire", 6, "Invocation", "10 minutes", "18 m", "Instantanée", False, "V,S", "Ta divinité envoie un céleste, un élémentaire ou un fiélon : il aide en échange d'un paiement selon la tâche.", "f:Allié planaire"),
 sp("word-of-recall", "Word of Recall", "Mot de rappel", 6, "Invocation", "1 action", "1,5 m", "Instantanée", False, "V", "Toi et jusqu'à 5 créatures consentantes êtes téléportés dans un sanctuaire préparé à l'avance.", "f:Téléportation au sanctuaire"),
 sp("conjure-celestial", "Conjure Celestial", "Convocation de céleste", 7, "Invocation", "1 minute", "27 m", "1 heure", True, "V,S", "Un céleste de FP 4 au plus, amical, qui obéit à tes ordres verbaux.", "f:Céleste allié", up="niveau 9 : FP 5"),
 sp("divine-word", "Divine Word", "Parole divine", 7, "Évocation", "1 action bonus", "9 m", "Instantanée", False, "V", "Chaque créature de ton choix qui t'entend : selon ses PV, assourdie (50 ou moins), aveuglée et assourdie (40), étourdie (30), tuée (20). Célestes, élémentaires, fées et fiélons ratés : renvoyés sur leur plan.", "f:Effet selon les PV", "CHA", "réussite : aucun effet"),
 sp("resurrection", "Resurrection", "Résurrection", 7, "Nécromancie", "1 heure", "Contact", "Instantanée", False, "V,S,M", "Une créature morte depuis 100 ans au plus (pas de vieillesse) revient avec tous ses PV, membres compris. −4 aux jets pendant 4 repos longs.", "f:Revient à la vie"),
 sp("holy-aura", "Holy Aura", "Aura sacrée", 8, "Abjuration", "1 action", "Personnelle (rayon de 9 m)", "1 minute", True, "V,S,M", "Créatures de ton choix à 9 m : avantage aux JdS, désavantage aux attaques contre elles. Un fiélon ou mort-vivant qui les touche au corps à corps fait un JdS de CON ou est aveuglé.", "f:Avantage JdS, désav. attaques", z="rayon de 9 m"),
 sp("mass-heal", "Mass Heal", "Guérison de groupe", 9, "Évocation", "1 action", "18 m", "Instantanée", False, "V,S", "700 PV à répartir entre les créatures que tu vois ; elles sont aussi guéries des maladies, de l'aveuglement et de la surdité.", "f:Soigne 700 PV au total"),
]
LIST = ("guidance light mending resistance sacred-flame spare-the-dying thaumaturgy "
 "bane bless command create-or-destroy-water cure-wounds detect-evil-and-good detect-magic detect-poison-and-disease guiding-bolt healing-word inflict-wounds protection-from-evil-and-good purify-food-and-drink sanctuary shield-of-faith "
 "aid augury blindness-deafness calm-emotions continual-flame enhance-ability find-traps gentle-repose hold-person lesser-restoration locate-object prayer-of-healing protection-from-poison silence spiritual-weapon warding-bond zone-of-truth "
 "animate-dead beacon-of-hope bestow-curse clairvoyance create-food-and-water daylight dispel-magic glyph-of-warding magic-circle mass-healing-word meld-into-stone protection-from-energy remove-curse revivify sending speak-with-dead spirit-guardians tongues water-walk "
 "banishment control-water death-ward divination freedom-of-movement guardian-of-faith locate-creature stone-shape "
 "commune contagion dispel-evil-and-good flame-strike geas greater-restoration hallow insect-plague legend-lore mass-cure-wounds planar-binding raise-dead scrying "
 "blade-barrier create-undead find-the-path forbiddance harm heal heroes-feast planar-ally true-seeing word-of-recall "
 "conjure-celestial divine-word etherealness fire-storm plane-shift regenerate resurrection symbol "
 "antimagic-field control-weather earthquake holy-aura astral-projection gate mass-heal true-resurrection").split()
d = json.load(open(P, encoding="utf-8")); ids = {s["id"] for s in d}
d += [s for s in NEW if s["id"] not in ids]
by = {s["id"]: s for s in d}
missing = [i for i in LIST if i not in by]
assert not missing, missing
for i in LIST:
    if "clerc" not in by[i]["cl"]: by[i]["cl"].append("clerc")
open(P, "w", encoding="utf-8").write("[\n" + ",\n".join(json.dumps(s, ensure_ascii=False) for s in d) + "\n]\n")
print(len(d), "sorts ;", sum("clerc" in s["cl"] for s in d), "de clerc")
