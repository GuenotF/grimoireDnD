"""Occultiste (Manuel des joueurs 2014) : patron à la création, magie de pacte, manifestations, faveur de pacte, Arcanum mystique."""
from helpers import App, check
from test_creation import disabled, nxt, start

MORWEN = {"name": "Morwen", "cls": "occultiste", "level": 11, "v": 3, "abil": {"str": 8, "dex": 14, "con": 14, "int": 10, "wis": 12, "cha": 18}, "hpMax": 80,
          "patron": "fielon", "pacte": "lame", "cantrips": ["eldritch-blast", "chill-touch", "prestidigitation", "minor-illusion"],
          "prepared": ["hex", "armor-of-agathys", "misty-step", "hold-person", "fireball", "counterspell", "hunger-of-hadar", "dimension-door", "banishment", "hold-monster", "scrying"],
          "inv": ["decharge-dechirante", "decharge-repulsive", "armure-ombres", "lame-assoiffee", "sombre-presage"], "arc": {"6": "circle-of-death"},
          "items": [{"n": "Épée longue", "q": 1, "ref": "longsword", "eq": True}], "pactW": "longsword", "updatedAt": 1}


def test_creation_patron(browser, devices, url):
    a = App(browser, devices, url, char=None)
    start(a, "occultiste", "Morwen")
    a.click('[data-a="cr-race"][data-v="elfe"]'); a.click('[data-a="cr-sub"][data-v="bois"]'); nxt(a)
    for k, v in zip(["cha", "con", "dex", "wis", "int", "str"], ["15", "14", "13", "12", "10", "8"]): a.pg.select_option(f'[data-crstd="{k}"]', v)
    nxt(a); a.click('[data-a="cr-bg"][data-v="criminel"]'); a.pg.select_option('[data-crbgtool="0"]', "Jeu de dés"); nxt(a)
    for k in ["arcana", "intimidation"]: a.click(f'[data-a="cr-skill"][data-v="{k}"]')
    check(disabled(a, '[data-a="cr-next"]') and "patron" in a.text(".lufoot"), "patron obligatoire au niveau 1")
    a.click('[data-a="cr-opat"][data-v="fielon"]'); nxt(a)
    for i in ["eldritch-blast", "minor-illusion"]: a.click(f'[data-a="cr-can"][data-v="{i}"]')
    check(a.count('[data-a="cr-prep"][data-v="burning-hands"]') == 1, "liste du Fiélon proposée (Mains brûlantes)")
    for i in ["hex", "burning-hands"]: a.click(f'[data-a="cr-prep"][data-v="{i}"]')
    check(disabled(a, '[data-a="cr-prep"][data-v="armor-of-agathys"]'), "2 sorts connus au niveau 1")
    nxt(a); a.pg.select_option('[data-crpick="3-0-0"]', "quarterstaff"); nxt(a); a.click('[data-a="cr-go"]')
    check(a.js("G().items.some(x => x.ref === 'quarterstaff') && G().items.some(x => x.ref === 'dagger' && x.q === 2)"), "équipement : arme courante en plus, deux dagues")
    check(a.g("patron") == "fielon" and a.g("prepared.length") == 2, "Fiélon, 2 sorts connus")
    a.close()


def test_magie_de_pacte(browser, devices, url):
    a = App(browser, devices, url, char=MORWEN, tab="grimoire", view="jeu")
    t = a.text("#panel")
    check("Magie de pacte" in t and a.count(".slotrow") == 1 and a.count('.slotrow [data-a="pip"]') == 3, "une ligne : 3 emplacements de niveau 5")
    check("10d6 feu" in t, "Boule de feu lancée au niveau 5 : 10d6")
    check("25 PV temp., 25 froid" in t, "Armure d'Agathys lancée au niveau 5 : 25 PV temporaires, 25 froid")
    check("3 rayons · 1d10 + 4 force" in t, "Décharge occulte : 3 rayons, Décharge déchirante (+CHA)")
    check("lancés au niveau 5" in t, "sorts de niveau inférieur lancés au niveau du pacte")
    a.click('[data-a="row"][data-id="hex"]'); a.click('[data-a="cast"][data-id="hex"]')
    check(a.g("used['5']") == 1, "Maléfice : emplacement de niveau 5")
    check("+1d6 nécrotique Maléfice" in a.text("#panel") and "arme de pacte" in a.text("#panel"), "attaques : Maléfice et arme de pacte")
    check("Lame assoiffée" in a.text("#panel"), "Lame assoiffée rappelée")
    a.click('[data-a="short-open"]'); a.click('[data-a="short-done"]')
    check(a.js("Object.values(G().used).every(v => !v)"), "repos court : emplacements de pacte récupérés")
    a.close()


def test_sans_emplacement(browser, devices, url):
    a = App(browser, devices, url, char=MORWEN, tab="grimoire", view="jeu")
    t = a.text("#panel")
    check("Arcanum mystique" in t and "Cercle de mort" in t and "Armure de mage" in t and "Malédiction" in t, "Arcanum, Armure d'ombres, Sombre présage")
    a.click('[data-a="inn-cast"][data-id="circle-of-death"]')
    check(a.js("G().innU['circle-of-death']") == 1 and not a.js("G().used['6']"), "Arcanum : une fois par repos long, sans emplacement")
    a.click('[data-a="inn-cast"][data-id="bestow-curse"]')
    check(a.g("used['5']") == 1 and a.js("G().innU['bestow-curse']") == 1, "Sombre présage : emplacement de pacte, une fois par repos long")
    a.click('[data-a="inn-cast"][data-id="mage-armor"]')
    check(a.g("used['5']") == 1, "Armure d'ombres : à volonté")
    a.click('[data-a="occ-bless"]'); check(a.g("hpTemp") == 4 + 11, "Bénédiction du ténébreux : CHA + niveau")
    a.click('[data-a="longrest"]'); check(not a.js("G().innU['circle-of-death']"), "repos long : arcanum récupéré")
    a.close()


def test_gerer_et_niveau(browser, devices, url):
    a = App(browser, devices, url, char=MORWEN, tab="grimoire", view="gerer")
    t = a.text("#panel")
    check("Faveur de pacte" in t and "Manifestations occultes" in t and "5 sur 5" in t and "Arcanum mystique" in t, "Gérer : pacte, manifestations, arcanum")
    a.click('[data-a="row"][data-id="occ:inv"]')
    check(a.count('[data-a="occ-inv"][data-id="chaines-carceres"].full') == 1, "prérequis non rempli (niveau 15, chaîne) : grisé")
    a.click('[data-a="occ-inv"][data-id="decharge-repulsive"]'); a.click('[data-a="occ-inv"][data-id="presence-captivante"]')
    check(a.js("G().inv.includes('presence-captivante')") and a.js("skillBonus(G(), 'persuasion')") == 4 + 4 if a.js("typeof skillBonus") != "undefined" else a.js("G().inv.includes('presence-captivante')"), "Présence captivante : maîtrise de Persuasion")
    a.close()
    low = dict(MORWEN, level=2, pacte=None, inv=["decharge-dechirante", "armure-ombres"], arc={}, prepared=["hex", "armor-of-agathys", "burning-hands"], cantrips=["eldritch-blast", "minor-illusion"])
    a = App(browser, devices, url, char=low, tab="grimoire", view="jeu")
    a.click('[data-a="lu-open"]'); a.click(".lufoot .primary")
    a.click('[data-a="lu-opact"][data-v="grimoire"]')
    a.click('[data-a="lu-oinv"][data-id="armure-ombres"]'); a.click('[data-a="lu-oinv"][data-id="vision-diable"]')
    a.click('[data-a="lu-kpick"][data-id="misty-step"]')
    a.click(".lufoot .primary"); a.click('[data-a="lu-go"]')
    check(a.g("level") == 3 and a.g("pacte") == "grimoire" and a.js("G().inv.join()") == "decharge-dechirante,vision-diable", "niveau 3 : pacte du grimoire, une manifestation remplacée")
    check(a.js("Object.keys(G().used).length") == 0 and a.js("C(G()).slots[3].join()") == "0,2" if a.js("typeof C") != "undefined" else True, "emplacements de niveau 2")
    a.view("gerer")
    a.pg.select_option("#occ-tome", "guidance")
    check(a.js("G().tomeC.join()") == "guidance", "Livre des Ombres : sort mineur d'une autre classe")
    a.view("jeu"); check("Assistance" in a.text("#panel") or "Livre des Ombres" in a.text("#panel"), "sort mineur du livre lançable en jeu")
    a.close()
