"""Repos long guidé : récapitulatif, préparation des sorts, étape de sous-classe (Présage), préparation hors repos."""
from helpers import App, check, KAEL, NEMEIA
from test_barbare import GARAL


def test_paladin_recuperer_puis_preparer(browser, devices, url):
    a = App(browser, devices, url, char=dict(KAEL, hpMax=34, hp=20, hdU=3, used={"1": 2}), tab="perso", view="jeu")
    a.click('[data-a="longrest"]')
    rows = a.texts("#lrsheet .lrrow")
    check(a.texts("#lrsheet .lusteps div") == ["1 · Récupérer", "2 · Préparer"], f"deux étapes : {a.texts('#lrsheet .lusteps div')}")
    check(any("Points de vie" in r and "20" in r and "34 / 34" in r for r in rows) and any("Dés de vie" in r and "1 / 4" in r and "3 / 4" in r for r in rows)
          and any("Emplacements niv. 1" in r and "1 / 3" in r for r in rows), f"récapitulatif calculé : {rows}")
    a.click('#lrsheet .lufoot [data-a="lr-close"]')
    check(a.pg.is_hidden("#lrsheet") and a.g("hp") == 20 and a.g("hdU") == 3, "Annuler : rien ne change")
    a.click('[data-a="longrest"]'); a.click('#lrsheet [data-a="lr-next"]')
    check("3 / 5" in a.text("#lrsheet .lrcount") and a.count('#lrsheet .pktog.on') == 3 and "Sorts de serment" in a.text("#lrsheet"), f"préparation : 3/5 (CHA 3 + moitié du niveau), serment hors limite ({a.text('#lrsheet .lrcount')})")
    check(a.g("hp") == 20, "le repos n'est pas encore appliqué")
    a.click('#lrsheet .pktog[data-id="bless"]'); a.click('#lrsheet .pktog[data-id="heroism"]')
    check("5 / 5" in a.text("#lrsheet .lrcount") and a.count('#lrsheet .pktog.full') > 0, "limite atteinte : les autres sorts grisés")
    a.pg.evaluate("document.querySelector('#lrsheet .pktog.full').click()"); a.pg.wait_for_timeout(50)
    check("Limite atteinte" in a.toast() and "5 / 5" in a.text("#lrsheet .lrcount"), "au-delà de la limite : expliqué")
    a.pg.fill("#lr-q", "bénédiction")
    check(a.count("#lrsheet .pkrow") == 1, "recherche")
    a.click('#lrsheet .lufoot [data-a="lr-done"]')
    check(a.pg.is_hidden("#lrsheet") and a.g("hp") is None and a.g("hdU") == 1 and a.js("JSON.stringify(G().used)") == "{}" and "bless" in a.g("prepared"), "terminé : repos appliqué et Bénédiction préparée")
    a.undo()
    check(a.g("hp") == 20 and "bless" not in a.g("prepared"), "Annuler le repos long : tout revient")
    a.close()


def test_garder_comme_hier_et_hors_repos(browser, devices, url):
    a = App(browser, devices, url, char=dict(KAEL, used={"1": 1}), view="gerer")
    check(a.count('#panel .lrentry [data-a="prep-open"]') == 1 and "3 / 5" in a.text("#panel .lrentry"), "Gérer : Préparer les sorts au-dessus de la liste")
    a.click('[data-a="prep-open"]')
    check(a.count("#lrsheet .lusteps") == 0 and "Préparation des sorts" in a.text("#lrsheet h2"), "préparation seule, sans étapes")
    a.click('#lrsheet .pktog[data-id="bless"]'); a.click('#lrsheet .lufoot [data-a="lr-done"]')
    check("bless" in a.g("prepared") and a.js("JSON.stringify(G().used)") == '{"1":1}', "hors repos : préparation changée, emplacements intacts")
    a.view("jeu")
    a.click('[data-a="longrest"]'); a.click('#lrsheet [data-a="lr-next"]'); a.click('#lrsheet [data-a="lr-keep"]')
    check(a.pg.is_hidden("#lrsheet") and "bless" in a.g("prepared") and a.js("JSON.stringify(G().used)") == "{}", "Garder comme hier : repos appliqué, préparation inchangée")
    a.close()


def test_martial_une_etape(browser, devices, url):
    a = App(browser, devices, url, char=dict(GARAL, rageU=2), tab="perso", view="jeu")
    a.click('[data-a="longrest"]')
    check(a.count("#lrsheet .lusteps") == 0 and a.count('#lrsheet .lufoot [data-a="lr-done"]') == 1 and "Rage" in a.text("#lrsheet"), "barbare : un écran, Rage récupérée")
    a.click('#lrsheet .lufoot [data-a="lr-done"]')
    check(a.g("rageU") == 0, "Rage récupérée")
    a.close()


def test_divination_presage(browser, devices, url):
    a = App(browser, devices, url, char=dict(NEMEIA, school="Divination", portent=[5, 12]), view="jeu")
    a.click('[data-a="longrest"]')
    check(a.texts("#lrsheet .lusteps div") == ["1 · Récupérer", "2 · Préparer", "3 · Présage"], "trois étapes")
    a.click('#lrsheet [data-a="lr-next"]'); a.click('#lrsheet [data-a="lr-next"]')
    check(a.g("portent.length") == 0 and a.count("#lrsheet #portent-0") == 1 and a.count('#lrsheet [data-a="lr-back"]') == 0, "repos appliqué : anciens résultats perdus, pas de retour")
    a.pg.fill("#portent-0", "17"); a.pg.wait_for_timeout(80); a.pg.fill("#portent-1", "13"); a.pg.wait_for_timeout(80)
    check(a.g("portent.join()") == "17,13", f"Présage noté : {a.g('portent.join()')}")
    a.click('#lrsheet .lufoot [data-a="lr-done"]')
    check(a.pg.is_hidden("#lrsheet") and a.count('[data-a="portent-use"]') >= 2, "résultats prêts dans les ressources de l'école")
    a.close()
