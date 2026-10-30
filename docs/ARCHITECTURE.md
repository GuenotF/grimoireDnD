# Architecture cible de l'Atelier du Grimoire

*Validé le 21 octobre 2026. Étapes 0 à 4 faites le 21 octobre 2026. Onglet Personnage (étapes 1 à 5 : caractéristiques, PV, compétences, défenses, dons et traits, historique, notes ; PV et amélioration au passage de niveau, page Personnage de la fiche imprimable) le 22 octobre 2026.*

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
    schema.js               format d'un personnage : valeurs par défaut, contrôle, version (v3) et migrations
    store.js                enregistrement sur l'appareil, personnage affiché, mutate
    ui.js                   rendu (fourni par app.js), message d'annulation, statut
    actions.js              registre des actions : onClick, onChange, onInput, onSubmit, onKey
    format.js               mise en forme du texte (signes, pluriels, échappement)
    pwa.js                  version installée : service worker, astuce iPhone
  rules/
    tables.js               tables sans dépendance : écoles, emplacements (lanceur complet, demi-lanceur), caractéristiques
    common.js               règles communes : maîtrise, modificateurs, emplacements, préparation, sorts lançables
    character.js            fiche de personnage : sauvegardes, initiative, PV moyens, fiche à compléter
    money.js                bourse : pièces, dépense avec monnaie
    magic.js                objets magiques : harmonisation (3 au plus), charges et recharge
    feats.js                dons qui modifient les calculs (Vigilant, Maître d'armes lourdes, Tireur d'élite)
    equipment.js            armes et armures : maîtrises, CA calculée, attaques
    hp.js                   points de vie : dégâts, soins, PV temporaires, jets contre la mort, dés de vie, repos long
  classes/
    index.js                registre des classes : C(g), sorts toujours préparés, capacités
    magicien.js             contrat + Restauration arcanique, onglet Règles, assistant de niveau du grimoire
    paladin.js              contrat + serments, Imposition des mains, Perception et Conduit divins, Châtiment
    druide.js               contrat + cercles, ressource Forme sauvage
    roublard.js             classe sans sorts : Attaque sournoise, Ruse, Esquive instinctive, Assassin
    barbare.js              classe sans sorts : Rage, Frénésie (Berserker), Défense sans armure, Attaque téméraire
    clerc.js                contrat + 8 domaines, Conduit divin, Renvoi et Destruction des morts-vivants, Intervention divine
    ensorceleur.js          contrat + points de sorcellerie, métamagie, Lignée draconique, Magie sauvage (ensorceleur-sauvage.js : table d100)
    rodeur.js               contrat + sorts connus, Ennemi juré, Explorateur-né, Chasseur, réglages (voir AJOUTER_UNE_CLASSE.md)
    rodeur-compagnon.js     Maître des bêtes : compagnon (Bestiaire, maîtrise, PV)
    druide-wildshape.js     Forme sauvage : formes possibles, forme active, Changeforme de combat, Bestiaire
    artificier.js           contrat + spécialités (canon occulte, élixirs, défenseur d'acier), objets imprégnés, étape Imprégner du repos long
    artificier-impregnations.js  catalogue des imprégnations et des répliques d'objets magiques (AideDD)
  ui/components.js          éléments réutilisables : sections repliables, capacités dépliables, bouton Retirer
  features/                 mécaniques partagées par toutes les classes
    character.js            onglet Personnage : caractéristiques, combat, jets de sauvegarde (Gérer, En jeu)
    hp.js                   carte des points de vie, puce de la barre du haut, rappel de concentration
    equipment.js            équipement : bourse et objets (Gérer, En jeu)
    abilities.js            onglet Capacités des classes sans sorts
    attacks.js              section Attaques (Personnage ou Capacités)
    tools.js                outils (maîtrise, expertise) et langues
    traits.js               défenses, dons et traits, historique, notes du personnage (Gérer, En jeu)
    rest.js                 repos court (dés de vie + récupération de la classe) et repos long, dans Personnage et Sorts
    spells.js               affichage d'un sort, notes personnelles
    cast.js                 Lancer, concentration, sorts en cours
    topbar.js               barre du haut collée (PV, CA, initiative, puces en cours, six caracs), ligne des emplacements, volet d'une carac. (JdS, test, compétences)
    swipe.js                balayage horizontal : onglet voisin de la rangée principale (bords, champs, zones défilantes et volets ignorés)
    longrest.js             repos long guidé : récapitulatif, préparation des sorts (aussi hors repos, bouton dans Gérer), étape de classe (C(g).lrStep)
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
| `hitDie`, `fileLabel`, `prepNote` | Dé de vie (PV moyens, rappel), nom des sauvegardes, précision sur la préparation | ✓ | ✓ | ✓ |
| `weaponProf`, `armorProf`, `noMetal` | Maîtrises d'armes (catégories `simple`, `martial` ou identifiants) et d'armures (`light`, `medium`, `heavy`, `shield`) ; refus du métal (druide) | ✓ | ✓ | ✓ |
| `acBonus(g, armure)`, `attackMods(g, arme)`, `attackNotes(g)` | Bonus de CA (style Défense), modificateurs d'attaque (Duel, Arme à deux mains), rappels sous les attaques (Châtiment divin) | | ✓ | |
| `attacksPerAction(g)` | Attaques par action Attaquer (Attaque supplémentaire), affiché dans l'en-tête des Attaques à partir de 2 | | ✓ | |
| `prepLine(g)` | Ligne de plus dans le cadre « Préparer les sorts » (Gérer), ex. sorts du grimoire du magicien | | | |
| `noSpells` | Classe sans sorts : onglet Capacités (`tabs` → `caps`, `panels.caps` = `abilitiesHTML`), barre du haut sans emplacements, assistant de niveau sans lignes de sorts | | | |
| `capsTop(g)`, `attackOptions(g)`, `extraAttacks(g, liste)` | Carte en tête de l'onglet Capacités (Rage), cases d'options sous les attaques (Attaque téméraire), attaques ajoutées (Frénésie) | | | |
| `acBase(g)`, `speedBonus(g)` | CA sans armure (Défense sans armure), bonus de vitesse (Déplacement rapide) | | | |
| `halfDamage(g)`, `onDown(g)` | Résistance active : bouton « Dégâts ½ » de la carte des PV ; effet d'une chute à 0 PV (fin de la rage) | | | |
| `saves` en fonction, `shortRest` en fonction | Sauvegardes selon le niveau (Esprit fuyant du roublard) ; ressource de repos court selon le niveau (Coup de chance) | | | |
| `tools(g)`, `langs(g)` | Outils et langues donnés d'office par la classe (outils de voleur, Jargon des voleurs, druidique) | | | ✓ |
| `asiLevels` | Niveaux d'amélioration de caractéristiques, si différents de 4, 8, 12, 16, 19 (guerrier, roublard plus tard) | | | |
| `saves` | Jets de sauvegarde maîtrisés par la classe (codes `str`, `dex`, `con`, `int`, `wis`, `cha`) | ✓ | ✓ | ✓ |
| `defaults()`, `normalize(o)` | Champs propres au personnage et leur contrôle à l'ouverture | ✓ | ✓ | ✓ |
| `subline(g)`, `subclassField(g)` | En-tête : sous-titre, champ de sous-classe | ✓ | ✓ | ✓ |
| `tabs(g)`, `moreTabs(g)`, `panels` | Onglets de la rangée principale (Sorts, Bibliothèque, Bestiaire), onglets du menu Plus (Règles, Imprimer), contenu des onglets propres. Personnage et Sauvegarde sont ajoutés par l'application | ✓ | ✓ | ✓ |
| `alwaysPrepared(g)`, `alwaysPreparedInfo(g)` | Sorts toujours préparés et leurs libellés (serment) | | ✓ | |
| `canRitual(prepared)`, `ritualNeedsPrep` | Lancer en rituel | ✓ | | ✓ |
| `features(g)` | Capacités de classe (avec `control(g)` pour un réglage, ex. style de combat) | | ✓ | ✓ |
| `resources(g)`, `resourceMax` | Ressources en haut de l'onglet et maximum de chaque compteur | | ✓ | ✓ |
| `beforeSlots(g)`, `playTop(g)`, `barChips(g)` | Ajouts à l'écran : forme active, Châtiment divin, puce de la barre du haut | | ✓ | ✓ |
| `itemMagic(g, objet)`, `attackAb(g, arme, objet)` | Artificier : effet de l'imprégnation portée par l'objet (`{ atk, ac, label }`, ajouté au bonus magique) ; caractéristique d'attaque de remplacement (Apte au combat : Intelligence avec une arme magique) | | | |
| `lrStep(g)` | Étape du repos long guidé après le repos : `{ label, html(g) }` (Présage de la divination) ; `null` sinon | | ✓ | ✓ |
| `restBar(g)`, `shortPanel(g)`, `shortRest`, `longRest(g)` | Ajouts à la barre de repos, panneau propre au repos court (Restauration arcanique) ou ressource récupérée, repos long (dés de vie et PV : communs, `features/longrest.js`) | ✓ | ✓ | ✓ |
| `renderSheets(g, levelUpOpen)` | Volets propres (Imposition des mains, formes possibles) | | ✓ | ✓ |
| `levelUp` | Assistant : étapes propres (`init`, `steps`, `apply`…) ou crochets des étapes communes (`rowsBefore`, `rowsAfter`, `summaryExtra`, `notes`, `choicesFirst`, `choices`, `recapBefore`, `recapAfter`, `recapNotes`, `apply`) | ✓ | ✓ | ✓ |
| `weaponProf`, `armorProf`, `tools` en fonction | Maîtrises selon le personnage (domaine du clerc : armures lourdes, armes de guerre) | | | |
| `extraSlots(g)`, `castExtras(g, sort)`, `castSnap`, `hpLv(g)` | Emplacements créés en plus au niveau actuel (`R.slots`), options au moment de lancer (métamagie), champs remis par « Annuler » après un sort, PV de plus par niveau (Résilience draconique) | | | |
| `pact(g)`, `extraList(g)`, `innate(g)`, `skillProf(g, k)`, `pillText(g, s, v)` | Occultiste : magie de pacte (emplacements d'un seul niveau, les niveaux vides masqués, sorts lancés et pastilles au niveau du pacte), liste élargie du patron (bibliothèque, choix, chargement), sorts sans emplacement ajoutés aux sorts innés (`will` à volonté, `slot` avec un emplacement de pacte, `ritual`), maîtrise de compétence donnée par la classe, texte de la pastille de dégâts (rayons). `shortRest` accepte `fields` + `reset(g)` | | | |
| `longOnly(g)` | Ressources dépensées qui ne reviennent qu'au repos long (Rage, inspiration avant le niveau 5, Imposition des mains…) : rappelées dans le panneau du repos court et dans son message. Le bouton « Terminer le repos court » est commun à toutes les classes | | | |
| (composant) `pickRow` (`ui/components.js`) | Ligne de choix dépliable commune à l'assistant et aux choix dans Gérer : nom ▾ + pastilles, description au toucher du nom, rond à droite (+ / ✓) et bouton Choisir ; `full` (limite), `off` + `why` (indisponible). Les gestionnaires sont des clics qui basculent le choix | | | |
| `noSpells(g)`, `slots(g)`, `knownOk(g, s, ids)`, `capsSettings(g)` | Classe qui gagne des sorts par sa sous-classe (Chevalier occulte, plus tard Escroc arcanique) : `noSpells` et `slots` peuvent être des fonctions (lire via `noSpells(g)` et `R.table(g)`) ; `knownOk` renvoie la raison si un sort connu n'est pas permis (école) ; `capsSettings` : réglages dans Capacités › Gérer. `halfProf(g, ab)` reçoit la caractéristique du test et peut renvoyer `"up"` (arrondi supérieur) | | | |
| `weaponAdjust(g, w)`, `unarmed(g)` | Moine : arme de moine ajustée avant le calcul (finesse, dé d'arts martiaux) ; mains nues de la classe `{ die, dt, bonus, pills }` (dé, attaque en action bonus). `CLASS_START.goldX` : multiplicateur de l'or de départ (1 pour le moine) | | | |
| (composant) `foldSec(k, titre, aside, corps)` | Section repliable des ressources de classe (En jeu), comme Attaques ou Sorts mineurs : à utiliser pour toute nouvelle section de ressources | | | |
| `halfProf(g)` | Touche-à-tout (barde) : moitié de la maîtrise aux compétences non maîtrisées (marquées ½) et à l'initiative, `rules/character.js` | | | |
| `known(lv)` | Classe à **sorts connus** (rôdeur, puis barde, ensorceleur, occultiste) : nombre de sorts connus au niveau. Les sorts connus sont rangés dans `g.prepared` (tous lançables) ; `R.prepMax` renvoie ce nombre. Gérer : apprendre / oublier ; assistant : apprendre les sorts gagnés, en remplacer un | | | |
| `settings(g)` | Réglages propres à la classe en mode Gérer, après les capacités (rôdeur : ennemis jurés, terrains, compagnon) | | | |
| `afterAttacks(g)` | Bloc en jeu sous les attaques (rôdeur : carte du compagnon) | | | |
| `creation` | Choix propres à la classe dans l'assistant de création, étape Compétences : `{ html(c), missing(c), apply(g, c), auto(c) }` (rôdeur : ennemi juré, terrain favori ; clerc : domaine dès le niveau 1, et `auto` : sorts mineurs donnés d'office, hors choix) | | | |
| `attackMods(g, arme, carac, mainSecondaire)` | Peut renvoyer `offMod: true` (Combat à deux armes : modificateur aux dégâts de la main secondaire) et `hit` (Archerie) | | | |
| `rules(g)`, `print(g)` | Onglet Règles et fiche imprimable (pilotes, à venir pour paladin et druide) | via `panels` | | |

## 5. Format de sauvegarde versionné

- Chaque personnage porte un numéro de version, `"v": 3`. Les fichiers sans numéro sont la version 1.
- `schema.js` contient la liste des migrations. À l'ouverture d'un fichier, on applique les migrations dans l'ordre.
  - v1 → v2 : ajout du numéro de version.
  - v2 → v3 : les six caractéristiques dans `abil` (`str`, `dex`, `con`, `int`, `wis`, `cha`). La caractéristique d'incantation saisie (`int`, `cha` ou `wis`) est reprise, les autres valent 10. Nouveaux champs : `ac` et `hpMax` (null tant qu'ils ne sont pas saisis), `speed` (mètres), `initX` (bonus d'initiative en plus de DEX), `saveX` (sauvegardes maîtrisées en plus de la classe), `hp` (PV actuels, null = au maximum), `hpTemp`, `death` (`s`, `f`, `stable`), `hdU` (dés de vie dépensés), `skills` (`{ code: 1 maîtrise | 2 expertise }`, codes dans `rules/tables.js`), `defs` (`[{ t: res | imm | vul | adv, v }]`), `traits` (`[{ n, o, d }]`), `bg` (`{ n, d }`), `pnotes`, `tools` (`{ nom: 1 | 2 }`), `langs`, un trait peut porter `feat` (don de `rules/feats.js`), `exh` (épuisement), `items` (`[{ n, q, eq, c, note }]`), `money` (`{ pp, po, pe, pa, pc }`) ; un objet peut porter `ref` (arme ou armure de `data/equipment.json`) et, s'il est magique, `bonus`, `xdmg`, `att` / `attuned`, `chMax` / `chU` / `rec` ; `acMode` (`calc` ou `manual`, null : saisie si elle existe, sinon calcul dès qu'une armure est équipée).
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

1. ✓ **Onglet Règles** du paladin et du druide : fait uniquement dans `classes/paladin.js` et `classes/druide.js` (`tabs`, `panels`), avec les rubriques communes « Lancer un sort » et « Concentration » dans `features/rules.js`, reprises par le magicien. Aucun écran commun modifié.
2. ✓ **Fiche imprimable** du paladin et du druide : `print(g)`, `printTitle`, `printDesc` dans chaque classe, avec les briques communes de `features/print.js` (en-tête, emplacements, sorts mineurs, liste à cocher, concentration, notes). La fiche du magicien utilise les mêmes briques (sortie vérifiée identique).
3. ✓ **Une sous-classe de plus** : le Serment de dévotion. Fait uniquement dans `classes/paladin.js` (un objet de serment : sorts, options de Conduit divin avec leur message, source ; trois capacités) et dans les données (5 sorts ajoutés, voir `outils/archives/ajout_sorts_devotion.py`). Aucun autre fichier du code modifié.

## 8. Décisions

1. **esbuild et Node.js** : oui. Ils servent seulement à assembler, dans l'espace de travail de Claude ou sur un poste de développement.
2. **Minification** : oui pour `index.html` publié ; la lisibilité est assurée dans `src/`.
3. **Langue** : identifiants en anglais (cohérent avec le code existant, aucun surcoût), commentaires et textes en français.
4. **Variante artefact claude.ai** : abandonnée (étape 0). Concrètement : plus de `dist/artifact.html`, et suppression du mode d'enregistrement propre à claude.ai (`window.claude`, `S.mode === "db"`, lecture seule), ce qui simplifie `store.js`. L'artefact déjà publié sur claude.ai n'est pas supprimé : il reste tel quel, figé.
5. **Outils** : les scripts d'extraction (OCR, bêtes, sorts) sont rangés dans `outils/`.
