"""Outils communs aux tests de l'Atelier du Grimoire (Playwright, navigateur Chromium)."""
import json

# Personnages de référence, au format des sauvegardes
NEMEIA = {"name": "Némeia", "cls": "magicien", "level": 4, "int": 18, "school": "Évocation",
          "cantrips": ["fire-bolt", "ray-of-frost", "mage-hand", "prestidigitation"],
          "spells": [{"id": i, "how": "niv"} for i in ["magic-missile", "burning-hands", "shield", "charm-person", "detect-magic", "shatter", "suggestion", "levitate", "sleep"]],
          "prepared": ["magic-missile", "shield", "shatter", "suggestion", "charm-person", "levitate", "burning-hands"],
          "extras": [{"name": "Thaumaturgie", "note": "Héritage tieffelin · à volonté", "used": False}], "updatedAt": 1}
KAEL = {"name": "Ser Kael", "cls": "paladin", "level": 4, "cha": 16, "oath": "conquete", "style": "defense",
        "prepared": ["shield-of-faith", "divine-favor", "cure-wounds"], "updatedAt": 1}
MALFAEL = {"name": "Malfaël Clanchombre", "cls": "druide", "level": 4, "wis": 16, "circle": "lune",
           "cantrips": ["create-bonfire", "druidcraft", "guidance"], "prepared": ["moonbeam", "entangle", "cure-wounds", "speak-with-animals"], "updatedAt": 1}


class Fail(AssertionError):
    pass


def check(cond, msg):
    if not cond:
        raise Fail(msg)


class App:
    """Une page de l'application, éventuellement chargée avec un personnage."""

    def __init__(self, browser, devices, url, device="Pixel 7", char=None, view="gerer", tab="grimoire", color_scheme="light"):
        self.ctx = browser.new_context(**devices[device], color_scheme=color_scheme)
        self.pg = self.ctx.new_page()
        self.errors = []
        self.pg.on("pageerror", lambda e: self.errors.append(str(e)))
        seed = ""
        if char is not None:
            seed = ("localStorage.setItem('grimoire.cache', JSON.stringify({'t': %s}));localStorage.setItem('grimoire.cur','t');"
                    "localStorage.setItem('grimoire.tab','%s');localStorage.setItem('grimoire.view','%s');") % (json.dumps(char), tab, view)
        self.pg.add_init_script("if(!sessionStorage.getItem('s')){localStorage.clear();localStorage.setItem('grimoire.iosTip','0');%ssessionStorage.setItem('s','1')}" % seed)
        self.pg.goto(url)
        self.pg.wait_for_timeout(400)

    # Raccourcis
    def js(self, expr):
        """Évalue une expression avec accès aux variables de l'application exposées pour les tests (window.__t)."""
        return self.pg.evaluate("() => { with (window.__t) { return (" + expr + "); } }")

    def g(self, expr):
        """Valeur calculée sur le personnage en cours, ex. g('level')."""
        return self.js("(() => { const g = G(); return g." + expr + "; })()")

    def click(self, sel, **kw):
        self.pg.click(sel, **kw)
        self.pg.wait_for_timeout(50)

    def text(self, sel):
        return self.pg.text_content(sel) or ""

    def count(self, sel):
        return self.pg.locator(sel).count()

    def texts(self, sel):
        return self.pg.eval_on_selector_all(sel, "e => e.map(x => x.innerText.replace(/\\s+/g, ' ').trim())")

    def toast(self):
        return self.text("#toast")

    def undo(self):
        self.click('#toast [data-a="undo"]')

    def view(self, v):
        self.click(f'[data-a="view"][data-v="{v}"]')

    def long_rest(self, sel='[data-a="longrest"]'):
        """Repos long guidé : ouvre l'écran, garde les sorts préparés, passe les étapes jusqu'à « Terminer le repos »."""
        self.click(sel)
        for _ in range(4):
            if self.count('#lrsheet [data-a="lr-done"]:not(.x)') and self.count('#lrsheet .lufoot [data-a="lr-done"]'):
                self.click('#lrsheet .lufoot [data-a="lr-done"]'); return
            self.click('#lrsheet .lufoot [data-a="lr-next"]')
        raise AssertionError("repos long : pas de bouton Terminer")

    def tab(self, v):
        sel = f'[data-a="tab"][data-v="{v}"]'
        if self.count(sel) == 0:  # onglet rangé dans le menu Plus
            self.click('[data-a="more"]')
        self.click(sel)

    def edit(self):
        """Déplie nom, niveau et sous-classe (bouton ✎ Modifier)."""
        if self.count("#f-level") == 0:
            self.click('[data-a="hero-edit"]')

    def level(self, n):
        self.edit()
        self.pg.select_option("#f-level", str(n))
        self.pg.wait_for_timeout(60)

    def new_character(self, cls, name, level=1):
        self.click('[data-a="new"]')
        self.click(f'[data-a="nw-cls"][data-v="{cls}"]')
        self.pg.fill("#nw-name", name)
        self.click(".nwgo")
        if level != 1:
            self.level(level)

    def close(self):
        check(not self.errors, "erreurs JavaScript : " + " / ".join(self.errors))
        self.ctx.close()
