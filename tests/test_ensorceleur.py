"""Ensorceleur (Manuel des joueurs 2014) : origine à la création, points de sorcellerie, métamagie, Lignée draconique, Magie sauvage."""
from helpers import App, check
from test_creation import disabled, nxt, start

YSOLDE = {"name": "Ysolde", "cls": "ensorceleur", "level": 5, "v": 3, "abil": {"str": 8, "dex": 14, "con": 14, "int": 10, "wis": 10, "cha": 16}, "hpMax": 32,
          "sorig": "draco", "anc": "rouge", "cantrips": ["fire-bolt", "ray-of-frost", "light", "mage-hand", "prestidigitation"],
          "prepared": ["magic-missile", "shield", "fireball", "mirror-image", "burning-hands", "scorching-ray"], "meta": ["accelere", "jumeau"], "updatedAt": 1}


def test_creation_draconique(browser, devices, url):
    a = App(browser, devices, url, char=None)
    start(a, "ensorceleur", "Ysolde")
    a.click('[data-a="cr-race"][data-v="elfe"]'); a.click('[data-a="cr-sub"][data-v="bois"]'); nxt(a)
    for k, v in zip(["cha", "con", "dex", "wis", "int", "str"], ["15", "14", "13", "12", "10", "8"]): a.pg.select_option(f'[data-crstd="{k}"]', v)
    nxt(a); a.click('[data-a="cr-bg"][data-v="criminel"]'); a.pg.select_option('[data-crbgtool="0"]', "Jeu de dés"); nxt(a)
    for k in ["arcana", "persuasion"]: a.click(f'[data-a="cr-skill"][data-v="{k}"]')
    check(disabled(a, '[data-a="cr-next"]') and "origine" in a.text(".lufoot"), "origine obligatoire au niveau 1")
    a.click('[data-a="cr-sorig"][data-v="draco"]')
    check(disabled(a, '[data-a="cr-next"]'), "ancêtre obligatoire")
    a.click('[data-a="cr-sanc"][data-v="bleu"]'); nxt(a)
    for i in ["fire-bolt", "shocking-grasp", "light", "prestidigitation"]: a.click(f'[data-a="cr-can"][data-v="{i}"]')
    check(disabled(a, '[data-a="cr-can"][data-v="mage-hand"]'), "4 sorts mineurs au niveau 1")
    for i in ["magic-missile", "shield"]: a.click(f'[data-a="cr-prep"][data-v="{i}"]')
    check(disabled(a, '[data-a="cr-prep"][data-v="sleep"]') and "Sorts connus" in a.text("#crsheet"), "2 sorts connus au niveau 1")
    nxt(a); nxt(a); a.click('[data-a="cr-go"]')
    check(a.g("sorig") == "draco" and a.g("anc") == "bleu" and a.js("G().langs.includes('Draconique')"), "lignée draconique, ancêtre bleu, draconique")
    check(a.g("hpMax") == 6 + 2 + 1 and a.js("acOf(G())") == 13 + 2, f"Résilience draconique : PV 6 + CON + 1, CA 13 + DEX : {a.g('hpMax')} {a.js('acOf(G())')}")
    check(a.g("prepared.length") == 2 and a.g("cantrips.length") == 4, "sorts connus et mineurs")
    a.close()


def test_source_et_metamagie(browser, devices, url):
    a = App(browser, devices, url, char=YSOLDE, tab="grimoire", view="jeu")
    check("5/5" in a.text(".slots.res"), "5 points de sorcellerie au niveau 5")
    a.click('[data-a="row"][data-id="res:src"]'); a.click('[data-a="sp-make"][data-l="1"]')
    check(a.g("spU") == 2 and a.g("made['1']") == 1 and a.count(".slotrow .pip.made") == 1, "emplacement de niveau 1 créé (2 points), en pointillé")
    a.click('[data-a="sp-conv"][data-l="2"]')
    check(a.g("spU") == 0 and a.g("used['2']") == 1, "emplacement de niveau 2 converti : +2 points")
    a.undo(); check(a.g("spU") == 2, "annulable")
    a.click('[data-a="row"][data-id="fire-bolt"]')
    check(a.count('[data-a="mm-tog"][data-v="accelere"]') == 1 and a.count('[data-a="mm-tog"][data-v="jumeau"]:not([disabled])') == 1, "métamagie proposée sur Trait de feu")
    a.click('[data-a="mm-tog"][data-id="fire-bolt"][data-v="jumeau"]'); a.click('[data-a="cast"][data-id="fire-bolt"]')
    check(a.g("spU") == 3 and "Sort jumeau" in a.toast(), "Sort jumeau sur un sort mineur : 1 point")
    a.click('[data-a="row"][data-id="fireball"]')
    check(a.count('[data-a="mm-tog"][data-id="fireball"][data-v="jumeau"]:disabled') == 1, "Sort jumeau grisé pour un sort de zone")
    a.click('[data-a="longrest"]')
    check(a.g("spU") == 0 and a.js("Object.keys(G().made).length") == 0, "repos long : points récupérés, emplacements créés perdus")
    a.close()
    a = App(browser, devices, url, char=dict(YSOLDE, level=6), tab="grimoire", view="jeu")
    check("8d6 + 3 feu" in a.text("#panel"), "Affinité élémentaire (niveau 6) : Boule de feu + CHA")
    a.close()


def test_magie_sauvage(browser, devices, url):
    z = dict(YSOLDE, name="Zéphyr", sorig="sauvage", level=6)
    a = App(browser, devices, url, char=z, tab="grimoire", view="jeu")
    a.click('[data-a="cast"][data-id="magic-missile"]')
    check(a.count("#wild-card") == 1 and "Sursaut de magie sauvage" in a.text("#wild-card"), "proposition de sursaut après un sort de niveau 1")
    a.click('[data-a="wm-d20"]')
    check("d20 :" in a.text("#wild-card"), "d20 lancé")
    a.click('[data-a="wm-close"]')
    a.click('[data-a="res-pip"][data-r="tide"]'); check(a.g("tideU") == 1, "Marée du chaos utilisée")
    a.click('[data-a="wm-table"]')
    check("d100 :" in a.text("#wild-card") and a.g("tideU") == 0, "sursaut sur la table : effet affiché, Marée du chaos récupérée")
    a.click('[data-a="sp-spend"][data-v="bend"]'); check(a.g("spU") == 2 and "Chance forcée" in a.toast(), "Chance forcée : 2 points")
    a.close()


def test_passage_niveau_3(browser, devices, url):
    a = App(browser, devices, url, char=dict(YSOLDE, level=2, meta=[], prepared=["magic-missile", "shield", "sleep"]), tab="grimoire", view="jeu")
    a.click('[data-a="lu-open"]'); a.click(".lufoot .primary")
    for k in ["accelere", "subtil"]: a.click(f'[data-a="lu-mm"][data-v="{k}"]')
    check(disabled(a, '[data-a="lu-mm"][data-v="jumeau"]'), "2 options de métamagie au niveau 3")
    a.click('[data-a="lu-kpick"][data-id="mirror-image"]') if a.count('[data-a="lu-kpick"][data-id="mirror-image"]') else a.click('[data-a="lu-pflt"][data-v="2"]') or a.click('[data-a="lu-kpick"][data-id="mirror-image"]')
    a.click(".lufoot .primary"); a.click('[data-a="lu-go"]')
    check(a.g("level") == 3 and a.js("G().meta.join()") == "accelere,subtil" and a.g("prepared.length") == 4, "niveau 3 : métamagie et un sort connu de plus")
    a.close()
