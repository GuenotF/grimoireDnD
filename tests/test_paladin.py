"""Paladin : préparation, ressources, Châtiment divin, capacités, passage de niveau."""
from helpers import App, check, KAEL


def test_preparation_et_serment(browser, devices, url):
    a = App(browser, devices, url, char=KAEL)
    check(a.count(".gstar") == 2, "2 sorts de serment au niveau 4")
    check(a.js("R.prepMax(G())") == 5, "limite de 5 sorts (CHA +3, niveau 4)")
    for sid in ["bless", "heroism"]:
        a.pg.check(f'.gprep[data-id="{sid}"]'); a.pg.wait_for_timeout(50)
    check(a.g("prepared.length") == 5 and a.count(".gprep.full") > 0, "limite atteinte, cases grisées")
    a.pg.reload(); a.pg.wait_for_timeout(400)
    check(a.g("prepared.length") == 5, "préparation conservée au rechargement")
    a.close()


def test_imposition_des_mains(browser, devices, url):
    a = App(browser, devices, url, char=KAEL)
    a.click('[data-a="loh-open"]')
    check(a.pg.is_visible("#lohsheet"), "volet d'Imposition des mains")
    a.click('[data-a="loh-set"][data-v="7"]') if a.count('[data-a="loh-set"][data-v="7"]') else None
    a.click('[data-a="loh-go"]')
    spent = a.g("loh")
    check(spent > 0 and "PV" in a.toast(), f"soin dépensé : {spent}")
    a.undo(); check(a.g("loh") == 0, "annulé")
    a.click('[data-a="loh-open"]'); a.click('[data-a="loh-cure"]')
    check(a.g("loh") == 5, "maladie ou poison : 5 PV")
    a.close()


def test_perception_et_conduit_divin(browser, devices, url):
    a = App(browser, devices, url, char=KAEL, view="jeu")
    a.click('[data-a="row"][data-id="res:ds"]'); a.click('[data-a="ds-use"]')
    check(a.g("dsU") == 1, "Perception divine utilisée")
    a.click('[data-a="row"][data-id="res:cd"]'); a.click('[data-a="cd-use"][data-v="presence"]')
    check(a.g("cdU") == 1 and a.g("effects[0].name") == "Présence conquérante", "Présence conquérante en cours")
    check(a.count('[data-a="cd-use"]:disabled') == 2, "Conduit divin épuisé")
    a.click('[data-a="short-pal"]')
    check(a.g("cdU") == 0 and a.g("dsU") == 1, "repos court : Conduit divin seulement")
    a.close()


def test_chatiment_divin(browser, devices, url):
    a = App(browser, devices, url, char=KAEL, view="jeu")
    a.pg.check('[data-a="smite-ud"]'); a.pg.wait_for_timeout(40)
    a.click('[data-a="smite"][data-l="1"]')
    check(a.js("JSON.stringify(G().used)") == '{"1":1}' and "3d8" in a.toast(), "Châtiment niv. 1 contre mort-vivant : 3d8")
    check(a.count(".jrow.oath") >= 1 or a.count('#panel .rubric:has-text("serment")') >= 1, "sorts de serment affichés en jeu")
    a.close()


def test_passage_de_niveau(browser, devices, url):
    a = App(browser, devices, url, char=KAEL)
    a.click(".lvup")
    check("Sorts de niveau 2" in a.text(".lubody"), "niveau 5 : sorts de niveau 2")
    a.click(".lufoot .primary")
    a.click('[data-a="lu-pflt"][data-v="1"]')
    a.pg.check('[data-a="lu-pprep"][data-id="bless"]'); a.pg.wait_for_timeout(40)
    a.click(".lufoot .primary"); a.click('[data-a="lu-go"]')
    check(a.g("level") == 5 and a.g("prepared.includes('bless')"), "niveau 5 avec Bénédiction")
    a.undo(); check(a.g("level") == 4, "annulé")
    a.close()


def test_onglet_regles(browser, devices, url):
    a = App(browser, devices, url, char=KAEL, tab="regles")
    t = a.text("#panel")
    for s in ["5 sorts", "DD de 13", "+5", "20 PV", "4 fois", "Présence conquérante", "Concentration", "Xanathar"]:
        check(s in t, f"règles du paladin : « {s} »")
    a.close()
