# Ajouter une classe

Recette suivie pour le rôdeur (octobre 2026), à reprendre pour les classes suivantes (barde, ensorceleur, occultiste, clerc, guerrier, moine). Le contrat complet d'une classe est décrit dans `ARCHITECTURE.md` (§ 4).

## 1. Règles et textes
- Table de progression, capacités et sous-classes du *Manuel des joueurs* 2014 (AideDD), résumées pour la table.
- Choisir le modèle de sorts : préparés dans toute la liste (`prep`), grimoire (`book`), **sorts connus** (`known`), ou aucun (`noSpells`).
- Lister ce qui demande une interface (ressources à cocher, choix, compagnon…) et en faire une **maquette** avant de coder.

## 2. Données
- Sorts : un script dans `outils/archives/ajout_sorts_<classe>.py` ajoute les sorts manquants (id anglais, nom français AideDD, description courte, pastille, jet, progression) et ajoute la classe dans le champ `cl` des sorts de sa liste. Le relancer ne doit rien changer.
- Équipement de départ et compétences : `CLASS_START` dans `src/rules/creation.js`.
- Présentation dans *Nouveau personnage* : `CLASS_INFO` dans `src/features/newchar.js`.

## 3. Fichier de classe
- `src/classes/<classe>.js` exporte la définition (contrat), enregistrée dans `src/classes/index.js`.
- Champs propres au personnage : `defaults()` et `normalize(o)`. **Noms de champs uniques entre classes** : les valeurs par défaut de toutes les classes sont fusionnées (ex. le rôdeur utilise `rarch`, le roublard `arch`).
- Capacités : `features(g)` (niveau, pastille, texte, `control` pour un réglage), sous-classe : `subclass` (choisie dans l'assistant de niveau), choix au passage de niveau : `levelUp.choices` / `recapBefore` / `apply`.
- Onglets *Règles* et *Imprimer* : `panels`, `print`. **La fiche imprimable suit chaque ajout** : ressources à cocher, capacités (tableau du niveau), sous-classe (sorts toujours préparés, compagnon…). La page Personnage (attaques, sorts innés et des dons, ressources des dons) est commune (`features/print.js`).
- Un mécanisme nouveau qui servira à d'autres classes va dans `src/features/` et s'active par un champ du contrat (ex. `known` pour les sorts connus, `afterAttacks`, `settings`, `creation`).

## 4. Tests
`tests/test_<classe>.py`, ajouté à `MODULES` dans `tests/run.py` :
- création pas à pas au niveau 1, puis enchaînement des niveaux jusqu'à 5 (sous-classe, amélioration, sorts) ;
- chaque sous-classe et ses éléments d'interface ;
- repos court et long ;
- la fiche imprimable (sections attendues présentes, voir `test_rodeur.test_fiches_imprimables`) ;
- `npm test` complet (le test commun vérifie que chaque `data-a` a son gestionnaire).

## 5. Publication
README (fonctionnalités), `ARCHITECTURE.md` si le contrat change, captures, commit et push.

## Exemples
- **Rôdeur** (octobre 2026) : sorts connus (`known`), réglages (`settings`), compagnon (`afterAttacks`), choix de création (`creation`).
- **Clerc** (octobre 2026) : modèle du paladin et du druide (préparation dans toute la liste, sorts toujours préparés) ; sous-classe au niveau 1, donc choisie à la création (`creation`, avec `auto` pour les sorts mineurs donnés par le domaine) ; maîtrises selon le domaine (`armorProf` en fonction) ; bonus calculés par `dmgBonus` (soins, sorts mineurs) et `acBonus`.
- **Ensorceleur** (octobre 2026) : sorts connus d'un lanceur complet ; nouvelle ressource (points de sorcellerie) dans `resources` ; emplacements créés par `extraSlots` ; options au moment de lancer par `castExtras` + `onCast` (+ `castSnap` pour l'annulation) ; table de sursauts fournie par Fabien (tableur) dans un module à part.
- **Barde** (octobre 2026) : sorts connus ; Touche-à-tout par `halfProf` (calculé dans `rules/character.js`) ; sorts d'autres classes (Secrets magiques) rangés dans `g.secrets` et lancés via `alwaysPrepared` ; choix d'Expertise et de compétences dans `levelUp.choices` / `apply` ; instruments par `creation`.
- **Occultiste** (octobre 2026) : emplacements de pacte décrits par une table `slots` remplie de 0 sous le niveau du pacte + `pact` ; liste du patron par `extraList` ; manifestations, Arcanum et Livre des Ombres passent par `innate` (section « sorts innés » réutilisée par `innateBlock`) ; repos court multi-champs (`shortRest.fields` / `reset`).
- **Guerrier** (octobre 2026) : classe sans sorts dont la sous-classe Chevalier occulte en donne (`noSpells`, `slots`, `extraList` en fonctions du personnage, onglets Sorts/Bibliothèque ajoutés au niveau 3) ; restriction d'école par `knownOk` ; manœuvres avec la ligne de choix dépliable `pickRow`. Méthode à reprendre pour l'Escroc arcanique.
