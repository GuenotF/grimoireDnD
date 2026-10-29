"""Assistant de création (règles 2014) : race, caractéristiques, historique, compétences, sorts, équipement, niveau de départ."""
from helpers import App, check


def start(a, cls, name):
    a.click('[data-a="new"]'); a.click(f'[data-a="nw-cls"][data-v="{cls}"]'); a.pg.fill("#nw-name", name); a.click('[data-a="nw-wizard"]')


def nxt(a):
    a.click('[data-a="cr-next"]')


def disabled(a, sel):
    return a.js(f"(() => {{ const e = document.querySelector('{sel}'); return !e || e.disabled || e.getAttribute('aria-disabled') === 'true'; }})()")


def test_roublarde_elfe_niveau_4(browser, devices, url):
    a = App(browser, devices, url, char=None)
    start(a, "roublard", "Lyra")
    check(disabled(a, '[data-a="cr-next"]'), "race obligatoire")
    a.click('[data-a="cr-race"][data-v="elfe"]')
    check(disabled(a, '[data-a="cr-next"]') and "sous-race" in a.text(".lufoot"), "sous-race obligatoire")
    a.click('[data-a="cr-sub"][data-v="bois"]'); nxt(a)
    a.click('[data-a="cr-method"][data-v="pb"]')
    for k, n in [("dex", 7), ("con", 6), ("int", 2), ("wis", 5), ("cha", 4)]:
        for _ in range(n): a.click(f'[data-a="cr-pb"][data-k="{k}"][data-v="1"]')
    check(disabled(a, '[data-a="cr-pb"][data-k="str"][data-v="1"]') and "0 restant" in a.text(".crbudget"), "27 points : plus rien à dépenser")
    check("17" in a.text(".crabr:nth-child(2) .tot"), "DEX 15 + 2 (race) = 17")
    nxt(a)
    a.click('[data-a="cr-bg"][data-v="criminel"]'); a.pg.select_option('[data-crbgtool="0"]', "Jeu de dés")
    check(disabled(a, '[data-a="cr-next"]') and a.count(".crdup") == 1, "doublon d'outils de voleur à remplacer")
    a.pg.select_option('[data-crswaptool]', "Kit de déguisement"); nxt(a)
    check(disabled(a, '[data-a="cr-skill"][data-v="stealth"]') and disabled(a, '[data-a="cr-skill"][data-v="perception"]'), "compétences de la race et de l'historique verrouillées")
    for k in ["acrobatics", "sleight", "insight", "investigation"]: a.click(f'[data-a="cr-skill"][data-v="{k}"]')
    check(disabled(a, '[data-a="cr-skill"][data-v="athletics"]'), "4 compétences au plus")
    check(a.count('[data-a="cr-exp"][data-v="athletics"]') == 0, "Expertise : seulement des compétences maîtrisées")
    a.click('[data-a="cr-exp"][data-v="acrobatics"]'); a.click('[data-a="cr-exp"][data-v="tools"]')
    check(disabled(a, '[data-a="cr-exp"][data-v="insight"]'), "2 expertises au plus")
    nxt(a)
    check("Équipement" in a.text(".crstep") and "sur 7" in a.text(".crstep"), "pas d'étape Sorts pour le roublard")
    nxt(a)
    for _ in range(3): a.click('[data-a="cr-lv"][data-v="1"]')
    a.click('[data-a="cr-go"]')
    for _ in range(3):
        a.click(".lufoot .primary")
        if a.count('[data-a="lu-go"]') == 0: a.click(".lufoot .primary")
        a.click('[data-a="lu-go"]')
    g = lambda e: a.g(e)
    check(g("level") == 4 and a.js("!S.lu"), "niveau 4 : l'assistant de niveau s'est enchaîné 3 fois")
    check(g("abil.dex") == 17 and g("abil.wis") == 14 and g("speed") == 10.5 and g("hpMax") == 31, f"caractéristiques, vitesse, PV : {a.js('JSON.stringify(G().abil)')} {g('hpMax')}")
    check(g("skills.acrobatics") == 2 and g("tools['Outils de voleur']") == 2 and g("skills.perception") == 1, "Expertise et maîtrises")
    check(a.js("G().items.some(x => x.ref === 'rapier' && x.eq)") and a.js("acOf(G())") == 14 and g("money.po") == 15, "paquetage relié au Manuel, CA 14, 15 po")
    check(a.js("G().traits.some(t => t.n === 'Transe')") and a.js("G().langs.includes('Elfique')"), "traits et langues de la race")
    a.close()


def test_magicien_haut_elfe_et_variantes(browser, devices, url):
    a = App(browser, devices, url, char=None)
    start(a, "magicien", "Ilmar")
    a.click('[data-a="cr-race"][data-v="elfe"]'); a.click('[data-a="cr-sub"][data-v="haut"]')
    a.pg.select_option('[data-crlang="0"]', "Draconique"); a.pg.select_option("#cr-rcantrip", "light")
    nxt(a)
    for k, v in zip(["int", "dex", "con", "wis", "cha", "str"], ["15", "14", "13", "12", "10", "8"]): a.pg.select_option(f'[data-crstd="{k}"]', v)
    check(a.js("document.querySelector('[data-crstd=str] option[value=\"15\"]').disabled"), "tableau standard : une valeur une seule fois")
    nxt(a)
    a.click('[data-a="cr-bg"][data-v="sage"]'); a.pg.select_option('[data-crbglang="0"]', "Nain"); a.pg.select_option('[data-crbglang="1"]', "Gnome"); nxt(a)
    for k in ["investigation", "medicine"]: a.click(f'[data-a="cr-skill"][data-v="{k}"]')
    nxt(a)
    check("Sorts" in a.text(".crstep"), "étape Sorts")
    for i in ["fire-bolt", "ray-of-frost", "mage-hand"]: a.click(f'[data-a="cr-can"][data-v="{i}"]')
    for i in ["magic-missile", "shield", "sleep", "burning-hands", "detect-magic", "mage-armor"]: a.click(f'[data-a="cr-book"][data-v="{i}"]')
    check(disabled(a, '[data-a="cr-book"][data-v="charm-person"]'), "6 sorts au plus dans le grimoire")
    for i in ["magic-missile", "shield"]: a.click(f'[data-a="cr-prep"][data-v="{i}"]')
    nxt(a)
    a.click('[data-a="cr-eqmode"][data-v="gold"]'); a.click('[data-a="cr-goldroll"]')
    gold = int(a.js("S.cr.gold")); check(40 <= gold <= 160, f"or de départ 4d4 × 10 : {gold}")
    nxt(a); a.click('[data-a="cr-go"]')
    check(a.g("abil.int") == 16 and a.g("spells.length") == 6 and a.g("cantrips.length") == 3 and a.g("prepared.length") == 2, "magicien créé avec son grimoire")
    check(a.g("items.length") == 0 and a.g("money.po") == gold and a.js("G().langs.join()") == "Commun,Elfique,Draconique,Nain,Gnome", "or au lieu de l'équipement ; langues")
    check(a.js("G().traits.find(t => t.n === 'Sort mineur').d").startswith("Lumière"), "sort mineur du haut-elfe")
    a.close()
    b = App(browser, devices, url, char=None)
    start(b, "barbare", "Brok")
    b.click('[data-a="cr-race"][data-v="nain"]'); b.click('[data-a="cr-sub"][data-v="collines"]'); b.click('[data-a="cr-rtool"][data-v="Outils de forgeron"]'); nxt(b)
    b.click('[data-a="cr-method"][data-v="dice"]'); b.click('[data-a="cr-roll"]')
    check(b.js("Object.values(S.cr.dice).every(v => v >= 3 && v <= 18)"), "4d6 lancés")
    nxt(b); b.click('[data-a="cr-bg"][data-v="soldat"]'); b.pg.select_option('[data-crbgtool="0"]', "Jeu de cartes"); nxt(b)
    check(b.count('[data-a="cr-exp"]') == 0, "pas d'Expertise hors roublard")
    for k in ["perception", "survival"]: b.click(f'[data-a="cr-skill"][data-v="{k}"]')
    nxt(b); b.click('[data-a="cr-eq"][data-k="0"][data-v="1"]')
    check(disabled(b, '[data-a="cr-next"]'), "arme de guerre à choisir")
    b.pg.select_option('[data-crpick="0-1-0"]', "battleaxe"); nxt(b); b.click('[data-a="cr-go"]')
    con = b.js("Math.floor((G().abil.con - 10) / 2)")
    check(b.g("hpMax") == 12 + con + 1 and b.js("G().items.some(x => x.ref === 'battleaxe')"), "nain des collines : +1 PV ; hache d'armes choisie")
    check(b.js("G().defs.some(d => d.t === 'res' && d.v === 'poison')"), "résistance au poison")
    b.close()


def test_races_a_choix(browser, devices, url):
    a = App(browser, devices, url, char=None)
    start(a, "paladin", "Vara")
    a.click('[data-a="cr-race"][data-v="humain"]'); a.click('[data-a="cr-sub"][data-v="variante"]')
    a.click('[data-a="cr-rasi"][data-v="str"]'); a.click('[data-a="cr-rasi"][data-v="cha"]')
    check(disabled(a, '[data-a="cr-rasi"][data-v="con"]'), "variante : +1 à deux caractéristiques seulement")
    a.click('[data-a="cr-rskill"][data-v="athletics"]'); a.pg.select_option('[data-crlang="0"]', "Nain")
    a.click('[data-a="fp-sel"][data-v="tough"]')
    check(not disabled(a, '[data-a="cr-next"]'), "variante complète avec un don")
    nxt(a)
    for k, v in zip(["str", "cha", "con", "wis", "dex", "int"], ["15", "14", "13", "12", "10", "8"]): a.pg.select_option(f'[data-crstd="{k}"]', v)
    nxt(a)
    a.click('[data-a="cr-bg"][data-v="acolyte"]'); a.pg.select_option('[data-crbglang="0"]', "Céleste"); a.pg.select_option('[data-crbglang="1"]', "Infernal"); nxt(a)
    a.click('[data-a="cr-skill"][data-v="persuasion"]'); a.click('[data-a="cr-skill"][data-v="medicine"]'); nxt(a)
    a.click('[data-a="cr-eq"][data-k="0"][data-v="0"]'); a.pg.select_option('[data-crpick="0-0-0"]', "longsword"); nxt(a); a.click('[data-a="cr-go"]')
    check(a.js("G().traits.some(t => t.feat === 'tough')") and a.g("hpMax") == 10 + a.js("Math.floor((G().abil.con - 10) / 2)") + 2, "don Robuste appliqué (+2 PV)")
    check(a.js("acOf(G())") == 18 and a.g("skills.athletics") == 1, "cotte de mailles + bouclier : CA 18 ; compétence de la variante")
    a.close()


def test_sorts_innes(browser, devices, url):
    from helpers import NEMEIA
    from test_roublard import OMBRE
    a = App(browser, devices, url, char=dict(NEMEIA, level=5, v=3, race={"id": "tieffelin", "n": "Tieffelin"}, abil={"str": 8, "dex": 14, "con": 12, "int": 18, "wis": 10, "cha": 14}), view="jeu")
    t = a.text('[data-k="act-inn"]') + a.text("#panel")
    check("Thaumaturgie" in t and "Représailles infernales" in t and "Ténèbres" in t, "sorts du tieffelin au niveau 5")
    check("3d10 feu" in t and "DEX 13" in t, "Représailles infernales lancées au niveau 2, DD avec le Charisme (8 + 3 + 2)")
    a.click('[data-a="inn-cast"][data-id="hellish-rebuke"]')
    check(a.g("innU['hellish-rebuke']") == 1 and a.count('[data-a="inn-cast"][data-id="hellish-rebuke"]') == 0, "une fois par repos long")
    check(a.js("JSON.stringify(G().used)") == "{}", "aucun emplacement dépensé")
    a.click('[data-a="inn-cast"][data-id="darkness"]')
    check(a.js("concOf(G()) && concOf(G()).id") == "darkness", "Ténèbres : concentration suivie")
    a.long_rest()
    check(not a.g("innU['hellish-rebuke']"), "repos long : de nouveau disponible")
    a.close()
    b = App(browser, devices, url, char=dict(OMBRE, level=3), view="jeu")
    check(b.count('[data-k="act-inn"]') == 0, "pas de race : pas de section")
    b.click('[data-a="hero-edit"]'); b.pg.select_option("#f-race", "elfe:drow")
    check("Lumières dansantes" in b.text("#panel") and "Lueurs féeriques" in b.text("#panel") and not any("Ténèbres" in x for x in b.texts(".jrow.inn")), "roublard drow : sorts innés dans Capacités (Ténèbres au niveau 5)")
    b.close()


def test_souffle_drakeide(browser, devices, url):
    from helpers import App as A2
    base = {"v": 3, "name": "Kriv", "cls": "barbare", "level": 6, "abil": {"str": 16, "dex": 12, "con": 14, "int": 8, "wis": 10, "cha": 12}, "hpMax": 60, "updatedAt": 1,
            "race": {"id": "drakeide", "n": "Drakéide"}, "traits": [{"n": "Ascendance draconique (dragon rouge)", "o": "race", "d": "Résistance : feu."}]}
    a = A2(browser, devices, url, char=base, tab="caps", view="jeu")
    check(a.g("race.anc") == 3, "ancienne fiche : ascendance retrouvée dans le trait (rouge)")
    t = a.text(".jrow.inn")
    check("Souffle" in t and "3d6 feu" in t and "DEX 13" in t and "cône de 4,5 m" in t, f"Souffle en jeu : 3d6 au niveau 6, DD 8 + CON + maîtrise ({t})")
    a.click('[data-a="breath-use"]')
    check(a.g("breathU") == 1 and a.count('[data-a="breath-use"]') == 0 and "Souffle" in a.toast(), "utilisé")
    a.click('[data-a="short-open"]')
    check("Souffle" in a.text("#short-panel"), "repos court : Souffle annoncé")
    a.click('[data-a="short-done"]')
    check(a.g("breathU") == 0 and "Souffle récupéré" in a.toast(), "récupéré au repos court")
    a.close()


def test_creation_drakeide_souffle(browser, devices, url):
    a = App(browser, devices, url, char=None)
    start(a, "paladin", "Vara")
    a.click('[data-a="cr-race"][data-v="drakeide"]'); a.click('[data-a="cr-anc"][data-v="1"]'); nxt(a)
    for k, v in zip(["str", "cha", "con", "wis", "dex", "int"], ["15", "14", "13", "12", "10", "8"]): a.pg.select_option(f'[data-crstd="{k}"]', v)
    nxt(a)
    a.click('[data-a="cr-bg"][data-v="acolyte"]'); a.pg.select_option('[data-crbglang="0"]', "Céleste"); a.pg.select_option('[data-crbglang="1"]', "Infernal"); nxt(a)
    a.click('[data-a="cr-skill"][data-v="persuasion"]'); a.click('[data-a="cr-skill"][data-v="medicine"]'); nxt(a)
    a.click('[data-a="cr-eq"][data-k="0"][data-v="0"]'); a.pg.select_option('[data-crpick="0-0-0"]', "longsword"); nxt(a); a.click('[data-a="cr-go"]')
    check(a.g("race.anc") == 1, "ascendance gardée sur la fiche (bleu)")
    a.tab("grimoire"); a.view("jeu")
    t = a.text(".jrow.inn")
    check("2d6 foudre" in t and "DEX 11" in t and "ligne de 1,5 × 9 m" in t, f"Souffle dans l'onglet d'action dès la création ({t})")
    a.close()
