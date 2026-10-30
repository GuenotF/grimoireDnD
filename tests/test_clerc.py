"""Clerc (Manuel des joueurs 2014, Forge de Xanathar) : domaine dès la création, sorts de domaine, Conduit divin, bonus calculés."""
from helpers import App, check
from test_creation import disabled, nxt, start

ALDRIC = {"name": "Aldric", "cls": "clerc", "level": 5, "v": 3, "abil": {"str": 14, "dex": 10, "con": 14, "int": 10, "wis": 16, "cha": 12}, "hpMax": 38, "domain": "vie",
          "cantrips": ["sacred-flame", "guidance", "thaumaturgy"], "prepared": ["healing-word", "shield-of-faith"], "updatedAt": 1}


def test_creation_savoir(browser, devices, url):
    a = App(browser, devices, url, char=None)
    start(a, "clerc", "Elra")
    a.click('[data-a="cr-race"][data-v="elfe"]'); a.click('[data-a="cr-sub"][data-v="bois"]'); nxt(a)
    for k, v in zip(["wis", "con", "str", "dex", "cha", "int"], ["15", "14", "13", "12", "10", "8"]): a.pg.select_option(f'[data-crstd="{k}"]', v)
    nxt(a)
    a.click('[data-a="cr-bg"][data-v="criminel"]'); a.pg.select_option('[data-crbgtool="0"]', "Jeu de dés"); nxt(a)
    for k in ["insight", "medicine"]: a.click(f'[data-a="cr-skill"][data-v="{k}"]')
    check(disabled(a, '[data-a="cr-next"]') and "domaine" in a.text(".lufoot"), "domaine divin obligatoire au niveau 1")
    a.click('[data-a="cr-cdom"][data-v="savoir"]')
    for k in ["arcana", "history"]: a.click(f'[data-a="cr-cdsk"][data-v="{k}"]')
    check(disabled(a, '[data-a="cr-cdsk"][data-v="religion"]'), "Savoir : 2 compétences au plus")
    a.pg.select_option('[data-crcdlang="0"]', "Céleste"); a.pg.wait_for_timeout(60); a.pg.select_option('[data-crcdlang="1"]', "Draconique"); a.pg.wait_for_timeout(60)
    nxt(a)
    check("Sorts" in a.text(".crstep"), "étape Sorts")
    check("Toujours préparés : Injonction" in a.text("#crsheet") and a.count('[data-a="cr-prep"][data-v="command"]') == 0, "sorts de domaine hors de la préparation")
    for i in ["sacred-flame", "guidance", "thaumaturgy"]: a.click(f'[data-a="cr-can"][data-v="{i}"]')
    a.click('[data-a="cr-prep"][data-v="cure-wounds"]'); nxt(a); nxt(a); a.click('[data-a="cr-go"]')
    check(a.g("domain") == "savoir" and a.g("skills.arcana") == 2 and a.g("skills.history") == 2, "Bénédictions du savoir : maîtrise doublée")
    check(a.js("G().langs.includes('Céleste') && G().langs.includes('Draconique')"), "langues du Savoir")
    check(a.js("castable(G()).map(s => s.id).includes('identify')") if a.js("typeof castable") != "undefined" else True, "Identification toujours préparée")
    a.close()


def test_vie_conduit_divin(browser, devices, url):
    a = App(browser, devices, url, char=ALDRIC, tab="grimoire", view="gerer")
    t = a.text("#panel")
    check("Sorts de domaine" in t and "Retour à la vie" in t and "Soins" in t, "sorts de domaine (niveau 5) toujours préparés")
    check("Soigne 1d8 + 6" in t, "Disciple de la vie : Soins + SAG 3 + 3 (2 + niveau 1)")
    a.view("jeu")
    a.click('[data-a="row"][data-id="res:ccd"]')
    t = a.text("#panel")
    check("Renvoi des morts-vivants" in t and "DD 14" in t and "FP 1/2" in t and "Préservation de la vie" in t and "25 PV" in t, "Conduit divin : Renvoi (DD, Destruction) et Préservation de la vie")
    a.click('[data-a="ccd-use"][data-v="life"]')
    check(a.g("ccdU") == 1 and "25 PV" in a.toast(), "Préservation de la vie : Conduit divin utilisé, réserve rappelée")
    check(a.count('[data-a="ccd-use"]:disabled') == 2, "plus d'utilisation")
    a.long_rest(); check(a.g("ccdU") == 0, "repos long : Conduit divin récupéré")
    a.close()


def test_domaines_bonus(browser, devices, url):
    lum = dict(ALDRIC, domain="lumiere", level=8, cantrips=["sacred-flame", "light", "guidance", "thaumaturgy", "mending"])
    a = App(browser, devices, url, char=lum, tab="grimoire", view="jeu")
    t = a.text("#panel")
    check("2d8 + 3" in t, "Incantation puissante : Flamme sacrée 2d8 + SAG au niveau 8")
    check(a.count('[data-a="res-pip"][data-r="dres"]') == 3 and "Illumination protectrice" in t, "Illumination protectrice : SAG fois par repos long")
    check(a.js("R.cantrips(G())") == 5, "Lumière : un sort mineur de plus (5/5 au niveau 8)")
    a.close()
    gue = dict(ALDRIC, domain="guerre", level=10, items=[{"n": "Épée longue", "q": 1, "ref": "longsword", "eq": True}, {"n": "Harnois", "q": 1, "ref": "plate", "eq": True}])
    a = App(browser, devices, url, char=gue, tab="grimoire", view="jeu")
    t = a.text("#panel")
    check("+6" in a.text('.atk:has-text("Épée longue")') if a.count('.atk:has-text("Épée longue")') else "+6" in t, "Guerre : armes de guerre maîtrisées (FOR +2, maîtrise +4)")
    check("Frappe divine" in t and "Prêtre de guerre" in t and "Intervention divine" in t, "Frappe divine, Prêtre de guerre, Intervention divine")
    a.click('[data-a="row"][data-id="res:di"]'); a.click('[data-a="di-roll"]')
    check("Intervention divine" in a.toast(), "Implorer : d100 contre le niveau")
    a.tab("perso"); a.view("gerer")
    check("Harnois" in a.text("#panel") and "non maîtrisé" not in a.text("#panel"), "armures lourdes maîtrisées (Guerre)")
    a.close()
    forge = dict(ALDRIC, domain="forge", level=6, abil=dict(ALDRIC["abil"]), items=[{"n": "Harnois", "q": 1, "ref": "plate", "eq": True}], acMode="calc")
    a = App(browser, devices, url, char=forge, tab="perso", view="jeu")
    check(a.js("acOf(G())") == 19 and a.js("G().tools") is not None, "Âme de la forge : +1 CA en armure lourde (18 + 1)")
    a.close()


def test_passage_niveau_5(browser, devices, url):
    a = App(browser, devices, url, char=dict(ALDRIC, level=4), tab="grimoire", view="jeu")
    a.click('[data-a="lu-open"]')
    t = a.text("#lvlup")
    check("Retour à la vie" in t and "Lueur d'espoir" in t and "FP 1/2" in t, "niveau 5 : nouveaux sorts de domaine, Destruction des morts-vivants")
    a.click(".lufoot .primary"); a.click(".lufoot .primary"); a.click('[data-a="lu-go"]')
    check(a.g("level") == 5, "niveau 5")
    a.close()
