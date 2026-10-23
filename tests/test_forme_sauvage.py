"""Druide du Cercle de la Lune : Forme sauvage (formes possibles, forme active, soins, concentration)."""
from helpers import App, check, MALFAEL


def transform(a, beast):
    a.click('[data-a="row"][data-id="res:ws"]')
    a.click('[data-a="ws-open"]')
    a.click(f'#wssheet [data-a="row"][data-id="ws:{beast}"]')
    a.click(f'[data-a="ws-go"][data-id="{beast}"]')


def test_formes_possibles(browser, devices, url):
    a = App(browser, devices, url, char=MALFAEL, view="jeu")
    a.click('[data-a="row"][data-id="res:ws"]'); a.click('[data-a="ws-open"]')
    check("55 bêtes" in a.text("#wssheet .luhead"), "55 formes au niveau 4")
    a.click('[data-a="ws-mv"][data-v="nage"]')
    check(a.count("#wssheet .wsrow") == 15, "15 bêtes qui nagent")
    a.click('[data-a="ws-mv"][data-v="nage"]')
    sc = "document.querySelector('#wssheet .lubody').scrollTop"
    a.pg.locator('#wssheet [data-a="row"][data-id="ws:rat"]').scroll_into_view_if_needed()
    y = a.js(sc); a.click('#wssheet [data-a="row"][data-id="ws:rat"]')
    check(a.js(sc) == y and y > 0, "la liste garde sa position en dépliant")
    a.close()


def test_forme_active_pv_et_retour(browser, devices, url):
    a = App(browser, devices, url, char=MALFAEL, view="jeu")
    transform(a, "ours-brun")
    check(a.g("wsForm.hp") == 34 and a.g("wsU") == 1, "ours brun, 34 PV")
    check("Ours brun · 34/34" in a.text(".slotbar .chip.ws"), "puce dans la barre du bas")
    a.pg.fill("#ws-n", "10"); a.click('[data-a="ws-dmg"]')
    check(a.g("wsForm.hp") == 24, "dégâts")
    a.pg.fill("#ws-n", "40"); a.click('[data-a="ws-dmg"]')
    check(a.g("wsForm") is None and "16 dégâts" in a.toast(), "retour à 0 PV avec excédent")
    a.undo(); check(a.g("wsForm.hp") == 24, "annulé")
    a.close()


def test_fiche_complete_et_repli(browser, devices, url):
    a = App(browser, devices, url, char=MALFAEL, view="jeu")
    transform(a, "pieuvre-geante")
    body = a.text("#ws-active")
    for t in ["Nuage d'encre", "1 fois par repos", "Discrétion +5", "Allonge 4,50 m", "DD 16"]:
        check(t in body, f"fiche complète : « {t} »")
    a.click('#ws-active [data-a="fold"]')
    check(a.count("#ws-active .bcard") == 0 and a.count('[data-a="ws-dmg"]') == 1, "repliée : PV et dégâts restent")
    a.close()


def test_changeforme_de_combat(browser, devices, url):
    a = App(browser, devices, url, char=dict(MALFAEL, level=13, used={"1": 4}), view="jeu")
    transform(a, "ours-brun")
    check("niv. 2 = 2d8" in a.text(".wscf .cast"), "premier emplacement libre par défaut")
    a.click('#ws-active [data-a="cast-open"]')
    check(a.count(".wscf .chooser .lvls button") == 7, "choix des niveaux 1 à 7")
    a.click('.wscf [data-a="ws-cf"][data-l="5"]')
    check(a.js("G().used[5]") == 1 and "5d8" in a.text("#ws-active"), "emplacement niv. 5 dépensé, 5d8 rappelé")
    a.close()


def test_rappel_de_concentration(browser, devices, url):
    a = App(browser, devices, url, char=MALFAEL, view="jeu")
    a.click('.jline [data-a="cast"][data-id="moonbeam"]')
    transform(a, "ours-brun")
    a.pg.fill("#ws-n", "24"); a.click('[data-a="ws-dmg"]')
    check("DD 12" in a.text(".wsconc") and "CON de la bête (+3)" in a.text(".wsconc"), "rappel avec la CON de la bête")
    a.click('[data-a="wsconc-ok"]')
    check(a.count(".wsconc") == 0 and a.js("!!concOf(G())"), "réussi : concentration gardée")
    a.pg.fill("#ws-n", "30"); a.click('[data-a="ws-dmg"]')
    check("ta propre CON" in a.text(".wsconc"), "forme perdue : CON du druide")
    a.click('[data-a="conc-end"]')
    check(not a.js("!!concOf(G())"), "raté : concentration perdue")
    a.close()


def test_niveau_6_et_18(browser, devices, url):
    a = App(browser, devices, url, char=dict(MALFAEL, level=6, wsForm={"id": "ours-brun", "hp": 34, "max": 34}), view="jeu")
    check(a.count(".wsprimal") == 1, "Frappe primitive au niveau 6")
    a.level(18)
    check("Sorts bestiaux" in a.text("#ws-active"), "Sorts bestiaux au niveau 18")
    a.close()
