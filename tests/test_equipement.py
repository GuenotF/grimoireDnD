"""Équipement : bourse (gains, dépenses, monnaie), objets (ajout, équipé, à décompter, retrait)."""
from helpers import App, check, MALFAEL

FICHE = {"abil": {"str": 10, "dex": 14, "con": 14, "int": 12, "wis": 16, "cha": 8}, "ac": 14, "hpMax": 31, "v": 3}


def money(a, n, coin, act):
    a.pg.fill("#m-n", str(n)); a.click(f'[data-a="m-coin"][data-v="{coin}"]'); a.click(f'[data-a="{act}"]')


def test_bourse(browser, devices, url):
    a = App(browser, devices, url, char=dict(MALFAEL, **FICHE, money={"po": 2, "pa": 3}), tab="perso", view="jeu")
    check("2 po · 3 pa" in a.text("#panel"), "résumé de la bourse")
    a.click('.purse')
    money(a, 15, "pc", "m-gain")
    check(a.g("money.pc") == 15, "gain de 15 pc")
    money(a, 5, "pa", "m-spend")
    check(a.js("JSON.stringify(G().money)") == '{"pp":0,"po":1,"pe":0,"pa":8,"pc":15}' and "1 po → 10 pa" in a.toast(), f"monnaie faite : {a.js('JSON.stringify(G().money)')}")
    a.undo()
    check(a.g("money.po") == 2 and a.g("money.pa") == 3, "dépense annulée")
    money(a, 1, "pp", "m-spend")
    check(a.g("money.po") == 2 and "Pas assez" in a.toast(), "bourse insuffisante : rien ne change")
    money(a, 24, "pa", "m-spend")
    check(a.js("JSON.stringify(G().money)") == '{"pp":0,"po":0,"pe":0,"pa":0,"pc":5}', f"24 pa payés avec 2 po, 3 pa, 15 pc : {a.js('JSON.stringify(G().money)')}")
    a.close()


def test_objets(browser, devices, url):
    a = App(browser, devices, url, char=dict(MALFAEL, **FICHE), tab="perso", view="gerer")
    for n in ["Bâton", "Rations", "Potion de soins"]:
        a.pg.fill("#it-new", n); a.pg.press("#it-new", "Enter"); a.pg.wait_for_timeout(60)
    check(a.g("items.length") == 3 and a.pg.evaluate("document.activeElement.id") == "it-new", "3 objets ajoutés, champ prêt pour le suivant")
    a.click('[data-a="it-eq"][data-i="0"]')
    a.click('[data-a="it-edit"][data-i="1"]'); a.pg.fill("#it-q", "7"); a.pg.check("#it-c"); a.pg.fill("#it-note", "une par jour"); a.click('.itform [type="submit"]')
    check(a.g("items[1].q") == 7 and a.g("items[1].c") and a.g("items[1].note") == "une par jour", "rations : 7, à décompter")
    a.view("jeu")
    check(a.texts(".it.j .itn > span")[0] == "Bâton" and a.count(".it.eq") == 1, "objet équipé en tête, en gras")
    a.click('[data-a="it-dec"][data-i="1"]')
    check(a.g("items[1].q") == 6, "une ration de moins")
    a.view("gerer"); a.click('[data-a="it-edit"][data-i="2"]'); a.click('[data-a="it-del"][data-i="2"]')
    check(a.g("items.length") == 2, "objet retiré"); a.undo()
    check(a.g("items.length") == 3 and a.g("items[2].n") == "Potion de soins", "retrait annulé")
    a.close()
