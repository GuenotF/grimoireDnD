"""Équipement : bourse (gains, dépenses, monnaie), objets (ajout, équipé, à décompter, retrait)."""
from helpers import App, check, MALFAEL

FICHE = {"abil": {"str": 10, "dex": 14, "con": 14, "int": 12, "wis": 16, "cha": 8}, "ac": 14, "hpMax": 31, "v": 3}


def money(a, n, coin, act):
    a.pg.fill("#m-n", str(n)); a.click(f'[data-a="m-coin"][data-v="{coin}"]'); a.click(f'[data-a="{act}"]')


def test_bourse(browser, devices, url):
    a = App(browser, devices, url, char=dict(MALFAEL, **FICHE, money={"po": 2, "pa": 3}), tab="perso", view="jeu")
    check("0 objet" in a.text('[data-k="ch-eqj"]') and a.count(".purse") == 1, "nombre d'objets à côté du titre, bourse affichée")
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
    check(a.texts(".it.j .itn > span")[0] == "▸ Bâton" and a.count(".it.eq") == 1, "objet équipé en tête, en gras")
    check(a.count('[data-a="it-dec"]') == 0 and "×7" in a.text(".itbox") and "onglet Sorts" in a.text(".itbox"), "Personnage en jeu : inventaire en lecture, renvoi vers Sorts")
    a.tab("grimoire")
    check(a.texts('[data-k="act-it"] ~ .itbox .itn > span') == ["Rations"], "onglet Sorts : section Objets, objets à décompter seulement")
    a.click('[data-a="it-dec"][data-i="1"]')
    check(a.g("items[1].q") == 6, "une ration de moins")
    a.tab("perso"); a.view("gerer"); a.click('[data-a="it-edit"][data-i="2"]'); a.click('[data-a="it-del"][data-i="2"]')
    check(a.g("items.length") == 2, "objet retiré"); a.undo()
    check(a.g("items.length") == 3 and a.g("items[2].n") == "Potion de soins", "retrait annulé")
    a.close()


def test_donnees_armes_et_armures(browser, devices, url):
    """data/equipment.json (outils/equipement_xlsx.py) : catalogue complet du Manuel des joueurs."""
    import json, pathlib
    d = json.load(open(pathlib.Path(__file__).parent.parent / "data" / "equipment.json", encoding="utf-8"))
    W = {w["id"]: w for w in d["weapons"]}; A = {a["id"]: a for a in d["armors"]}
    check(len(W) == 37 and len(A) == 13, "37 armes, 12 armures et le bouclier")
    check(sum(w["cat"] == "simple" for w in W.values()) == 14 and sum(w["rng"] == "ranged" for w in W.values()) == 9, "catégories")
    check(W["rapier"]["finesse"] and W["longsword"]["vers"] == "1d10" and W["longbow"]["range"] == "45 m/180 m", "propriétés lues")
    check(W["crossbow-heavy"].get("two") and "deux mains" in W["crossbow-heavy"]["props"], "propriétés sur deux lignes recollées")
    check(A["half-plate"]["dexMax"] == 2 and A["plate"]["str"] == 15 and A["plate"]["stealth"] and "metal" not in A["hide"], "armures")


KAEL_F = {"abil": {"str": 16, "dex": 10, "con": 14, "int": 8, "wis": 10, "cha": 16}, "hpMax": 40, "v": 3,
          "items": [{"n": "Cotte de mailles", "q": 1, "eq": True, "ref": "chain-mail"}, {"n": "Bouclier", "q": 1, "eq": True, "ref": "shield"},
                    {"n": "Épée longue", "q": 1, "eq": True, "ref": "longsword"}, {"n": "Javeline", "q": 5, "eq": True, "ref": "javelin"}]}


def s_order(a):
    """Onglet Sorts en jeu : la carte du Châtiment divin, puis les attaques."""
    return a.js("(() => { const s = document.querySelector('.smite'), p = document.querySelector('.atkbox'); return !!s && !!p && !!(s.compareDocumentPosition(p) & 4); })()")


def test_catalogue_ca_et_attaques(browser, devices, url):
    from helpers import KAEL
    a = App(browser, devices, url, char=dict(KAEL, **KAEL_F), tab="perso", view="gerer")
    check(a.text(".acv") == "19" and "Défense" in a.text(".acparts"), f"CA calculée : cotte 16 + bouclier 2 + Défense 1 : {a.text('.acblock')}")
    check("Discrétion" in a.text(".acwarn") and "vitesse" not in a.text(".acwarn"), "alerte Discrétion, Force suffisante")
    a.click('[data-a="ac-mode"][data-v="manual"]')
    check(a.g("acMode") == "manual" and a.g("ac") == 19, "saisie à la main, préremplie avec le calcul")
    a.pg.fill("#f-ac", "20"); a.pg.press("#f-ac", "Tab"); a.pg.wait_for_timeout(60)
    check("le calcul donne 19" in a.text(".acblock"), "écart affiché")
    a.click('[data-a="ac-mode"][data-v="calc"]')
    a.pg.fill("#it-new", "épée"); a.pg.wait_for_timeout(60)
    check(a.count(".sug") == 3 and a.pg.evaluate("document.activeElement.id") == "it-new", "3 épées proposées, saisie continue")
    a.click('[data-a="it-pick"][data-id="greatsword"]')
    check(a.g("items[4].ref") == "greatsword" and a.g("items[4].eq") is False, "épée à deux mains ajoutée, reliée au catalogue")
    a.view("jeu")
    check(a.texts(".chstat .v")[0] == "19" and a.count(".atk") == 0, "CA en jeu, plus d'attaques dans Personnage")
    a.tab("grimoire")
    check(s_order(a), "Châtiment divin puis attaques en tête de l'onglet Sorts")
    atk = a.texts(".atk .ah")
    check(atk[0] == "Épée longue +5 1d8 + 3 tranchant" and "×5" in atk[1] and atk[2].startswith("Mains nues +5 4 contondant"), f"attaques : {atk}")
    check("à deux mains : 1d10 + 3" in a.text(".atk") and "Châtiment divin" in a.text(".atknotes"), "polyvalente et rappel du Châtiment")
    a.js("mutate(g => { g.style = 'duel'; })")
    check(a.texts(".atk .ah")[0] == "Épée longue +5 1d8 + 5 tranchant" and "à deux mains : 1d10 + 3" in a.text(".atk"), "Duel : +2 à une main seulement")
    a.close()


def test_alertes_druide_et_magicien(browser, devices, url):
    from helpers import NEMEIA
    a = App(browser, devices, url, char=dict(MALFAEL, **dict(FICHE, ac=None), items=[{"n": "Chemise de mailles", "q": 1, "eq": True, "ref": "chain-shirt"}]), tab="perso", view="gerer")
    check(a.text(".acv") == "15" and "métallique" in a.text(".acwarn"), "druide : 13 + DEX 2, alerte métal")
    a.close()
    b = App(browser, devices, url, char=dict(NEMEIA, **dict(FICHE, ac=None), items=[{"n": "Cuir", "q": 1, "eq": True, "ref": "leather"}, {"n": "Épée longue", "q": 1, "eq": True, "ref": "longsword"}, {"n": "Dague", "q": 1, "eq": True, "ref": "dagger"}]), tab="perso", view="gerer")
    check("non maîtrisée" in b.text(".acwarn") and "pas de sorts" in b.text(".acwarn"), "magicien en armure : alerte")
    b.view("jeu"); b.tab("grimoire")
    atk = b.texts(".atk .ah")
    check(atk[0].startswith("Épée longue +0") and atk[1].startswith("Dague +4 1d4 + 2"), f"maîtrise selon la classe, finesse : {atk}")
    b.close()


def test_lien_catalogue_conserve(browser, devices, url):
    """Régression : modifier un objet (note…) gardait le nom mais perdait le lien avec le Manuel (attaque et CA disparues)."""
    a = App(browser, devices, url, char=dict(MALFAEL, **dict(FICHE, ac=None, abil=dict(FICHE["abil"], dex=12)),
            items=[{"n": "Bâton", "q": 1, "eq": True}, {"n": "Armure en cuir clouté", "q": 1, "eq": True}]), tab="perso", view="gerer")
    check(a.g("items[0].ref") == "quarterstaff" and a.g("items[1].ref") is None, "à l'ouverture : nom exact du Manuel relié, nom libre non")
    a.click('[data-a="it-edit"][data-i="0"]'); a.pg.fill("#it-note", "focaliseur druidique"); a.click('.itform [type="submit"]')
    check(a.g("items[0].ref") == "quarterstaff" and a.g("items[0].note") == "focaliseur druidique", "note ajoutée, lien conservé")
    a.click('[data-a="it-edit"][data-i="1"]'); a.pg.select_option("#it-ref", "studded-leather"); a.click('.itform [type="submit"]')
    check(a.g("items[1].ref") == "studded-leather", "lien choisi dans le formulaire")
    a.click('[data-a="ac-mode"][data-v="calc"]')
    check(a.text(".acv") == "13", f"CA : cuir clouté 12 + DEX 1 = 13 : {a.text('.acblock')}")
    a.view("jeu"); a.tab("grimoire")
    check(a.texts(".atk .ah b")[0] == "Bâton", "attaque au bâton")
    a.close()


def test_objets_magiques(browser, devices, url):
    from helpers import KAEL
    a = App(browser, devices, url, char=dict(KAEL, **KAEL_F), tab="perso", view="gerer")
    a.click('[data-a="it-edit"][data-i="2"]')  # épée longue
    a.pg.select_option("#it-bonus", "1"); a.pg.fill("#it-xdmg", "1d6 radiant"); a.pg.check("#it-att"); a.click('.itform [type="submit"]')
    check(a.g("items[2].bonus") == 1 and a.g("items[2].att") and not a.g("items[2].attuned"), "épée +1 à harmoniser")
    a.view("jeu"); a.tab("grimoire")
    check("non harmonisée" in a.text(".atkbox") and a.texts(".atk .ah")[0] == "Épée longue +5 1d8 + 3 tranchant", "non harmonisée : pas de bonus")
    a.tab("perso"); a.view("gerer"); a.click('[data-a="it-edit"][data-i="2"]'); a.pg.check("#it-attuned"); a.click('.itform [type="submit"]')
    a.view("jeu"); a.tab("grimoire")
    check(a.texts(".atk .ah")[0] == "Épée longue +6 1d8 + 4 tranchant + 1d6 radiant" and "+1 magique" in a.text(".atkbox"), f"harmonisée : +1 et dégâts en plus : {a.texts('.atk .ah')[0]}")
    a.tab("perso"); a.view("gerer"); a.click('[data-a="it-edit"][data-i="1"]'); a.pg.select_option("#it-bonus", "1"); a.click('.itform [type="submit"]')
    check(a.text(".acv") == "20" and "Bouclier +1" in a.text(".acparts"), "bouclier +1 : CA 20")
    a.click('[data-a="it-edit"][data-i="3"]'); a.pg.fill("#it-ch", "3"); a.pg.select_option("#it-rec", "court"); a.click('.itform [type="submit"]')
    a.view("jeu")
    check(a.count('[data-a="it-chg"]') == 0 and "3/3 charges" in a.text(".itbox"), "Personnage : charges en lecture")
    a.tab("grimoire")
    a.click('[data-a="it-chg"][data-i="3"][data-k="0"]'); a.click('[data-a="it-chg"][data-i="3"][data-k="1"]')
    check(a.g("items[3].chU") == 2 and "1/3 charges" in a.text(".itbox"), "2 charges dépensées")
    a.click('[data-a="short-open"]')
    check("charges récupérées" in a.text("#short-panel"), "repos court : objet rechargé annoncé")
    a.click('[data-a="short-done"]')
    check(a.g("items[3].chU") == 0, "charges récupérées au repos court")
    a.close()


def test_limite_harmonisation(browser, devices, url):
    items = [{"n": f"Anneau {k}", "q": 1, "eq": True, "att": True, "attuned": k < 3} for k in range(4)]
    a = App(browser, devices, url, char=dict(MALFAEL, **FICHE, items=items), tab="perso", view="gerer")
    check("harmonisation 3/3" in a.text('[data-k="ch-eq"]'), "compteur d'harmonisation")
    a.click('[data-a="it-edit"][data-i="3"]'); a.pg.check("#it-attuned"); a.click('.itform [type="submit"]')
    check(not a.g("items[3].attuned") and "Déjà 3" in a.toast(), "pas plus de 3 objets harmonisés")
    a.close()


def test_main_secondaire_regle(browser, devices, url):
    from helpers import KAEL
    items = [{"n": "Rapière", "q": 1, "eq": True, "ref": "rapier"}, {"n": "Rapière", "q": 1, "eq": True, "ref": "rapier", "oh": True}]
    a = App(browser, devices, url, char=dict(KAEL, **dict(KAEL_F, items=items)), tab="perso", view="gerer")
    a.click('[data-a="it-edit"][data-i="0"]')
    check(a.count("#it-oh") == 0, "rapière (non légère) : pas de case Main secondaire")
    a.click('[data-a="it-cancel"]'); a.click('[data-a="it-open"][data-i="0"]')
    check("arme légère requise" in a.text(".itdet"), "la fiche dépliée explique pourquoi")
    a.js("mutate(g => { g.traits.push({ n: 'Combattant à deux armes', o: 'don', d: '', feat: 'dual-wielder' }); })")
    a.click('[data-a="it-edit"][data-i="0"]')
    check(a.count("#it-oh") == 1, "avec Combattant à deux armes : case proposée")
    a.close()
