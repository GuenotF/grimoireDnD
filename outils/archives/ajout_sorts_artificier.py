"""Artificier (Eberron, AideDD) : ajoute les 14 sorts du Guide de Xanathar absents de data/spells.json et marque « artificier »
dans le champ cl des 88 sorts de sa liste (outils/archives/liste_sorts_artificier.txt, fournie par Fabien, octobre 2026).
Textes des sorts : fiches AideDD fournies par Fabien. Les sorts ajoutés ne sont ouverts qu'à l'artificier (listes des autres classes à recevoir).
Le relancer ne change rien.
"""
import json, os, re, unicodedata
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P = os.path.join(ROOT, "data", "spells.json")
norm = lambda s: unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().lower().replace("’", "'").strip()
X = dict(g=0, x=False, ri=False, c=False, j="", ok="", z="", up="", src="Xanathar")
NEW = [
 dict(id="thunderclap", en="Thunderclap", n="Coup de tonnerre", l=0, s="Évocation", t="1 action", r="1,5 m", d="Instantanée", v="S", e="Toute créature autre que toi à 1,5 m ou moins. Le bruit s'entend à 30 m.", p="d:1d6 tonnerre", j="CON", ok="réussite : aucun effet", z="rayon de 1,5 m", up="2d6 au niveau 5, 3d6 au 11, 4d6 au 17"),
 dict(id="frostbite", en="Frostbite", n="Gelure", l=0, s="Évocation", t="1 action", r="18 m", d="Instantanée", v="V,S", e="Une créature. En cas d'échec, désavantage à son prochain jet d'attaque avec une arme avant la fin de son prochain tour.", p="d:1d6 froid", j="CON", ok="réussite : aucun effet", up="2d6 au niveau 5, 3d6 au 11, 4d6 au 17"),
 dict(id="magic-stone", en="Magic Stone", n="Pierre magique", l=0, s="Transmutation", t="1 action bonus", r="Contact", d="1 minute", v="V,S", e="Un à trois cailloux : attaque à distance avec un sort, jetés (18 m) ou à la fronde, avec ton modificateur d'incantation même pour un autre lanceur. Relancer le sort met fin aux cailloux précédents.", p="d:1d6 + mod. contondant", j="atk", ok="contre la CA"),
 dict(id="absorb-elements", en="Absorb Elements", n="Absorption des éléments", l=1, s="Abjuration", t="1 réaction", r="Personnelle", d="1 round", v="S", e="Quand tu subis des dégâts d'acide, de froid, de feu, de foudre ou de tonnerre : résistance à ce type jusqu'au début de ton prochain tour, et ta première attaque au corps à corps qui touche à ton prochain tour inflige des dégâts de ce type en plus.", p="d:+1d6 du type absorbé", up="+1d6 par niveau d'emplacement"),
 dict(id="catapult", en="Catapult", n="Catapulte", l=1, s="Transmutation", t="1 action", r="18 m", d="Instantanée", v="S", e="Un objet de 500 g à 2,5 kg, ni porté ni transporté, vole en ligne droite jusqu'à 27 m. Il s'arrête sur une créature qui rate son jet ; l'objet et ce qu'il frappe subissent les dégâts.", p="d:3d8 contondant", j="DEX", ok="réussite : l'objet ne la frappe pas", up="+1d8 et +2,5 kg par niveau d'emplacement"),
 dict(id="snare", en="Snare", n="Collet", l=1, s="Abjuration", t="1 minute", r="Contact", d="8 heures", v="S,M", x=True, e="Piège presque invisible (Investigation contre ton DD) avec 7,5 m de corde. Une créature P, M ou G qui y marche est hissée tête en bas. Nouveau jet de DEX à la fin de chacun de ses tours ; Arcanes contre ton DD (action) pour la libérer.", p="f:Entravée", j="DEX", ok="réussite : aucun effet", z="cercle de 1,5 m de rayon"),
 dict(id="skywrite", en="Skywrite", n="Libellé aérien", l=2, s="Transmutation", t="1 action", r="Champ de vision", d="1 heure", c=True, ri=True, v="V,S", e="Jusqu'à dix mots faits de nuage dans le ciel. Un vent fort peut les disperser et mettre fin au sort.", p="f:Message dans le ciel"),
 dict(id="pyrotechnics", en="Pyrotechnics", n="Pyrotechnie", l=2, s="Transmutation", t="1 action", r="18 m", d="Instantanée", v="V,S", e="Une flamme non magique (cube de 1,5 m) : l'éteindre, ou feux d'artifice (à 3 m : aveuglée jusqu'à la fin de ton prochain tour), ou fumée (rayon de 7,5 m, visibilité nulle, 1 minute).", p="f:Aveuglée ou fumée", j="CON", ok="feux d'artifice, réussite : aucun effet"),
 dict(id="flame-arrows", en="Flame Arrows", n="Flèches enflammées", l=3, s="Transmutation", t="1 action", r="Contact", d="1 heure", c=True, v="V,S", e="Un carquois de flèches ou de carreaux : chaque munition qui touche inflige des dégâts de feu en plus. Fin après douze munitions tirées.", p="d:+1d6 feu", up="+2 munitions par niveau d'emplacement au-delà du 3"),
 dict(id="tiny-servant", en="Tiny Servant", n="Serviteur miniature", l=3, s="Transmutation", t="1 minute", r="Contact", d="8 heures", v="V,S", e="Un objet non magique de taille TP s'anime sous ton contrôle (ordre mental en action bonus, 36 m). Serviteur miniature : CA 15, 10 PV, vitesse 9 m, escalade 9 m, vision aveugle 18 m ; Coup +5, 1d4 + 3 contondant.", p="f:Objet animé", up="+2 objets par niveau d'emplacement au-delà du 3"),
 dict(id="catnap", en="Catnap", n="Sieste", l=3, s="Enchantement", t="1 action", r="9 m", d="10 minutes", v="S,M", e="Jusqu'à trois créatures volontaires tombent inconscientes. Restées inconscientes toute la durée : un repos court. Une fois par repos long par créature.", p="f:Repos court", up="+1 créature par niveau d'emplacement"),
 dict(id="elemental-bane", en="Elemental Bane", n="Fléau élémentaire", l=4, s="Transmutation", t="1 action", r="27 m", d="1 minute", c=True, v="V,S", e="Une créature et un type (acide, froid, feu, foudre, tonnerre) : la première fois par tour qu'elle en subit, dégâts en plus de ce type ; elle perd sa résistance à ce type.", p="d:+2d6 du type", j="CON", ok="réussite : aucun effet", up="+1 créature par niveau d'emplacement (à 9 m l'une de l'autre)"),
 dict(id="skill-empowerment", en="Skill Empowerment", n="Amélioration de compétences", l=5, s="Transmutation", t="1 action", r="Contact", d="1 heure", c=True, v="V,S", e="Une créature consentante : expertise (maîtrise doublée) dans une compétence qu'elle maîtrise déjà, sans cumul avec une autre expertise.", p="f:Expertise"),
 dict(id="transmute-rock", en="Transmute Rock", n="Transmutation de la pierre", l=5, s="Transmutation", t="1 action", r="36 m", d="Jusqu'à dissipation", v="V,S,M", e="Cube de 12 m. Roche en boue : chaque mètre de déplacement en coûte quatre, jet de FOR ou entravée ; lancé sur un plafond, pluie de boue (4d8 contondant, DEX pour moitié). Boue en roche : jet de DEX ou entravée (FOR DD 20 ou dégâts pour se libérer).", p="f:Entravée", j="FOR", ok="réussite : pas entravée", z="cube de 12 m"),
]
assert len(NEW) == 14
rows = [json.loads(l.strip().rstrip(",")) for l in open(P) if l.strip().startswith("{")]
ids = {r["id"] for r in rows}
for s in NEW:
    if s["id"] in ids: continue
    o = {**X, **s}
    rows.append({k: o[k] for k in ["en", "l", "s", "t", "r", "d", "c", "ri", "v", "g", "x", "n", "e", "id", "p", "j", "ok", "z", "up"]} | {"cl": [], "src": "Xanathar"})
txt = open(os.path.join(ROOT, "outils", "archives", "liste_sorts_artificier.txt")).read().split("## Sorts")[1]
names = [re.sub(r"\s*\(rituel\)|\s*\*", "", x).strip() for x in re.split(r"\n| \| ", txt)]
names = [x for x in names if x and not x.startswith(("Sorts mineurs", "Niveau"))]
alias = {norm("écrire dans le ciel"): "skywrite"}  # nom de la table ; AideDD : Libellé aérien
byn = {norm(r["n"]): r for r in rows}
done = 0
for n in names:
    r = byn.get(norm(n)) or next(x for x in rows if x["id"] == alias[norm(n)])
    if "artificier" not in r["cl"]: r["cl"].append("artificier")
    done += 1
assert done == 88, done
ar = [r for r in rows if "artificier" in r["cl"]]
from collections import Counter
print("artificier :", len(ar), dict(sorted(Counter(r["l"] for r in ar).items())), "| total", len(rows))
open(P, "w").write("[\n" + ",\n".join(json.dumps(r, ensure_ascii=False) for r in rows) + "\n]\n")
