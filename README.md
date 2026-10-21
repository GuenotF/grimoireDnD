# Atelier du Grimoire

Grimoire et fiche de sorts pour **D&D 5e**, en français : les sorts de magicien, de paladin et de druide du *Manuel des joueurs* (2014), la préparation des sorts, le suivi des emplacements et une fiche imprimable A4.

L'application est une seule page web. Elle s'installe sur l'écran d'accueil (Android, iPhone, iPad, ordinateur) et fonctionne hors connexion.

## Fonctionnalités

**Classes**
- **Magicien** : toutes les fonctionnalités ci-dessous.
- **Paladin** : Charisme, serment (Conquête), emplacements de demi-lanceur. *Gérer* : sorts de serment (★, toujours préparés), toute la liste du paladin à cocher avec la limite (mod. CHA + moitié du niveau). Ressources : Imposition des mains (volet de soin, maladie/poison) ; Perception divine et Conduit divin dépliables comme un sort (effet, DD, boutons Utiliser, Présence conquérante, Frappe guidée ; Présence conquérante rejoint les sorts actifs) ; repos court et long. *En jeu* : Châtiment divin (dés par niveau d'emplacement, +1d8 contre morts-vivants et fiélons), section *Sorts de serment* puis sorts préparés par niveau, avec *Lancer*, même barre du bas que le magicien. *Capacités de classe* (Gérer et En jeu, même ordre) : style de combat au choix, Santé divine, Attaque supplémentaire, auras de protection et de conquête, etc., valeurs calculées selon le Charisme et le niveau ; les deux prochaines capacités en grisé dans Gérer. *Passage de niveau* (bouton ↑) : ce qui change, nouvelles capacités et sorts de serment, style de combat et sorts préparés, validation annulable. Impression et règles : magicien seulement pour l'instant.
- **Druide** (Cercle de la Lune) : Sagesse, lanceur complet, sorts mineurs (dont Embrasement, Xanathar), préparation dans toute la liste du druide (mod. SAG + niveau), rituels préparés, Forme sauvage (2 utilisations par repos court, FP maximum, nage/vol selon le niveau), capacités du cercle, passage de niveau (avec les nouvelles formes du niveau, à ajouter en ★ en un geste). **Formes possibles** (bouton *Choisir une forme* dans Forme sauvage) : les 82 bêtes du *Manuel des monstres* filtrées selon le niveau (FP, nage, vol), filtres FP et déplacement, recherche, ★ formes favorites en tête, fiche de la bête (CA, PV, vitesses, FOR/DEX/CON, compétences avec rappel de la règle des maîtrises, sens, traits, attaques). *Se transformer* dépense une utilisation (annulable). **Forme active** en tête de l'onglet : PV de la bête avec barre, Dégâts / Soins (à 0 PV, retour à la forme de druide et excédent de dégâts indiqué), fiche complète de la bête (traits, sens, attaques avec allonge et effets, pastille de recharge), carte repliable (repliée : nom, CA, PV et Dégâts / Soins), Frappe primitive rappelée dès le niveau 6 et Sorts bestiaux au niveau 18, Changeforme de combat (bouton sur le premier emplacement libre, ▲ pour choisir un niveau plus élevé : niveau N = Nd8 PV, le dé à lancer est rappelé), *Reprendre ma forme* ; puce 🐾 dans la barre du bas ; si un sort de concentration est actif, des dégâts sur la bête affichent le rappel du jet de sauvegarde de Constitution (DD calculé, CON de la bête ou la tienne si la forme a pris fin) avec *Réussi* / *Raté : concentration perdue* ; le repos long met fin à la forme. **Bestiaire** (onglet du druide) : les 82 bêtes de FP 0 à 7 par FP, comme la Bibliothèque ; filtres FP, déplacement, taille, *Accessibles à son niveau*, *★ Mes formes* et recherche (nom ou capacité) ; une ligne par bête (dépliée pendant une recherche), fiche complète, niveau requis indiqué pour les formes pas encore accessibles ; ★ seulement sur les formes accessibles. Pas de transformation depuis le Bestiaire.
- *Nouveau personnage* : choix de la classe à la création. Un fichier importé garde sa classe ; les anciens fichiers sans classe sont des magiciens.

**Le magicien**
- Niveau, Intelligence et tradition arcanique : DD, bonus d'attaque, emplacements, nombre de sorts préparés et de sorts mineurs calculés automatiquement.
- Dés des sorts mineurs à dégâts ajustés au niveau (5, 11, 17).
- **Passage de niveau** : le bouton *↑ Niveau N*, à côté du sélecteur, ouvre un assistant en 3 étapes : ce qui change (DD, attaque, emplacements, préparation, Restauration arcanique, sorts mineurs), choix des 2 sorts gratuits (et du sort mineur supplémentaire aux niveaux 4 et 10), validation avec préparation facultative. Annulable. Le sélecteur reste un réglage direct, sans assistant (création, correction).
- Plusieurs grimoires sur le même appareil.

**Onglet Grimoire, mode « Gérer »** (préparer et organiser)
- Une ligne par sort : case *Préparer*, nom, pastilles clés (dégâts, jet ou effet). Toucher le nom déplie le détail complet, les boutons de lancement, l'origine et *Retirer*.
- **Notes par sort** : crayon à droite de chaque ligne (gris sans note, doré avec une note) pour écrire un rappel, une règle de table ou une phrase préparée. La note s'affiche en bas du détail, au-dessus du bouton *Lancer*, quand on déplie le sort. Les notes figurent aussi sur la fiche imprimable et dans les sauvegardes.
- Compteur *Préparés x / y* dans la barre du bas pendant la préparation. Limite respectée : une fois atteinte, les autres cases sont grisées (toucher l’une d’elles explique pourquoi) ; on décoche un sort pour en préparer un autre.
- *Autres sorts* (race, dons, objets) : une ligne avec la case *utilisé*, l'usage et *Modifier* au toucher du nom.

**Onglet Grimoire, mode « En jeu »** (en partie)
- Seulement les sorts préparés, les sorts mineurs, les rituels et les autres sorts, en lignes compactes avec *Lancer* à droite.
- Repère doré ✎ sur les sorts qui ont une note ; la note s'affiche au-dessus du bouton *Lancer* quand on déplie le sort (lecture seule).
- Sorts mineurs de concentration (Embrasement, Assistance, Résistance, Lumières dansantes, Coup au but) : bouton *Lancer* sans emplacement, pour suivre la concentration.
- *Lancer* coche un emplacement du niveau du sort (ou du premier niveau supérieur libre) ; **▲** choisit un niveau supérieur quand le sort y gagne quelque chose ; *Rituel* pour les sorts lancés en rituel. Chaque lancement peut être annulé.
- **Concentration** : avertissement avant de remplacer un sort de concentration, panneau du jet de concentration (DD calculé à partir des dégâts subis).
- **Sorts en cours** : ajoutés automatiquement au lancement, puces dans la barre du bas, volet *En cours* avec note facultative et *Terminer*.
- **Barre du bas** : emplacements restants toujours visibles, accès direct à la section des emplacements.

**Sections repliables** (Gérer et En jeu)
- Toucher le titre d'une section (sorts mineurs, chaque niveau, rituels, autres sorts) la replie ou la déplie ; repliée, elle affiche un résumé (« 6 sorts · 4 préparés », emplacements restants en jeu).
- L'état est retenu sur l'appareil, pour chaque grimoire et séparément pour Gérer et En jeu.

**Repos**
- *Repos long* : emplacements, capacités et sorts en cours remis à zéro.
- *Repos court* : assistant de Restauration arcanique (choix rapides valides, budget de niveaux, une fois par jour).

**Onglet Bibliothèque**
- Les sorts de la classe (213 pour le magicien, 45 pour le paladin, 111 pour le druide), filtrables par niveau, école, concentration, rituel, accessibilité et sorts déjà appris.
- Une ligne par sort par défaut ; les résultats d'une recherche s'affichent avec leur description complète.
- Ajout par montée de niveau ou par copie (coût calculé, moitié prix pour l'école du magicien).

**Onglets Imprimer, Sauvegarde, Règles**
- Fiche imprimable A4 (tableau de bord, grimoire à cocher, journal de copie, rappel des règles).
- *Envoyer au MJ* (menu de partage du téléphone), export et import, suppression.
- Rappel des règles du grimoire du magicien.

## Utilisation

- **Adresse** : https://guenotf.github.io/grimoireDnD/
- **Installer sur Android** : dans Chrome, menu ⋮ › *Ajouter à l'écran d'accueil* (ou *Installer l'application*).
- **Installer sur iPhone / iPad** : dans Safari, bouton *Partager* › *Sur l'écran d'accueil*. Ouvre ensuite toujours l'atelier depuis cette icône : sur iOS, l'icône a son propre stockage, séparé de Safari.

## Où sont stockés les grimoires

- **Sur l'appareil**, dans le stockage du navigateur (ou de l'application installée). Rien n'est envoyé à GitHub ni ailleurs.
- Chaque appareil a ses propres grimoires : il n'y a pas de synchronisation.
- **Sauvegarde et transfert** : onglet *Sauvegarde* › *Envoyer au MJ* (ou *Exporter*), puis *Importer* sur l'autre appareil. Les fichiers sont datés (`Grimoire - Némeia - 2026-10-19.json`). Sur Android, le partage produit un `.txt` au contenu identique, que l'import accepte aussi.
- L'import **ajoute** un grimoire : il ne remplace pas celui qui existe déjà.
- Vider les données du navigateur, utiliser la navigation privée ou désinstaller l'icône sur iOS efface les grimoires : exporte-les régulièrement.

## Organisation du dépôt

| Fichier | Rôle |
|---|---|
| `src/app.js` | Le code de l'application (interface, règles, stockage, fiche imprimable), en cours de découpage (voir `docs/ARCHITECTURE.md`). **À modifier ici.** |
| `src/data.js`, `src/core/format.js` | Accès aux données (sorts, bêtes) ; mise en forme du texte (signes, pluriels, échappement). |
| `src/styles/` | Les styles, un fichier par partie de l'écran ; `index.css` fixe l'ordre d'application. |
| `src/app.html` | Le gabarit : structure de la page. |
| `data/spells.json` | Les 310 sorts (magicien, paladin, druide, sorts de serment), un par ligne. |
| `data/beasts.json` | Les 82 bêtes du *Manuel des monstres* utilisables en Forme sauvage. |
| `src/sw.js` | Modèle du service worker (cache hors connexion). |
| `build.py`, `package.json` | Assemblage : esbuild réunit et minifie le code, `build.py` produit la page. |
| `index.html`, `sw.js`, `app.js.map` | **Générés** par `build.py`, publiés par GitHub Pages. Ne pas modifier à la main. |
| `tests/` | Tests automatiques (téléphone simulé) : `python3 tests/run.py`. |
| `outils/` | Scripts d'extraction des données (OCR des exports AideDD, bêtes, sorts) et des maquettes. |
| `docs/ARCHITECTURE.md` | Architecture cible et plan de restructuration. |
| `manifest.webmanifest`, `icons/` | Installation sur l'écran d'accueil. |
| `fonts/` | Polices Alegreya (licence SIL OFL), servies localement. |

## Modifier l'application

1. Une fois : `npm install` (installe esbuild, l'outil d'assemblage).
2. Modifier les fichiers de `src/` et/ou `data/*.json`.
3. `python3 build.py`, puis `python3 tests/run.py` (ou `npm test`, qui fait les deux).
4. Envoyer les modifications sur la branche `main` : GitHub Pages republie en une minute environ. Les appareils où l'atelier est installé récupèrent la nouvelle version au lancement suivant.

Le code publié est minifié. En cas d'erreur, les outils du navigateur la situent dans `src/app.js` grâce à `app.js.map`.

Pour tester en local : `python3 -m http.server 8000` dans le dossier, puis ouvrir `http://localhost:8000/`.

## Format d'un sort (`data/spells.json`)

| Champ | Contenu | Exemple |
|---|---|---|
| `id` | Identifiant (nom anglais) | `fire-bolt` |
| `n` / `en` | Nom français officiel / anglais | `Trait de feu` / `Fire Bolt` |
| `l` | Niveau (0 = sort mineur) | `0` |
| `s` | École | `Évocation` |
| `t`, `r`, `d` | Incantation, portée, durée | `1 action`, `36 m`, `Instantanée` |
| `c`, `ri` | Concentration, rituel | `false`, `false` |
| `v` | Composantes | `V,S` |
| `g`, `x` | Coût de la composante en po, consommée | `0`, `false` |
| `p` | Pastille principale : `d:` dégâts ou `f:` effet | `d:1d10 feu` |
| `j` | Jet : `atk` (attaque de sort), `auto` (touche toujours), `DEX`, `CON`, `SAG`, `INT`, `CHA`, `FOR` (sauvegarde de la cible), vide | `atk` |
| `ok` | Texte sous la pastille de jet | `contre la CA` |
| `z` | Zone, quand elle s'ajoute à la portée | `sphère de 6 m` |
| `up` | Emplacement plus élevé, ou progression d'un sort mineur | `2d10 au niveau 5, …` |
| `e` | Description courte | |
| `cl` | Classes qui ont le sort dans leur liste (vide pour un sort de serment hors liste) | `["magicien", "paladin"]` |

Le DD et le bonus d'attaque ne sont pas stockés : l'application les calcule pour le magicien affiché.

## Sources

Liste des sorts et noms français vérifiés sur le *Manuel des joueurs* 2014 et AideDD ; caractéristiques des sorts recoupées avec le SRD 5.1. Les descriptions sont des résumés rédigés pour la table : en cas de doute, le livre fait foi.
