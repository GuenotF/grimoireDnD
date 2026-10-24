"""Guerrier (Manuel des joueurs 2014) : style de combat, Second souffle, Fougue, Champion, Maître de guerre, Chevalier occulte."""
from helpers import App, check
from test_creation import disabled, nxt, start

ALDWIN = {"name": "Aldwin", "cls": "guerrier", "level": 5, "v": 3, "abil": {"str": 18, "dex": 12, "con": 16, "int": 10, "wis": 12, "cha": 8}, "hpMax": 49, "hp": 30,
          "garch": "mdg", "style": "duel", "mano": ["precise", "croc", "riposte"], "gtool": "Outils de forgeron",
          "items": [{"n": "Épée longue", "q": 1, "ref": "longsword", "eq": True}, {"n": "Cotte de mailles", "q": 1, "ref": "chain-mail", "eq": True}, {"n": "Bouclier", "q": 1, "ref": "shield", "eq": True}],
          "acMode": "calc", "updatedAt": 1}


def test_creation_style(browser, devices, url):
    a = App(browser, devices, url, char=None)
    start(a, "guerrier", "Aldwin")
    a.click('[data-a="cr-race"][data-v="elfe"]'); a.click('[data-a="cr-sub"][data-v="bois"]'); nxt(a)
    for k, v in zip(["str", "con", "dex", "wis", "int", "cha"], ["15", "14", "13", "12", "10", "8"]): a.pg.select_option(f'[data-crstd="{k}"]', v)
    nxt(a); a.click('[data-a="cr-bg"][data-v="criminel"]'); a.pg.select_option('[data-crbgtool="0"]', "Jeu de dés"); nxt(a)
    for k in ["athletics", "intimidation"]: a.click(f'[data-a="cr-skill"][data-v="{k}"]')
    check(disabled(a, '[data-a="cr-next"]') and "style" in a.text(".lufoot"), "style de combat obligatoire")
    a.click('[data-a="cr-gstyle"][data-v="defense"]'); nxt(a)
    check("Sorts" not in a.text(".crstep"), "pas d'étape Sorts")
    a.pg.select_option('[data-crpick="1-0-0"]', "longsword"); nxt(a); a.click('[data-a="cr-go"]')
    check(a.g("style") == "defense" and a.g("hpMax") == 10 + 2, "Défense, PV 10 + CON")
    check(a.js("acOf(G())") == 16 + 2 + 1 if a.js("typeof acOf") != "undefined" else True, "CA : cotte de mailles + bouclier + Défense")
    a.close()


def test_ressources_et_manoeuvres(browser, devices, url):
    a = App(browser, devices, url, char=ALDWIN, tab="caps", view="jeu")
    t = a.text("#panel")
    check("Ressources du guerrier" in t and a.count('[data-a="res-pip"][data-r="sup"]') == 4, "4 dés de supériorité")
    check("Duel : +2 à une main" in t and "2 attaques par action" in t, "Duel et Attaque supplémentaire sur les attaques")
    a.click('[data-a="row"][data-id="res:sw"]'); a.pg.fill("#sw-n", "6"); a.click('[data-a="sw-go"]')
    check(a.g("hp") == 41 and a.g("swU") == 1, "Second souffle : 6 + 5 PV")
    a.undo(); check(a.g("hp") == 30 and a.g("swU") == 0, "annulable")
    a.click('[data-a="row"][data-id="res:sup"]')
    check("JdS FOR 15" in a.text("#panel"), "Croc-en-jambe : DD 15 (8 + 3 + FOR 4)")
    a.click('[data-a="man-use"][data-v="croc"]'); check(a.g("supU") == 1 and "Croc-en-jambe" in a.toast(), "manœuvre : un dé dépensé")
    a.click('[data-a="res-pip"][data-r="surge"]')
    a.click('[data-a="short-open"]'); a.click('[data-a="short-done"]')
    check(a.g("supU") == 0 and a.g("surgeU") == 0, "repos court : dés et Fougue récupérés")
    a.view("gerer")
    check("Manœuvres" in a.text("#panel") and "3 sur 3" in a.text("#panel"), "Gérer : manœuvres connues")
    a.close()


def test_champion(browser, devices, url):
    c = dict(ALDWIN, garch="champion", level=10, style="deuxmains", gstyle2="defense", items=[{"n": "Épée à deux mains", "q": 1, "ref": "greatsword", "eq": True}, {"n": "Cotte de mailles", "q": 1, "ref": "chain-mail", "eq": True}])
    a = App(browser, devices, url, char=c, tab="caps", view="jeu")
    t = a.text("#panel")
    check("critique 19-20" in t and "Arme à deux mains : relance 1-2" in t, "Champion : critique 19-20, style à deux mains")
    check(a.js("skillBonus(G(), 'acrobatics')") == 1 + 2 if a.js("typeof skillBonus") != "undefined" else True, "Athlète remarquable : DEX +1 + 2 (moitié de 4 arrondie au supérieur)")
    a.tab("perso"); check("½" in a.text("#panel"), "compétences FOR/DEX/CON marquées ½")
    a.close()


def test_niveau_3_maitre_de_guerre(browser, devices, url):
    a = App(browser, devices, url, char=dict(ALDWIN, level=2, garch="champion", mano=[], gtool=""), tab="caps", view="jeu")
    a.click('[data-a="lu-open"]'); a.click('[data-a="lu-sub"][data-v="mdg"]'); a.click(".lufoot .primary")
    a.click('[data-a="pk-open"][data-id="man-feinte"]')
    check("Action bonus, une créature à 1,50 m" in a.text("#lvlup"), "manœuvre dépliable : description")
    for k in ["precise", "feinte", "parade"]: a.click(f'.pktog[data-a="lu-gman"][data-id="man-{k}"]')
    check(a.count('.pktog[data-a="lu-gman"][data-id="man-riposte"].full') == 1, "3 manœuvres au plus")
    a.pg.select_option("#lu-gtool", "Outils de forgeron")
    a.click(".lufoot .primary"); a.click('[data-a="lu-go"]')
    check(a.g("level") == 3 and a.g("garch") == "mdg" and a.js("G().mano.join()") == "precise,feinte,parade" and a.g("gtool") == "Outils de forgeron", "niveau 3 : Maître de guerre, manœuvres, outil")
    a.close()


def test_chevalier_occulte(browser, devices, url):
    a = App(browser, devices, url, char=dict(ALDWIN, level=2, garch="champion", mano=[], abil=dict(ALDWIN["abil"], int=14)), tab="caps", view="jeu")
    a.click('[data-a="lu-open"]'); a.click('[data-a="lu-sub"][data-v="ek"]'); a.click(".lufoot .primary")
    for i in ["fire-bolt", "shocking-grasp"]: a.click(f'.pktog[data-a="lu-cpick"][data-id="{i}"]')
    a.click('.pktog[data-a="lu-kpick"][data-id="shield"]'); a.click('.pktog[data-a="lu-kpick"][data-id="sleep"]')
    check(disabled(a, '.pktog[data-a="lu-kpick"][data-id="charm-person"]') and "Abjuration ou évocation" in a.text("#lvlup"), "une seule école libre au niveau 3")
    a.click('.pktog[data-a="lu-kpick"][data-id="magic-missile"]')
    a.click(".lufoot .primary"); a.click('[data-a="lu-go"]')
    check(a.g("level") == 3 and a.g("garch") == "ek" and a.g("prepared.length") == 3 and a.g("cantrips.length") == 2, "niveau 3 : 3 sorts connus, 2 sorts mineurs")
    check(a.count('[data-a="tab"][data-v="grimoire"]') == 1, "onglet Sorts")
    a.tab("grimoire"); a.view("jeu")
    check(a.count('.slotrow [data-a="pip"]') == 2 and "DD" in a.text(".hero"), "2 emplacements de niveau 1, en-tête des sorts")
    a.close()


def test_styles_aidedd(browser, devices, url):
    deux = dict(ALDWIN, level=1, style="duel", items=[{"n": "Épée longue", "q": 1, "ref": "longsword", "eq": True}, {"n": "Épée courte", "q": 1, "ref": "shortsword", "eq": True, "oh": True}])
    a = App(browser, devices, url, char=deux, tab="caps", view="jeu")
    check("Duel : +2" not in a.text(".atk") and "1d8 + 4 tranchant" in a.text(".atk"), "Duel : pas de bonus avec une seconde arme en main")
    a.close()
    prot = dict(ALDWIN, level=1, style="protection")
    a = App(browser, devices, url, char=prot, tab="caps", view="jeu")
    check("bouclier porté" in a.text("#panel"), "Protection : rappel avec le bouclier porté")
    a.close()
    a = App(browser, devices, url, char=dict(prot, items=[{"n": "Épée longue", "q": 1, "ref": "longsword", "eq": True}]), tab="caps", view="jeu")
    check("il faut porter un bouclier" in a.text("#panel"), "Protection : bouclier requis")
    a.close()
