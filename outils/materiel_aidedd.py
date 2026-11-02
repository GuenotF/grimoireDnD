"""Équipement d'aventurier, outils et paquetages du Manuel des joueurs 2014 (tables d'AideDD, règles 2014, novembre 2026)
-> data/materiel.json. Sources : https://www.aidedd.org/regles/equipement/materiel/ et .../outils/
Chaque objet : id, n (nom AideDD), p (prix), w (poids en kg, à l'unité ; None si non indiqué), g (groupe), f (dossier proposé),
c (à décompter en jeu), u (achat par lot : {n: nom de l'objet, q: quantité}), fx (effet résumé, d'après le texte AideDD),
pack (paquetage : [[nom, quantité, id du contenu ou None]])."""
import json, re, unicodedata, pathlib

def slug(t):
    t = unicodedata.normalize("NFD", t).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")
def kg(t):
    t = t.strip()
    if t in ("-", "", "*"): return None
    m = re.match(r"([\d,]+)\s*(kg|g)$", t)
    v = float(m.group(1).replace(",", "."))
    return round(v / 1000 if m.group(2) == "g" else v, 4)

MATERIEL = """— | Acide (fiole) | 25 po | 500 g
— | Antidote (fiole) | 50 po | -
— | Balance de marchand | 5 po | 1,5 kg
— | Bélier portable | 4 po | 17,5 kg
— | Billes (sac de 1000) | 1 po | 1 kg
— | Boite d'allume-feu | 5 pa | 500 g
— | Bougie | 1 pc | -
— | Boulier | 2 po | 1 kg
— | Bouteille en verre | 2 po | 1 kg
— | Cadenas | 10 po | 500 g
— | Carquois | 1 po | 500 g
— | Chaîne (3 m) | 5 po | 5 kg
— | Chausse-trappes (sac de 20) | 1 po | 1 kg
— | Chevalière | 5 po | -
— | Cire à cacheter | 5 pa | -
— | Cloche | 1 po | -
— | Coffre | 5 po | 12,5 kg
— | Corde en chanvre (15 m) | 1 po | 5 kg
— | Corde en soie (15 m) | 10 po | 2,5 kg
— | Couverture | 5 pa | 1,5 kg
— | Craie (un morceau) | 1 pc | -
— | Cruche ou pichet | 2 pc | 2 kg
— | Eau bénite (flasque) | 25 po | 500 g
— | Échelle (3 m) | 1 pa | 12,5 kg
— | Encre (bouteille de 30 ml) | 10 po | -
— | Étui à carreaux | 1 po | 500 g
— | Étui à cartes ou parchemins | 1 po | 500 g
— | Feu grégeois (flasque) | 50 po | 500 g
— | Fiole (10 cl) | 1 po | -
— | Flasque ou chope (50 cl) | 2 pc | 500 g
Focaliseur arcanique | Baguette | 10 po | 500 g
Focaliseur arcanique | Bâton | 5 po | 2 kg
Focaliseur arcanique | Boule de cristal | 10 po | 500 g
Focaliseur arcanique | Orbe | 20 po | 1,5 kg
Focaliseur arcanique | Sceptre | 10 po | 1 kg
Focaliseur druidique | Baguette d'if | 10 po | 500 g
Focaliseur druidique | Bâton | 5 po | 2 kg
Focaliseur druidique | Branche de gui | 1 po | -
Focaliseur druidique | Totem | 1 po | -
— | Gamelle | 2 pa | 500 g
— | Gourde (pleine) | 2 pa | 2,5 kg
— | Grappin | 2 po | 2 kg
— | Grimoire | 50 po | 1,5 kg
— | Huile (flasque) | 1 pa | 500 g
— | Kit d'escalade | 25 po | 6 kg
— | Lampe | 5 pa | 500 g
— | Lanterne à capote | 5 po | 1 kg
— | Lanterne sourde | 10 po | 1 kg
— | Livre | 25 po | 2,5 kg
— | Longue-vue | 1000 po | 500 g
— | Loupe | 100 po | -
— | Marteau | 1 po | 1,5 kg
— | Marteau de forgeron | 2 po | 5 kg
— | Matériel de pêche | 1 po | 2 kg
— | Menottes | 2 po | 3 kg
— | Miroir en acier | 5 po | 250 g
Munitions | Aiguilles de sarbacane (50) | 1 po | 500 g
Munitions | Billes de fronde (20) | 4 pc | 750 g
Munitions | Carreaux d'arbalète (20) | 1 po | 750 g
Munitions | Flèches (20) | 1 po | 500 g
— | Palan | 1 po | 2,5 kg
— | Panier | 4 pa | 1 kg
— | Papier (une feuille) | 2 pa | -
— | Parchemin (une feuille) | 1 pa | -
— | Parfum (fiole) | 5 po | -
— | Pelle | 2 po | 2,5 kg
— | Perche (3 m) | 5 pc | 3,5 kg
— | Pied-de-biche | 2 po | 2,5 kg
— | Piège à mâchoires | 5 po | 12,5 kg
— | Pierre à aiguiser | 1 pc | 500 g
— | Pioche de mineur | 2 po | 5 kg
— | Piton | 5 pc | 125 g
— | Plume d'écriture | 2 pc | -
— | Pointes en fer (10) | 1 po | 2,5 kg
— | Poison (fiole) | 100 po | -
— | Pot en fer | 2 po | 5 kg
— | Potion de guérison | 50 po | 250 g
— | Rations (1 jour) | 5 pa | 1 kg
— | Robes | 1 po | 2 kg
— | Sablier | 25 po | 500 g
— | Sac | 1 pc | 250 g
— | Sac à dos | 2 po | 2,5 kg
— | Sac de couchage | 1 po | 3,5 kg
— | Sacoche | 5 pa | 500 g
— | Sacoche à composantes | 25 po | 1 kg
— | Savon | 2 pc | -
— | Seau | 5 pc | 1 kg
— | Sifflet | 5 pc | -
Symbole sacré | Amulette | 5 po | 500 g
Symbole sacré | Emblème | 5 po | -
Symbole sacré | Reliquaire | 5 po | 1 kg
— | Tente | 2 po | 10 kg
— | Tonneau | 2 po | 35 kg
— | Torche | 1 pc | 500 g
— | Trousse de soins | 5 po | 1,5 kg
— | Vêtements, communs | 5 pa | 1,5 kg
— | Vêtements, costume | 5 po | 2 kg
— | Vêtements, fins | 15 po | 3 kg
— | Vêtements, voyage | 2 po | 2 kg"""
OUTILS = """Instruments de musique | Chalemie | 2 po | 500 g
Instruments de musique | Cor | 3 po | 1 kg
Instruments de musique | Cornemuse | 30 po | 3 kg
Instruments de musique | Flûte | 2 po | 500 g
Instruments de musique | Flûte de pan | 12 po | 1 kg
Instruments de musique | Luth | 35 po | 1 kg
Instruments de musique | Lyre | 30 po | 1 kg
Instruments de musique | Tambour | 6 po | 1,5 kg
Instruments de musique | Tympanon | 25 po | 5 kg
Instruments de musique | Viole | 30 po | 500 g
Jeux | Dés | 1 pa | -
Jeux | Jeu d'échecs draconiques | 1 po | 250 g
Jeux | Jeu de cartes | 5 pa | -
Jeux | Jeu des Dragons | 1 po | -
Outils | Kit d'empoisonneur | 50 po | 1 kg
Outils | Kit d'herboriste | 5 po | 1,5 kg
Outils | Kit de contrefaçon | 15 po | 2,5 kg
Outils | Kit de déguisement | 25 po | 1,5 kg
Outils d'artisan | Matériel d'alchimiste | 50 po | 4 kg
Outils d'artisan | Matériel de brasseur | 20 po | 4,5 kg
Outils d'artisan | Matériel de calligraphe | 10 po | 2,5 kg
Outils d'artisan | Matériel de peintre | 10 po | 2,5 kg
Outils d'artisan | Outils de bijoutier | 25 po | 1 kg
Outils d'artisan | Outils de bricoleur | 50 po | 5 kg
Outils d'artisan | Outils de cartographe | 15 po | 3 kg
Outils d'artisan | Outils de charpentier | 8 po | 3 kg
Outils d'artisan | Outils de cordonnier | 5 po | 2,5 kg
Outils d'artisan | Outils de forgeron | 20 po | 4 kg
Outils d'artisan | Outils de maçon | 10 po | 4 kg
Outils d'artisan | Outils de menuisier | 1 po | 2,5 kg
Outils d'artisan | Outils de potier | 10 po | 1 kg
Outils d'artisan | Outils de souffleur de verre | 30 po | 2,5 kg
Outils d'artisan | Outils de tanneur | 5 po | 2,5 kg
Outils d'artisan | Outils de tisserand | 1 po | 2,5 kg
Outils d'artisan | Ustensiles de cuisinier | 1 po | 4 kg
Outils | Outils de navigateur | 25 po | 1 kg
Outils | Outils de voleur | 25 po | 500 g"""
# Effets résumés (texte AideDD, règles 2014)
FX = {
 "Acide (fiole)": "Action : lancer sur une créature à 1,50 m ou jusqu'à 6 m (attaque à distance, arme improvisée) ; touché : 2d6 acide.",
 "Antidote (fiole)": "La boire : avantage aux JdS contre le poison pendant 1 heure (sans effet sur morts-vivants et créatures artificielles).",
 "Billes (sac de 1000)": "Action : répandre sur un carré de 3 m ; qui s'y déplace : JdS DEX DD 10 ou à terre (pas s'il avance à demi-vitesse).",
 "Chausse-trappes (sac de 20)": "Action : couvrir un carré de 1,50 m ; qui y entre : JdS DEX DD 15 ou s'arrête, 1 perforant, vitesse −3 m jusqu'à récupérer 1 PV.",
 "Eau bénite (flasque)": "Action : lancer à 1,50 m ou jusqu'à 6 m (attaque à distance, arme improvisée) ; touché : 2d6 radiants à un fiélon ou un mort-vivant.",
 "Feu grégeois (flasque)": "Action : lancer jusqu'à 6 m (attaque à distance, arme improvisée) ; touché : 1d4 feu au début de chacun de ses tours, jusqu'à un test de DEX DD 10 (action).",
 "Huile (flasque)": "Lancée (attaque à distance, arme improvisée) : la cible prend 5 feu de plus si elle subit du feu dans la minute. Versée sur 1,50 m : brûle 2 rounds, 5 feu.",
 "Lampe": "Lumière vive sur 4,50 m, faible sur 9 m de plus ; 6 heures par flasque d'huile.",
 "Lanterne à capote": "Lumière vive sur 9 m, faible sur 9 m de plus ; 6 heures par flasque d'huile ; une action la réduit à une lumière faible sur 1,50 m.",
 "Lanterne sourde": "Lumière vive dans un cône de 18 m, faible sur 18 m de plus ; 6 heures par flasque d'huile.",
 "Menottes": "Créature P ou M ; s'échapper : DEX DD 20 ; briser : FOR DD 20 ; crocheter (outils de voleur) : DEX DD 15 ; 15 PV.",
 "Poison (fiole)": "Action : enduire une arme tranchante ou perforante, ou 3 munitions ; touché : JdS CON DD 10 ou 1d4 poison ; actif 1 minute.",
 "Potion de guérison": "La boire ou la faire boire (action) : récupère 2d4 + 2 PV.",
 "Torche": "Brûle 1 heure : lumière vive sur 6 m, faible sur 6 m de plus ; au corps à corps, allumée : 1 dégât de feu.",
 "Trousse de soins": "10 utilisations ; action : stabiliser une créature à 0 PV sans test de Sagesse (Médecine).",
 "Kit d'escalade": "Action : s'ancrer ; impossible de tomber ou de grimper à plus de 7,50 m du point d'ancrage.",
 "Carquois": "Contient jusqu'à 20 flèches.",
 "Étui à carreaux": "Contient jusqu'à 20 carreaux.",
 "Sacoche à composantes": "Composantes matérielles des sorts (sauf celles qui ont un prix indiqué).",
}
CONSO = {"Acide (fiole)", "Antidote (fiole)", "Bougie", "Eau bénite (flasque)", "Feu grégeois (flasque)", "Huile (flasque)", "Poison (fiole)", "Potion de guérison", "Rations (1 jour)", "Torche", "Craie (un morceau)", "Papier (une feuille)", "Parchemin (une feuille)", "Piton"}
UNIT = {"Aiguilles de sarbacane (50)": ("Aiguilles de sarbacane", 50), "Billes de fronde (20)": ("Billes de fronde", 20), "Carreaux d'arbalète (20)": ("Carreaux", 20), "Flèches (20)": ("Flèches", 20)}
ALIAS = {"Potion de guérison": ["Potion de soins"], "Boite d'allume-feu": ["Boîte d'allume-feu", "Boîte à amadou"], "Corde en chanvre (15 m)": ["Corde de chanvre (15 m)", "Corde de chanvre"],
         "Gourde (pleine)": ["Gourde"], "Carreaux d'arbalète (20)": ["Carreaux d'arbalète"], "Rations (1 jour)": ["Rations"], "Torche": ["Torches"]}
items = []
for src, rows in (("materiel", MATERIEL), ("outils", OUTILS)):
    for line in rows.splitlines():
        g, n, p, w = [x.strip() for x in line.split("|")]
        grp = "" if g == "—" else g
        base = n if not grp.startswith(("Focaliseur", "Symbole")) else f"{n} ({grp.lower()})"
        x = {"id": slug(base), "n": base, "p": p, "w": kg(w), "g": grp or ("Équipement d'aventurier" if src == "materiel" else "Outils"), "f": "conso" if (n in CONSO or n in UNIT) else "divers"}
        if n in CONSO or n in UNIT: x["c"] = True
        if n in UNIT: un, q = UNIT[n]; x["u"] = {"n": un, "q": q}; x["w"] = round(kg(w) / q, 4) if kg(w) else None  # poids à l'unité
        if n in FX: x["fx"] = FX[n]
        if n in ALIAS: x["al"] = ALIAS[n]
        items.append(x)
ids = {x["n"]: x["id"] for x in items}
def c(n, q=1, real=None): return [n, q, ids.get(real or n)]
PACKS = [
 ("Sac d'artiste", "40 po", [c("Sac à dos"), c("Sac de couchage"), c("Vêtements, costume", 2), c("Bougie", 5), c("Rations (1 jour)", 5), c("Gourde (pleine)"), c("Kit de déguisement")]),
 ("Sac de cambrioleur", "16 po", [c("Sac à dos"), c("Billes (sac de 1000)"), c("Chaîne (3 m)"), c("Cloche"), c("Bougie", 5), c("Pied-de-biche"), c("Marteau"), c("Piton", 10), c("Lanterne à capote"), c("Huile (flasque)", 2), c("Rations (1 jour)", 5), c("Boite d'allume-feu"), c("Gourde (pleine)"), c("Corde en chanvre (15 m)")]),
 ("Sac de diplomate", "39 po", [c("Coffre"), c("Étui à cartes ou parchemins", 2), c("Vêtements, fins"), c("Encre (bouteille de 30 ml)"), c("Plume d'écriture"), c("Lampe"), c("Huile (flasque)", 2), c("Papier (une feuille)", 5), c("Parfum (fiole)"), c("Cire à cacheter"), c("Savon")]),
 ("Sac d'ecclésiastique", "19 po", [c("Sac à dos"), c("Couverture"), c("Bougie", 10), c("Boite d'allume-feu"), c("Boîte pour l'aumône"), c("Bâtonnet d'encens", 2), c("Encensoir"), c("Habits de cérémonie"), c("Rations (1 jour)", 2), c("Gourde (pleine)")]),
 ("Sac d'érudit", "40 po", [c("Sac à dos"), c("Livre de connaissance", 1, "Livre"), c("Encre (bouteille de 30 ml)"), c("Plume d'écriture"), c("Parchemin (une feuille)", 10), c("Petit sac de sable"), c("Petit couteau")]),
 ("Sac d'explorateur", "10 po", [c("Sac à dos"), c("Sac de couchage"), c("Gamelle"), c("Boite d'allume-feu"), c("Torche", 10), c("Rations (1 jour)", 10), c("Gourde (pleine)"), c("Corde en chanvre (15 m)")]),
 ("Sac d'exploration souterraine", "12 po", [c("Sac à dos"), c("Pied-de-biche"), c("Marteau"), c("Piton", 10), c("Torche", 10), c("Boite d'allume-feu"), c("Rations (1 jour)", 10), c("Gourde (pleine)"), c("Corde en chanvre (15 m)")]),
]
by = {x["id"]: x for x in items}
for n, p, content in PACKS:
    w = sum((by[i]["w"] or 0) * q for _, q, i in content if i)
    items.append({"id": slug(n), "n": n, "p": p, "w": round(w, 3), "g": "Paquetage", "f": "divers", "pack": content})
assert len({x["id"] for x in items}) == len(items), "identifiants en double"
out = pathlib.Path(__file__).resolve().parent.parent / "data" / "materiel.json"
out.write_text(json.dumps({"source": "Manuel des joueurs 2014, chapitre 5 (tables AideDD)", "items": items}, ensure_ascii=False, indent=1))
print(len(items), "objets ->", out)
print({x["n"]: x["w"] for x in items if x.get("pack")})
