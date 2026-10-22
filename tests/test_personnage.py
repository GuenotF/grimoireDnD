"""Onglet Personnage : navigation (menu Plus), caractéristiques, combat, jets de sauvegarde, migration."""
from helpers import App, check, KAEL, MALFAEL


def test_navigation_menu_plus(browser, devices, url):
    a = App(browser, devices, url, char=MALFAEL)
    check(a.texts(".tabs > .tab") == ["Personnage", "Sorts", "Bibliothèque", "Bestiaire"], f"rangée principale : {a.texts('.tabs > .tab')}")
    check(a.count(".tab.play") == 2, "Personnage et Sorts mis en avant")
    a.click('[data-a="more"]')
    check(a.texts(".moremenu button") == ["Règles", "Imprimer", "Sauvegarde"], "menu Plus")
    a.pg.keyboard.press("Escape"); a.pg.wait_for_timeout(50)
    check(a.count(".moremenu") == 0, "Échap referme le menu")
    a.tab("regles")
    check(a.count(".moremenu") == 0 and a.pg.get_attribute('[data-a="more"]', "aria-selected") == "true", "Plus marqué quand un de ses onglets est affiché")
    a.click('[data-a="more"]'); a.click(".moreback")
    check(a.count(".moremenu") == 0, "toucher à côté referme le menu")
    a.close()


def test_creation_puis_fiche(browser, devices, url):
    a = App(browser, devices, url)
    a.new_character("druide", "Malfaël Clanchombre", 4)
    check(a.js("S.tab") == "perso" and a.js("S.view") == "gerer", "un nouveau personnage s'ouvre sur sa fiche, en Gérer")
    check(a.count(".chtodo") == 1 and a.count(".tab .todo") == 1, "fiche à compléter signalée")
    for k, v in [("str", 10), ("dex", 14), ("con", 14), ("int", 12), ("wis", 16), ("cha", 8)]:
        a.pg.fill(f"#ab-{k}", str(v)); a.pg.press(f"#ab-{k}", "Tab"); a.pg.wait_for_timeout(40)
    check(a.js("JSON.stringify(G().abil)") == '{"str":10,"dex":14,"con":14,"int":12,"wis":16,"cha":8}', "caractéristiques enregistrées")
    check(a.texts(".abcell .abm") == ["+0", "+2", "+2", "+1", "+3", "−1"], f"modificateurs : {a.texts('.abcell .abm')}")
    check("13" in a.texts(".stats .stat .v")[1], "le DD des sorts lit la Sagesse de la fiche")
    a.pg.fill("#ab-wis", "17"); a.pg.press("#ab-wis", "Tab"); a.pg.wait_for_timeout(40)
    check(a.pg.evaluate("document.activeElement.id") == "ab-cha", "Tab passe au champ suivant malgré l'enregistrement")
    a.pg.fill("#ab-wis", "16"); a.pg.press("#ab-wis", "Tab"); a.pg.wait_for_timeout(40)
    check("moyenne 31" in a.text(".chrow:nth-child(4) .hint"), "PV moyens : d8, niveau 4, CON +2")
    a.pg.fill("#f-ac", "14"); a.pg.press("#f-ac", "Tab"); a.pg.wait_for_timeout(40)
    a.pg.fill("#f-hpmax", "31"); a.pg.press("#f-hpmax", "Tab"); a.pg.wait_for_timeout(40)
    check(a.count(".chtodo") == 0 and a.count(".tab .todo") == 0, "fiche complète")
    a.pg.fill("#f-init", "+4"); a.pg.press("#f-init", "Tab"); a.pg.wait_for_timeout(40)
    check(a.g("initX") == 2, "bonus d'initiative en plus de DEX")
    a.pg.fill("#ab-dex", "10"); a.pg.press("#ab-dex", "Tab"); a.pg.wait_for_timeout(40)
    check(a.pg.input_value("#f-init") == "+2", "l'initiative suit la Dextérité")
    a.pg.fill("#f-speed", "10.5"); a.pg.press("#f-speed", "Tab"); a.pg.wait_for_timeout(40)
    check(a.g("speed") == 10.5, "vitesse en mètres")
    check(a.count(".sv.lock") == 2 and a.texts(".sv.lock .n") == ["Intelligence", "Sagesse"], "sauvegardes du druide fixes")
    a.click('[data-a="save-tog"][data-v="con"]')
    check(a.g("saveX.join()") == "con" and "+4" in a.text('[data-a="save-tog"][data-v="con"]'), "maîtrise ajoutée en Constitution")
    a.view("jeu")
    check(a.texts(".chstat .v") == ["14", "31", "+2", "10,5 m", "+2"], f"En jeu : {a.texts('.chstat .v')}")
    check(a.texts(".abtile .js.on") == ["JdS +4", "JdS +3", "JdS +5"], f"JdS maîtrisés : {a.texts('.abtile .js.on')}")
    a.close()


def test_migration_v2(browser, devices, url):
    a = App(browser, devices, url, char=dict(KAEL, v=2, int=16, wis=16))
    check(a.g("v") == 3 and a.js("JSON.stringify(G().abil)") == '{"str":10,"dex":10,"con":10,"int":10,"wis":10,"cha":16}', "seul le Charisme du paladin est repris")
    check(a.js("R.am(G())") == 3, "modificateur d'incantation")
    a.tab("perso")
    check(a.count(".chtodo") == 1, "fiche à compléter")
    check(a.texts(".sv.lock .n") == ["Sagesse", "Charisme"], "sauvegardes du paladin")
    a.close()
