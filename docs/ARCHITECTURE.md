# Architecture cible de l'Atelier du Grimoire

*Validé le 21 octobre 2026. Étapes 0 et 1 faites le 21 octobre 2026.*

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
| Actions | Une seule chaîne de près de 350 lignes (`if (a === "cast") … else if …`) |
| Sauvegarde | Pas de numéro de version du format |
| Tests | 29 scénarios dans `tests/` |

## 3. Organisation proposée

```
src/
  index.html              squelette de la page (conteneurs, volets) – sans code
  app.js                  point d'entrée : importe tout, démarre l'application
  styles/                 CSS découpé : base, grimoire, jeu, volets, classes
  core/
    state.js              état de l'écran (S), personnage en cours (G), mutate
    store.js              enregistrement sur l'appareil, mode artefact, sauvegardes
    schema.js             format du personnage, numéro de version, migrations
    render.js             rendu général, onglets, volets, message d'annulation
    actions.js            registre des actions : chaque module déclare les siennes
    format.js             outils de texte (esc, signed, plural…)
  rules/
    common.js             maîtrise, modificateurs, DD, emplacements partagés
  classes/
    index.js              registre des classes
    magicien.js           ┐
    paladin.js            ├ une fiche de règles par classe (même contrat, voir §4)
    druide.js             ┘
  features/               mécaniques partagées entre classes
    spells/               lignes de sorts, Lancer, concentration, sorts en cours, notes
    library.js            Bibliothèque
    wildshape/            Forme sauvage, Bestiaire, forme active
    levelup.js            assistant (structure commune, étapes fournies par la classe)
    print.js              fiche imprimable (sections fournies par la classe)
    save.js               onglet Sauvegarde, export, import
data/
  spells.json, beasts.json  inchangés, importés directement par le code
tests/                    inchangés, joués après chaque étape
build.py                  appelle esbuild, puis produit index.html, sw.js, dist/artifact.html
```

L'outil esbuild réunit tous les modules en un seul script, intégré à `index.html` comme aujourd'hui. Le code publié est **minifié** (plus léger) ; la lisibilité se joue dans `src/`, pas dans `index.html`. Esbuild produit aussi une carte des sources pour retrouver une erreur de production dans le code d'origine.

## 4. Le contrat d'une classe

Chaque fichier `classes/<classe>.js` exporte un objet de même forme. L'application ne teste plus jamais « est-ce un paladin ? » : elle appelle ce que la classe fournit.

**Langue** : identifiants du code en anglais, comme le code actuel (`render`, `mutate`, `slotsLeft`, `castHTML`…) ; commentaires, textes affichés et noms de règles en français.

```js
export default {
  id: "paladin", name: "Paladin",
  casting: { ability: "cha", slots: HALF_CASTER, cantrips: () => 0, prepared: (g, mod) => … },
  subclasses: { conquete: { name: "Serment de la conquête", spells: {…}, channel: […], features: […] } },
  defaults: { oath: "conquete", loh: 0, dsU: 0, cdU: 0 },   // champs propres au personnage
  normalize(g) { … },                                         // contrôle à l'ouverture d'un fichier
  features: […],                                              // rubrique « Capacités de classe »
  resources: { html(g), shortRest(g), longRest(g) },          // en haut du grimoire
  play: { beforeSpells(g) },                                  // ex. Châtiment divin, forme active
  tabs: [],                                                   // ex. druide : Bestiaire
  levelUp: { summary(g, b), choices(g, b), recap(g, b), apply(g, choice) },
  rules(g),                                                   // onglet Règles
  print(g),                                                   // sections de la fiche imprimable
};
```

Une partie vide est simplement absente : le magicien n'a pas de `tabs`, le paladin n'a pas de `cantrips`.

**Critère de réussite mesurable** : à la fin, aucun `isPal(`, `isDru(` ou `isWiz(` hors du dossier `classes/`.

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
| 2 | Noyau : état, stockage, version du format, rendu, registre des actions ; retrait de `S.readonly` (toujours faux depuis l'étape 0) | 1 |
| 3 | Classes : magicien, paladin, druide derrière le contrat ; suppression des `isX` | 1 |
| 4 | Mécaniques partagées : sorts, bibliothèque, Forme sauvage, passage de niveau, impression, sauvegarde | ½ |
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
