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
    b.click('[data-a="ab-open"][data-v="wis"]')
    check(b.count('[data-a="hp-dmg"][data-half]') == 1 and b.texts("#absheet .abrow")[0].endswith("+7") and "maîtrisé" in b.texts("#absheet .abrow")[0], "Esquive instinctive ; Esprit fuyant : JdS SAG maîtrisé")
    b.close()


def test_outils_langues_et_vigilant(browser, devices, url):
    a = App(browser, devices, url, char=OMBRE, tab="perso", view="gerer")
    check(a.texts(".tlrow .n") == ["Outils de voleur", "Kit de déguisement", "Matériel d'empoisonneur"], f"outils de la classe et de l'Assassin : {a.texts('.tlrow .n')}")
    a.click('[data-a="tool"][data-v="Outils de voleur"]')
    check(a.g("tools['Outils de voleur']") == 2 and "DEX +7" in a.text('[data-a="tool"][data-v="Outils de voleur"]'), "outils de voleur en expertise : DEX 3 + 4")
    a.pg.fill("#tool-new", "Jeu de dés"); a.pg.press("#tool-new", "Enter"); a.pg.wait_for_timeout(60)
    a.pg.fill("#lang-new", "Halfelin"); a.pg.press("#lang-new", "Enter"); a.pg.wait_for_timeout(60)
    check(a.g("tools['Jeu de dés']") == 1 and a.g("langs.join()") == "Halfelin" and "Jargon des voleurs" in a.text(".tlbox"), "outil et langue ajoutés, Jargon des voleurs d'office")
    check(a.pg.input_value("#f-init") == "+8", "initiative saisie : +8 (DEX +3, bonus +5)")
    a.click('[data-a="trait-feat"]'); a.pg.fill("#fp-q", "vigil"); a.pg.wait_for_timeout(60); a.click('[data-a="fp-sel"][data-v="alert"]'); a.click('[data-a="fp-add"]')
    check(a.g("traits[0].feat") == "alert" and a.g("traits[0].n") == "Vigilant" and a.g("initX") == 0 and a.pg.input_value("#f-init") == "+8", "Vigilant relié : le +5 passe du bonus divers au don, initiative inchangée")
    a.view("jeu")
    check("Outils de voleur" in a.text(".tljeu") and "expertise" in a.text(".tljeu"), "outils en jeu")
    a.close()


def test_main_secondaire_au_choix(browser, devices, url):
    a = App(browser, devices, url, char=OMBRE, tab="perso", view="gerer")
    a.click('[data-a="it-edit"][data-i="0"]')
    check(a.count("#it-oh") == 1, "case Main secondaire sur une dague")
    a.pg.check("#it-oh"); a.click('.itform [type="submit"]')
    check(a.g("items[0].oh") and "main secondaire" in a.text(".itbox"), "Dague de cultiste en main secondaire")
    a.click('[data-a="it-edit"][data-i="1"]'); a.pg.check("#it-oh"); a.click('.itform [type="submit"]')
    check(a.g("items[1].oh") and not a.g("items[0].oh"), "une seule arme en main secondaire")
    a.click('[data-a="it-edit"][data-i="0"]'); a.pg.check("#it-oh"); a.click('.itform [type="submit"]')
    a.view("jeu"); a.tab("caps")
    check(any(t.startswith("Dague de cultiste (main secondaire)") for t in a.texts(".atk .ah")), f"attaque bonus avec l'arme choisie : {a.texts('.atk .ah')}")
    a.tab("perso")
    a.click('[data-a="it-open"][data-i="2"]')
    check("Munitions (portée 9 m/36 m)" in a.text(".itdet") and "1 pa" in a.text(".itdet"), "En jeu : arme dépliée avec ses propriétés")
    a.view("gerer"); a.click('[data-a="it-open"][data-i="3"]')
    check("11 + DEX" in a.text(".itdet") and "maîtrisée" in a.text(".itdet"), "Gérer : armure dépliée")
    a.close()


def test_escroc_arcanique(browser, devices, url):
    from test_creation import disabled
    a = App(browser, devices, url, char=dict(OMBRE, level=2, arch="assassin"), tab="caps", view="jeu")
    a.click('[data-a="lu-open"]'); a.click('[data-a="lu-sub"][data-v="escroc"]'); a.click(".lufoot .primary")
    check("Main de mage" in a.text("#lvlup") and "offert" in a.text("#lvlup"), "main de mage offerte")
    for i in ["minor-illusion", "fire-bolt"]: a.click(f'.pktog[data-a="lu-cpick"][data-id="{i}"]')
    check(a.count('.pktog[data-a="lu-cpick"][data-id="light"].full') == 1, "2 sorts mineurs à choisir en plus")
    a.click('.pktog[data-a="lu-kpick"][data-id="sleep"]'); a.click('.pktog[data-a="lu-kpick"][data-id="magic-missile"]')
    check(disabled(a, '.pktog[data-a="lu-kpick"][data-id="shield"]') and "Enchantement ou Illusion" in a.text("#lvlup"), "une seule école libre au niveau 3")
    a.click('.pktog[data-a="lu-kpick"][data-id="charm-person"]')
    a.click(".lufoot .primary"); a.click('[data-a="lu-go"]')
    check(a.g("level") == 3 and a.g("arch") == "escroc" and a.g("prepared.length") == 3 and a.js("G().cantrips.join()") == "mage-hand,minor-illusion,fire-bolt", "niveau 3 : 3 sorts connus, main de mage + 2 sorts mineurs")
    check(a.count('[data-a="tab"][data-v="grimoire"]') == 1, "onglet Sorts")
    a.tab("grimoire"); a.view("jeu")
    check(a.count('.slotrow [data-a="pip"]') == 2 and "DD" in a.text(".hero"), "2 emplacements, en-tête des sorts")
    a.close()
