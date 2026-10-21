# Tests

Scénarios automatiques joués dans un téléphone simulé (Chromium, Pixel 7) sur la version assemblée `index.html`.

```
python3 build.py
python3 tests/run.py            # tous les tests (≈ 1 minute)
python3 tests/run.py druide     # seulement ceux dont le nom contient « druide »
```

Prérequis : `pip install playwright` puis `playwright install chromium`.

| Fichier | Ce qui est vérifié |
|---|---|
| `test_commun.py` | Création, export / import, anciens fichiers, notes, sections repliables, sorts en cours, autres sorts |
| `test_magicien.py` | Limite de préparation, Lancer et niveau supérieur, concentration, Restauration arcanique, bibliothèque, passage de niveau |
| `test_paladin.py` | Préparation et serment, Imposition des mains, Perception et Conduit divin, Châtiment, passage de niveau |
| `test_druide.py` | Préparation, rituels, sorts mineurs de concentration, bibliothèque, Bestiaire, passage de niveau et nouvelles formes |
| `test_forme_sauvage.py` | Formes possibles, forme active (PV, retour, repli, fiche complète), Changeforme de combat, rappel de concentration, niveaux 6 et 18 |

`helpers.py` contient les personnages de référence (Némeia, Ser Kael, Malfaël) et les raccourcis communs. Chaque test échoue aussi si la page produit une erreur JavaScript.

Règle : on lance les tests avant chaque publication ; on ne publie que si tout est vert.

## Captures de référence (restructuration)

Pour vérifier qu'une modification ne change rien à l'écran : `tests/captures.py` photographie 34 écrans (trois classes, accueil, thèmes clair et sombre) et les compare au pixel près.

```
python3 tests/captures.py prendre /tmp/avant      # avant la modification
python3 tests/captures.py prendre /tmp/apres      # après (python3 build.py entre les deux)
python3 tests/captures.py comparer /tmp/avant /tmp/apres
```
