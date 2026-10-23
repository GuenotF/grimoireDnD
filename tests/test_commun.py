"""Fonctions communes à toutes les classes : création, sauvegarde, notes, sections, sorts en cours."""
import json, pathlib, tempfile
from helpers import App, check, NEMEIA, KAEL, MALFAEL

tmp_path = lambda: pathlib.Path(tempfile.mkdtemp())


def test_accueil_et_creation(browser, devices, url):
    a = App(browser, devices, url)
    check(a.count('.welcome [data-a="new"]') == 1, "un seul bouton de création sur l'accueil")
    check(a.count('label[for="f-import"]') == 1, "bouton Importer sur l'accueil")
    a.click('.welcome [data-a="new"]')
    classes = a.texts(".nwcard b")
    check(classes == ["Barbare", "Druide", "Magicien", "Paladin", "Rôdeur", "Roublard"], f"classes proposées : {classes}")
    a.click('[data-a="nw-cls"][data-v="paladin"]'); a.pg.fill("#nw-name", "Ser Kael"); a.click(".nwgo")
    check(a.g("cls") == "paladin" and a.g("name") == "Ser Kael", "paladin créé")
    check("Paladin niveau 1" in a.text(".subline"), "sous-titre du paladin")
    a.close()


def test_export_import_conserve_tout(browser, devices, url):
    char = dict(MALFAEL, favs=["ours-brun", "loup"], wsU=1, wsForm={"id": "ours-brun", "hp": 20, "max": 34},
                snotes={"moonbeam": "Déplacer le rayon : action bonus"})
    a = App(browser, devices, url, char=char)
    a.tab("sauvegarde")
    with a.pg.expect_download() as dl:
        a.click('[data-a="dl-json"]')
    d = dl.value
    path = str(tmp_path() / d.suggested_filename); d.save_as(path)
    check(d.suggested_filename.startswith("Druide - Malfaël Clanchombre - "), f"nom du fichier : {d.suggested_filename}")
    data = json.load(open(path))
    g = data["grimoire"]
    check(data["format"] == "grimoire-5e", "format du fichier")
    check(g["v"] == 3, "numéro de version du format dans la sauvegarde")
    check(g["favs"] == ["ours-brun", "loup"] and g["wsForm"]["hp"] == 20 and g["wsU"] == 1, "Forme sauvage exportée")
    check(g["snotes"]["moonbeam"].startswith("Déplacer"), "notes exportées")
    a.close()
    b = App(browser, devices, url)
    b.pg.set_input_files("#f-import", path); b.pg.wait_for_timeout(300)
    check(b.g("cls") == "druide" and b.g("favs.join()") == "ours-brun,loup" and b.g("wsForm.hp") == 20, "import identique")
    b.close()


def test_suppression(browser, devices, url):
    a = App(browser, devices, url, char=NEMEIA, tab="sauvegarde")
    a.click('[data-a="del"]'); a.click('[data-a="del"]')
    check(a.js("Object.keys(S.list).length") == 0 and "supprimé" in a.toast(), "personnage supprimé")
    check(a.count('.welcome [data-a="new"]') == 1, "retour à l'accueil")
    a.close()


def test_ancien_fichier_sans_classe_est_magicien(browser, devices, url):
    old = {k: v for k, v in NEMEIA.items() if k != "cls"}
    a = App(browser, devices, url, char=old)
    check(a.g("cls") == "magicien", "classe par défaut")
    check(a.g("v") == 3, "format migré vers la version 3")
    check(a.g("abil.int") == 18 and a.g("abil.wis") == 10 and a.g("int") is None, "Intelligence reprise dans les caractéristiques")
    check(a.g("prepared.length") == 7, "sorts préparés gardés")
    a.close()


def test_notes_par_sort(browser, devices, url):
    a = App(browser, devices, url, char=dict(NEMEIA, snotes={"shield": "Réaction : l'annoncer avant les dégâts."}))
    check(a.count(".nbox") == 0, "notes masquées tant que le sort est replié")
    a.click('.npen[data-id="suggestion"]')
    a.pg.fill("#n-edit", "Phrase prête"); a.click('[data-a="note-save"]')
    check(a.g("snotes.suggestion") == "Phrase prête", "note enregistrée")
    a.click('[data-a="row"][data-id="shield"]')
    check("Réaction" in a.text(".jbody .nbox"), "note visible dans le détail")
    a.view("jeu")
    check(a.count(".nmark") == 2, "repères ✎ en jeu")
    a.close()


def test_sections_repliables_retenues(browser, devices, url):
    a = App(browser, devices, url, char=NEMEIA)
    n0 = a.count(".jrow")
    a.click('[data-a="fold"][data-k="l1"]')
    check(a.count(".fold.shut") == 1 and a.count(".jrow") < n0, "niveau 1 replié")
    a.pg.reload(); a.pg.wait_for_timeout(400)
    check(a.count(".fold.shut") == 1, "repli retenu après rechargement")
    a.view("jeu")
    check(a.count(".fold.shut") == 0, "repli propre à chaque mode")
    a.close()


def test_sorts_en_cours_et_repos_long(browser, devices, url):
    a = App(browser, devices, url, char=NEMEIA, view="jeu")
    for sid in ["magic-missile", "charm-person", "shield", "levitate"]:
        a.click(f'.jline [data-a="cast"][data-id="{sid}"]')
    names = a.js("G().effects.map(e => e.name + (e.c ? '*' : ''))")
    check(names == ["Charme-personne", "Bouclier", "Lévitation*"], f"effets suivis : {names}")
    a.click('.slotbar .chip[data-a="fx-open"]')
    check(a.count(".fxitem") == 3, "volet des sorts en cours")
    a.click('[data-a="fx-all"]')
    check(a.g("effects.length") == 0, "tout terminer")
    a.click('.jline [data-a="cast"][data-id="levitate"]')
    a.click('[data-a="longrest"]')
    check(a.g("effects.length") == 0 and a.js("JSON.stringify(G().used)") == "{}", "repos long : tout récupéré")
    a.close()


def test_autres_sorts(browser, devices, url):
    a = App(browser, devices, url, char=NEMEIA)
    a.pg.check('[data-a="xused"][data-i="0"]'); a.pg.wait_for_timeout(50)
    check(a.g("extras[0].used") is True, "case utilisé")
    a.click('[data-a="row"][data-id="x:0"]'); a.click('.jbody [data-a="xedit"]')
    a.pg.fill("#x-enote", "à volonté"); a.click("form.extra.edit button[type=submit]")
    check(a.g("extras[0].note") == "à volonté", "modification")
    a.close()


def test_chaque_action_a_un_gestionnaire(browser, devices, url):
    """Contrôle statique : tout data-a="…" écrit dans le code correspond à une action déclarée (onClick, onChange, onSubmit)."""
    import glob, os, re
    files = glob.glob(os.path.join(os.path.dirname(__file__), "..", "src", "**", "*.js"), recursive=True)
    src = "".join(open(f, encoding="utf-8").read() for f in files if not f.endswith("actions.js"))  # actions.js : le registre lui-même
    used = set(re.findall(r'data-a="([a-z0-9-]+)"', src)) | set(re.findall(r"data-a=\\?'([a-z0-9-]+)", src))
    declared = set()
    for m in re.finditer(r'on(?:Click|Change|Submit)\((\[[^\]]*\]|"[^"]*")', src):
        declared |= set(re.findall(r'"([^"#][^"]*)"', m.group(1)))
    missing = sorted(used - declared)
    check(not missing, f"actions sans gestionnaire : {missing}")
    unused = sorted(declared - used)
    check(not unused, f"gestionnaires sans élément qui les déclenche : {unused}")


def test_fiches_imprimables(browser, devices, url):
    """Onglet Imprimer des trois classes : fichier téléchargé et contenu propre à chaque classe."""
    cases = [(NEMEIA, "Grimoire - Némeia.html", ["Le grimoire", "Restauration arcanique", "Journal de copie"]),
             (KAEL, "Paladin - Ser Kael.html", ["Imposition des mains", "reste", "/ 20 PV", "Châtiment divin", "Sorts de serment", "Agathys", "Sorts de paladin", "Style de combat"]),
             (dict(MALFAEL, favs=["ours-brun"]), "Druide - Malfaël Clanchombre.html", ["Forme sauvage", "Forme active", "Mes formes", "Ours brun", "Griffes", "Sorts de druide", "Changeforme de combat"])]
    for char, name, words in cases:
        a = App(browser, devices, url, char=char, tab="imprimer")
        check(a.count('[data-a="open-print"]') == 1, f"onglet Imprimer : {name}")
        with a.pg.expect_download() as dl:
            a.click('[data-a="dl-print"]')
        d = dl.value
        check(d.suggested_filename == name, f"nom du fichier : {d.suggested_filename}")
        path = str(tmp_path() / name); d.save_as(path); html = open(path, encoding="utf-8").read()
        for w in words + ["Points de vie", "Jets contre la mort", "Compétences", "PERCEPTION PASSIVE", "Notes du personnage"]:
            check(w in html, f"{name} : « {w} »")
        a.close()


def test_nouveau_personnage_clavier(browser, devices, url):
    a = App(browser, devices, url, char=None)
    a.click('[data-a="new"]'); a.click('[data-a="nw-cls"][data-v="rodeur"]')
    check(a.js("document.activeElement.id") != "nw-name", "choisir la classe n'ouvre pas le clavier")
    a.js("(document.documentElement.style.setProperty('--kb', '300px'), document.documentElement.style.setProperty('--vvh', '500px'), document.body.classList.add('kb-open'))")
    a.pg.wait_for_timeout(60)
    r = a.js("(() => { const b = document.getElementById('nwsheet').getBoundingClientRect(); return [Math.round(b.bottom), innerHeight, Math.round(b.height)]; })()")
    check(r[0] == r[1] - 300 and r[2] <= 484, f"volet au-dessus du clavier : {r}")
    a.close()
