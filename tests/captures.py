#!/usr/bin/env python3
"""Captures d'écran de référence, pour vérifier qu'une restructuration ne change rien à l'écran.

    python3 tests/captures.py prendre /tmp/avant        # avant la modification (après python3 build.py)
    python3 tests/captures.py prendre /tmp/apres        # après
    python3 tests/captures.py comparer /tmp/avant /tmp/apres

60 écrans (magicien, paladin, druide, passages de niveau, accueil ; thèmes clair et sombre), en page entière, comparés au pixel près.
Pour comparer avec une version précédente sans la republier : GRIMOIRE_ROOT=/chemin/vers/une/copie python3 tests/captures.py prendre /tmp/avant
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import run
from helpers import App, NEMEIA, KAEL, MALFAEL


def prendre(out):
    from playwright.sync_api import sync_playwright
    os.makedirs(out, exist_ok=True)
    srv, url = run.serve()
    def full(a, name):
        a.pg.add_style_tag(content=".stick{position:static!important}")  # barre collée : sinon sa place varie pendant la capture
        a.pg.wait_for_timeout(150); a.pg.screenshot(path=f"{out}/{name}.png", full_page=True, animations="disabled")
    srv, url = run.serve()
    def full(a, name):
        a.pg.add_style_tag(content=".stick{position:static!important}")  # barre collée : sinon sa place varie pendant la capture
        a.pg.wait_for_timeout(150); a.pg.screenshot(path=f"{out}/{name}.png", full_page=True, animations="disabled")
    with sync_playwright() as p:
        b = p.chromium.launch()
        for scheme in ["light", "dark"]:
            a = App(b, p.devices, url, char=dict(NEMEIA, snotes={"shield": "Note"}), color_scheme=scheme)
            a.click('[data-a="row"][data-id="shield"]'); full(a, f"{scheme}-nem-gerer")
            a.view("jeu"); full(a, f"{scheme}-nem-jeu")
            for t in ["biblio", "imprimer", "regles", "sauvegarde"]: a.tab(t); full(a, f"{scheme}-nem-{t}")
            a.tab("grimoire"); a.click(".lvup"); full(a, f"{scheme}-nem-lu1"); a.click(".lufoot .primary"); full(a, f"{scheme}-nem-lu2")
            a.ctx.close()
            a = App(b, p.devices, url, char=KAEL, color_scheme=scheme)
            a.click('[data-a="row"][data-id="res:cd"]'); full(a, f"{scheme}-kael-gerer")
            a.view("jeu"); full(a, f"{scheme}-kael-jeu"); a.click('[data-a="loh-open"]'); full(a, f"{scheme}-kael-loh")
            a.ctx.close()
            a = App(b, p.devices, url, char=dict(KAEL, style=""), color_scheme=scheme)
            a.click(".lvup"); full(a, f"{scheme}-kael-lu1"); a.click(".lufoot .primary"); a.click('[data-a="lu-style"][data-v="duel"]'); full(a, f"{scheme}-kael-lu2")
            a.click(".lufoot .primary"); full(a, f"{scheme}-kael-lu3"); a.ctx.close()
            a = App(b, p.devices, url, char=dict(KAEL, level=2, prepared=["bless"]), color_scheme=scheme)
            a.click(".lvup"); full(a, f"{scheme}-kael2-lu1"); a.ctx.close()
            a = App(b, p.devices, url, char=dict(MALFAEL, level=5), color_scheme=scheme)
            a.click(".lvup"); full(a, f"{scheme}-mal-lu1"); a.click(".lufoot .primary"); a.click('[data-a="lu-wsfav"][data-id="ours-polaire"]'); full(a, f"{scheme}-mal-lu2")
            a.click(".lufoot .primary"); full(a, f"{scheme}-mal-lu3"); a.ctx.close()
            a = App(b, p.devices, url, char=dict(MALFAEL, level=1), color_scheme=scheme)
            a.click(".lvup"); full(a, f"{scheme}-mal1-lu1"); a.click(".lufoot .primary"); full(a, f"{scheme}-mal1-lu2"); a.ctx.close()
            a = App(b, p.devices, url, char=dict(NEMEIA, level=3), color_scheme=scheme)
            a.click(".lvup"); full(a, f"{scheme}-nem3-lu1"); a.click(".lufoot .primary"); full(a, f"{scheme}-nem3-lu2"); a.click(".lufoot .primary"); full(a, f"{scheme}-nem3-lu3"); a.ctx.close()
            a = App(b, p.devices, url, char=dict(MALFAEL, used={"1": 2}), color_scheme=scheme)
            a.click('[data-a="row"][data-id="res:ws"]'); a.click('[data-a="row"][data-id="speak-with-animals"]'); full(a, f"{scheme}-mal-gerer2"); a.ctx.close()
            a = App(b, p.devices, url, char=dict(MALFAEL, wsForm={"id": "pieuvre-geante", "hp": 40, "max": 52}, favs=["loup"]), color_scheme=scheme)
            full(a, f"{scheme}-mal-gerer"); a.view("jeu"); full(a, f"{scheme}-mal-jeu")
            a.click('[data-a="row"][data-id="res:ws"]'); a.click('[data-a="ws-open"]'); a.click('#wssheet [data-a="row"][data-id="ws:ours-brun"]'); full(a, f"{scheme}-mal-ws")
            a.click('[data-a="ws-close"]'); a.tab("bestiaire"); a.click('[data-a="row"][data-id="bst:loup"]'); full(a, f"{scheme}-mal-bst")
            a.ctx.close()
            a = App(b, p.devices, url, color_scheme=scheme); full(a, f"{scheme}-accueil"); a.click('[data-a="new"]'); full(a, f"{scheme}-nouveau"); a.ctx.close()
        b.close()
    srv.shutdown()

    print(len(os.listdir(out)), "captures dans", out)


def comparer(a, b):
    from PIL import Image, ImageChops
    bad = 0
    for f in sorted(os.listdir(a)):
        x, y = Image.open(f"{a}/{f}").convert("RGB"), Image.open(f"{b}/{f}").convert("RGB")
        if x.size != y.size: print("TAILLE", f, x.size, y.size); bad += 1; continue
        box = ImageChops.difference(x, y).getbbox()
        if box: print("DIFF", f, box); bad += 1
    print("identiques" if not bad else f"{bad} différences", f"({len(os.listdir(a))} captures)")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    {"prendre": lambda: prendre(sys.argv[2]), "comparer": lambda: comparer(sys.argv[2], sys.argv[3])}[sys.argv[1]]()
