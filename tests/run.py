#!/usr/bin/env python3
"""Lance tous les tests de l'Atelier du Grimoire.

    python3 build.py && python3 tests/run.py            # tout
    python3 tests/run.py druide                         # seulement les tests dont le nom contient « druide »

Prérequis : Python 3 et Playwright (pip install playwright, puis playwright install chromium).
Les tests ouvrent index.html (la version assemblée) dans un téléphone simulé, servi par un petit serveur local.
"""
import functools, http.server, importlib, os, socketserver, sys, threading, time, traceback

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.environ.get("GRIMOIRE_ROOT", ROOT)  # autre copie du dépôt à servir (ex. version précédente, pour les captures)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from playwright.sync_api import sync_playwright  # noqa: E402

MODULES = ["test_commun", "test_magicien", "test_paladin", "test_druide", "test_forme_sauvage", "test_personnage", "test_equipement", "test_barbare", "test_roublard"]


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def serve():
    handler = functools.partial(Quiet, directory=ROOT)
    srv = socketserver.ThreadingTCPServer(("127.0.0.1", 0), handler)
    srv.daemon_threads = True
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f"http://127.0.0.1:{srv.server_address[1]}/index.html"


def main():
    pattern = sys.argv[1] if len(sys.argv) > 1 else ""
    srv, url = serve()
    tests = []
    for m in MODULES:
        mod = importlib.import_module(m)
        tests += [(m, n, getattr(mod, n)) for n in dir(mod) if n.startswith("test_") and pattern in m + "." + n]
    tests.sort(key=lambda t: (MODULES.index(t[0]), t[2].__code__.co_firstlineno))
    failed = []
    t0 = time.time()
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for m, n, fn in tests:
            try:
                fn(browser, p.devices, url)
                print(f"  ok    {m}.{n}")
            except Exception as e:  # noqa: BLE001
                failed.append(f"{m}.{n}")
                print(f"  ÉCHEC {m}.{n} : {e}")
                if not isinstance(e, AssertionError):
                    traceback.print_exc()
        browser.close()
    srv.shutdown()
    print(f"\n{len(tests) - len(failed)} / {len(tests)} tests réussis en {time.time() - t0:.0f} s")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
