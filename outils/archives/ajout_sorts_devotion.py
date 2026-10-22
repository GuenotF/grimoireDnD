"""Ajout des 5 sorts du Serment de dévotion absents des listes déjà intégrées (sorts de clerc, hors liste du paladin).

DÉJÀ APPLIQUÉ (octobre 2026). Source : pages AideDD des règles 2014 (sanctuaire, lueur-d-espoir, gardien-de-la-foi,
communion, colonne-de-flamme). Le relancer échoue volontairement (identifiants déjà présents).
Les sorts de serment hors liste ont cl = [] : ils ne sont proposés qu'au paladin qui a ce serment.
"""
import json, os
P = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "spells.json")
def sp(id, en, n, l, s, t, r, d, c, v, e, p, j="", ok="", z="", up="", ri=False):
    return {"en": en, "l": l, "s": s, "t": t, "r": r, "d": d, "c": c, "ri": ri, "v": v, "g": 0, "x": False, "n": n, "e": e, "id": id, "p": p, "j": j, "ok": ok, "z": z, "up": up, "cl": []}
NEW = [
 sp("sanctuary", "Sanctuary", "Sanctuaire", 1, "Abjuration", "1 action bonus", "9 m", "1 minute", False, "V,S,M",
    "Qui veut attaquer la créature protégée ou la viser d'un sort offensif doit d'abord réussir un JdS de Sagesse, sinon il change de cible ou perd son attaque. Pas contre les zones. Prend fin si la créature attaque, lance un sort contre un ennemi ou inflige des dégâts.",
    "f:Protège une créature", "SAG", "échec : change de cible ou perd l'attaque"),
 sp("beacon-of-hope", "Beacon of Hope", "Lueur d'espoir", 3, "Abjuration", "1 action", "9 m", "1 minute", True, "V,S",
    "Les créatures choisies à portée ont l'avantage aux jets de sauvegarde de Sagesse et aux jets contre la mort, et regagnent le maximum de PV possible avec tout soin.",
    "f:Avantage SAG, soins maximaux"),
 sp("guardian-of-faith", "Guardian of Faith", "Gardien de la foi", 4, "Invocation", "1 action", "9 m", "8 heures", False, "V",
    "Gardien spectral de taille G. Toute créature hostile qui entre pour la première fois à 3 m ou moins de lui pendant son tour fait un JdS. Il disparaît après avoir infligé 60 dégâts au total.",
    "d:20 radiants", "DEX", "réussite : moitié des dégâts", "rayon de 3 m autour du gardien"),
 sp("commune", "Commune", "Communion", 5, "Divination", "1 minute", "Personnelle", "1 minute", False, "V,S,M",
    "Jusqu'à trois questions fermées à ta divinité, qui répond juste (ou « incertain »). Chaque lancement de plus avant un repos long a 25 % de chances cumulées de rester sans réponse.",
    "f:3 questions oui/non", ri=True),
 sp("flame-strike", "Flame Strike", "Colonne de flamme", 5, "Évocation", "1 action", "18 m", "Instantanée", False, "V,S,M",
    "Une colonne de feu divin s'abat sur le point choisi.",
    "d:4d6 feu + 4d6 radiants", "DEX", "réussite : moitié des dégâts", "cylindre de 3 m de rayon, 12 m de haut", "+1d6 feu ou radiants (au choix) par niveau d'emplacement au-delà du 5"),
]
rows = [json.loads(l.strip().rstrip(",")) for l in open(P, encoding="utf-8") if l.strip().startswith("{")]
ids = {r["id"] for r in rows}
assert not ids & {s["id"] for s in NEW}, ids & {s["id"] for s in NEW}
rows += NEW
open(P, "w", encoding="utf-8").write("[\n" + ",\n".join(json.dumps(r, ensure_ascii=False) for r in rows) + "\n]\n")
print("ajoutés :", [s["n"] for s in NEW], "| total :", len(rows))
