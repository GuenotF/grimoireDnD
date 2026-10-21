#!/usr/bin/env python3
"""Reconstruit l'Atelier du Grimoire à partir des sources.

    npm install          # une fois : installe esbuild (voir package.json)
    python3 build.py

Entrées :
  src/app.js           le code de l'application (importe data/spells.json et data/beasts.json)
  src/app.html         le gabarit : styles et structure de la page, /*APP*/ à la place du code
  src/sw.js            le service worker (cache hors connexion)
Sorties :
  index.html           la page publiée par GitHub Pages (code et styles minifiés, intégrés)
  app.js.map           la carte des sources : les outils du navigateur affichent les erreurs dans src/
  sw.js                le service worker, avec un numéro de version recalculé
"""
import hashlib, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
read = lambda p: open(os.path.join(ROOT, p), encoding="utf-8").read()


def write(p, text):
    path = os.path.join(ROOT, p)
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    open(path, "w", encoding="utf-8").write(text)


ESBUILD = os.path.join(ROOT, "node_modules", ".bin", "esbuild")
if not os.path.exists(ESBUILD):
    sys.exit("esbuild manquant : lance « npm install » une fois dans le dossier du projet.")


def esbuild(args, stdin=None):
    r = subprocess.run([ESBUILD, *args], cwd=ROOT, input=stdin, capture_output=True, text=True)
    if r.returncode:
        sys.exit(r.stderr)
    return r.stdout


# --- Contrôles des données ---
spells = json.loads(read("data/spells.json"))
ids = [s["id"] for s in spells]
assert len(ids) == len(set(ids)), "identifiants de sorts en double"
beasts = json.loads(read("data/beasts.json"))
assert len({b["id"] for b in beasts}) == len(beasts), "identifiants de bêtes en double"

# --- Code : un seul script minifié, avec sa carte des sources ---
esbuild(["src/app.js", "--bundle", "--format=iife", "--minify", "--target=es2020", "--charset=utf8",
         "--sourcemap=linked", "--sources-content=false", "--outfile=app.js", "--allow-overwrite"])
code = read("app.js").strip()
os.remove(os.path.join(ROOT, "app.js"))
assert "</script" not in code.lower(), "« </script » dans le code : la page serait coupée"

# --- Styles du gabarit : minifiés ---
tpl = read("src/app.html")
css = re.search(r"<style>\n(.*?)</style>", tpl, re.S)
tpl = tpl.replace(css.group(0), "<style>" + esbuild(["--loader=css", "--minify", "--charset=utf8"], css.group(1)).strip() + "</style>", 1)
body = tpl.replace("/*APP*/", code, 1)

# --- index.html pour GitHub Pages ---
title = re.search(r"<title>.*?</title>", body).group(0)
page_body = body.replace(title, "", 1).replace("<!--FONTS-->", "", 1)
head = f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
{title}
<meta name="description" content="Grimoire de magicien D&amp;D 5e : sorts du Manuel des joueurs 2014, préparation, emplacements et fiche imprimable.">
<meta name="theme-color" content="#ECEEF1" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#10131B" media="(prefers-color-scheme: dark)">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Grimoire">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="manifest" href="./manifest.webmanifest">
<link rel="icon" href="./icons/icon-192.png" type="image/png">
<link rel="apple-touch-icon" href="./icons/apple-touch-icon.png">
<link rel="stylesheet" href="./fonts/fonts.css">
<style>
:root{{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}
body{{margin:0;font:14px system-ui,sans-serif}}img{{max-width:100%}}[hidden]{{display:none!important}}
</style>
</head>
<body>
"""
write("index.html", head + page_body + "\n</body>\n</html>\n")

# --- sw.js : liste des fichiers mis en cache et version ---
assets = ["./", "./index.html", "./manifest.webmanifest", "./fonts/fonts.css"]
assets += ["./fonts/" + f for f in sorted(os.listdir(os.path.join(ROOT, "fonts"))) if f.endswith(".woff2")]
assets += ["./icons/" + f for f in sorted(os.listdir(os.path.join(ROOT, "icons"))) if f.endswith(".png")]
digest = hashlib.sha256()
for p in ["index.html", "manifest.webmanifest", "fonts/fonts.css"]:
    digest.update(read(p).encode())
sw = read("src/sw.js").replace("__VERSION__", digest.hexdigest()[:10]).replace("__ASSETS__", json.dumps(assets, indent=2))
write("sw.js", sw)

print(f"OK : {len(spells)} sorts, {len(beasts)} bêtes · index.html {os.path.getsize(os.path.join(ROOT, 'index.html')) // 1024} Ko · cache {digest.hexdigest()[:10]}")
