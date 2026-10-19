#!/usr/bin/env python3
"""Reconstruit l'Atelier du Grimoire à partir des sources.

    python3 build.py

Entrées : src/app.html (l'application), data/spells.json (les 213 sorts), src/sw.js (cache hors connexion).
Sorties :
  index.html          la page publiée par GitHub Pages
  sw.js               le service worker, avec un numéro de version recalculé
  dist/artifact.html  la variante pour l'artefact claude.ai (polices Google, sans en-tête de document)
"""
import hashlib, json, os, re

ROOT = os.path.dirname(os.path.abspath(__file__))
read = lambda p: open(os.path.join(ROOT, p), encoding="utf-8").read()

def write(p, text):
    path = os.path.join(ROOT, p)
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    open(path, "w", encoding="utf-8").write(text)

app = read("src/app.html")
spells = json.loads(read("data/spells.json"))
ids = [s["id"] for s in spells]
assert len(ids) == len(set(ids)), "identifiants de sorts en double"
body = app.replace("/*SPELLS*/[]", json.dumps(spells, ensure_ascii=False, separators=(",", ":")))

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

# --- variante artefact claude.ai ---
google = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
          '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
          '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400;0,500;0,700;1,400;1,500'
          '&family=Alegreya+Sans:ital,wght@0,400;0,500;0,700;1,400&family=Alegreya+Sans+SC:wght@500;700&display=swap">')
write("dist/artifact.html", body.replace("<!--FONTS-->", google, 1))

print(f"OK : {len(spells)} sorts · index.html {os.path.getsize(os.path.join(ROOT, 'index.html')) // 1024} Ko · cache {digest.hexdigest()[:10]}")
