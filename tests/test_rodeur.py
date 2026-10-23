"""Rôdeur (Manuel des joueurs 2014) : sorts connus, Ennemi juré, Explorateur-né, Chasseur, Maître des bêtes et son compagnon."""
from helpers import App, check
from test_creation import disabled, nxt, start

BRAM = {"name": "Bram", "cls": "rodeur", "level": 5, "wis": 14, "rarch": "betes", "foes": ["dragons"], "terrs": ["foret"],
        "prepared": ["hunters-mark", "cure-wounds", "goodberry", "pass-without-trace"], "updatedAt": 1}


def lu_next(a):
    a.click(".lufoot .primary")


def test_creation_et_niveaux_chasseur(browser, devices, url):
    a = App(browser, devices, url, char=None)
    start(a, "rodeur", "Sylve")
    a.click('[data-a="cr-race"][data-v="elfe"]'); a.click('[data-a="cr-sub"][data-v="bois"]'); nxt(a)
    for k, v in zip(["dex", "wis", "con", "str", "int", "cha"], ["15", "14", "13", "12", "10", "8"]): a.pg.select_option(f'[data-crstd="{k}"]', v)
    nxt(a)
    a.click('[data-a="cr-bg"][data-v="criminel"]'); a.pg.select_option('[data-crbgtool="0"]', "Jeu de dés"); nxt(a)
    for k in ["athletics", "survival", "nature"]: a.click(f'[data-a="cr-skill"][data-v="{k}"]')
    check(disabled(a, '[data-a="cr-skill"][data-v="insight"]'), "3 compétences de rôdeur au plus")
    check(disabled(a, '[data-a="cr-next"]') and "ennemi juré" in a.text(".lufoot"), "ennemi juré obligatoire à la création")
    a.click('[data-a="cr-rfoe"][data-v="humanoides"]'); a.pg.fill("#cr-rfoeh", "gobelinoïdes et orcs")
    check(disabled(a, '[data-a="cr-rfoe"][data-v="dragons"]'), "un seul ennemi juré au niveau 1")
    a.click('[data-a="cr-rterr"][data-v="foret"]'); nxt(a)
    check("Équipement" in a.text(".crstep") and "sur 7" in a.text(".crstep"), "pas d'étape Sorts : le rôdeur n'a pas de sort au niveau 1")
    nxt(a)
    for _ in range(4): a.click('[data-a="cr-lv"][data-v="1"]')
    a.click('[data-a="cr-go"]')
    check(a.g("foes.join()") == "humanoides" and a.g("foeH") == "gobelinoïdes et orcs" and a.g("terrs.join()") == "foret", "ennemi juré et terrain enregistrés")
    check(a.js("G().items.some(x => x.ref === 'longbow') && G().items.some(x => x.ref === 'scale-mail')"), "arc long et armure d'écailles")
    # 1 → 2 : style de combat et 2 premiers sorts connus
    lu_next(a)
    check("Sorts connus · 0 → 2" in a.text("#lvlup"), "niveau 2 : 2 sorts à apprendre")
    a.click('[data-a="lu-rstyle"][data-v="archerie"]')
    a.click('[data-a="lu-pflt"][data-v="1"]')
    for i in ["hunters-mark", "cure-wounds"]: a.click(f'[data-a="lu-kpick"][data-id="{i}"]')
    check(a.js("document.querySelector('[data-a=lu-kpick][data-id=goodberry]').classList.contains('full')"), "pas plus de 2 sorts")
    lu_next(a); a.click('[data-a="lu-go"]')
    check(a.g("level") == 2 and a.g("prepared.join()") == "hunters-mark,cure-wounds" and a.g("style") == "archerie", "niveau 2 : sorts connus et Archerie")
    # 2 → 3 : Chasseur, Tueur de colosses, un sort de plus
    a.click('[data-a="lu-sub"][data-v="chasseur"]'); a.click('[data-a="lu-subx"][data-v="colosse"]'); lu_next(a)
    a.click('[data-a="lu-kpick"][data-id="hail-of-thorns"]'); lu_next(a); a.click('[data-a="lu-go"]')
    check(a.g("rarch") == "chasseur" and a.g("hunt[3]") == "colosse" and a.g("prepared.length") == 3, "niveau 3 : Chasseur, Tueur de colosses")
    # 3 → 4 : amélioration de caractéristiques, pas de nouveau sort
    a.click('[data-a="lu-asi"][data-v="wis"]'); a.click('[data-a="lu-asi"][data-v="wis"]'); lu_next(a)
    check("aucun nouveau sort" in a.text("#lvlup"), "niveau 4 : sorts connus inchangés (3)")
    lu_next(a); a.click('[data-a="lu-go"]')
    # 4 → 5 : un sort de niveau 2, et un sort remplacé
    lu_next(a)
    a.click('[data-a="lu-kpick"][data-id="pass-without-trace"]')
    a.pg.select_option("#lu-kout", "cure-wounds"); a.pg.wait_for_timeout(60); a.pg.select_option("#lu-kin", "goodberry"); a.pg.wait_for_timeout(60)
    lu_next(a)
    check("Soins → Baies nourricières" in a.text("#lvlup"), "récapitulatif : remplacement")
    a.click('[data-a="lu-go"]')
    check(a.g("level") == 5 and a.js("!S.lu") and sorted(a.js("G().prepared")) == ["goodberry", "hail-of-thorns", "hunters-mark", "pass-without-trace"], f"niveau 5 : 4 sorts connus {a.js('G().prepared')}")
    check(a.g("abil.wis") == 17 and a.g("abil.dex") == 17, "SAG 14 + 1 (elfe des bois) + 2, DEX 15 + 2")
    # Gérer : compteur, Apprendre grisé quand c'est plein
    a.tab("grimoire"); a.view("gerer")
    check("4 / 4" in a.text(".kncount") and "Ennemi juré" in a.text("#panel"), "Sorts connus 4 / 4, réglages du rôdeur")
    a.click('[data-a="kn-flt"][data-v="1"]')
    check(disabled(a, '[data-a="kn-toggle"][data-id="alarm"]'), "Apprendre grisé : compte plein")
    a.click('[data-a="kn-toggle"][data-id="goodberry"]')
    check(a.g("prepared.length") == 3 and "oublié" in a.toast(), "Oublier (au cas où)")
    a.undo(); check(a.g("prepared.length") == 4, "annuler l'oubli")
    # En jeu : Archerie et Marque du chasseur sur l'arc long
    a.view("jeu")
    arc = lambda: a.text('.atk:has-text("Arc long")') if a.count('.atk:has-text("Arc long")') else a.text("#panel")
    check("+8" in arc() and "Archerie +2" in arc(), "arc long : DEX +3, maîtrise +3, Archerie +2")
    a.click('[data-a="cast"][data-id="hunters-mark"]')
    check("+1d6 Marque du chasseur" in a.text("#panel") and "Tueur de colosses" in a.text("#panel"), "Marque du chasseur rappelée sur les attaques, Tueur de colosses")
    a.close()


def test_maitre_des_betes(browser, devices, url):
    a = App(browser, devices, url, char=BRAM, tab="grimoire", view="gerer")
    check(a.count("#pet-q") == 1, "pas de compagnon : choix dans le Bestiaire")
    n = a.count('[data-a="pet-pick"]'); check(n == 41, f"bêtes de taille M au plus et FP 1/4 au plus : {n}")
    a.pg.fill("#pet-q", "loup"); a.pg.wait_for_timeout(80)
    check(a.count('[data-a="pet-pick"]') == 2, "recherche (Loup, Araignée-loup géante)")
    a.click('[data-a="row"][data-id="petc:loup"]')
    check("CA 16" in a.text(".petstats") and "2d4 + 5 perforant" in a.text(".petstats") and "Perception +6" in a.text(".petstats"), "fiche calculée avec la maîtrise (+3)")
    a.click('[data-a="pet-pick"][data-id="loup"]')
    check(a.g("pet.id") == "loup" and a.count("#pet-name") == 1, "compagnon choisi")
    a.pg.fill("#pet-name", "Croc"); a.pg.wait_for_timeout(60)
    a.click('[data-a="row"][data-id="pet:g"]')
    check("Morsure" in a.text(".petstats") and "+7" in a.text(".petstats"), "détail du compagnon dépliable dans Gérer")
    a.view("jeu")
    check(a.count("#pet-card") == 1 and "20" in a.text("#pet-card .hph .v"), "carte du compagnon : PV max = 4 × 5")
    a.pg.fill("#pet-n", "7"); a.click('[data-a="pet-dmg"]')
    check(a.g("pet.hp") == 13 and "Croc" in a.toast(), "dégâts au compagnon")
    a.pg.fill("#pet-n", "3"); a.click('[data-a="pet-heal"]')
    check(a.g("pet.hp") == 16, "soins au compagnon")
    a.undo(); check(a.g("pet.hp") == 13, "annuler le soin")
    check("13/20" in a.text('[data-a="pet-top"]'), "puce du compagnon dans la barre du bas")
    a.pg.fill("#pet-n", "30"); a.click('[data-a="pet-dmg"]')
    check(a.g("pet.hp") == 0 and "à 0 PV" in a.text("#pet-card"), "compagnon à 0 PV")
    a.click('[data-a="longrest"]') if a.count('[data-a="longrest"]') else None
    check(a.g("pet.hp") is None, "repos long : compagnon soigné")
    # 5 → 6 : un ennemi juré et un terrain de plus
    a.click('[data-a="lu-open"]'); lu_next(a)
    check(a.count('[data-a="lu-rfoe"][data-v="dragons"]:disabled') == 1, "ennemi déjà choisi verrouillé")
    a.click('[data-a="lu-rfoe"][data-v="geants"]'); a.click('[data-a="lu-rterr"][data-v="montagne"]')
    lu_next(a); a.click('[data-a="lu-go"]')
    check(a.g("foes.join()") == "dragons,geants" and a.g("terrs.join()") == "foret,montagne", "niveau 6 : 2 ennemis jurés, 2 terrains")
    a.close()
