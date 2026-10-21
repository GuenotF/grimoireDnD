# Architecture cible de l'Atelier du Grimoire

*Validé le 21 octobre 2026. Étapes 0 à 3 faites le 21 octobre 2026.*

## 1. Objectifs

1. **Y voir clair** : chaque fichier a un rôle, et ses dépendances sont déclarées (`import` / `export`).
2. **Une classe = un fichier de règles**, toujours appelé de la même façon par l'application. Ajouter une classe ou une sous-classe ne doit pas demander de modifier les écrans.
3. **Aucun changement pour les joueurs** : même adresse, même fichier unique `index.html`, hors connexion, sans compte, mêmes sauvegardes.
4. **Préparer la suite** : fiche de personnage (PV, caractéristiques, équipement), autres classes et sous-classes.

## 2. Situation actuelle

| Élément | Aujourd'hui |
|---|---|
| `src/app.html` | 2 050 lignes : CSS, écrans, règles des 3 classes, stockage, actions, fiche imprimable |
| Données | `data/spells.json` (310 sorts), `data/beasts.json` (82 bêtes), injectées par `build.py` |
| Règles de classe | Dispersées : 57 tests `isWiz` / `isPal` / `isDru` répartis dans tout le code |
| Actions | Une seule chaîne de près de 350 lignes (`if (a === "cast") … else if …`) ; depuis l'étape 2 : registre `core/actions.js` |
| Sauvegarde | Pas de numéro de version du format |
| Tests | 29 scénarios dans `tests/` |

## 3. Organisation (en place depuis l'étape 3)

```
src/
  app.html                  gabarit de la page (structure) – /*CSS*/ et /*APP*/ remplacés à l'assemblage
  app.js                    point d'entrée : écran principal (en-tête, onglets), volets, démarrage
  data.js                   accès aux sorts et aux bêtes (data/*.json)
  styles/                   CSS, un fichier par partie de l'écran (index.css fixe l'ordre)
  core/
    state.js                état de l'écran (S) et personnage en cours (G)
    schema.js               format d'un personnage : valeurs par défaut, contrôle, version (v2) et migrations
    store.js                enregistrement sur l'appareil, personnage affiché, mutate
    ui.js                   rendu (fourni par app.js), message d'annulation, statut
    actions.js              registre des actions : onClick, onChange, onInput, onSubmit, onKey
    format.js               mise en forme du texte (signes, pluriels, échappement)
    pwa.js                  version installée : service worker, astuce iPhone
  rules/
    tables.js               tables sans dépendance : écoles, emplacements (lanceur complet, demi-lanceur)
    common.js               règles communes : maîtrise, modificateurs, emplacements, préparation, sorts lançables
  classes/
    index.js                registre des classes : C(g), sorts toujours préparés, capacités
    magicien.js             contrat + Restauration arcanique, onglet Règles, assistant de niveau du grimoire
    paladin.js              contrat + serments, Imposition des mains, Perception et Conduit divins, Châtiment
    druide.js               contrat + cercles, ressource Forme sauvage
    druide-wildshape.js     Forme sauvage : formes possibles, forme active, Changeforme de combat, Bestiaire
  ui/components.js          éléments réutilisables : sections repliables, capacités dépliables, bouton Retirer
  features/                 mécaniques partagées par toutes les classes
    spells.js               affichage d'un sort, notes personnelles
    cast.js                 Lancer, barre des emplacements, concentration, sorts en cours
    grimoire.js             onglet Sorts/Grimoire : Gérer, En jeu, capacités de classe, repos
    library.js              Bibliothèque
    levelup.js              assistant de passage de niveau (structure et étapes des classes à sorts préparés)
    save.js, print.js, newchar.js   sauvegarde, fiche imprimable, création d'un personnage
```

Chaque module déclare lui-même ses actions (boutons, champs) en se chargeant. Aucun module partagé (`app.js`, `core/`, `features/`, `ui/`, `rules/`) n'importe un fichier de classe : il passe par `classes/index.js`.

## 4. Le contrat d'une classe

Chaque fichier `classes/<classe>.js` exporte par défaut un objet de même forme. Le reste de l'application ne teste jamais la classe d'un personnage (il n'existe plus aucun `isWiz`, `isPal` ou `isDru`) : il appelle ce que la classe fournit, via `C(g)`. Une partie absente veut dire « rien de particulier ».

**Langue** : identifiants du code en anglais ; commentaires, textes affichés et noms de règles en français.

| Champ | Rôle | Magicien | Paladin | Druide |
|---|---|:-:|:-:|:-:|
| `n`, `ab`, `abN`, `abArticle` | Nom, caractéristique d'incantation (code, nom, « la Sagesse ») | ✓ | ✓ | ✓ |
| `slots`, `top`, `cantrips(lv)`, `prep(g, mod)` | Emplacements, niveau de sort maximal, sorts mineurs, sorts préparés | ✓ | ✓ | ✓ |
| `book` | Modèle du grimoire (apprend, puis prépare parmi ses sorts) ; sinon prépare dans toute la liste | ✓ | | |
| `hitDie`, `fileLabel`, `prepNote` | Dé de vie (rappel), nom des sauvegardes, précision sur la préparation | ✓ | ✓ | ✓ |
| `defaults()`, `normalize(o)` | Champs propres au personnage et leur contrôle à l'ouverture | ✓ | ✓ | ✓ |
| `subline(g)`, `subclassField(g)`, `heroStats(g)` | En-tête : sous-titre, champ de sous-classe, statistiques | ✓ | ✓ | ✓ |
| `tabs(g)`, `panels` | Onglets et contenu des onglets propres (Règles, Imprimer, Bestiaire) | ✓ | ✓ | ✓ |
| `alwaysPrepared(g)`, `alwaysPreparedInfo(g)` | Sorts toujours préparés et leurs libellés (serment) | | ✓ | |
| `canRitual(prepared)`, `ritualNeedsPrep` | Lancer en rituel | ✓ | | ✓ |
| `features(g)` | Capacités de classe (avec `control(g)` pour un réglage, ex. style de combat) | | ✓ | ✓ |
| `resources(g)`, `resourceMax` | Ressources en haut de l'onglet et maximum de chaque compteur | | ✓ | ✓ |
| `beforeSlots(g)`, `playTop(g)`, `slotbarChips(g)` | Ajouts à l'écran : forme active, Châtiment divin, puce de la barre du bas | | ✓ | ✓ |
| `restBar(g)`, `shortPanel(g)`, `shortRest`, `longRest(g)` | Repos court (propre ou ressource récupérée) et repos long | ✓ | ✓ | ✓ |
| `renderSheets(g, levelUpOpen)` | Volets propres (Imposition des mains, formes possibles) | | ✓ | ✓ |
| `levelUp` | Assistant : étapes propres (`init`, `steps`, `apply`…) ou crochets des étapes communes (`rowsBefore`, `rowsAfter`, `summaryExtra`, `notes`, `choicesFirst`, `choices`, `recapBefore`, `recapAfter`, `recapNotes`, `apply`) | ✓ | ✓ | ✓ |
| `rules(g)`, `print(g)` | Onglet Règles et fiche imprimable (pilotes, à venir pour paladin et druide) | via `panels` | | |

## 5. Format de sauvegarde versionné

- Chaque personnage porte un numéro de version, `"v": 2`. Les fichiers actuels, sans numéro, sont la version 1.
- `schema.js` contient la liste des migrations (v1 → v2, puis v2 → v3 le jour où les PV arrivent…). À l'ouverture d'un fichier, on applique les migrations dans l'ordre.
- Les champs propres à une classe viennent de `defauts` et `normaliser` de cette classe.
- Les anciens fichiers de tes joueurs restent lisibles. Un test vérifie l'import d'un fichier version 1.

## 6. Déroulé, étape par étape

Chaque étape fait l'objet d'une publication séparée. On ne publie que si les tests sont verts, et l'application reste identique à l'écran.

| Étape | Contenu | Effort |
|---|---|---|
| 0 ✓ | Outillage : esbuild branché dans `build.py`, le code actuel passe par esbuild sans être découpé ; abandon de la variante claude.ai | ½ itération |
| 1 ✓ | Outils et données : `format.js`, `data.js` (import direct des JSON), CSS découpé en 13 fichiers | ½ |
| 2 ✓ | Noyau : état, stockage, version du format (v2 et migrations), rendu, registre des actions ; retrait du mode lecture seule. Les tables de règles sont passées dans `rules/common.js` en préalable à l'étape 3 | 1 |
| 3 ✓ | Classes : magicien, paladin, druide derrière le contrat ; plus aucun `isWiz` / `isPal` / `isDru`. Fait avec l'étape 4 (mécaniques partagées réparties dans `features/`), les deux étant liées | 1 |
| 4 ✓ | Mécaniques partagées : sorts, bibliothèque, Forme sauvage, passage de niveau, impression, sauvegarde (avec l'étape 3) | ½ |
| 5 | Documentation : README et ce document mis à jour | — |

Pendant les étapes 0 à 5, il n'y a pas de nouvelle fonctionnalité.

## 7. Fonctionnalités pilotes pour éprouver l'architecture

Ce sont des besoins connus et simples. Chacun doit se faire **uniquement dans les fichiers de classe**, sans toucher aux écrans. Si ce n'est pas le cas, l'architecture est à corriger.

1. **Onglet Règles** du paladin et du druide (`rules(g)`).
2. **Fiche imprimable** du paladin et du druide (`print(g)`).
3. **Une sous-classe de plus**, par exemple le Serment de dévotion (`subclasses`). C'est le test le plus parlant pour la suite.

## 8. Décisions

1. **esbuild et Node.js** : oui. Ils servent seulement à assembler, dans l'espace de travail de Claude ou sur un poste de développement.
2. **Minification** : oui pour `index.html` publié ; la lisibilité est assurée dans `src/`.
3. **Langue** : identifiants en anglais (cohérent avec le code existant, aucun surcoût), commentaires et textes en français.
4. **Variante artefact claude.ai** : abandonnée (étape 0). Concrètement : plus de `dist/artifact.html`, et suppression du mode d'enregistrement propre à claude.ai (`window.claude`, `S.mode === "db"`, lecture seule), ce qui simplifie `store.js`. L'artefact déjà publié sur claude.ai n'est pas supprimé : il reste tel quel, figé.
5. **Outils** : les scripts d'extraction (OCR, bêtes, sorts) sont rangés dans `outils/`.
