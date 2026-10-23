"""Dons du Manuel des joueurs : catalogue, conditions, effets calculés, retrait, assistant de niveau, reprise des fiches."""
from helpers import App, check, NEMEIA
from test_barbare import GARAL
from test_roublard import OMBRE


def pick(a, q, fid):
    a.pg.fill("#fp-q", q); a.pg.wait_for_timeout(60)
    a.click(f'[data-a="fp-sel"][data-v="{fid}"]')


def test_catalogue_et_conditions(browser, devices, url):
    import json, pathlib
    d = json.load(open(pathlib.Path(__file__).parent.parent / "data" / "feats.json", encoding="utf-8"))
    check(len(d) == 42 and len({f["id"] for f in d}) == 42, "42 dons, identifiants uniques")
    check(all(f["n"] and f["d"] for f in d) and any(f["id"] == "skilled" and f["n"] == "Doué" for f in d), "noms et textes ; Doué séparé de Discret")
    a = App(browser, devices, url, char=GARAL, tab="perso", view="gerer")
    a.click('[data-a="trait-feat"]')
    check(a.count('[data-a="fp-sel"][data-v="war-caster"]') == 0 and a.count('[data-a="fp-sel"][data-v="skulker"]') == 0, "accessibles : ni Mage de guerre (sorts), ni Discret (DEX 12)")
    a.click('[data-a="fp-all"][data-v="1"]')
    check(a.count('[data-a="fp-sel"][data-v="skulker"].off') == 1 and "DEX 13 requise (tu as 12)" in a.text('[data-a="fp-sel"][data-v="skulker"]'), "Tous : Discret grisé avec la raison")
    a.click('[data-a="fp-sel"][data-v="skulker"]')
    check(a.count('[data-a="fp-add"]') == 0 and "ne peut pas être pris" in a.text(".fpdet"), "condition non remplie : texte lisible, pas de bouton Ajouter")
    a.pg.fill("#fp-q", "mains nues"); a.pg.wait_for_timeout(60)
    check(a.texts(".fprow .hd b") == ["Bagarreur de tavernes"], f"recherche dans les effets : {a.texts('.fprow .hd b')}")
    a.close()


def test_resilient_et_retrait(browser, devices, url):
    a = App(browser, devices, url, char=OMBRE, tab="perso", view="gerer")
    a.click('[data-a="trait-feat"]'); pick(a, "rési", "resilient")
    a.click('[data-a="fp-add"]')
    check("Termine le choix" in a.toast() and a.g("traits.length") == 0, "choix de la caractéristique obligatoire")
    check(a.count('[data-a="fp-abil"][data-v="dex"]') == 1 and "★" in a.text('[data-a="fp-abil"][data-v="dex"]'), "★ sur les JdS déjà maîtrisés")
    a.click('[data-a="fp-abil"][data-v="con"]')
    check("CON 12 → 13" in a.text(".fpprev") and "JdS CON +1 → +3" in a.text(".fpprev"), f"aperçu : {a.text('.fpprev')}")
    a.click('[data-a="fp-add"]')
    check(a.g("abil.con") == 13 and a.g("traits[0].feat") == "resilient" and a.js("saveProf(G(), 'con')"), "CON +1, JdS CON maîtrisé")
    check(a.count('.sv.lock') == 3, "JdS CON verrouillé (donné par le don)")
    a.click('[data-a="trait-edit"][data-i="0"]'); a.click('[data-a="trait-del"][data-i="0"]')
    check(a.g("abil.con") == 12 and a.g("traits.length") == 0 and not a.js("saveProf(G(), 'con')"), "retiré avec ses effets")
    a.undo()
    check(a.g("abil.con") == 13 and a.g("traits.length") == 1, "retrait annulé")
    a.close()


def test_effets_calcules(browser, devices, url):
    a = App(browser, devices, url, char=dict(GARAL, level=5), tab="perso", view="gerer")
    hp0, sp0 = a.g("hpMax"), a.js("speedOf(G())")
    a.click('[data-a="trait-feat"]'); pick(a, "robu", "tough"); a.click('[data-a="fp-add"]')
    check(a.g("hpMax") == hp0 + 10, "Robuste : +2 × niveau 5")
    a.click('[data-a="trait-feat"]'); pick(a, "mobi", "mobile"); a.click('[data-a="fp-add"]')
    check(a.js("speedOf(G())") == sp0 + 3, "Mobile : +3 m")
    a.click('[data-a="trait-feat"]'); pick(a, "bagar", "tavern-brawler"); a.click('[data-a="fp-abil"][data-v="str"]'); a.click('[data-a="fp-add"]')
    check(a.g("abil.str") == 17, "Bagarreur : FOR +1")
    a.click('[data-a="trait-feat"]'); pick(a, "doué", "skilled")
    for k in ["arcana", "history", "medicine"]: a.click(f'[data-a="fp-skill"][data-v="{k}"]')
    check(a.count('[data-a="fp-skill"]:disabled') > 0, "3 compétences au plus"); a.click('[data-a="fp-add"]')
    check(all(a.g(f"skills.{k}") == 1 for k in ["arcana", "history", "medicine"]), "Doué : 3 compétences maîtrisées")
    a.view("jeu"); a.tab("caps")
    check(a.texts(".atk .ah")[-1].startswith("Mains nues +6 1d4 + 3 contondant"), f"mains nues 1d4 + FOR : {a.texts('.atk .ah')[-1]}")
    a.close()
    b = App(browser, devices, url, char=dict(OMBRE, traits=[{"n": "Combattant à deux armes", "o": "don", "d": ""}], items=[{"n": "Rapière", "q": 1, "eq": True, "ref": "rapier"}, {"n": "Épée courte", "q": 1, "eq": True, "ref": "shortsword"}, {"n": "Cuir", "q": 1, "eq": True, "ref": "leather"}]), tab="perso", view="gerer")
    check(b.g("traits[0].feat") == "dual-wielder" and "Combattant à deux armes" in b.text(".acparts") and b.text(".acv") == "15", "relié par le nom ; +1 CA à deux armes")
    b.view("jeu"); b.tab("caps")
    check(any("Épée courte (main secondaire)" in t for t in b.texts(".atk .ah")), "main secondaire avec une rapière (non légère)")
    b.close()


def test_assistant_de_niveau(browser, devices, url):
    a = App(browser, devices, url, char=dict(GARAL, level=7, hpMax=75), view="jeu")
    a.click(".lvup"); a.click('[data-a="lu-mode"][data-v="feat"]')
    check(a.count(".fpick") == 1 and a.count('[data-a="lu-asi"]') == 0, "choix : un don à la place de +2 / +1 +1")
    a.click(".lufoot .primary"); a.click('[data-a="lu-go"]')
    check(a.g("level") == 7 and "Choisis un don" in a.toast(), "don obligatoire en mode « Un don »")
    a.click('[data-a="fp-all"][data-v="1"]'); pick(a, "discr", "skulker"); a.click(".lufoot .primary"); a.click('[data-a="lu-go"]')
    check(a.g("level") == 7 and "Choisis un don" in a.toast(), "don dont la condition n'est pas remplie : refusé")
    pick(a, "robu", "tough")
    check("+16 PV max" in a.text(".fpprev"), "Robuste : 2 × niveau 8")
    a.click(".lufoot .primary"); a.click('[data-a="lu-go"]')
    check(a.g("level") == 8 and a.g("traits.at(-1).feat") == "tough", "niveau 8, Robuste pris")
    check(a.g("hpMax") == 101, f"PV : 75 + 10 (dé) + 16 (Robuste) = {a.g('hpMax')}")
    a.undo()
    check(a.g("level") == 7 and a.g("hpMax") == 75 and a.g("traits.length") == len(GARAL.get("traits", [])), "passage annulé, don retiré")
    a.close()
    b = App(browser, devices, url, char=dict(NEMEIA, level=7, traits=[{"n": "Robuste", "o": "don", "d": ""}], hpMax=40))
    b.click(".lvup")
    check("40 → 46" in b.text(".luhpv"), f"Robuste déjà pris : 4 + 0 CON + 2 au passage ({b.text('.luhpv')})")
    b.close()
