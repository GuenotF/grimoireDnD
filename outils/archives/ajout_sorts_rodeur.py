"""Ajout des 6 sorts propres au rôdeur à data/spells.json et marquage « rodeur » des 46 sorts de sa liste (Manuel des joueurs 2014).

DÉJÀ APPLIQUÉ (octobre 2026) : gardé comme référence et comme modèle pour une prochaine classe.
Le relancer ne change rien (sorts déjà présents, marquage idempotent).
Noms français : AideDD. Textes courts rédigés pour la table, règles 2014.
"""
import json, os
P = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "spells.json")
def sp(id, en, n, l, s, t, r, d, c, v, e, p, j="", ok="", z="", up="", ri=False, g=0, x=False, cl=("rodeur",)):
    return {"en": en, "l": l, "s": s, "t": t, "r": r, "d": d, "c": c, "ri": ri, "v": v, "g": g, "x": x, "n": n, "e": e, "id": id, "p": p, "j": j, "ok": ok, "z": z, "up": up, "cl": list(cl)}
NEW = [
 sp("hail-of-thorns", "Hail of Thorns", "Grêle d'épines", 1, "Invocation", "1 action bonus", "Personnelle", "1 minute", True, "V",
    "Prochaine attaque à distance avec une arme qui touche : des épines jaillissent ; la cible et chaque créature à 1,5 m d'elle font un JdS.", "d:1d10 perçant", "DEX", "réussite : moitié des dégâts", up="+1d10 par niveau d'emplacement (6d10 au plus)"),
 sp("cordon-of-arrows", "Cordon of Arrows", "Cordon de flèches", 2, "Transmutation", "1 action", "1,5 m", "8 heures", False, "V,S,M",
    "Quatre munitions plantées en terre gardent la zone : une créature (autre que toi et celles que tu désignes) qui arrive à 9 m ou y finit son tour reçoit une munition. Le sort prend fin quand il n'en reste plus.", "d:1d6 perçant", "DEX", "réussite : aucun dégât", up="+2 munitions par niveau d'emplacement"),
 sp("conjure-barrage", "Conjure Barrage", "Invocation de projectiles", 3, "Invocation", "1 action", "Personnelle (cône de 18 m)", "Instantanée", False, "V,S,M",
    "Tu lances une arme ou tires une munition : des copies s'abattent sur chaque créature du cône. Dégâts du type de l'arme.", "d:3d8", "DEX", "réussite : moitié des dégâts", z="cône de 18 m"),
 sp("lightning-arrow", "Lightning Arrow", "Flèche de foudre", 3, "Transmutation", "1 action bonus", "Personnelle", "1 minute", True, "V,S",
    "Prochaine attaque à distance avec une arme : la munition devient un éclair. Touché : 4d8 foudre (moitié si raté). Chaque créature à 3 m de la cible : 2d8 foudre.", "d:4d8 foudre", "DEX", "créatures autour : moitié des 2d8", up="+1d8 aux deux effets par niveau d'emplacement"),
 sp("conjure-volley", "Conjure Volley", "Invocation de volée", 5, "Invocation", "1 action", "45 m", "Instantanée", False, "V,S,M",
    "Une munition ou une arme lancée vers un point : des centaines de copies pleuvent sur un cylindre de 12 m de rayon et 6 m de haut. Dégâts du type de l'arme.", "d:8d8", "DEX", "réussite : moitié des dégâts", z="cylindre de 12 m de rayon"),
 sp("swift-quiver", "Swift Quiver", "Vif carquois", 5, "Transmutation", "1 action bonus", "Contact", "1 minute", True, "V,S,M",
    "Ton carquois produit des munitions sans fin. À chacun de tes tours, action bonus : deux attaques avec une arme qui tire ses munitions.", "f:2 attaques par action bonus"),
]
LIST = ("alarm animal-friendship cure-wounds detect-magic detect-poison-and-disease ensnaring-strike fog-cloud goodberry hail-of-thorns hunters-mark jump longstrider speak-with-animals "
        "animal-messenger barkskin beast-sense cordon-of-arrows darkvision find-traps lesser-restoration locate-animals-or-plants locate-object pass-without-trace protection-from-poison silence spike-growth "
        "conjure-animals conjure-barrage daylight lightning-arrow nondetection plant-growth protection-from-energy speak-with-plants water-breathing water-walk wind-wall "
        "conjure-woodland-beings freedom-of-movement grasping-vine locate-creature stoneskin commune-with-nature conjure-volley swift-quiver tree-stride").split()
d = json.load(open(P, encoding="utf-8")); ids = {s["id"] for s in d}
d += [s for s in NEW if s["id"] not in ids]
by = {s["id"]: s for s in d}
assert len(LIST) == 46 and all(i in by for i in LIST), [i for i in LIST if i not in by]
for i in LIST:
    if "rodeur" not in by[i]["cl"]: by[i]["cl"].append("rodeur")
open(P, "w", encoding="utf-8").write("[\n" + ",\n".join(json.dumps(s, ensure_ascii=False) for s in d) + "\n]\n")
print(len(d), "sorts ;", sum("rodeur" in s["cl"] for s in d), "de rôdeur")
