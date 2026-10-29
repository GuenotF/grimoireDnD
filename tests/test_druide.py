"""Druide : sorts mineurs, préparation, rituels, ressources, bibliothèque, Bestiaire, passage de niveau."""
from helpers import App, check, MALFAEL


def test_fiche_et_preparation(browser, devices, url):
    a = App(browser, devices, url)
    a.new_character("druide", "Malfaël Clanchombre", 4)
    check("Druide niveau 4 · Cercle de la Lune" in a.text(".subline"), "sous-titre")
    check(a.js("R.slots(G()).join()") == "4,3", "emplacements du niveau 4")
    a.pg.fill("#ab-wis", "16"); a.pg.press("#ab-wis", "Tab"); a.pg.wait_for_timeout(60)
    a.tab("grimoire")
    for sid in ["entangle", "cure-wounds", "fog-cloud", "speak-with-animals", "moonbeam", "lesser-restoration", "healing-word"]:
        a.pg.check(f'.gprep[data-id="{sid}"]'); a.pg.wait_for_timeout(20)
    check(a.g("prepared.length") == 7 and a.count(".gprep.full") > 0, "7 sorts préparés (SAG +3, niveau 4)")
    a.close()


def test_rituel_et_sort_mineur_de_concentration(browser, devices, url):
    a = App(browser, devices, url, char=MALFAEL, view="jeu")
    a.click('[data-a="row"][data-id="speak-with-animals"]')
    check(a.count('.jbody [data-a="cast-rit"]') == 1, "rituel préparé lançable")
    a.click('.jline [data-a="cast"][data-id="create-bonfire"]')
    check(a.js("JSON.stringify(G().used)") == "{}" and "Embrasement" in a.text("#topbar .chip.conc"), "Embrasement : concentration sans emplacement")
    a.click('.jline [data-a="cast"][data-id="moonbeam"]')
    check(a.count(".concwarn") == 1, "Rayon de lune remplacerait Embrasement")
    a.close()


def test_bibliotheque_druide(browser, devices, url):
    a = App(browser, devices, url, char=MALFAEL, tab="biblio")
    check("111 sorts" in a.text(".found"), a.text(".found"))
    check(not a.js("inClass(G(), BY_ID['silence'] || {cl: []})"), "Silence n'est pas un sort de druide")
    a.close()


def test_bestiaire(browser, devices, url):
    a = App(browser, devices, url, char=MALFAEL, tab="bestiaire")
    check("82 bêtes · 55 formes accessibles au niveau 4" in a.text(".found"), a.text(".found"))
    check(a.count('[data-a="ws-fav"][data-id="aigle"]') == 0, "pas de favori sur une forme inaccessible (vol)")
    a.click('[data-a="ws-fav"][data-id="ours-brun"]')
    check(a.g("favs.join()") == "ours-brun", "favori ajouté")
    a.pg.fill("#b-q", "encre"); a.pg.wait_for_timeout(100)
    check(a.count("#panel .bcard") == 2, "recherche : fiches dépliées")
    a.pg.fill("#b-q", ""); a.pg.wait_for_timeout(50)
    a.pg.check('[data-a="btog"][data-v="reach"]'); a.pg.wait_for_timeout(50)
    check(a.text(".found").startswith("55 bêtes"), "filtre Accessibles")
    a.close()


def test_passage_de_niveau_nouvelles_formes(browser, devices, url):
    a = App(browser, devices, url, char=dict(MALFAEL, level=5))
    a.click(".lvup")
    check("7 bêtes de plus" in a.text(".lubody"), "niveau 6 : 7 formes de FP 2")
    a.click(".lufoot .primary")
    a.click('[data-a="lu-wsfav"][data-id="ours-polaire"]')
    a.click(".lufoot .primary")
    check("Ours polaire" in a.text(".luadd"), "récapitulatif")
    a.click('[data-a="lu-go"]')
    check(a.g("level") == 6 and a.g("favs.includes('ours-polaire')"), "favori ajouté à la validation")
    a.undo(); check(a.g("level") == 5 and a.g("favs.length") == 0, "annulé")
    a.close()


def test_onglet_regles(browser, devices, url):
    a = App(browser, devices, url, char=MALFAEL, tab="regles")
    t = a.text("#panel")
    for s in ["7 sorts", "3 sorts mineurs", "DD de 13", "2 fois", "2 h", "FP 1", "Constitution de la bête", "Changeforme de combat"]:
        check(s in t, f"règles du druide : « {s} »")
    a.close()
