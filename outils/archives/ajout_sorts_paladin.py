"""Ajout des 35 sorts de paladin et des sorts de serment (Conquête) à data/spells.json, et marquage des 10 sorts partagés avec le magicien.

DÉJÀ APPLIQUÉ (octobre 2026) : gardé comme référence et comme modèle pour une prochaine classe.
Le relancer échoue volontairement (les identifiants existent déjà dans data/spells.json).
Contient le travail rédigé à la main pour chaque sort : id anglais, nom français, description courte, pastille, jet, progression.
"""
import json, sys
P = __import__("os").path.join(__import__("os").path.dirname(__import__("os").path.dirname(__import__("os").path.dirname(__import__("os").path.abspath(__file__)))), "data", "spells.json")
S9 = "Personnelle (sphère de 9 m de rayon)"
def sp(id, en, n, l, s, t, r, d, c, v, e, p, j="", ok="", z="", up="", ri=False, g=0, x=False, cl=("paladin",)):
    return {"en": en, "l": l, "s": s, "t": t, "r": r, "d": d, "c": c, "ri": ri, "v": v, "g": g, "x": x, "n": n, "e": e, "id": id, "p": p, "j": j, "ok": ok, "z": z, "up": up, "cl": list(cl)}
NEW = [
 # Niveau 1
 sp("bless","Bless","Bénédiction",1,"Enchantement","1 action","9 m","1 minute",True,"V,S,M","Jusqu'à trois créatures ajoutent 1d4 à leurs jets d'attaque et de sauvegarde.","f:+1d4 attaque et JdS",up="+1 créature par niveau d'emplacement"),
 sp("command","Command","Injonction",1,"Enchantement","1 action","18 m","1 round",False,"V","Ordre d'un mot suivi à son prochain tour (approche, lâche, fuis, tombe, halte…). Sans effet sur un mort-vivant ou si l'ordre lui nuit directement.","f:Obéit à un mot","SAG","réussite : aucun effet",up="+1 créature par niveau d'emplacement (à 9 m l'une de l'autre)"),
 sp("compelled-duel","Compelled Duel","Duel forcé",1,"Enchantement","1 action bonus","9 m","1 minute",True,"V","Désavantage pour attaquer d'autres créatures que toi ; nouveau JdS pour s'éloigner à plus de 9 m. Prend fin si tu attaques une autre créature ou si un allié la blesse.","f:Provoquée","SAG","réussite : aucun effet"),
 sp("cure-wounds","Cure Wounds","Soins",1,"Évocation","1 action","Contact","Instantanée",False,"V,S","Une créature touchée. Sans effet sur les morts-vivants et les artificiels.","f:Soigne 1d8 + mod.",up="+1d8 par niveau d'emplacement"),
 sp("detect-evil-and-good","Detect Evil and Good","Détection du mal et du bien",1,"Divination","1 action",S9,"10 minutes",True,"V,S","Aberrations, célestes, élémentaires, fées, fiélons et morts-vivants à 9 m, et leur position ; lieux et objets consacrés ou profanés.","f:Détection"),
 sp("detect-poison-and-disease","Detect Poison and Disease","Détection du poison et des maladies",1,"Divination","1 action",S9,"10 minutes",True,"V,S,M","Poisons, créatures venimeuses et maladies à 9 m, avec leur type.","f:Détection",ri=True),
 sp("divine-favor","Divine Favor","Faveur divine",1,"Évocation","1 action bonus","Personnelle","1 minute",True,"V,S","Tes attaques avec une arme infligent 1d4 dégâts radiants de plus.","d:+1d4 radiant"),
 sp("heroism","Heroism","Héroïsme",1,"Enchantement","1 action","Contact","1 minute",True,"V,S","Une créature consentante est immunisée contre la peur et gagne, au début de chacun de ses tours, des PV temporaires égaux à ton mod. de Charisme.","f:Sans peur, PV temp.",up="+1 créature par niveau d'emplacement"),
 sp("purify-food-and-drink","Purify Food and Drink","Purification de nourriture et d'eau",1,"Transmutation","1 action","3 m","Instantanée",False,"V,S","Nourriture et boissons non magiques débarrassées de tout poison et de toute maladie.","f:Purifie",z="sphère de 1,5 m de rayon",ri=True),
 sp("searing-smite","Searing Smite","Châtiment calcinant",1,"Évocation","1 action bonus","Personnelle","1 minute",True,"V","Prochaine attaque au corps à corps avec une arme : la cible s'enflamme et subit 1d6 feu au début de chacun de ses tours, jusqu'à un JdS réussi.","d:+1d6 feu","CON","réussite : les flammes s'éteignent",up="+1d6 aux dégâts initiaux par niveau d'emplacement"),
 sp("shield-of-faith","Shield of Faith","Bouclier de la foi",1,"Abjuration","1 action bonus","18 m","10 minutes",True,"V,S,M","Une créature de ton choix.","f:+2 CA"),
 sp("thunderous-smite","Thunderous Smite","Châtiment tonitruant",1,"Évocation","1 action bonus","Personnelle","1 minute",True,"V","Prochaine attaque au corps à corps avec une arme, audible à 90 m. Échec : repoussée de 3 m et à terre.","d:+2d6 tonnerre","FOR","réussite : ni repoussée ni à terre"),
 sp("wrathful-smite","Wrathful Smite","Châtiment courroucé",1,"Évocation","1 action bonus","Personnelle","1 minute",True,"V","Prochaine attaque au corps à corps avec une arme. Échec : effrayée ; elle peut retenter le jet par une action.","d:+1d6 psychique","SAG","réussite : pas effrayée"),
 # Niveau 2
 sp("aid","Aid","Aide",2,"Abjuration","1 action","9 m","8 heures",False,"V,S,M","Jusqu'à trois créatures : PV maximum et actuels +5.","f:+5 PV max",up="+5 PV par niveau d'emplacement"),
 sp("branding-smite","Branding Smite","Châtiment révélateur",2,"Évocation","1 action bonus","Personnelle","1 minute",True,"V","Prochaine attaque avec une arme : la cible devient visible, émet une lumière faible et ne peut plus devenir invisible.","d:+2d6 radiant",up="+1d6 par niveau d'emplacement"),
 sp("find-steed","Find Steed","Appel de destrier",2,"Invocation","10 minutes","9 m","Instantanée",False,"V,S","Destrier loyal (cheval de guerre, poney, chameau, élan ou molosse), céleste, fée ou fiélon. Télépathie à 1,5 km ; tes sorts qui te ciblent peuvent aussi le cibler.","f:Destrier"),
 sp("lesser-restoration","Lesser Restoration","Restauration partielle",2,"Abjuration","1 action","Contact","Instantanée",False,"V,S","Met fin à une maladie ou à un état : aveuglé, assourdi, paralysé ou empoisonné.","f:Guérit un état"),
 sp("protection-from-poison","Protection from Poison","Protection contre le poison",2,"Abjuration","1 action","Contact","1 heure",False,"V,S","Neutralise un poison ; avantage aux JdS contre le poison et résistance aux dégâts de poison.","f:Antipoison"),
 sp("zone-of-truth","Zone of Truth","Zone de vérité",2,"Enchantement","1 action","18 m","10 minutes",False,"V,S","En cas d'échec, elle ne peut pas mentir délibérément dans la zone. Tu sais qui a réussi.","f:Ne peut mentir","CHA","réussite : aucun effet",z="sphère de 4,5 m de rayon"),
 # Niveau 3
 sp("aura-of-vitality","Aura of Vitality","Aura de vitalité",3,"Évocation","1 action",S9,"1 minute",True,"V","Action bonus : une créature dans l'aura (toi compris) récupère 2d6 PV.","f:Soigne 2d6 par tour"),
 sp("blinding-smite","Blinding Smite","Châtiment aveuglant",3,"Évocation","1 action bonus","Personnelle","1 minute",True,"V","Prochaine attaque au corps à corps avec une arme. Échec : aveuglée ; nouveau jet à la fin de chacun de ses tours.","d:+3d8 radiant","CON","réussite : pas aveuglée"),
 sp("create-food-and-water","Create Food and Water","Création de nourriture et d'eau",3,"Invocation","1 action","9 m","Instantanée",False,"V,S","22,5 kg de nourriture et 120 litres d'eau : 15 humanoïdes ou 5 montures pendant 24 h.","f:Vivres"),
 sp("crusaders-mantle","Crusader's Mantle","Aura du croisé",3,"Évocation","1 action",S9,"1 minute",True,"V","Les créatures non hostiles dans l'aura (toi compris) infligent 1d4 radiants de plus avec leurs attaques avec une arme.","d:+1d4 radiant"),
 sp("daylight","Daylight","Lumière du jour",3,"Évocation","1 action","18 m","1 heure",False,"V,S","Lumière vive, faible sur 18 m de plus. Dissipe les ténèbres magiques de niveau 3 ou moins.","f:Lumière vive",z="sphère de 18 m de rayon"),
 sp("elemental-weapon","Elemental Weapon","Arme élémentaire",3,"Transmutation","1 action","Contact","1 heure",True,"V,S","Arme non magique : +1 à l'attaque et +1d4 dégâts d'acide, de froid, de feu, de foudre ou de tonnerre (au choix).","f:Arme +1, +1d4",up="+2 et 2d4 (niveau 5 ou 6), +3 et 3d4 (niveau 7+)"),
 sp("revivify","Revivify","Retour à la vie",3,"Nécromancie","1 action","Contact","Instantanée",False,"V,S,M","Une créature morte depuis au plus une minute revient avec 1 PV.","f:Ranime",g=300,x=True),
 # Niveau 4
 sp("aura-of-life","Aura of Life","Aura de vie",4,"Abjuration","1 action",S9,"10 minutes",True,"V","Créatures non hostiles dans l'aura : résistance nécrotique, PV max non réductibles ; une créature à 0 PV regagne 1 PV au début de son tour.","f:Résistance nécrotique"),
 sp("aura-of-purity","Aura of Purity","Aura de pureté",4,"Abjuration","1 action",S9,"10 minutes",True,"V","Créatures non hostiles dans l'aura : pas de maladie, résistance au poison, avantage aux JdS contre aveuglé, charmé, assourdi, effrayé, paralysé, empoisonné et étourdi.","f:Avantage aux JdS"),
 sp("death-ward","Death Ward","Protection contre la mort",4,"Abjuration","1 action","Contact","8 heures",False,"V,S","La première fois qu'elle tombe à 0 PV, elle reste à 1 PV ; annule aussi un effet de mort instantanée.","f:Reste à 1 PV"),
 sp("staggering-smite","Staggering Smite","Châtiment débilitant",4,"Évocation","1 action bonus","Personnelle","1 minute",True,"V","Prochaine attaque au corps à corps avec une arme. Échec : désavantage aux attaques et aux tests, pas de réaction, jusqu'à la fin de son prochain tour.","d:+4d6 psychique","SAG","réussite : pas d'effet supplémentaire"),
 # Niveau 5
 sp("banishing-smite","Banishing Smite","Châtiment du ban",5,"Abjuration","1 action bonus","Personnelle","1 minute",True,"V","Prochaine attaque avec une arme. Si la cible tombe à 50 PV ou moins, elle est bannie (son plan d'origine ou un demi-plan) jusqu'à la fin du sort.","d:+5d10 force"),
 sp("circle-of-power","Circle of Power","Cercle de pouvoir",5,"Abjuration","1 action",S9,"10 minutes",True,"V","Créatures amies dans la zone : avantage aux JdS contre les sorts et effets magiques ; un JdS réussi « moitié des dégâts » n'en inflige aucun.","f:Avantage contre la magie"),
 sp("destructive-wave","Destructive Wave","Vague destructrice",5,"Évocation","1 action",S9,"Instantanée",False,"V","Créatures de ton choix. Échec : à terre. Radiant ou nécrotique, au choix.","d:5d6 tonnerre + 5d6 radiant","CON","réussite : moitié des dégâts, pas à terre"),
 sp("dispel-evil-and-good","Dispel Evil and Good","Dissipation du mal et du bien",5,"Abjuration","1 action","Personnelle","1 minute",True,"V,S,M","Célestes, élémentaires, fées, fiélons et morts-vivants ont un désavantage pour t'attaquer. Fin anticipée : libérer un allié charmé, effrayé ou possédé, ou renvoyer une créature sur son plan (JdS de Charisme).","f:Désavantage contre toi"),
 sp("raise-dead","Raise Dead","Rappel à la vie",5,"Nécromancie","1 heure","Contact","Instantanée",False,"V,S,M","Une créature morte depuis moins de 10 jours revient avec 1 PV ; −4 à ses jets, réduit de 1 à chaque repos long.","f:Ressuscite",g=500,x=True),
 # Sorts de serment hors liste du paladin (Serment de la conquête)
 sp("armor-of-agathys","Armor of Agathys","Armure d'Agathys",1,"Abjuration","1 action","Personnelle","1 heure",False,"V,S,M","Tant que ces PV temporaires durent, qui te touche au corps à corps subit 5 dégâts de froid.","f:5 PV temp., 5 froid",up="+5 PV temporaires et +5 froid par niveau d'emplacement",cl=()),
 sp("spiritual-weapon","Spiritual Weapon","Arme spirituelle",2,"Évocation","1 action bonus","18 m","1 minute",False,"V,S","Arme spectrale : attaque au corps à corps à l'incantation, puis par une action bonus à chaque tour après un déplacement de 6 m.","d:1d8 + mod. force","atk","contre la CA",up="+1d8 tous les 2 niveaux d'emplacement au-delà du 2e",cl=()),
 sp("dominate-beast","Dominate Beast","Domination de bête",4,"Enchantement","1 action","18 m","1 minute",True,"V,S","Charmée, la bête obéit à tes ordres télépathiques. Avantage au jet si vous la combattez ; nouveau jet à chaque fois qu'elle subit des dégâts.","f:Charmée, obéit","SAG","réussite : aucun effet",up="Concentration 10 min (niv. 5), 1 h (niv. 6), 8 h (niv. 7+)",cl=()),
]
SHARED = ["detect-magic","protection-from-evil-and-good","magic-weapon","locate-object","dispel-magic","magic-circle","remove-curse","banishment","locate-creature","geas"]
rows = [json.loads(l.strip().rstrip(",")) for l in open(P) if l.strip().startswith("{")]
ids = {r["id"] for r in rows}
assert not ids & {s["id"] for s in NEW}, ids & {s["id"] for s in NEW}
for r in rows:
    r["cl"] = ["magicien"] + (["paladin"] if r["id"] in SHARED else [])
assert sum(r["id"] in SHARED for r in rows) == len(SHARED)
rows += NEW
pal = [r for r in rows if "paladin" in r["cl"]]
from collections import Counter
print("paladin:", len(pal), dict(sorted(Counter(r["l"] for r in pal).items())), "| total:", len(rows))
with open(P, "w") as f:
    f.write("[\n" + ",\n".join(json.dumps(r, ensure_ascii=False) for r in rows) + "\n]\n")
