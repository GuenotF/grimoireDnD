"""Roublard : Attaque sournoise, main secondaire, Ruse, Esquive instinctive, Assassin, Esprit fuyant, niveaux d'amélioration."""
from helpers import App, check

OMBRE = {"name": "Ombre-Poigne", "cls": "roublard", "level": 4, "v": 3, "arch": "assassin",
         "abil": {"str": 10, "dex": 16, "con": 12, "int": 12, "wis": 14, "cha": 10}, "hpMax": 28, "initX": 5,
         "skills": {"stealth": 2, "sleight": 2, "acrobatics": 1, "perception": 1, "deception": 1, "insight": 1},
         "items": [{"n": "Dague de cultiste", "q": 1, "eq": True, "ref": "dagger", "note": "+1d4 nécrotique"}, {"n": "Dague", "q": 1, "eq": True, "ref": "dagger"},
                   {"n": "Fronde", "q": 1, "eq": True, "ref": "sling"}, {"n": "Cuir", "q": 1, "eq": True, "ref": "leather"}]}


def test_capacites_et_attaques(browser, devices, url):
    a = App(browser, devices, url, char=OMBRE, view="jeu")
    check(a.texts(".stats .v")[:5] == ["2d6", "+8", "14", "+7", "14"], f"en-tête : {a.texts('.stats .v')}")
    atk = a.texts(".atk .ah")
    check(atk[0] == "Dague de cultiste +5 1d4 + 3 perforant" and atk[2] == "Dague (main secondaire) +5 1d4 perforant" and atk[3].startswith("Fronde +5 1d4 + 3"), f"attaques : {atk}")
    check(a.text(".atkbox").count("sournoise +2d6") == 4 and atk[4] == "Mains nues +2 1 contondant", "sournoise sur les armes de finesse et à distance, pas à mains nues")
    a.pg.check('[data-a="sneak-used"]'); a.pg.wait_for_timeout(50)
    check("sournoise déjà utilisée" in a.text(".atkbox") and "+2d6" not in a.text(".atk .ap"), "case « Utilisée ce tour »")
    check("Se cacher" in a.text("#panel") and "Assassinat" in a.text(".atknotes"), "Ruse et Assassinat")
    a.tab("perso")
    check(a.count('[data-a="hp-dmg"][data-half]') == 0, "pas d'Esquive instinctive avant le niveau 5")
    a.close()


def test_niveaux_roublard(browser, devices, url):
    a = App(browser, devices, url, char=dict(OMBRE, level=9), view="jeu")
    a.click(".lvup")
    check(a.count('[data-a="lu-asi"]') == 6 and "5d6" in a.text(".lutab"), "amélioration au niveau 10, sournoise 5d6")
    a.close()
    b = App(browser, devices, url, char=dict(OMBRE, level=15), tab="perso", view="jeu")
    check(b.count('[data-a="hp-dmg"][data-half]') == 1 and "JdS +7" in b.texts(".stats .js.on")[-1], "Esquive instinctive ; Esprit fuyant : JdS SAG maîtrisé")
    b.close()
