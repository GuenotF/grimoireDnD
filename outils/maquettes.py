"""Briques HTML des maquettes (téléphone 390 × 900, pastilles, rubriques, cases, boutons) aux couleurs de l'application.

Utilisées pour dessiner les écrans à valider avant développement (tableau de maquettes sur claude.ai).
Exemple : from maquettes import HEAD, FOOT, rub, kp, box ; page = HEAD % "Titre" + rub("Niveau 1") + … + FOOT % "Légende"
"""
HEAD='''<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>%s</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,500;0,700;1,400&amp;family=Alegreya+Sans:ital,wght@0,400;0,500;0,700;1,400&amp;family=Alegreya+Sans+SC:wght@500;700&amp;display=swap">
<style>body{margin:0}</style>
</helmet>
<div style="width: 390px; height: 900px; box-sizing: border-box; background: #ECEEF1; color: #1B2136; font-family: 'Alegreya Sans', 'Segoe UI', sans-serif; position: relative; overflow: hidden">
'''
FOOT='''<div style="position: absolute; left: 0; right: 0; bottom: 0; padding: 10px 16px; background: #1B2136; color: #F9FAFB; font-size: 12.5px; line-height: 1.4">%s</div>
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":390,"height":900}}'>
class Component extends DCLogic { renderVals() { return {}; } }
</script>
</body>
</html>
'''
SC="font-family: 'Alegreya Sans SC', sans-serif; letter-spacing: 0.06em"
DISP="font-family: 'Alegreya', Georgia, serif"
NAME=DISP+"; font-weight: 700; font-size: 15.5px"
K={'d':('#8F2F08','#FBE7DC','#C2410C'),'s':('#233C80','#E6EAF5','#2D4A9A'),'f':('#4F2C7A','#EFE6F7','#6B3FA0'),'a':('#7A1C14','#F3DEDB','#A2261C'),'n':('#5A6176','#F9FAFB','#9AA0AE')}
def kp(k,t):
    c,b,d=K[k]; return f'<span style="font-size: 12.5px; font-weight: 700; color: {c}; background: {b}; border: 1.2px solid {d}; border-radius: 4px; padding: 1px 5px; white-space: nowrap">{t}</span>'
def sw(jeu):
    a='font: inherit; font-size: 14.5px; padding: 8px; border: 0; border-radius: 6px;'
    on=a+' font-weight: 700; background: #F9FAFB; color: #1B2136; box-shadow: 0 1px 2px rgba(27,33,54,.15)'; off=a+' background: transparent; color: #5A6176'
    return f'<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); background: #E2E5EA; border-radius: 8px; padding: 3px"><button style="{off if jeu else on}">Gérer</button><button style="{on if jeu else off}">En jeu</button></div>'
def rub(t,aside="",col="#A2261C",chev="▾"):
    return f'<div style="display: flex; align-items: baseline; gap: 6px; border-bottom: 1.5px solid {col}; padding-bottom: 2px; margin-top: 4px"><span style="font-size: 12px; color: {col}">{chev}</span><span style="{DISP}; font-size: 18px; font-weight: 500; color: {col}">{t}</span><span style="flex: 1"></span><span style="font-size: 12.5px; color: #5A6176; font-style: italic">{aside}</span></div>'
def box(on, lock=False):
    if lock: return '<span title="Toujours préparé" style="width: 20px; height: 20px; border-radius: 4px; background: #8A6516; color: #F9FAFB; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; flex: none">★</span>'
    return ('<span style="width: 20px; height: 20px; border-radius: 4px; background: #A2261C; color: #F9FAFB; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex: none">✓</span>' if on else '<span style="width: 20px; height: 20px; border-radius: 4px; border: 1.5px solid #9AA0AE; background: #F9FAFB; box-sizing: border-box; flex: none"></span>')
def pip(used=False, sz=18, col="#A2261C"):
    return f'<span style="display: inline-block; width: {sz}px; height: {sz}px; border-radius: 50%; border: 1.6px solid {col}; box-sizing: border-box; background: {col if used else "transparent"}"></span>'
def chev(): return '<span style="font-family: \'Alegreya Sans\'; font-weight: 400; font-size: 12px; color: #5A6176">▾</span>'
BTN='font: inherit; flex: none; font-size: 13.5px; font-weight: 500; padding: 6px 11px; border-radius: 6px; border: 1px solid #A2261C; background: #A2261C; color: #F9FAFB'
BTN2='font: inherit; flex: none; font-size: 13.5px; padding: 6px 11px; border-radius: 6px; border: 1px solid #C9CED8; background: #F9FAFB; color: #1B2136'
