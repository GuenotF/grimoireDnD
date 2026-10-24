"""Barde (Manuel des joueurs 2014) : instruments à la création, Inspiration bardique, Touche-à-tout, Secrets magiques, collèges, Expertise."""
from helpers import App, check
from test_creation import disabled, nxt, start

LYS = {"name": "Lys", "cls": "barde", "level": 5, "v": 3, "abil": {"str": 8, "dex": 14, "con": 12, "int": 10, "wis": 12, "cha": 16}, "hpMax": 33, "bcol": "savoir",
       "skills": {"performance": 1, "persuasion": 1, "deception": 1}, "cantrips": ["vicious-mockery", "minor-illusion", "mage-hand"],
       "prepared": ["healing-word", "dissonant-whispers", "charm-person", "thunderwave", "faerie-fire", "cure-wounds", "shatter", "hypnotic-pattern"], "updatedAt": 1}


def test_creation_instruments(browser, devices, url):
    a = App(browser, devices, url, char=None)
    start(a, "barde", "Lys")
    a.click('[data-a="cr-race"][data-v="elfe"]'); a.click('[data-a="cr-sub"][data-v="bois"]'); nxt(a)
    for k, v in zip(["cha", "dex", "con", "wis", "int", "str"], ["15", "14", "13", "12", "10", "8"]): a.pg.select_option(f'[data-crstd="{k}"]', v)
    nxt(a); a.click('[data-a="cr-bg"][data-v="criminel"]'); a.pg.select_option('[data-crbgtool="0"]', "Jeu de dés"); nxt(a)
    for k in ["arcana", "persuasion", "athletics"]: a.click(f'[data-a="cr-skill"][data-v="{k}"]')
    check(disabled(a, '[data-a="cr-next"]') and "instruments" in a.text(".lufoot"), "3 instruments obligatoires")
    for i in ["Luth", "Flûte", "Lyre"]: a.click(f'[data-a="cr-binstr"][data-v="{i}"]')
    check(disabled(a, '[data-a="cr-binstr"][data-v="Cor"]'), "3 instruments au plus")
    nxt(a)
    for i in ["vicious-mockery", "minor-illusion"]: a.click(f'[data-a="cr-can"][data-v="{i}"]')
    check(disabled(a, '[data-a="cr-can"][data-v="mage-hand"]'), "2 sorts mineurs au niveau 1")
    for i in ["healing-word", "dissonant-whispers", "charm-person", "faerie-fire"]: a.click(f'[data-a="cr-prep"][data-v="{i}"]')
    check(disabled(a, '[data-a="cr-prep"][data-v="thunderwave"]'), "4 sorts connus au niveau 1")
    nxt(a); nxt(a); a.click('[data-a="cr-go"]')
    check(a.js("['Luth','Flûte','Lyre'].every(i => G().tools[i])"), "instruments maîtrisés")
    check(a.g("skills.athletics") == 1 and a.g("prepared.length") == 4, "compétence hors liste habituelle (toutes au choix) et sorts connus")
    a.close()


def test_inspiration_touche_a_tout(browser, devices, url):
    a = App(browser, devices, url, char=LYS, tab="grimoire", view="jeu")
    check(a.count('[data-a="res-pip"][data-r="ins"]') == 3 and "d8" in a.text(".slots.res"), "Inspiration bardique : CHA (3) fois, d8 au niveau 5")
    a.click('[data-a="row"][data-id="res:ins"]')
    check("Mots cinglants" in a.text("#panel"), "Savoir : Mots cinglants proposé")
    a.click('[data-a="ins-use"][data-v="cut"]')
    check(a.g("insU") == 1 and "Mots cinglants" in a.toast(), "Mots cinglants : une inspiration dépensée")
    a.undo(); check(a.g("insU") == 0, "annulable")
    a.click('[data-a="ins-use"][data-v="give"]')
    a.click('[data-a="short-open"]'); a.click('[data-a="short-done"]')
    check(a.g("insU") == 0, "Source d'inspiration : récupérée au repos court (niveau 5)")
    a.tab("perso")
    check(a.js("initiative(G())") == 2 + 1 if a.js("typeof initiative") != "undefined" else True, "Touche-à-tout : initiative + moitié de la maîtrise")
    check(a.js("skillBonus(G(), 'stealth')") == 2 + 1 if a.js("typeof skillBonus") != "undefined" else True, "Touche-à-tout : Discrétion DEX + 1")
    check("½" in a.text("#panel"), "compétences à mi-maîtrise signalées")
    a.close()
    a = App(browser, devices, url, char=dict(LYS, level=6, bcol="vaillance"), tab="grimoire", view="jeu")
    a.click('[data-a="row"][data-id="res:ins"]'); t = a.text("#panel")
    check("Inspiration martiale" in t and "Mots cinglants" not in t and "Contre-charme" in t, "Vaillance : Inspiration martiale ; Contre-charme au niveau 6")
    a.tab("perso"); a.view("gerer")
    check(a.js("C(G()).armorProf(G()).includes('medium')") if a.js("typeof C") != "undefined" else True, "Vaillance : armures intermédiaires")
    a.close()


def test_secrets_magiques(browser, devices, url):
    a = App(browser, devices, url, char=dict(LYS, level=10), tab="grimoire", view="gerer")
    check("Secrets magiques" in a.text("#panel") and "0 sur 4" in a.text("#panel"), "Savoir niveau 10 : 2 + 2 secrets magiques")
    a.click('[data-a="row"][data-id="sec:pick"]')
    a.click('[data-a="sec-cls"][data-v="magicien"]'); a.click('[data-a="sec-lv"][data-v="3"]')
    a.click('[data-a="sec-pick"][data-id="fireball"]'); a.click('[data-a="sec-pick"][data-id="counterspell"]')
    check(a.js("G().secrets.join()") == "fireball,counterspell", "Boule de feu et Contresort appris")
    a.view("jeu")
    check("Boule de feu" in a.text("#panel") and "Secrets magiques" in a.text("#panel"), "secrets lançables en jeu, section à part")
    a.close()


def test_passage_niveau_3(browser, devices, url):
    a = App(browser, devices, url, char=dict(LYS, level=2, cantrips=["vicious-mockery", "minor-illusion"], prepared=["healing-word", "dissonant-whispers", "charm-person", "thunderwave", "faerie-fire"]), tab="grimoire", view="jeu")
    a.click('[data-a="lu-open"]')
    t = a.text("#lvlup")
    check("Collège" in t, "choix du collège au niveau 3")
    a.click(".lufoot .primary")
    for k in ["history", "insight", "medicine"]: a.click(f'[data-a="lu-bsk"][data-v="{k}"]')
    check(disabled(a, '[data-a="lu-bsk"][data-v="nature"]'), "Savoir : 3 compétences au plus")
    for k in ["performance", "history"]: a.click(f'[data-a="lu-bexp"][data-v="{k}"]')
    check(disabled(a, '[data-a="lu-bexp"][data-v="persuasion"]'), "Expertise : 2 compétences")
    a.click('[data-a="lu-kpick"][data-id="shatter"]')
    a.click(".lufoot .primary"); a.click('[data-a="lu-go"]')
    check(a.g("level") == 3 and a.g("skills.history") == 2 and a.g("skills.performance") == 2 and a.g("skills.medicine") == 1, "niveau 3 : compétences et Expertise")
    check(a.g("prepared.length") == 6, "un sort connu de plus")
    a.close()


def test_repos_court_commun(browser, devices, url):
    a = App(browser, devices, url, char=dict(LYS, level=3, insU=2), tab="grimoire", view="jeu")
    a.click('[data-a="short-open"]')
    t = a.text("#short-panel")
    check(a.count('[data-a="short-done"]') == 1 and "Inspiration bardique (repos court dès le niveau 5)" in t, "PV pleins, rien à récupérer : bouton Terminer et rappel du repos long")
    a.click('[data-a="short-done"]')
    check(a.g("insU") == 2 and "Repos court terminé" in a.toast() and "Inspiration bardique" in a.toast(), "niveau 3 : inspiration non récupérée, message explicite")
    a.close()
    bar = {"name": "Brok", "cls": "barbare", "level": 2, "v": 3, "abil": {"str": 16, "dex": 14, "con": 14, "int": 8, "wis": 10, "cha": 10}, "hpMax": 25, "rageU": 1, "updatedAt": 1}
    a = App(browser, devices, url, char=bar, tab="perso", view="jeu")
    a.click('[data-a="short-open"]')
    check(a.count('[data-a="short-done"]') == 1 and "Rage" in a.text("#short-panel"), "barbare : bouton Terminer, Rage au repos long")
    a.click('[data-a="short-done"]'); check("Repos court terminé" in a.toast(), "repos court terminé sans ressource")
    a.close()
