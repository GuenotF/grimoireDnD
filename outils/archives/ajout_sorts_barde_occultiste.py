"""Ajout des 11 sorts propres au barde et à l'occultiste (exports AideDD « sorts manquants ») et marquage « barde » / « occultiste »
des sorts de leurs listes (listes AideDD en XML : outils/sources/listes-aidedd-barde.xml, listes-aidedd-occultiste.xml ; 133 et 79 sorts).

DÉJÀ APPLIQUÉ (octobre 2026). Le relancer ne change rien.
Les sorts des listes sont retrouvés par le nom français (identifiant AideDD : nom sans accents, en minuscules, tirets).
"""
import json, os, re, unicodedata
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P = os.path.join(ROOT, "data", "spells.json")
def sp(id, en, n, l, s, t, r, d, c, v, e, p, j="", ok="", z="", up="", cl=()):
    return {"en": en, "l": l, "s": s, "t": t, "r": r, "d": d, "c": c, "ri": False, "v": v, "g": 0, "x": False, "n": n, "e": e, "id": id, "p": p, "j": j, "ok": ok, "z": z, "up": up, "cl": list(cl)}
B, W, BW = ("barde",), ("occultiste",), ("barde", "occultiste")
NEW = [
 sp("blade-ward", "Blade Ward", "Protection contre les armes", 0, "Abjuration", "1 action", "Personnelle", "1 round", False, "V,S", "Jusqu'à la fin de ton prochain tour : résistance aux dégâts contondants, perforants et tranchants des attaques avec une arme.", "f:Résistance C/P/T", cl=BW + ("ensorceleur", "magicien")),
 sp("vicious-mockery", "Vicious Mockery", "Moquerie cruelle", 0, "Enchantement", "1 action", "18 m", "Instantanée", False, "V", "Une créature qui t'entend : en cas d'échec, dégâts et désavantage à son prochain jet d'attaque avant la fin de son prochain tour.", "d:1d4 psychique", "SAG", "réussite : aucun effet", up="2d4 au niveau 5, 3d4 au 11, 4d4 au 17", cl=B),
 sp("eldritch-blast", "Eldritch Blast", "Décharge occulte", 0, "Évocation", "1 action", "36 m", "Instantanée", False, "V,S", "Un rayon par attaque de sort à distance : 2 rayons au niveau 5, 3 au 11, 4 au 17, sur une ou plusieurs cibles (un jet par rayon).", "d:1d10 force par rayon", "atk", "contre la CA", cl=W),
 sp("dissonant-whispers", "Dissonant Whispers", "Murmures dissonants", 1, "Enchantement", "1 action", "18 m", "Instantanée", False, "V", "Une créature de ton choix : en cas d'échec, elle utilise sa réaction pour s'éloigner de toi autant que sa vitesse le permet (sans traverser de danger évident). Une créature assourdie réussit automatiquement.", "d:3d6 psychique", "SAG", "réussite : moitié des dégâts, pas de déplacement", up="+1d6 par niveau d'emplacement", cl=B),
 sp("hex", "Hex", "Maléfice", 1, "Enchantement", "1 action bonus", "27 m", "1 heure", True, "V,S,M", "Une créature : +1d6 nécrotiques à chaque coup que tu lui portes, et désavantage à ses tests d'une caractéristique choisie. Si elle tombe à 0 PV : action bonus pour maudire une autre créature.", "d:+1d6 nécrotique", up="niveau 3-4 : 8 heures ; niveau 5+ : 24 heures", cl=W),
 sp("arms-of-hadar", "Arms of Hadar", "Tentacules de Hadar", 1, "Invocation", "1 action", "Personnelle (rayon de 3 m)", "Instantanée", False, "V,S", "Chaque créature à 3 m ou moins : en cas d'échec, pas de réaction jusqu'à son prochain tour.", "d:2d6 nécrotique", "FOR", "réussite : moitié des dégâts", z="rayon de 3 m", up="+1d6 par niveau d'emplacement", cl=W),
 sp("enthrall", "Enthrall", "Discours captivant", 2, "Enchantement", "1 action", "18 m", "1 minute", False, "V,S", "Créatures de ton choix qui te voient et t'entendent : en cas d'échec, désavantage aux tests de Sagesse (Perception) pour repérer une autre créature que toi. Avantage au jet si tu ou tes compagnons les combattez ; une créature qui ne peut pas être charmée réussit.", "f:Captivées", "SAG", "réussite : aucun effet", cl=BW),
 sp("hunger-of-hadar", "Hunger of Hadar", "Voracité de Hadar", 3, "Invocation", "1 action", "45 m", "1 minute", True, "V,S,M", "Sphère de 6 m de ténèbres magiques (aveuglés dedans), terrain difficile. 2d6 froid au début du tour de chaque créature dedans ; à la fin de son tour, JdS de DEX ou 2d6 acide.", "d:2d6 froid + 2d6 acide", "DEX", "réussite : pas d'acide", z="sphère de 6 m de rayon", cl=W),
 sp("compulsion", "Compulsion", "Compulsion", 4, "Enchantement", "1 action", "9 m", "1 minute", True, "V,S", "Créatures de ton choix : en cas d'échec, à chacun de tes tours, ton action bonus leur impose une direction ; elles y dépensent tout leur mouvement (pas vers un danger mortel évident), puis refont le jet.", "f:Déplacement imposé", "SAG", "réussite : aucun effet", cl=B),
 sp("glibness", "Glibness", "Bagou", 8, "Transmutation", "1 action", "Personnelle", "1 heure", False, "V", "Pour tes tests de Charisme, tu peux remplacer le résultat du dé par 15. La magie qui détecte le mensonge te dit sincère.", "f:CHA : dé au moins 15", cl=BW),
 sp("power-word-heal", "Power Word Heal", "Mot de pouvoir guérisseur", 9, "Évocation", "1 action", "Contact", "Instantanée", False, "V,S", "La créature touchée récupère tous ses PV ; charmée, effrayée, paralysée ou étourdie : l'état prend fin ; à terre, elle peut se relever par sa réaction. Sans effet sur les morts-vivants et les artificiels.", "f:Tous les PV", cl=B),
]
sl = lambda x: re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", unicodedata.normalize("NFD", x.replace("œ", "oe")).encode("ascii", "ignore").decode().lower())).strip("-")
d = json.load(open(P, encoding="utf-8")); ids = {s["id"] for s in d}
d += [s for s in NEW if s["id"] not in ids]
by = {sl(s["n"]): s for s in d}
for cls, f, n in [("barde", "listes-aidedd-barde.xml", 133), ("occultiste", "listes-aidedd-occultiste.xml", 79)]:
    slugs = re.findall(r"<spell>([^<]+)</spell>", open(os.path.join(ROOT, "outils", "sources", f), encoding="utf-8").read())
    assert len(slugs) == n and all(x in by for x in slugs), [x for x in slugs if x not in by]
    for x in slugs:
        if cls not in by[x]["cl"]: by[x]["cl"].append(cls)
open(P, "w", encoding="utf-8").write("[\n" + ",\n".join(json.dumps(s, ensure_ascii=False) for s in d) + "\n]\n")
print(len(d), "sorts ;", sum("barde" in s["cl"] for s in d), "de barde ;", sum("occultiste" in s["cl"] for s in d), "d'occultiste")
