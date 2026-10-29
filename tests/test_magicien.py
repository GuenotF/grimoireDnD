"""Magicien : préparation, lancement, Restauration arcanique, bibliothèque, passage de niveau."""
from helpers import App, check, NEMEIA


def test_limite_de_preparation(browser, devices, url):
    a = App(browser, devices, url, char=NEMEIA)
    q = lambda: (a.g("prepared.length"), a.count(".gprep.full"))
    check(q() == (7, 0), f"7 préparés sur 8 : {q()}")
    a.pg.check('.gprep[data-id="detect-magic"]'); a.pg.wait_for_timeout(50)
    check(q() == (8, 1), f"limite atteinte, une case grisée : {q()}")
    a.click('.gprep[data-id="sleep"]', force=True)
    check(a.g("prepared.length") == 8 and "Limite" in a.toast(), "case grisée refusée avec explication")
    a.pg.uncheck('.gprep[data-id="shield"]'); a.pg.wait_for_timeout(50)
    check(q() == (7, 0), "décocher libère une place")
    a.close()


def test_lancer_et_choix_du_niveau(browser, devices, url):
    a = App(browser, devices, url, char=NEMEIA)
    used = lambda: a.js("JSON.stringify(G().used)")
    a.click('[data-a="row"][data-id="magic-missile"]')
    a.click('.jbody [data-a="cast"][data-id="magic-missile"]')
    check(used() == '{"1":1}', "emplacement de niveau 1 coché")
    a.undo(); check(used() == "{}", "annulation")
    a.click('[data-a="cast-open"][data-id="magic-missile"]')
    a.click('.chooser [data-a="cast"][data-l="2"]')
    check(used() == '{"2":1}' and a.count(".chooser") == 0, "lancé au niveau 2")
    a.click('[data-a="row"][data-id="detect-magic"]')
    a.click('[data-a="cast-rit"][data-id="detect-magic"]')
    check(used() == '{"2":1}' and "rituel" in a.toast(), "rituel sans emplacement")
    a.close()


def test_concentration(browser, devices, url):
    a = App(browser, devices, url, char=NEMEIA, view="jeu")
    a.click('.jline [data-a="cast"][data-id="levitate"]')
    check("Lévitation" in a.text("#topbar .chip.conc"), "puce de concentration")
    a.click('.jline [data-a="cast"][data-id="suggestion"]')
    check(a.count(".concwarn") == 1, "avertissement avant de remplacer la concentration")
    a.click('[data-a="cast-force"]')
    check("Suggestion" in a.text("#topbar .chip.conc"), "concentration remplacée")
    a.click('[data-a="conc-panel"]'); a.pg.fill("#conc-dmg", "24"); a.pg.wait_for_timeout(50)
    check(a.text("#conc-dd") == "JdS CON · DD 12", "DD de concentration calculé")
    a.close()


def test_restauration_arcanique(browser, devices, url):
    a = App(browser, devices, url, char=dict(NEMEIA, used={"1": 3, "2": 2}), view="jeu")
    a.click('[data-a="short-open"]')
    a.click('[data-a="sr-pick"] >> nth=0'); a.click('[data-a="sr-go"]')
    check(a.g("arcane") is True, "Restauration arcanique utilisée")
    rec = a.js("(3 - (G().used[1] || 0)) + 2 * (2 - (G().used[2] || 0))")
    check(rec == 2, f"2 niveaux d'emplacement récupérés (niveau 4) : {rec}")
    a.close()


def test_bibliotheque(browser, devices, url):
    a = App(browser, devices, url, char=NEMEIA, tab="biblio")
    check("215 sorts" in a.text(".found"), a.text(".found"))
    a.pg.fill("#f-q", "boule de feu"); a.pg.wait_for_timeout(100)
    check(a.count(".spell") >= 1, "recherche affichée en entier")
    a.pg.fill("#f-q", ""); a.pg.wait_for_timeout(50)
    a.click('[data-a="flvl"][data-v="1"]')
    a.click('[data-a="row"][data-id="lib:magic-missile"]')
    check("Déjà appris" in a.text('.jrow:has([data-id="lib:magic-missile"])'), "sort déjà appris signalé")
    a.close()


def test_passage_de_niveau(browser, devices, url):
    a = App(browser, devices, url, char=NEMEIA)
    check(a.text(".lvup").strip() == "↑ Niveau 5", "bouton de passage de niveau")
    a.click(".lvup"); a.click(".lufoot .primary")
    a.click('[data-a="lu-flt"][data-v="3"]')
    check(a.count('[data-a="lu-pick"][data-id="aura-of-vitality"]') == 0 and a.count('[data-a="lu-pick"][data-id="fireball"]') == 1, "sorts gratuits : liste du magicien seulement")
    a.click('[data-a="lu-pick"][data-id="fireball"]'); a.click('[data-a="lu-pick"][data-id="counterspell"]')
    check(a.count(".lurow .pick:disabled") > 0, "2 sorts gratuits maximum")
    a.click(".lufoot .primary")
    a.pg.check('[data-a="lu-prep"][data-id="fireball"]'); a.pg.wait_for_timeout(50)
    a.click('[data-a="lu-go"]')
    check(a.g("level") == 5 and a.g("spells.length") == 11 and a.g("prepared.includes('fireball')"), "niveau 5, 2 sorts appris, Boule de feu préparée")
    a.undo()
    check(a.g("level") == 4 and a.g("spells.length") == 9, "passage annulé")
    a.close()


def test_onglet_regles(browser, devices, url):
    a = App(browser, devices, url, char=NEMEIA, tab="regles")
    t = a.text("#panel")
    for s in ["Concentration", "Jet de sauvegarde", "DD de 14", "Attaque de sort", "+6", "Restauration arcanique"]:
        check(s in t, f"règles du magicien : « {s} »")
    a.close()


def test_armure_de_mage(browser, devices, url):
    a = App(browser, devices, url, char=dict(NEMEIA, v=3, abil={"str": 8, "dex": 14, "con": 12, "int": 18, "wis": 10, "cha": 14}, spells=NEMEIA["spells"] + [{"id": "mage-armor", "how": "niv"}], prepared=NEMEIA["prepared"] + ["mage-armor"], acMode="calc"), view="jeu")
    check(a.js("acOf(G())") == 12, "sans armure : 10 + DEX")
    a.click('.jline [data-a="cast"][data-id="mage-armor"]')
    check(a.js("acOf(G())") == 15 and a.text("#topbar .tbst").startswith("15"), f"Armure de mage en cours : 13 + DEX, barre à jour ({a.text('#topbar .tbst')})")
    a.js("(mutate(g => { g.items.push({ n: 'Cuir', q: 1, eq: true, c: false, note: '', ref: 'leather' }); }), 0)")
    check(a.js("acOf(G())") == 13, "une armure portée remplace Armure de mage (cuir 11 + DEX)")
    a.js("(mutate(g => { g.items = []; g.effects = []; }), 0)")
    check(a.js("acOf(G())") == 12, "sort terminé : retour à 10 + DEX")
    a.close()
