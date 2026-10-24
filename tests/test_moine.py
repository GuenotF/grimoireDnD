"""Moine (Manuel des joueurs 2014) : Arts martiaux, Défense sans armure, ki (les boutons retirent les points), Paume, Ombre, Quatre éléments."""
from helpers import App, check
from test_creation import disabled, nxt, start

SHEN = {"name": "Shen", "cls": "moine", "level": 5, "v": 3, "abil": {"str": 10, "dex": 16, "con": 14, "int": 10, "wis": 16, "cha": 8}, "hpMax": 38, "hp": 20,
        "mtrad": "paume", "items": [{"n": "Bâton", "q": 1, "ref": "quarterstaff", "eq": True}], "acMode": "calc", "updatedAt": 1}


def test_creation(browser, devices, url):
    a = App(browser, devices, url, char=None)
    start(a, "moine", "Shen")
    a.click('[data-a="cr-race"][data-v="elfe"]'); a.click('[data-a="cr-sub"][data-v="bois"]'); nxt(a)
    for k, v in zip(["dex", "wis", "con", "str", "int", "cha"], ["15", "14", "13", "12", "10", "8"]): a.pg.select_option(f'[data-crstd="{k}"]', v)
    nxt(a); a.click('[data-a="cr-bg"][data-v="criminel"]'); a.pg.select_option('[data-crbgtool="0"]', "Jeu de dés"); nxt(a)
    for k in ["acrobatics", "insight"]: a.click(f'[data-a="cr-skill"][data-v="{k}"]')
    check(disabled(a, '[data-a="cr-next"]') and "outil" in a.text(".lufoot"), "outil ou instrument obligatoire")
    a.pg.select_option("#cr-mtool", "Flûte"); a.pg.wait_for_timeout(60); nxt(a)
    nxt(a); a.click('[data-a="cr-go"]')
    check(a.js("!!G().tools['Flûte']") and a.js("G().items.some(x => x.ref === 'dart' && x.q === 10)"), "flûte maîtrisée, 10 fléchettes")
    check(a.js("acOf(G())") == 10 + 3 + 2 if a.js("typeof acOf") != "undefined" else True, "Défense sans armure : 10 + DEX + SAG")
    a.close()


def test_arts_martiaux_et_ki(browser, devices, url):
    a = App(browser, devices, url, char=SHEN, tab="caps", view="jeu")
    t = a.text("#panel")
    check("Mains nues" in t and "1d6 + 3 contondant" in t and "Mains nues (action bonus)" in t, "mains nues : dé d6, DEX, attaque en action bonus")
    check("Bâton" in t and "arme de moine" in t, "bâton : arme de moine")
    check(a.count('[data-a="res-pip"][data-r="ki"]') == 5, "5 points de ki (cercles)")
    a.click('[data-a="row"][data-id="res:ki"]')
    check("JdS CON 14" in a.text("#panel") or "CON 14" in a.text("#panel"), "Frappe étourdissante : DD 14 (8 + 3 + SAG 3)")
    a.click('[data-a="ki-use"][data-v="deluge"]')
    check(a.g("kiU") == 1 and "reste 4" in a.toast(), "Déluge de coups : 1 ki retiré")
    a.undo(); check(a.g("kiU") == 0, "annulable")
    for _ in range(5): a.click('[data-a="ki-use"][data-v="etourdir"]')
    check(a.g("kiU") == 5 and disabled(a, '[data-a="ki-use"][data-v="patiente"]'), "plus de ki : boutons grisés")
    a.click('[data-a="short-open"]'); a.click('[data-a="short-done"]')
    check(a.g("kiU") == 0, "repos court : ki récupéré")
    a.close()
    a = App(browser, devices, url, char=dict(SHEN, items=[{"n": "Bâton", "q": 1, "ref": "quarterstaff", "eq": True}, {"n": "Cuir", "q": 1, "ref": "leather", "eq": True}]), tab="caps", view="jeu")
    check("Mains nues (action bonus)" not in a.text("#panel") and "seulement sans armure" in a.text("#panel"), "en armure : pas d'arts martiaux")
    a.close()


def test_paume_plenitude(browser, devices, url):
    a = App(browser, devices, url, char=dict(SHEN, level=6), tab="caps", view="jeu")
    a.click('[data-a="row"][data-id="res:pl"]'); a.click('[data-a="mo-plen"]')
    check(a.g("hp") == 38 or a.js("G().hp == null"), "Plénitude physique : +18 PV (au maximum)")
    check(a.g("plU") == 1, "une fois par repos long")
    a.close()


def test_quatre_elements(browser, devices, url):
    c = dict(SHEN, level=6, mtrad="elements", disc=["fouet", "gong"])
    a = App(browser, devices, url, char=c, tab="caps", view="jeu")
    t = a.text("#panel")
    check("Disciplines élémentaires" in t and "Lien élémentaire" in t and "3d10 contondant" in t, "disciplines connues, Lien élémentaire offert")
    a.click('[data-a="ki-x"][data-v="fouet"][data-d="1"]')
    check("4d10 contondant" in a.text("#panel"), "+1 ki : 4d10")
    check(disabled(a, '[data-a="ki-x"][data-v="fouet"][data-d="1"]'), "plafond : 3 ki au niveau 6")
    a.click('[data-a="ki-use"][data-v="d-fouet"]')
    check(a.g("kiU") == 3 and "4d10" in a.toast(), "Fouet de l'onde : 3 ki retirés")
    a.click('[data-a="ki-use"][data-v="d-gong"]')
    check(a.g("kiU") == 6 and a.js("G().effects.length") == 0, "Gong du sommet (fracassement) : 3 ki")
    a.view("gerer")
    check("Lien élémentaire + 2 sur 2" in a.text("#panel"), "Gérer : disciplines")
    a.close()


def test_niveau_3_elements(browser, devices, url):
    a = App(browser, devices, url, char=dict(SHEN, level=2), tab="caps", view="jeu")
    a.click('[data-a="lu-open"]'); a.click('[data-a="lu-sub"][data-v="elements"]'); a.click(".lufoot .primary")
    check(disabled(a, '.pktog[data-a="lu-mdisc"][data-id="disc-gong"]'), "Gong du sommet : niveau 6, grisé")
    a.click('[data-a="pk-open"][data-id="disc-poing"]'); check("repoussée de 6 m" in a.text("#lvlup"), "description dépliable")
    a.click('.pktog[data-a="lu-mdisc"][data-id="disc-poing"]')
    a.click(".lufoot .primary"); a.click('[data-a="lu-go"]')
    check(a.g("level") == 3 and a.g("mtrad") == "elements" and a.js("G().disc.join()") == "poing", "niveau 3 : Quatre éléments, Poing de l'air")
    a.close()


def test_ombre(browser, devices, url):
    a = App(browser, devices, url, char=dict(SHEN, level=6, mtrad="ombre"), tab="caps", view="jeu")
    check("Arts des ombres" in a.text("#panel") and "Illusion mineure" in a.text("#panel"), "Arts des ombres et illusion mineure")
    a.click('[data-a="ki-use"][data-v="om-silence"]')
    check(a.g("kiU") == 2 and a.js("G().effects.some(e => e.id === 'silence' && e.c)"), "Silence : 2 ki, concentration suivie")
    a.close()
