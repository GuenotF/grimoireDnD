"""Équipement : bourse (gains, dépenses, monnaie), objets (ajout, équipé, à décompter, retrait)."""
from helpers import App, check, MALFAEL

FICHE = {"abil": {"str": 10, "dex": 14, "con": 14, "int": 12, "wis": 16, "cha": 8}, "ac": 14, "hpMax": 31, "v": 3}


def money(a, n, coin, act):
    a.pg.fill("#m-n", str(n)); a.click(f'[data-a="m-coin"][data-v="{coin}"]'); a.click(f'[data-a="{act}"]')


def test_bourse(browser, devices, url):
    a = App(browser, devices, url, char=dict(MALFAEL, **FICHE, money={"po": 2, "pa": 3}), tab="inv", view="jeu")
    check("2 po · 3 pa" in a.text(".invsum") and "≈ 2,3 po" in a.text(".invsum"), f"résumé : bourse et sa valeur en po ({a.text('.invsum')})")
    a.click('.invsum[data-a="m-open"]')
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
    a = App(browser, devices, url, char=dict(MALFAEL, **FICHE), tab="inv", view="gerer")
    for n in ["Bâton", "Rations", "Potion de soins"]:
        a.add_open(); a.pg.fill("#it-new", n); a.pg.press("#it-new", "Enter"); a.pg.wait_for_timeout(60)
    check(a.g("items.length") == 3 and a.pg.evaluate("document.activeElement.id") == "it-new", "3 objets ajoutés, champ prêt pour le suivant")
    a.click('[data-a="it-eq"][data-i="0"]')
    a.click('[data-a="it-edit"][data-i="1"]'); a.pg.fill("#it-q", "7"); a.pg.check("#it-c"); a.pg.fill("#it-note", "une par jour"); a.click('.itform [type="submit"]')
    check(a.g("items[1].q") == 7 and a.g("items[1].c") and a.g("items[1].note") == "une par jour", "rations : 7, à décompter")
    a.view("jeu")
    check(a.texts(".it.j .itn > span")[0].startswith("▸ Bâton") and "équipé" in a.texts(".it.j .itn > span")[0] and a.count(".it.eq") == 1, "objet équipé en tête, en gras, marqué")
    check(a.count('[data-a="it-dec"]') == 2 and a.text('[data-a="it-dec"][data-i="1"] + b') == "7", "En jeu : − / + sur la ligne des rations et de la potion (à décompter, catalogue)")
    a.tab("grimoire")
    check(a.texts('[data-k="act-it"] ~ .itbox .itn > span') == ["Rations", "Potion de soins"], "onglet Sorts : section Objets, objets à décompter seulement")
    a.click('[data-a="it-dec"][data-i="1"]')
    check(a.g("items[1].q") == 6, "une ration de moins")
    a.tab("inv"); a.view("gerer"); a.click('[data-a="it-edit"][data-i="2"]'); a.click('[data-a="it-del"][data-i="2"]')
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
    a.tab("inv")
    a.add_open(); a.pg.fill("#it-new", "épée"); a.pg.wait_for_timeout(60)
    check(a.count(".sug") == 3 and a.pg.evaluate("document.activeElement.id") == "it-new", "3 épées proposées, saisie continue")
    a.click('[data-a="it-pick"][data-id="greatsword"]')
    check(a.g("items.length") == 4 and a.pg.input_value("#it-new") == "Épée à deux mains" and a.count(".sugok") == 1, "suggestion choisie : recopiée dans le champ, pas encore ajoutée")
    a.click('[data-a="it-add"] [type="submit"]')
    check(a.g("items[4].ref") == "greatsword" and a.g("items[4].eq") is False, "＋ : épée à deux mains ajoutée, reliée au catalogue")
    a.tab("perso"); a.view("jeu")
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
            items=[{"n": "Bâton", "q": 1, "eq": True}, {"n": "Armure en cuir clouté", "q": 1, "eq": True}]), tab="inv", view="gerer")
    check(a.g("items[0].ref") == "quarterstaff" and a.g("items[1].ref") is None, "à l'ouverture : nom exact du Manuel relié, nom libre non")
    a.click('[data-a="it-edit"][data-i="0"]'); a.pg.fill("#it-note", "focaliseur druidique"); a.click('.itform [type="submit"]')
    check(a.g("items[0].ref") == "quarterstaff" and a.g("items[0].note") == "focaliseur druidique", "note ajoutée, lien conservé")
    a.click('[data-a="it-edit"][data-i="1"]'); a.pg.select_option("#it-ref", "studded-leather"); a.click('.itform [type="submit"]')
    check(a.g("items[1].ref") == "studded-leather", "lien choisi dans le formulaire")
    a.tab("perso")
    a.click('[data-a="ac-mode"][data-v="calc"]')
    check(a.text(".acv") == "13", f"CA : cuir clouté 12 + DEX 1 = 13 : {a.text('.acblock')}")
    a.view("jeu"); a.tab("grimoire")
    check(a.texts(".atk .ah b")[0] == "Bâton", "attaque au bâton")
    a.close()


def test_objets_magiques(browser, devices, url):
    from helpers import KAEL
    a = App(browser, devices, url, char=dict(KAEL, **KAEL_F), tab="inv", view="gerer")
    a.click('[data-a="it-edit"][data-i="2"]')  # épée longue
    a.pg.select_option("#it-bonus", "1"); a.pg.fill("#it-xdmg", "1d6 radiant"); a.pg.check("#it-att"); a.click('.itform [type="submit"]')
    check(a.g("items[2].bonus") == 1 and a.g("items[2].att") and not a.g("items[2].attuned"), "épée +1 à harmoniser")
    a.view("jeu"); a.tab("grimoire")
    check("non harmonisée" in a.text(".atkbox") and a.texts(".atk .ah")[0] == "Épée longue +5 1d8 + 3 tranchant", "non harmonisée : pas de bonus")
    a.tab("inv"); a.view("gerer"); a.click('[data-a="it-edit"][data-i="2"]'); a.pg.check("#it-attuned"); a.click('.itform [type="submit"]')
    a.view("jeu"); a.tab("grimoire")
    check(a.texts(".atk .ah")[0] == "Épée longue +6 1d8 + 4 tranchant + 1d6 radiant" and "+1 magique" in a.text(".atkbox"), f"harmonisée : +1 et dégâts en plus : {a.texts('.atk .ah')[0]}")
    a.tab("inv"); a.view("gerer"); a.click('[data-a="it-edit"][data-i="1"]'); a.pg.select_option("#it-bonus", "1"); a.click('.itform [type="submit"]')
    a.tab("perso")
    check(a.text(".acv") == "20" and "Bouclier +1" in a.text(".acparts"), "bouclier +1 : CA 20")
    a.tab("inv")
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
    a = App(browser, devices, url, char=dict(MALFAEL, **FICHE, items=items), tab="inv", view="gerer")
    check("3 / 3" in a.text(".invsum.att") and a.count(".invsum.att .pip.used") == 3, "résumé : harmonisation 3 / 3")
    a.click('[data-a="it-edit"][data-i="3"]'); a.pg.check("#it-attuned"); a.click('.itform [type="submit"]')
    check(not a.g("items[3].attuned") and "Déjà 3" in a.toast(), "pas plus de 3 objets harmonisés")
    a.close()


def test_main_secondaire_regle(browser, devices, url):
    from helpers import KAEL
    items = [{"n": "Rapière", "q": 1, "eq": True, "ref": "rapier"}, {"n": "Rapière", "q": 1, "eq": True, "ref": "rapier", "oh": True}]
    a = App(browser, devices, url, char=dict(KAEL, **dict(KAEL_F, items=items)), tab="inv", view="gerer")
    a.click('[data-a="it-edit"][data-i="0"]')
    check(a.count("#it-oh") == 0, "rapière (non légère) : pas de case Main secondaire")
    a.click('[data-a="it-cancel"]'); a.click('[data-a="it-open"][data-i="0"]')
    check("arme légère requise" in a.text(".itdet"), "la fiche dépliée explique pourquoi")
    a.js("mutate(g => { g.traits.push({ n: 'Combattant à deux armes', o: 'don', d: '', feat: 'dual-wielder' }); })")
    a.click('[data-a="it-edit"][data-i="0"]')
    check(a.count("#it-oh") == 1, "avec Combattant à deux armes : case proposée")
    a.close()


def test_equipement_en_jeu(browser, devices, url):
    a = App(browser, devices, url, char=dict(MALFAEL, **FICHE), tab="inv", view="jeu")
    check(a.text('[data-a="view"][data-v="gerer"]') == "✎ Gérer", "sélecteur : ✎ Gérer")
    a.add_open(); a.pg.fill("#it-new", "épée lo")
    check("Épée longue" in a.text(".sugbox"), "En jeu : armes du Manuel proposées")
    a.click('.sug[data-id="longsword"]'); a.click('[data-a="it-add"] [type="submit"]')
    check(a.g("items.length") == 1 and a.g("items[0].ref") == "longsword" and not a.g("items[0].eq") and "touche-le puis Équiper" in a.toast(), "ajoutée depuis En jeu, non équipée")
    a.add_open(); a.pg.fill("#it-new", "Corde de chanvre"); a.pg.press("#it-new", "Enter"); a.pg.wait_for_timeout(60)
    check(a.g("items.length") == 2 and "Ajouté" in a.toast(), "objet libre ajouté")
    a.undo()
    check(a.g("items.length") == 1, "ajout annulable")
    a.click('[data-a="it-open"][data-i="0"]')
    check("1d8" in a.text(".itdet") and a.count('.itplay [data-a="it-eq"]') == 1, "fiche de l'objet : détail et Équiper")
    a.click('.itplay [data-a="it-eq"]')
    check(a.g("items[0].eq") and "Ranger" in a.text(".itplay") and "équipé" in a.text(".it.eq"), "équipée : marquée, Ranger proposé")
    a.click('.itplay [data-a="it-del"]')
    check(a.g("items.length") == 0 and "Retiré" in a.toast(), "retirée en jeu")
    a.undo()
    check(a.g("items.length") == 1, "retrait annulable")
    a.close()


def test_ajout_avec_details(browser, devices, url):
    a = App(browser, devices, url, char=dict(MALFAEL, **FICHE), tab="inv", view="jeu")
    a.add_open(); a.pg.fill("#it-new", "Perles"); a.click('[data-a="it-det"]')
    check(a.count(".itform.itnew") == 1 and a.pg.input_value("#it-name") == "Perles" and a.count('.itnew [data-a="it-del"]') == 0, "✎ Détails : formulaire complet, nom repris, sans Retirer")
    a.click('.itnew [data-a="it-cancel"]')
    check(a.g("items.length") == 0 and a.count(".itnew") == 0, "Annuler : rien n'est créé")
    a.add_open(); a.pg.fill("#it-new", "Perles"); a.click('[data-a="it-det"]')
    a.pg.fill("#it-q", "12"); a.pg.fill("#it-note", "valeur à estimer"); a.click('.itnew [type="submit"]')
    check(a.g("items.length") == 1 and a.g("items[0].q") == 12 and a.g("items[0].note") == "valeur à estimer" and "×12" in a.toast(), "12 perles en une fois")
    a.add_open(); a.pg.fill("#it-new", "épée lo"); a.click('.sug[data-id="longsword"]'); a.click('[data-a="it-det"]')
    check(a.pg.input_value("#it-ref") == "longsword", "nom du Manuel : arme déjà liée")
    a.pg.select_option("#it-bonus", "1"); a.pg.check("#it-eq"); a.click('.itnew [type="submit"]')
    check(a.g("items[1].bonus") == 1 and a.g("items[1].eq") and a.g("items[1].ref") == "longsword" and "✦" in a.toast(), "objet magique ajouté, équipé, en une fois")
    a.undo()
    check(a.g("items.length") == 1, "ajout annulable")
    a.add_open(); a.pg.fill("#it-new", "Corde"); a.click('[data-a="it-add"] [type="submit"]')
    check(a.g("items.length") == 2 and a.g("items[1].n") == "Corde", "＋ : ajout rapide inchangé")
    a.close()


def test_ranger_inventaire(browser, devices, url):
    items = [{"n": "Bâton", "q": 1, "eq": True, "ref": "quarterstaff"}, {"n": "Corde", "q": 1}, {"n": "Rations", "q": 5}, {"n": "Torches", "q": 10}, {"n": "Bouclier", "q": 1, "eq": True, "ref": "shield"}]
    a = App(browser, devices, url, char=dict(MALFAEL, **FICHE, items=items), tab="inv", view="gerer")
    secs = lambda: [f"{h} {n}" for h, n in zip(a.texts(".rubric.invsec .h"), a.texts(".rubric.invsec .aside"))]
    check(secs() == ["Équipé 2", "Consommables 2", "Divers 1"], f"sections (rations et torches reconnues dans le catalogue) : {secs()}")
    names = lambda: [t.split("×")[0].replace("▸", "").strip() for t in a.texts(".it .itn > span")]
    check(names() == ["Bâton", "Bouclier", "Rations", "Torches", "Corde"], f"ordre : {names()}")
    check(a.js("document.querySelector('[data-a=it-mv][data-i=\"1\"][data-v=\"-1\"]').disabled"), "premier de sa section : ▲ grisé")
    a.click('[data-a="it-mv"][data-i="3"][data-v="-1"]')
    check(names() == ["Bâton", "Bouclier", "Torches", "Rations", "Corde"], f"Torches monte d'une place : {names()}")
    a.click('[data-a="it-mv"][data-i="4"][data-v="-1"]')
    check(names() == ["Bouclier", "Bâton", "Torches", "Rations", "Corde"], f"Bouclier monte dans Équipé : {names()}")
    a.view("jeu")
    check(secs() == ["Équipé 2", "Consommables 2", "Divers 1"] and a.count('[data-a="it-mv"]') == 0, "En jeu : mêmes sections, sans flèches")
    a.close()


def test_onglet_inventaire_et_recherche(browser, devices, url):
    items = [{"n": "Bâton", "q": 1, "eq": True, "ref": "quarterstaff"}, {"n": "Corde de chanvre", "q": 1}, {"n": "Potion de soins", "q": 2, "note": "2d4 + 2"}, {"n": "Clé rouillée", "q": 1, "note": "manoir de Tresendar"}]
    a = App(browser, devices, url, char=dict(MALFAEL, **FICHE, items=items), tab="perso", view="gerer")
    check(a.count(".itbox") == 0 and a.count(".invsum") == 0, "Personnage : plus d'équipement ni de bourse")
    names = lambda: [t.split("×")[0].replace("▸", "").strip() for t in a.texts(".it .itn > span")]
    a.tab("inv")
    check(a.count(".invsum") == 1 and len(names()) == 4, "Inventaire : bourse et objets")
    a.pg.fill("#it-find", "tresendar"); a.pg.wait_for_timeout(60)
    check(names() == ["Clé rouillée"] and a.pg.evaluate("document.activeElement.id") == "it-find", f"recherche dans les notes, saisie continue : {names()}")
    check(a.count('[data-a="it-mv"]') == 0, "pas de flèches pendant la recherche")
    a.pg.fill("#it-find", "cle"); a.pg.wait_for_timeout(60)
    check(names() == ["Clé rouillée"], "accents ignorés")
    a.pg.fill("#it-find", "zzz"); a.pg.wait_for_timeout(60)
    check("Aucun objet" in a.text(".empty"), "aucun résultat")
    a.pg.fill("#it-find", ""); a.pg.wait_for_timeout(60)
    check(len(names()) == 4 and a.count('[data-a="it-mv"]') > 0, "recherche vidée : tout revient, flèches comprises")
    a.view("jeu")
    check(a.count("#it-find") == 1 and a.count(".invsum") == 1, "En jeu : recherche et bourse aussi")
    # Barre d'onglets qui défile : l'onglet ouvert recentré, fondu sur le bord coupé
    sc = lambda e: a.js(f"(() => {{ const s = document.querySelector('.tabscroll'); return {e}; }})()")
    check(sc("s.scrollWidth > s.clientWidth"), "druide sur téléphone : la rangée dépasse, elle défile")
    a.tab("bestiaire")
    check(sc("s.classList.contains('fl') && Math.abs(s.scrollLeft + s.clientWidth - s.scrollWidth) < 3"), "Bestiaire : barre au bout, fondu à gauche")
    a.tab("perso")
    check(sc("s.scrollLeft === 0 && s.classList.contains('fr') && !s.classList.contains('fl')"), "Personnage : barre au début, fondu à droite")
    check(a.js("document.querySelector('.tabmore').getBoundingClientRect().right <= window.innerWidth"), "Plus reste visible à droite")
    check(not a.errors, f"erreurs : {a.errors}")
    a.close()


def test_dossiers_filtres_et_fiche(browser, devices, url):
    items = [{"n": "Épée longue", "q": 1, "eq": True, "ref": "longsword"}, {"n": "Dague", "q": 2, "ref": "dagger"}, {"n": "Potion de soins", "q": 2, "c": True},
             {"n": "Anneau", "q": 1, "unid": True}, {"n": "Corde de chanvre (15 m)", "q": 1}]  # fichier sans dossiers : classement proposé à l'ouverture
    a = App(browser, devices, url, char=dict(MALFAEL, **FICHE, items=items), tab="inv", view="jeu")
    secs = lambda: [f"{h} {n}" for h, n in zip(a.texts(".rubric.invsec .h"), a.texts(".rubric.invsec .aside"))]
    names = lambda: [t.split("×")[0].replace("▸", "").replace("▾", "").replace("équipé", "").replace("non identifié", "").strip() for t in a.texts(".it .itn > span")]
    check(a.js("G().items.map(x => x.f).join()") == "armes,armes,conso,magie,divers", f"classement : {a.js('G().items.map(x => x.f).join()')}")
    check(secs() == ["Équipé 1", "Armes 1", "Consommables 1", "Magie 1", "Divers 1"], f"sections : {secs()}")
    check(a.texts(".invf .chip") == ["Tout", "Équipé", "Armes", "Consommables", "Magie", "Divers"], f"puces : {a.texts('.invf .chip')}")
    a.click('[data-a="it-flt"][data-v="armes"]')
    check(secs() == ["Armes 2"] and names() == ["Épée longue", "Dague"], f"filtre Armes : équipée comprise ({names()})")
    a.click('[data-a="it-flt"][data-v=""]')
    # Consommable : − / + sur la ligne, Utiliser · −1 dans la fiche
    a.click('[data-a="it-dec"][data-i="2"]')
    check(a.g("items[2].q") == 1, "− sur la ligne")
    a.click('[data-a="it-open"][data-i="2"]'); a.click('.itplay [data-a="it-dec"]')
    check(a.g("items[2].q") == 0 and a.count('.itplay [data-a="it-dec"][disabled]') == 1, "Utiliser · −1, grisé à 0")
    # Non identifié, puis identifié ; déplacer vers un dossier (annulable)
    a.click('[data-a="it-open"][data-i="3"]')
    check("Effet inconnu" in a.text(".itunid") and a.count(".unid") == 1, "anneau non identifié")
    a.click('[data-a="it-idf"]')
    check(not a.g("unid") and a.js("G().items[3].unid") is None, "identifié")
    a.click('[data-a="it-open"][data-i="4"]'); a.pg.select_option('[data-a="it-fold"]', "quete"); a.pg.wait_for_timeout(60)
    check(a.g("items[4].f") == "quete" and "Quête 1" in secs(), "corde déplacée dans Quête")
    a.undo()
    check(a.g("items[4].f") == "divers", "déplacement annulé")
    # Ajout : dossier du filtre en cours
    a.click('[data-a="it-flt"][data-v="magie"]'); a.add_open(); a.pg.fill("#it-new", "Baguette"); a.click('[data-a="it-add"] [type="submit"]')
    check(a.g("items[5].f") == "magie", "ajouté dans le dossier du filtre")
    a.click('[data-a="it-flt"][data-v=""]')
    # Gérer : fiche complète (dossier, poids, valeur, rareté, description)
    a.view("gerer"); a.click('[data-a="it-edit"][data-i="5"]')
    a.pg.select_option("#it-f", "quete"); a.pg.fill("#it-w", "0,5"); a.pg.fill("#it-v", "120"); a.pg.select_option("#it-rar", "rare"); a.pg.fill("#it-desc", "Trouvée dans la tour."); a.click('.itform [type="submit"]')
    check(a.js("JSON.stringify([G().items[5].f, G().items[5].w, G().items[5].v, G().items[5].rar, G().items[5].desc])") == '["quete",0.5,120,"rare","Trouvée dans la tour."]', f"fiche (virgule acceptée) : {a.js('JSON.stringify(G().items[5])')}")
    a.click('[data-a="it-open"][data-i="5"]')
    check("120 po" in a.text(".itinfo") and "rare" in a.text(".itinfo") and "Trouvée dans la tour." in a.text(".itinfo"), "détail : valeur, rareté, description")
    a.click('[data-a="it-open"][data-i="0"]')
    check("1,5 kg" in a.text(".itdet"), "poids du Manuel pour l'épée longue")
    # Dossiers : créer, renommer, ranger, supprimer (objets dans Divers, annulable)
    a.click('[data-a="fd-new"]'); a.pg.fill("#fd-name", "Monture"); a.click('[data-a="fd-save"] [type="submit"]')
    check(a.js("G().folders.map(f => f.n).join()") == "Armes,Consommables,Magie,Quête,Butin,Divers,Monture", "dossier créé")
    a.click('[data-a="fd-mv"][data-v="divers"][data-d="1"]')
    check(a.js("G().folders.map(f => f.n).slice(-2).join()") == "Monture,Divers", "dossier rangé")
    check(a.count('[data-a="fd-del"][data-v="divers"]') == 0, "Divers ne se supprime pas")
    a.click('[data-a="fd-del"][data-v="quete"]')
    check(a.g("items[5].f") == "divers" and "Quête" not in a.js("G().folders.map(f => f.n).join()"), "Quête supprimé : objets dans Divers")
    a.undo()
    check(a.g("items[5].f") == "quete" and a.js("G().folders.some(f => f.id === 'quete')"), "suppression annulée")
    a.pg.reload(); a.pg.wait_for_timeout(400)
    check(a.js("G().folders.length") == 7 and a.g("items[5].rar") == "rare", "dossiers et fiche conservés au rechargement")
    check(not a.errors, f"erreurs : {a.errors}")
    a.close()


def test_catalogue_paquetage_et_charge(browser, devices, url):
    items = [{"n": "Sac d'exploration souterraine", "q": 1}, {"n": "Enclume", "q": 1, "w": 20}]  # nom du Manuel : relié au catalogue à l'ouverture
    a = App(browser, devices, url, char=dict(MALFAEL, **FICHE, items=items), tab="inv", view="jeu")
    check(a.g("items[0].mat") == "sac-d-exploration-souterraine", "paquetage d'une ancienne fiche relié au catalogue")
    # Catalogue : suggestions avec poids, prix et dossier ; lot de munitions
    a.add_open(); a.pg.fill("#it-new", "corde"); a.pg.wait_for_timeout(60)
    check("Corde en chanvre (15 m)" in a.text(".sugbox") and "5 kg" in a.text(".sugbox") and "1 po" in a.text(".sugbox"), f"suggestions du catalogue : {a.text('.sugbox')[:200]}")
    a.click('[data-a="it-pick"][data-m="corde-en-chanvre-15-m"]'); a.click('[data-a="it-add"] [type="submit"]')
    check(a.g("items[2].mat") == "corde-en-chanvre-15-m" and a.g("items[2].f") == "divers", "corde ajoutée, reliée au catalogue")
    a.add_open(); a.pg.fill("#it-new", "Flèches"); a.click('[data-a="it-add"] [type="submit"]')
    check(a.js("JSON.stringify([G().items[3].n, G().items[3].q, G().items[3].c, G().items[3].f])") == '["Flèches",20,true,"conso"]', f"lot de 20 flèches à décompter : {a.js('JSON.stringify(G().items[3])')}")
    a.add_open(); a.pg.fill("#it-new", "Potion de guérison"); a.click('[data-a="it-add"] [type="submit"]')
    a.click('[data-a="it-open"][data-i="4"]')
    check("2d4 + 2" in a.text(".itinfo") and "50 po" in a.text(".itinfo") and "250 g" not in a.text(".itinfo"), f"fiche : effet et prix du Manuel ({a.text('.itinfo')})")
    # Paquetage : déballer en décochant ce qui manque, annulable
    a.add_open(); a.pg.fill("#it-new", "Sac d'explorateur"); a.click('[data-a="it-add"] [type="submit"]')
    n0 = a.g("items.length"); a.click(f'[data-a="it-open"][data-i="{n0 - 1}"]')
    check("Contient" in a.text(".pkin") and "torche" in a.text(".pkin"), "contenu du sac affiché")
    a.click('[data-a="up-open"]')
    check(a.count(".pkrow") == 8, "8 objets à cocher")
    a.click('[data-a="up-tog"][data-k="4"]')
    check("Déballer · 7 objets" in a.text('[data-a="up-go"]'), "torches décochées")
    a.click('[data-a="up-go"]')
    names = a.js("G().items.map(x => x.n + ':' + x.q + ':' + x.f).join('|')")
    check("Sac d'explorateur" not in names and "Rations (1 jour):10:conso" in names and "Torche" not in names and "Corde en chanvre (15 m):2:divers" in names, f"déballé (corde ajoutée à la première) : {names}")
    a.undo()
    check(a.g("items.length") == n0 and a.js(f"G().items[{n0 - 1}].n") == "Sac d'explorateur", "déballage annulé")
    # Charge : pas suivie par défaut ; variante d'encombrement (FOR 10 : 25 kg, 50 kg)
    check(a.count(".invsum.load") == 0 and a.count("#topbar .chip.load") == 0, "charge pas suivie par défaut")
    a.view("gerer"); a.click('[data-a="load-set"][data-v="enc"]')
    check(a.text(".invsum.load b").startswith("86") and a.count(".invsum.load .ld.l3") == 1 and a.js("speedOf(G())") == 3, f"86 kg pour 75 kg de capacité : au-delà, vitesse 9 − 6 ({a.text('.invsum.load b')}, {a.js('speedOf(G())')} m)")
    check("Surchargé" in a.text("#topbar .chip.load"), "puce dans la barre du haut")
    a.click('[data-a="fd-np"][data-v="divers"]')
    check(a.text(".invsum.load b").startswith("0,75") and a.count(".invsum.load .ld") == 0 and a.js("speedOf(G())") == 9 and a.count("#topbar .chip.load") == 0, f"Divers non porté : sacs, corde et enclume ne comptent plus ({a.text('.invsum.load b')})")
    a.pg.check('[data-a="coin-w"]'); a.pg.wait_for_timeout(60)
    check(a.g("coinW") is True, "poids des pièces coché")
    a.click('[data-a="fd-np"][data-v="divers"]'); a.click('[data-a="load-set"][data-v="cap"]')
    check(a.count(".invsum.load .ld.l3") == 1 and a.js("speedOf(G())") == 9, "capacité seule : avertissement, pas de perte de vitesse")
    a.click('[data-a="load-set"][data-v=""]')
    check(a.count(".invsum.load") == 0, "charge plus suivie")
    check(not a.errors, f"erreurs : {a.errors}")
    a.close()


def test_butin_vente_et_munitions(browser, devices, url):
    items = [{"n": "Arc long", "q": 1, "eq": True, "ref": "longbow"}, {"n": "Flèches", "q": 5},
             {"n": "Pierre précieuse", "q": 1, "v": 50, "f": "butin"}, {"n": "Épée courte", "q": 3, "ref": "shortsword", "f": "butin"},
             {"n": "Statuette", "q": 1, "f": "butin"}, {"n": "Corde en soie (15 m)", "q": 1}]
    a = App(browser, devices, url, char=dict(MALFAEL, **FICHE, items=items, money={"po": 1}), tab="inv", view="jeu")
    check("≈ 80 po" in a.text(".rubric.invsec[data-k='inv-butin'] .aside"), f"Butin : valeur pleine (50 + 3 × 10) : {a.text('.rubric.invsec[data-k=inv-butin] .aside')}")
    check("Revente ≈ 65 po" in a.text(".sellbar") and "1 sans valeur" in a.text(".sellbar"), f"revente : 50 + 15 (moitié prix) : {a.text('.sellbar')}")
    a.click('[data-a="sell-open"][data-v="butin"]')
    check(a.count(".sellbox .pkrow") == 3 and a.count(".sellbox .pkrow:disabled") == 1 and "65 po" in a.text(".selltot"), "vente : 3 objets, la statuette sans valeur grisée, total 65 po")
    a.click('[data-a="sell-n"][data-v="1"]'); a.click('[data-a="sell-n"][data-v="1"]')
    check("21 po 6 pa 6 pc chacun" in a.text(".sellsplit"), f"partage entre 3 : {a.text('.sellsplit')}")
    a.click('[data-a="sell-go"]')
    check(a.js("JSON.stringify([G().money.po, G().money.pa, G().money.pc])") == "[22,6,6]" and a.g("items.length") == 4, f"ma part dans la bourse, objets vendus retirés : {a.js('JSON.stringify(G().money)')}")
    a.undo()
    check(a.g("money.po") == 1 and a.g("items.length") == 6, "vente annulée")
    # Vendre depuis la fiche d'un objet (équipement du Manuel : moitié prix)
    a.click('[data-a="it-open"][data-i="5"]')
    check("revente 5 po (moitié prix)" in a.text(".itinfo"), f"fiche : prix de revente ({a.text('.itinfo')})")
    a.click('.itplay [data-a="sell-open"]')
    check(a.js("S.sell.sel.join()") == "5" and "5 po" in a.text(".selltot"), "vente d'un seul objet")
    a.click('[data-a="sell-n"][data-v="-1"]') if a.count('[data-a="sell-n"][data-v="-1"]:not([disabled])') else None
    a.click('[data-a="sell-cancel"]')
    # Munitions : arc long équipé, flèches de l'inventaire
    a.tab("grimoire"); a.view("jeu")
    check("Flèches 5" in a.text(".ammo"), f"stock sur l'arme : {a.text('.ammo')}")
    for _ in range(3): a.click('[data-a="ammo-shot"]')
    check(a.g("items[1].q") == 2 and a.g("items[1].shot") == 3 and "3 tirées" in a.text(".ammo"), "3 tirs")
    a.click('[data-a="ammo-pick"]')
    check(a.g("items[1].q") == 3 and a.js("G().items[1].shot") is None, "ramassées : la moitié de 3 (1)")
    a.undo()
    check(a.g("items[1].q") == 2 and a.g("items[1].shot") == 3, "ramassage annulé")
    a.js("mutate(g => { g.items.splice(1, 1); })")
    check("Pas de munitions" in a.text(".atkbox"), "arc sans flèches : rappel")
    check(not a.errors, f"erreurs : {a.errors}")
    a.close()


def test_vente_partielle(browser, devices, url):
    items = [{"n": "Perle", "q": 10, "v": 100, "f": "butin"}, {"n": "Épée courte", "q": 3, "ref": "shortsword", "f": "butin"}]
    a = App(browser, devices, url, char=dict(MALFAEL, **FICHE, items=items, money={}), tab="inv", view="jeu")
    a.click('[data-a="sell-open"][data-v="butin"]')
    check(a.count(".sellq") == 2 and "1 040 po" not in a.text(".selltot") and "1015 po" in a.text(".selltot"), f"tout par défaut : 1000 + 15 ({a.text('.selltot')})")
    for _ in range(7): a.click('[data-a="sell-q"][data-i="0"][data-v="-1"]')
    check("tu en gardes 7" in a.text(".sellq") and "300 po" in a.text(".sellbox .pkrow") , "3 perles sur 10")
    a.click('[data-a="sell-tog"][data-i="1"]')
    check(a.count(".sellq") == 1 and "300 po" in a.text(".selltot"), "épées décochées : seulement les perles")
    a.click('[data-a="sell-go"]')
    check(a.g("items[0].q") == 7 and a.g("money.po") == 300 and a.g("items.length") == 2, f"3 vendues, 7 gardées : {a.js('JSON.stringify(G().items.map(x => x.q))')}")
    a.undo()
    check(a.g("items[0].q") == 10 and a.g("money.po") == 0, "vente annulée")
    check(not a.errors, f"erreurs : {a.errors}")
    a.close()
