"""Sous-classes du Manuel des joueurs : écoles du magicien, Cercle de la Terre, guerrier totem, serments, Voleur, choix dans l'assistant."""
from helpers import App, check, NEMEIA, KAEL, MALFAEL
from test_barbare import GARAL
from test_roublard import OMBRE


def test_magicien_evocation_et_capacites(browser, devices, url):
    a = App(browser, devices, url, char=dict(NEMEIA, level=10), view="jeu")
    check("2d10 + 4 feu" in a.text('#panel'), "Évocation améliorée : + INT aux dégâts du Trait de feu")
    check("3 × (1d4+1) force" in a.text('#panel'), "Projectile magique inchangé (plusieurs jets)")
    check("Façonneur de sorts" in a.text('#panel') and "Évocation améliorée" in a.text('#panel'), "capacités de l'école en jeu, après les sorts")
    a.view("gerer")
    check("Tradition arcanique" in a.text('#panel') and "Restauration arcanique" in a.text('#panel'), "capacités en mode Gérer")
    a.close()


def test_abjuration_protection(browser, devices, url):
    a = App(browser, devices, url, char=dict(NEMEIA, school="Abjuration", hpMax=26), view="jeu")
    check("créée par ton premier sort" in a.text('#panel'), "pas encore de protection")
    a.click('.jline [data-a="cast"][data-id="shield"]')
    check(a.g("wardMade") and a.g("wardHp") == 12 and "Protection arcanique : 12 PV" in a.toast(), "Bouclier (abjuration) : protection 2 × 4 + 4")
    a.click("#topbar .chip.hp"); a.pg.fill("#hp-n", "7"); a.click('#hppanel [data-a="hp-dmg"]')
    check(a.g("wardHp") == 5 and a.g("hp") is None and "7 absorbés par la Protection arcanique" in a.toast(), "dégâts encaissés par la protection")
    a.pg.fill("#hp-n", "8"); a.click('#hppanel [data-a="hp-dmg"]')
    check(a.g("wardHp") == 0 and a.g("hp") == 23, "excédent sur les PV")
    a.undo(); check(a.g("wardHp") == 5 and a.g("hp") is None, "annulable")
    a.click('#hppanel [data-a="hp-close"]'); a.click('.jline [data-a="cast"][data-id="shield"]')
    check(a.g("wardHp") == 7, "nouvelle abjuration : +2 × niveau du sort")
    a.click('[data-a="longrest"]')
    check(not a.g("wardMade") and a.g("wardHp") == 0, "repos long : protection à recréer")
    a.close()


def test_divination_presage(browser, devices, url):
    a = App(browser, devices, url, char=dict(NEMEIA, school="Divination"), view="jeu")
    a.pg.click("#portent-0"); a.pg.keyboard.type("1"); a.pg.wait_for_timeout(80)
    check(a.js("(G().portent || []).length") == 0, "un seul chiffre (1) : pas encore validé")
    a.pg.keyboard.type("7"); a.pg.wait_for_timeout(120)
    a.pg.keyboard.type("3"); a.pg.wait_for_timeout(120)
    check(a.js("JSON.stringify(G().portent)") == "[17,3]", "deux résultats notés")
    a.click('[data-a="portent-use"][data-i="1"]')
    check(a.g("portentU[1]") and a.count(".pdie.used") == 1 and a.js("getComputedStyle(document.querySelector('.pdie.used')).textDecorationLine") == "line-through", "résultat barré")
    a.undo(); check(not a.g("portentU[1]"), "annulable")
    a.click('[data-a="portent-use"][data-i="1"]')
    a.click('[data-a="longrest"]')
    check(a.js("G().portent.length") == 0, "repos long : nouveau Présage")
    a.close()


def test_druide_terre(browser, devices, url):
    a = App(browser, devices, url, char=dict(MALFAEL, level=5, circle="terre", terrain="foret", used={"1": 2, "2": 1}), view="jeu")
    prep = a.js("alwaysPrepared(G())")
    check(set(prep) == {"spider-climb", "barkskin", "call-lightning", "plant-growth"}, f"sorts de cercle Forêt niveaux 3 et 5 : {prep}")
    check(a.js("R.cantrips(G())") == 4, "un sort mineur de plus (3 + 1)")
    check(a.count(".wscf") == 0 and "FP 1/2" in a.text(".stats") or "FP 0.5" in a.text(".stats"), f"Forme sauvage du druide de base ({a.text('.stats')})")
    a.click('[data-a="short-open"]')
    check("Récupération naturelle" in a.text("#short-panel") and "Forme sauvage" in a.text("#short-panel"), "repos court : Forme sauvage et Récupération naturelle")
    a.click('#short-panel [data-a="sr-pick"] >> nth=0'); a.click('#short-panel [data-a="sr-go"]')
    check(a.g("natRec") and a.js("(G().used[1] || 0) + 2 * (G().used[2] || 0)") == 1, "3 niveaux récupérés (moitié de 5, arrondi au supérieur)")
    a.view("gerer"); a.pg.select_option("#f-terrain", "montagne")
    check("lightning-bolt" in a.js("alwaysPrepared(G())"), "terrain changé : sorts de la Montagne")
    a.close()


def test_barbare_totem(browser, devices, url):
    a = App(browser, devices, url, char=dict(GARAL, voie="totem", level=6, raging=True, totem={"3": "ours", "6": "aigle"}), view="jeu")
    check("Esprit totem · Ours" in a.text("#rage-card") and "sauf psychiques" in a.text("#rage-card"), "carte Rage : effet de l'Ours")
    a.tab("perso")
    check("Ours" in (a.pg.get_attribute('[data-a="hp-dmg"][data-half]', "title") or ""), "Dégâts ½ : tous les dégâts sauf psychiques")
    a.tab("caps"); a.view("gerer")
    check(a.count('select[data-totem="3"]') == 1 and a.count('select[data-totem="6"]') == 1, "choix de l'esprit par palier")
    a.pg.select_option('select[data-totem="3"]', "loup")
    check(a.g("totem['3']") == "loup", "esprit changé")
    a.close()


def test_paladin_serments_et_voleur(browser, devices, url):
    a = App(browser, devices, url, char=dict(KAEL, oath="vengeance", level=5), view="jeu")
    t = a.text("#panel")
    check("Fléau" in t and "Marque du chasseur" in t and "Immobilisation de personne" in t, "sorts du serment de vengeance")
    a.click('[data-a="row"][data-id="res:cd"]')
    check(a.texts(".capopt b") == ["Conspuer l'ennemi", "Vœu d'hostilité"], "options de Conduit divin")
    a.close()
    b = App(browser, devices, url, char=dict(OMBRE, arch="voleur"), view="jeu")
    check("Mains lestes" in b.text("#panel") and "Monte-en-l'air" in b.text("#panel"), "Voleur : Mains lestes dans la Ruse, Monte-en-l'air")
    b.close()


def test_choix_dans_l_assistant(browser, devices, url):
    a = App(browser, devices, url, char=dict(GARAL, level=2, hpMax=25), view="jeu")
    a.click(".lvup")
    check(a.count('[data-a="lu-sub"]') == 2, "deux voies proposées")
    a.click('[data-a="lu-sub"][data-v="totem"]'); a.click('[data-a="lu-subx"][data-v="aigle"]')
    check("Foncer en action bonus" in a.text(".subx"), "effet de l'esprit choisi")
    a.click(".lufoot .primary"); a.click('[data-a="lu-go"]')
    check(a.g("level") == 3 and a.g("voie") == "totem" and a.g("totem['3']") == "aigle", "voie et esprit enregistrés")
    a.undo(); check(a.g("voie") == "berserker", "annulable")
    a.close()
    b = App(browser, devices, url, char=dict(NEMEIA, level=1, school="Évocation"), view="jeu")
    b.click(".lvup"); b.click('[data-a="lu-sub"][data-v="Divination"]')
    check("Présage" in b.text(".subopt.on"), "écoles avec leur capacité de niveau 2")
    b.click(".lufoot .primary"); b.click(".lufoot .primary"); b.click('[data-a="lu-go"]')
    check(b.g("level") == 2 and b.g("school") == "Divination", "école choisie au niveau 2")
    b.close()
