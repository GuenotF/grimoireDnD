# Outils

Scripts qui ont servi à construire les données de l'atelier. Ils ne font pas partie de l'application : on les relance pour une nouvelle intégration (autre classe, supplément, nouvelles bêtes) ou pour corriger une extraction.

Les PDF d'origine (exports AideDD des livres) ne sont **pas** dans le dépôt : il faut les fournir à chaque fois.

| Script | Rôle |
|---|---|
| `ocr_pdf.py` | PDF image → texte, colonne par colonne (les exports AideDD sont sur deux colonnes). Prérequis : `pdftoppm`, `tesseract`, Pillow. |
| `betes_aidedd.py` | Texte OCR d'un export « Monstres » → `data/beasts.json` : caractéristiques, compétences, traits, actions, recharges, nettoyage OCR, noms accentués. Le texte d'ambiance écarté est listé à côté pour relecture. |
| `sorts_aidedd.py` | Texte OCR d'un export « Sorts » → en-têtes des sorts (niveau, école, rituel, incantation, portée, composantes, durée). Signale les titres illisibles à relever à la main. |
| `imports.mjs` | Recalcule les imports de tous les modules de `src/` après un déplacement de code (`node outils/imports.mjs`, puis `npm run lint`). |
| `maquettes.py` | Briques HTML des maquettes d'écran, aux couleurs de l'application. |
| `archives/` | Scripts déjà appliqués (ajout des sorts du paladin et du druide), gardés comme modèle : ils contiennent la rédaction faite à la main pour chaque sort. Ils refusent de se relancer. |

## Exemple : intégrer un export de bêtes

```
python3 outils/ocr_pdf.py Monstres-druide.pdf /tmp/betes.txt
python3 outils/betes_aidedd.py /tmp/betes.txt          # réécrit data/beasts.json
python3 build.py && python3 tests/run.py
```

Relire ensuite `data/beasts.json.ecarte.txt` (texte écarté en fin de bloc) puis le supprimer.

## Exemple : nouvelle classe de lanceur de sorts

1. Export AideDD des sorts de la classe (règles 2014, pages `/dnd/sorts.php`), puis `ocr_pdf.py` et `sorts_aidedd.py`.
2. Sur le modèle de `archives/ajout_sorts_druide.py` : marquer les sorts déjà présents (`cl`) et rédiger les nouveaux.
3. `python3 build.py && python3 tests/run.py`.
