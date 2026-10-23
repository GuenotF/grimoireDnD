"""Barbare : classe sans sorts (onglets, en-tête, barre du bas), Rage, Frénésie, Attaque téméraire, Défense sans armure, épuisement."""
from helpers import App, check

GARAL = {"name": "Garal Ulcer", "cls": "barbare", "level": 4, "v": 3, "voie": "berserker",
         "abil": {"str": 16, "dex": 12, "con": 16, "int": 8, "wis": 10, "cha": 10}, "hpMax": 45,
         "skills": {"athletics": 1, "intimidation": 1, "survival": 1},
         "items": [{"n": "Hache à deux mains", "q": 1, "eq": True, "ref": "greataxe"}, {"n": "Hachette", "q": 2, "eq": True, "ref": "handaxe"},
                   {"n": "Armure de peaux", "q": 1, "eq": False, "ref": "hide"}]}


def test_classe_sans_sorts(browser, devices, url):
    a = App(browser, devices, url, char=GARAL, view="jeu")
    check(a.js("S.tab") == "caps" and a.texts(".tabs > .tab") == ["Personnage", "Capacités"], f"onglets : {a.texts('.tabs > .tab')}")
    a.click('[data-a="more"]')
    check(a.texts(".moremenu button") == ["Règles", "Imprimer", "Sauvegarde"], "menu Plus")
    a.pg.keyboard.press("Escape")
    check(a.text(".statcap") == "Barbare" and "3/3" in a.texts(".stats .v")[0] and a.texts(".stats .v")[2] == "14", f"en-tête : {a.texts('.stats .v')}")
    check("sorts" not in a.text(".subline"), "pas de « sorts jusqu'au niveau »")
    check(a.count("#slotbar:not([hidden]) .chip.hp") == 1, "barre du bas avec les PV, sans emplacements")
    check(a.count(".atk") == 3, "attaques dans l'onglet Capacités (hache, hachette, mains nues)")
    a.view("gerer")
    check(a.count('[data-a="rage-start"]') == 0 and a.count(".atk") == 0 and a.count('[data-a="short-open"]') == 0, "Gérer : ni Rage, ni attaques, ni repos (réglages seulement)")
    a.view("jeu")
    a.tab("perso")
    check(a.count(".atk") == 0 and a.texts(".chstat .v")[0] == "14", "pas d'attaques dans Personnage ; CA : Défense sans armure 10 + 1 + 3")
    for t in ["regles", "imprimer"]:
        a.tab(t)
    a.close()


def test_rage_frenesie(browser, devices, url):
    a = App(browser, devices, url, char=GARAL, view="jeu")
    a.pg.check('[data-a="rage-frenzy"]'); a.click('[data-a="rage-start"]')
    check(a.g("raging") and a.g("frenzy") and a.g("rageU") == 1 and a.count(".ragecard.on") == 1, "en rage, avec Frénésie")
    check("🔥 Rage" in a.text("#slotbar .chip.fire"), "puce Rage dans la barre du bas")
    atk = a.texts(".atk .ah")
    check(atk[0] == "Hache à deux mains +5 1d12 + 5 tranchant" and "Frénésie" in atk[1], f"rage +2 et attaque de Frénésie : {atk}")
    check("lancée : sans bonus de rage" in a.text(".atk:nth-child(3)") or "lancée : sans bonus de rage" in a.text(".atkbox"), "hachette lancée : pas de bonus")
    a.pg.check('[data-a="opt-reckless"]'); a.pg.wait_for_timeout(50)
    check("avantage (téméraire)" in a.text(".atkbox") and "contre toi" in a.text(".atkopts"), "Attaque téméraire")
    a.tab("perso")
    a.pg.fill("#hp-n", "13"); a.click('[data-a="hp-dmg"][data-half="1"]')
    check(a.g("hp") == 39, "résistance de la rage : 13 → 6 dégâts")
    a.tab("caps"); a.click('[data-a="rage-end"]')
    check(not a.g("raging") and a.g("exh") == 1 and "épuisement 1" in a.toast(), "fin de rage avec Frénésie : épuisement")
    a.tab("perso")
    check("Épuisement 1" in a.text(".hpexh"), "épuisement affiché dans la carte des PV")
    a.tab("caps"); a.click('[data-a="longrest"]')
    check(a.g("rageU") == 0 and a.g("exh") == 0 and a.g("hp") is None, "repos long : rages, épuisement, PV")
    a.close()


def test_rage_prend_fin_a_0_pv_et_niveau_5(browser, devices, url):
    a = App(browser, devices, url, char=dict(GARAL, raging=True, frenzy=True), tab="perso", view="jeu")
    a.pg.fill("#hp-n", "50"); a.click('[data-a="hp-dmg"]')
    check(a.g("hp") == 0 and not a.g("raging") and a.g("exh") == 1 and "fin de la rage" in a.toast(), "à 0 PV la rage prend fin")
    a.close()
    b = App(browser, devices, url, char=GARAL, view="jeu")
    b.click(".lvup")
    check("Rages" in b.text(".lutab") and "Bonus de maîtrise" in b.text(".lutab") and "DD des sorts" not in b.text(".lutab"), "assistant sans sorts")
    b.click(".lufoot .primary"); b.click(".lufoot .primary"); b.click('[data-a="lu-go"]')
    check(b.g("level") == 5 and "12 m" in b.texts(".stats .v")[3] and "Attaque supplémentaire" in b.text(".atknotes"), "niveau 5 : Déplacement rapide, Attaque supplémentaire")
    b.close()


def test_maitre_d_armes_lourdes(browser, devices, url):
    a = App(browser, devices, url, char=dict(GARAL, raging=True, traits=[{"n": "Maître d'armes lourdes", "o": "don", "d": "", "feat": "gwm"}]), view="jeu")
    a.pg.check('[data-a="opt-feat"][data-v="gwm"]'); a.pg.wait_for_timeout(50)
    atk = a.texts(".atk .ah")
    check(atk[0] == "Hache à deux mains +0 1d12 + 15 tranchant" and atk[1].startswith("Hachette ×2 +5 1d6 + 5"), f"MAL sur l'arme lourde seulement : {atk}")
    check("Maître d'armes lourdes" in a.text(".atknotes"), "rappel de l'attaque bonus")
    a.close()
