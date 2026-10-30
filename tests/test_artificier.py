"""Artificier (version d'Eberron, AideDD) : création, imprégnations (connues, objets imprégnés, repos long), spécialités,
canon occulte (PV suivis), élixirs, défenseur d'acier, passage de niveau."""
from helpers import App, check
from test_creation import disabled, nxt, start

URZAK = {"v": 3, "name": "Urzak", "cls": "artificier", "level": 4, "aspec": "artilleur", "atool": "Outils de menuisier",
         "abil": {"str": 8, "dex": 16, "con": 12, "int": 16, "wis": 12, "cha": 8}, "hpMax": 27, "acMode": "calc",
         "infK": ["arme", "rep:Lunettes de nuit", "rep:Sac sans fond", "boomerang"], "cantrips": ["mending", "minor-illusion"], "prepared": ["grease", "alarm", "cure-wounds"],
         "items": [{"n": "Arbalète légère", "q": 1, "eq": True, "ref": "crossbow-light"}, {"n": "Dague", "q": 1, "eq": True, "ref": "dagger"},
                   {"n": "Cuir clouté", "q": 1, "eq": True, "ref": "studded-leather"}, {"n": "Lunettes bricolées", "q": 1}], "updatedAt": 1}


def test_creation(browser, devices, url):
    a = App(browser, devices, url, char=None)
    start(a, "artificier", "Urzak")
    a.click('[data-a="cr-race"][data-v="elfe"]'); a.click('[data-a="cr-sub"][data-v="bois"]'); nxt(a)
    for k, v in zip(["int", "dex", "con", "wis", "str", "cha"], ["15", "14", "13", "12", "10", "8"]): a.pg.select_option(f'[data-crstd="{k}"]', v)
    nxt(a); a.click('[data-a="cr-bg"][data-v="sage"]'); a.pg.select_option('[data-crbglang="0"]', "Nain"); a.pg.select_option('[data-crbglang="1"]', "Gnome"); nxt(a)
    for k in ["investigation", "medicine"]: a.click(f'[data-a="cr-skill"][data-v="{k}"]')
    check(disabled(a, '[data-a="cr-next"]') and "outils d'artisan" in a.text(".lufoot"), "outils d'artisan obligatoires")
    a.pg.select_option("#cr-atool", "Outils de menuisier"); nxt(a)
    check("Sorts" in a.text(".crstep"), "étape Sorts")
    for i in ["mending", "fire-bolt"]: a.click(f'[data-a="cr-can"][data-v="{i}"]')
    for i in ["grease", "cure-wounds"]: a.click(f'[data-a="cr-prep"][data-v="{i}"]')
    nxt(a)
    a.pg.select_option('[data-crpick="0-0-0"]', "dagger"); a.pg.select_option('[data-crpick="0-0-1"]', "light-hammer"); nxt(a); a.click('[data-a="cr-go"]')
    check(a.g("hpMax") == 8 + 1 and a.js("R.slots(G()).join()") == "2" and a.js("R.prepMax(G())") == 2, f"niveau 1 : 8 + CON, 2 emplacements, 2 préparés (INT 2 + 0) : {a.js('JSON.stringify([G().hpMax, R.slots(G()), R.prepMax(G()), G().abil])')}")
    t = a.js("JSON.stringify(G().items.map(x => x.n))")
    check("Arbalète légère" in t and "Carreaux" in t and "Outils de voleur" in t and "Sac d'exploration souterraine" in t, f"équipement de départ : {t}")
    a.tab("perso"); a.view("jeu")
    check(a.g("atool") == "Outils de menuisier" and all(t in a.text("#panel") for t in ["Outils de voleur", "Outils de bricoleur", "Outils de menuisier"]), "outils de la classe")
    a.close()


def test_niveaux_impregnations_specialite(browser, devices, url):
    a = App(browser, devices, url, char=dict(URZAK, level=1, infK=[], hpMax=9), view="jeu")
    a.click(".lvup")
    check("Imprégnations connues" in a.text(".lutab"), "niveau 2 : imprégnations annoncées")
    a.click('#lvlup [data-a="lu-next"]')
    check(a.count('[data-a="lu-ainf"]') > 30 and "0/4" in a.text(".luprep h3"), "4 imprégnations à choisir (répliques comprises)")
    check(a.js("document.querySelector('[data-a=lu-ainf][data-id=\"inf-bottes\"]').disabled"), "Bottes du sentier sinueux : niveau 6, grisées")
    for k in ["arme", "boomerang", "rep:Lunettes de nuit", "rep:Sac sans fond"]: a.click(f'[data-a="lu-ainf"][data-id="inf-{k}"]')
    a.click('#lvlup [data-a="lu-next"]'); a.click('#lvlup [data-a="lu-go"]')
    check(a.g("level") == 2 and a.g("infK.length") == 4, "niveau 2 : 4 imprégnations connues")
    a.click(".lvup")
    check("Spécialité" in a.text("#lvlup") and "Artilleur" in a.text("#lvlup"), "niveau 3 : spécialité proposée")
    a.click('#lvlup [data-a="lu-sub"][data-v="forgeron"]') if a.count('#lvlup [data-a="lu-sub"][data-v="forgeron"]') else None
    for _ in range(2): a.click('#lvlup [data-a="lu-next"]') if a.count('#lvlup [data-a="lu-next"]') else None
    a.click('#lvlup [data-a="lu-go"]')
    check(a.g("level") == 3 and a.g("aspec") == "forgeron" and "heroism" in a.js("alwaysPrepared(G()).join()"), "Forgeron de guerre : Héroïsme et Bouclier toujours préparés")
    check("Apte au combat" in a.text("#panel") or a.view("jeu") or "Apte au combat" in a.text("#panel"), "Apte au combat : armes de guerre")
    a.close()


def test_impregnations_et_attaques(browser, devices, url):
    a = App(browser, devices, url, char=URZAK, view="gerer")
    check(a.count('select[data-a="art-inf"]') == 4 and "0 / 2" in a.text(".artcount"), "Gérer : 4 imprégnations, 0 objet sur 2")
    opts = a.js("[...document.querySelectorAll('select[data-a=art-inf][data-k=boomerang] option')].map(o => o.textContent).join('|')")
    check(opts == "Aucun objet|Dague", f"Arme boomerang : seulement une arme de lancer ({opts})")
    a.pg.select_option('select[data-a="art-inf"][data-k="arme"]', label="Arbalète légère"); a.pg.wait_for_timeout(80)
    a.pg.select_option('select[data-a="art-inf"][data-k="boomerang"]', label="Dague"); a.pg.wait_for_timeout(80)
    a.pg.select_option('select[data-a="art-inf"][data-k="rep:Lunettes de nuit"]', label="Lunettes bricolées"); a.pg.wait_for_timeout(80)
    check("plus ancienne" not in a.toast() and a.js("G().items.filter(x => x.inf).length") == 2 and "prend fin" in a.toast(), f"3e objet : la plus ancienne prend fin ({a.toast()})")
    a.view("jeu")
    atk = a.texts(".atk .ah")
    check(atk[0] == "Arbalète légère +6 1d8 + 4 perforant" or any("Dague +6 1d4 + 4" in x for x in atk), f"attaques avec l'imprégnation : {atk}")
    check("Imprégnations" in a.text("#panel") and "✦" in a.text("#panel"), "rappel des objets imprégnés en jeu")
    a.close()


def test_canon_occulte(browser, devices, url):
    a = App(browser, devices, url, char=URZAK, view="jeu")
    a.click('[data-a="can-form"]'); a.click('[data-a="can-t"][data-v="baliste"]')
    check("+5" in a.text(".artcard") and "2d8 force" in a.text(".artcard") and "gratuit" in a.text('[data-a="can-go"]'), "baliste de choc : attaque +5, 2d8 force, création gratuite")
    a.click('[data-a="can-go"]')
    check(a.g("can.length") == 1 and a.g("canFree") and a.js("JSON.stringify(G().used)") == "{}", "canon créé sans emplacement")
    a.pg.fill("#ahp-can0", "7"); a.click('[data-a="art-hp"][data-k="can0"][data-v="-1"]')
    check(a.g("can[0].hp") == 13, "PV du canon : 20 − 7")
    a.click('[data-a="can-end"][data-i="0"]'); a.click('[data-a="can-form"]'); a.click('[data-a="can-t"][data-v="flamme"]')
    check("emplacement niv. 1" in a.text('[data-a="can-go"]'), "deuxième création : un emplacement")
    a.click('[data-a="can-go"]')
    check(a.js("G().used[1]") == 1 and "DEX 13" in a.text(".artcard"), "lance-flammes : DD 13, emplacement dépensé")
    a.long_rest()
    check(a.g("can.length") == 0 and not a.g("canFree"), "repos long : canon dissipé, création gratuite rendue")
    a.close()


def test_alchimiste_et_forgeron(browser, devices, url):
    a = App(browser, devices, url, char=dict(URZAK, aspec="alchimiste"), view="jeu")
    a.pg.fill("#elix-d6", "1"); a.click('[data-a="elix-new"]')
    check(a.g("elix.join()") == "1" and "2d4 + 3" in a.text("#panel"), "élixir de soins : 2d4 + INT")
    check(a.count('[data-a="elix-new"]') == 0, "un seul élixir gratuit au niveau 4")
    a.click('[data-a="elix-drink"][data-i="0"]'); check(a.g("elix.length") == 0 and "Soins" in a.toast(), "élixir bu")
    a.close()
    b = App(browser, devices, url, char=dict(URZAK, aspec="forgeron", items=URZAK["items"] + [{"n": "Hache d'armes", "q": 1, "eq": True, "ref": "battleaxe", "bonus": 1}]), view="jeu")
    check(any(x.startswith("Hache d'armes +6 1d8 + 4") for x in b.texts(".atk .ah")), f"Apte au combat : INT avec une arme magique ({b.texts('.atk .ah')})")
    t = b.text("#panel")
    check("Défenseur d'acier" in t and "25/25 PV" in t, "défenseur : 2 + INT + 5 × niveau = 25 PV")
    b.close()
