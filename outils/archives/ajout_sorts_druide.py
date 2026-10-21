"""Ajout des 58 sorts propres au druide à data/spells.json et marquage des 52 sorts partagés. Lit les en-têtes relevés par outils/sorts_aidedd.py (argument 1).

DÉJÀ APPLIQUÉ (octobre 2026) : gardé comme référence et comme modèle pour une prochaine classe.
Le relancer échoue volontairement (les identifiants existent déjà dans data/spells.json).
Contient le travail rédigé à la main pour chaque sort : id anglais, nom français, description courte, pastille, jet, progression.
"""
import json, re, unicodedata
P = __import__("os").path.join(__import__("os").path.dirname(__import__("os").path.dirname(__import__("os").path.dirname(__import__("os").path.abspath(__file__)))), "data", "spells.json")
def norm(s): return unicodedata.normalize("NFD",s).encode("ascii","ignore").decode().upper().replace("’","'").strip()
recs={norm(r["name"]):r for r in json.load(open(__import__("sys").argv[1]))}
# Sorts mineurs et 9e niveau dont le titre a échappé à l'OCR : champs relevés à la main dans l'export
manual={
 "ASSISTANCE":dict(l=0,s="divination",t="1 action",r="contact",v="V,S",d="concentration, jusqu'à 1 minute",ri=False),
 "FOUET EPINEUX":dict(l=0,s="transmutation",t="1 action",r="9 mètres",v="V, S, M",d="instantanée",ri=False),
 "GOURDIN MAGIQUE":dict(l=0,s="transmutation",t="1 action bonus",r="contact",v="V, S, M",d="1 minute",ri=False),
 "RESISTANCE":dict(l=0,s="abjuration",t="1 action",r="contact",v="V, S, M",d="concentration, jusqu'à 1 minute",ri=False),
 "TEMPETE VENGERESSE":dict(l=9,s="invocation",t="1 action",r="champ de vision",v="V, S",d="concentration, jusqu'à 1 minute",ri=False),
}
for k,v in manual.items(): recs[k]=dict(name=k,**v)
SC={"abjuration":"Abjuration","divination":"Divination","enchantement":"Enchantement","évocation":"Évocation","illusion":"Illusion","invocation":"Invocation","nécromancie":"Nécromancie","transmutation":"Transmutation"}
def cr(x):
    x=x.replace("métres","m").replace("métre","m").replace("mètres","m").replace("mètre","m").strip()
    m=re.match(r"personnelle \(rayon de (.+)\)",x)
    if m: return f"Personnelle (sphère de {m.group(1)} de rayon)"
    return x[0].upper()+x[1:]
def cd(x):
    x=x.replace("jusqu'a","jusqu'à").replace("jusqu’a","jusqu'à").replace("jusqu'é","jusqu'à").strip()
    m=re.match(r"concentration, jusqu'à (.+)",x)
    if m: return m.group(1), True
    return x[0].upper()+x[1:], False
def cv(x): return ",".join(c for c in ["V","S","M"] if re.search(r"\b"+c+r"\b", x.split("(")[0]))
# id, en, nom français, recherche OCR, e, p, j, ok, z, up, g, x
S=[
("druidcraft","Druidcraft","Druidisme","DRUIDISME","Prédit la météo, fait éclore une fleur, petit effet sensoriel, allume ou éteint une petite flamme.","f:Effets naturels","","","","",0,False),
("guidance","Guidance","Assistance","ASSISTANCE","Une créature consentante ajoute 1d4 à un test de caractéristique de son choix.","f:+1d4 à un test","","","","",0,False),
("produce-flame","Produce Flame","Flammes","FLAMMES","Flamme dans ta main (lumière 3 m). Lancer la flamme à 9 m met fin au sort.","d:1d8 feu","atk","contre la CA","","2d8 au niveau 5, 3d8 au 11, 4d8 au 17",0,False),
("thorn-whip","Thorn Whip","Fouet épineux","FOUET EPINEUX","Une créature de taille G ou moins touchée est tirée de 3 m vers toi.","d:1d6 perforant","atk","contre la CA","","2d6 au niveau 5, 3d6 au 11, 4d6 au 17",0,False),
("shillelagh","Shillelagh","Gourdin magique","GOURDIN MAGIQUE","Bâton ou gourdin : attaque et dégâts avec la Sagesse, dés de dégâts d8, arme magique.","f:Arme d8 (SAG)","","","","",0,False),
("resistance","Resistance","Résistance","RESISTANCE","Une créature consentante ajoute 1d4 à un jet de sauvegarde de son choix.","f:+1d4 à un JdS","","","","",0,False),
("animal-friendship","Animal Friendship","Amitié avec les animaux","AMITIE AVEC LES ANIMAUX","Une bête d'Intelligence 3 ou moins. Prend fin si tu la blesses.","f:Bête charmée","SAG","réussite : aucun effet","","+1 bête par niveau d'emplacement",0,False),
("goodberry","Goodberry","Baies nourricières","BAIES NOURRICIERES","Jusqu'à 10 baies : chacune rend 1 PV et nourrit pour la journée. Elles perdent leur pouvoir après 24 h.","f:10 baies, 1 PV chacune","","","","",0,False),
("speak-with-animals","Speak with Animals","Communication avec les animaux","COMMUNICATION AVEC LES ANIMAUX","Tu comprends les bêtes et peux leur parler.","f:Parler aux bêtes","","","","",0,False),
("create-or-destroy-water","Create or Destroy Water","Création ou destruction d'eau","CREATION OU DESTRUCTION D'EAU","Crée ou détruit jusqu'à 40 litres d'eau, ou dissipe le brouillard dans un cube de 9 m.","f:40 litres d'eau","","","","+40 litres par niveau d'emplacement",0,False),
("entangle","Entangle","Enchevêtrement","ENCHEVETREMENT","Carré de 6 m de terrain difficile. Une créature entravée peut se libérer par un test de Force.","f:Entravée","FOR","réussite : aucun effet","carré de 6 m","",0,False),
("faerie-fire","Faerie Fire","Lueurs féeriques","LUEURS FEERIQUES","Les créatures touchées brillent : avantage pour les attaquer, plus d'invisibilité.","f:Avantage contre elles","DEX","réussite : aucun effet","cube de 6 m","",0,False),
("healing-word","Healing Word","Mot de guérison","MOT DE GUERISON","Une créature que tu vois. Sans effet sur les morts-vivants et les artificiels.","f:Soigne 1d4 + mod.","","","","+1d4 par niveau d'emplacement",0,False),
("enhance-ability","Enhance Ability","Amélioration de caractéristique","AMELIORATION DE CARACTERISTIQUE","Au choix : avantage aux tests d'une caractéristique (Constitution : +2d6 PV temporaires, Force : charge doublée, etc.).","f:Avantage aux tests","","","","+1 créature par niveau d'emplacement",0,False),
("spike-growth","Spike Growth","Croissance d'épines","CROISSANCE D'EPINES","Terrain difficile camouflé ; 2d4 perforants par tranche de 1,5 m parcourue.","d:2d4 / 1,5 m","","","sphère de 6 m de rayon","",0,False),
("flame-blade","Flame Blade","Lame de feu","LAME DE FEU","Cimeterre de feu dans ta main (lumière 3 m) : attaque de sort au corps à corps, une action par attaque.","d:3d6 feu","atk","contre la CA","","+1d6 tous les 2 niveaux d'emplacement",0,False),
("locate-animals-or-plants","Locate Animals or Plants","Localisation d'animaux ou de plantes","PLANTES","Direction et distance de la bête ou de la plante du type nommé la plus proche, à 7,5 km.","f:Localise","","","","",0,False),
("animal-messenger","Animal Messenger","Messager animal","MESSAGER ANIMAL","Une bête de taille TP porte un message de 25 mots à un destinataire décrit.","f:Message 25 mots","","","","Durée +48 h par niveau d'emplacement",0,False),
("heat-metal","Heat Metal","Métal brûlant","METAL BROULANT","Un objet métallique : une action bonus pour répéter les dégâts. La créature qui le tient le lâche ou a un désavantage.","d:2d8 feu","CON","réussite : peut le garder en main","","+1d8 par niveau d'emplacement",0,False),
("pass-without-trace","Pass without Trace","Passage sans trace","PASSAGE SANS TRACE","Toi et tes alliés à 9 m : +10 en Discrétion, aucune trace sauf par magie.","f:+10 Discrétion","","","","",0,False),
("barkskin","Barkskin","Peau d'écorce","PEAU D'ECORCE","Une créature consentante touchée : sa CA ne peut pas être inférieure à 16.","f:CA 16 minimum","","","","",0,False),
("moonbeam","Moonbeam","Rayon de lune","RAYON DE LUNE","Cylindre de 1,5 m de rayon et 12 m de haut ; à qui y entre ou y commence son tour. Action : déplacer le rayon de 18 m. Les métamorphes reprennent leur forme.","d:2d10 radiant","CON","réussite : moitié des dégâts","cylindre de 1,5 m de rayon","+1d10 par niveau d'emplacement",0,False),
("beast-sense","Beast Sense","Sens animal","SENS ANIMAL","Une bête consentante : tu vois et entends à travers ses sens.","f:Sens d'une bête","","","","",0,False),
("find-traps","Find Traps","Sens des pièges","SENS DES PIEGES","Tu sens la présence de pièges à portée et en vue, sans leur emplacement.","f:Détecte les pièges","","","","",0,False),
("call-lightning","Call Lightning","Appel de la foudre","APPEL DE LA FOUDRE","Nuage d'orage : un éclair à l'incantation, puis une action par éclair (cercle de 1,5 m).","d:3d10 foudre","DEX","réussite : moitié des dégâts","cercle de 1,5 m de rayon","+1d10 par niveau d'emplacement",0,False),
("speak-with-plants","Speak with Plants","Communication avec les plantes","COMMUNICATION AVEC LES PLANTES","Les plantes à 9 m te répondent et peuvent changer le terrain (difficile ou normal).","f:Parler aux plantes","","","","",0,False),
("plant-growth","Plant Growth","Croissance végétale","CROISSANCE VEGETALE","1 action : végétation dense (déplacement ×4) dans un cercle de 30 m. 8 heures : récoltes doublées sur 750 m.","f:Terrain très difficile","","","cercle de 30 m de rayon","",0,False),
("meld-into-stone","Meld into Stone","Fusion dans la pierre","FUSION DANS LA PIERRE","Tu entres dans la pierre avec ton équipement ; tu peux entendre, pas voir.","f:Caché dans la pierre","","","","",0,False),
("conjure-animals","Conjure Animals","Invocation d'animaux","INVOCATION D'ANIMAUX","Esprits fées en forme de bêtes : une de FP 2, deux de FP 1, quatre de FP 1/2 ou huit de FP 1/4.","f:Bêtes alliées","","","","Plus de bêtes avec un emplacement de niveau 5, 7 ou 9",0,False),
("water-walk","Water Walk","Marche sur l'eau","MARCHE SUR L'EAU","Jusqu'à 10 créatures consentantes marchent sur les liquides.","f:Marche sur l'eau","","","","",0,False),
("wind-wall","Wind Wall","Mur de vent","MUR DE VENT","Mur de 15 m sur 4,5 m. Repousse projectiles, gaz et petites créatures volantes.","d:3d8 contondant","FOR","réussite : moitié des dégâts","mur de 15 m","",0,False),
("giant-insect","Giant Insect","Insecte géant","INSECTE GEANT","Jusqu'à 10 mille-pattes, 3 araignées, 5 guêpes ou un scorpion deviennent géants et t'obéissent.","f:Insectes alliés","","","","",0,False),
("conjure-woodland-beings","Conjure Woodland Beings","Invocation d'êtres sylvestres","INVOCATION D'ETRES SYLVESTRES","Fées : une de FP 2, deux de FP 1, quatre de FP 1/2 ou huit de FP 1/4.","f:Fées alliées","","","","Plus de fées avec un emplacement de niveau 6 ou 8",0,False),
("grasping-vine","Grasping Vine","Liane avide","LIANE AVIDE","Action bonus : la liane tire une créature de 6 m vers elle.","f:Tirée de 6 m","DEX","réussite : aucun effet","","",0,False),
("freedom-of-movement","Freedom of Movement","Liberté de mouvement","LIBERTE DE MOUVEMENT","Une créature consentante : le terrain difficile et la magie n'entravent plus ses déplacements ; 1,5 m pour se libérer d'une étreinte.","f:Libre de ses mouvements","","","","",0,False),
("commune-with-nature","Commune with Nature","Communion avec la nature","COMMUNION AVEC LA NATURE","Trois informations sur le terrain à 4,5 km (5 m sous terre) : eau, animaux, plantes, créatures…","f:3 informations","","","","",0,False),
("contagion","Contagion","Contagion","CONTAGION","Attaque de sort au contact : empoisonnée, puis une maladie au choix après trois JdS de Constitution ratés.","f:Empoisonnée, maladie","atk","contre la CA","","",0,False),
("antilife-shell","Antilife Shell","Coquille antivie","COQUILLE ANTIVIE","Barrière de 3 m : les créatures vivantes (hors morts-vivants et artificiels) ne peuvent pas la franchir ni t'atteindre.","f:Barrière","","","","",0,False),
("awaken","Awaken","Éveil","EVEIL","Une bête ou une plante d'INT 3 ou moins gagne INT 10, une langue, et reste charmée 30 jours.","f:Éveillée","","","","",1000,True),
("insect-plague","Insect Plague","Fléau d'insectes","FLEAU D'INSECTES","Sphère de 6 m de criquets : terrain difficile, visibilité réduite ; dégâts à qui y entre ou y finit son tour.","d:4d10 perforant","CON","réussite : moitié des dégâts","sphère de 6 m de rayon","+1d10 par niveau d'emplacement",0,False),
("tree-stride","Tree Stride","Passage par les arbres","PASSAGE PAR LES ARBRES","Tu entres dans un arbre et ressors d'un arbre de la même espèce à 150 m, une fois par tour.","f:Voyage par les arbres","","","","",0,False),
("reincarnate","Reincarnate","Réincarnation","REINCARNATION","Une créature morte depuis moins de 10 jours revient dans un nouveau corps (race tirée au hasard).","f:Nouveau corps","","","","",1000,True),
("greater-restoration","Greater Restoration","Restauration supérieure","RESTAURATION SUPERIEURE","Met fin à un niveau d'épuisement, un charme, une pétrification, une malédiction, une réduction de caractéristique ou de PV max.","f:Guérit un mal grave","","","","",100,True),
("mass-cure-wounds","Mass Cure Wounds","Soins de groupe","SOINS DE GROUPE","Jusqu'à 6 créatures dans une sphère de 9 m.","f:Soigne 3d8 + mod.","","","","+1d8 par niveau d'emplacement",0,False),
("heroes-feast","Heroes' Feast","Festin des héros","FESTIN DES HEROS","Jusqu'à 12 convives : immunité au poison et à la peur, avantage aux JdS de Sagesse, +2d10 PV max pendant 24 h.","f:Festin, +2d10 PV max","","","","",1000,True),
("heal","Heal","Guérison","GUERISON","Une créature : met fin à la cécité, à la surdité et aux maladies.","f:Soigne 70 PV","","","","+10 PV par niveau d'emplacement",0,False),
("conjure-fey","Conjure Fey","Invocation de fée","INVOCATION DE FEE","Une fée de FP 6 ou moins (ou une bête-esprit). Si la concentration est rompue, elle devient hostile.","f:Fée alliée","","","","+1 FP par niveau d'emplacement",0,False),
("wind-walk","Wind Walk","Marche sur le vent","MARCHE SUR LE VENT","Jusqu'à 10 créatures en forme de nuage : vol 90 m, résistance aux dégâts non magiques.","f:Vol 90 m","","","","",0,False),
("wall-of-thorns","Wall of Thorns","Mur d'épines","MOR D'EPINES","Mur de broussailles épineuses (terrain très difficile) ; dégâts à l'apparition et pour qui le traverse.","d:7d8 perforant","DEX","réussite : moitié des dégâts","mur de 18 m","+1d8 par niveau d'emplacement",0,False),
("find-the-path","Find the Path","Sens de l'orientation","SENS DE L'ORIEN","Le chemin le plus court et le plus direct vers un lieu fixe que tu connais, sur le même plan.","f:Chemin vers un lieu","","","","",100,False),
("transport-via-plants","Transport via Plants","Voie végétale","VOIE VEGETALE","Passage d'une grande plante à une autre que tu connais, sur le même plan.","f:Portail végétal","","","","",0,False),
("regenerate","Regenerate","Régénération","REGENERATION","Rend 4d8 + 15 PV, puis 1 PV par round pendant 1 heure ; les membres perdus repoussent.","f:Soigne 4d8 + 15","","","","",0,False),
("fire-storm","Fire Storm","Tempête de feu","TEMPETE DE FEU","Jusqu'à dix cubes de 3 m. Tu peux épargner les plantes.","d:7d10 feu","DEX","réussite : moitié des dégâts","10 cubes de 3 m","",0,False),
("animal-shapes","Animal Shapes","Formes animales","FORMES ANIMALES","Des créatures consentantes deviennent des bêtes de FP 4 ou moins (taille G maximum).","f:Transforme en bêtes","","","","",0,False),
("earthquake","Earthquake","Tremblement de terre","TREMBLEMENT DE TERRE","Cercle de 30 m : terrain difficile, fissures, bâtiments endommagés ; les créatures au sol tombent.","f:À terre, fissures","DEX","réussite : reste debout","cercle de 30 m de rayon","",0,False),
("tsunami","Tsunami","Tsunami","TSUNAMI","Mur d'eau de 90 m de long qui avance chaque round en perdant de la hauteur.","d:6d10 contondant","FOR","réussite : moitié des dégâts","mur de 90 m","",0,False),
("true-resurrection","True Resurrection","Résurrection suprême","RESURRECTION SUPREME","Ramène une créature morte depuis moins de 200 ans, même sans corps ; tous ses PV.","f:Ressuscite","","","","",25000,True),
("storm-of-vengeance","Storm of Vengeance","Tempête vengeresse","TEMPETE VENGERESSE","Nuage de 108 m de rayon : tonnerre puis, chaque round, acide, éclairs, grêle, vent glacial.","d:2d6 tonnerre, assourdie","CON","réussite : aucun effet","sphère de 108 m de rayon","",0,False),
]
assert len(S)==58, len(S)
SHARED=["poison-spray","mending","charm-person","detect-magic","detect-poison-and-disease","longstrider","fog-cloud","purify-food-and-drink","jump","cure-wounds","thunderwave","gust-of-wind","hold-person","locate-object","protection-from-poison","lesser-restoration","flaming-sphere","darkvision","dispel-magic","daylight","feign-death","protection-from-energy","water-breathing","sleet-storm","confusion","control-water","dominate-beast","stone-shape","conjure-minor-elementals","locate-creature","polymorph","wall-of-fire","stoneskin","ice-storm","hallucinatory-terrain","planar-binding","conjure-elemental","wall-of-stone","geas","scrying","sunbeam","plane-shift","reverse-gravity","mirage-arcane","antipathy-sympathy","control-weather","sunburst","feeblemind","foresight","shapechange","blight","move-earth"]
rows=[json.loads(l.strip().rstrip(",")) for l in open(P) if l.strip().startswith("{")]
ids={r["id"] for r in rows}
for r in rows:
    if r["id"] in SHARED and "druide" not in r["cl"]: r["cl"].append("druide")
assert sum("druide" in r["cl"] for r in rows if r["id"] in SHARED)==len(SHARED)
for (id_,en,n,key,e,p,j,ok,z,up,g,x) in S:
    assert id_ not in ids, id_
    o=recs[key]; d,c=cd(o["d"])
    rows.append({"en":en,"l":o["l"],"s":SC[o["s"].lower()],"t":o["t"].replace("é","é"),"r":cr(o["r"]),"d":d,"c":c,"ri":bool(o["ri"]),"v":cv(o["v"]),"g":g,"x":x,"n":n,"e":e,"id":id_,"p":p,"j":j,"ok":ok,"z":z,"up":up,"cl":["druide"]})
dr=[r for r in rows if "druide" in r["cl"]]
from collections import Counter
print("druide:",len(dr),dict(sorted(Counter(r["l"] for r in dr).items())),"| total",len(rows))
open(P,"w").write("[\n"+",\n".join(json.dumps(r,ensure_ascii=False) for r in rows)+"\n]\n")
