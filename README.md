# Atelier du Grimoire

Grimoire de magicien pour **D&D 5e**, en français : les 213 sorts de magicien du *Manuel des joueurs* (2014), la préparation des sorts, le suivi des emplacements et une fiche imprimable A4.

L'application est une seule page web. Elle s'installe sur l'écran d'accueil (Android, iPhone, iPad, ordinateur) et fonctionne hors connexion.

## Fonctionnalités

**Le magicien**
- Niveau, Intelligence et tradition arcanique : DD, bonus d'attaque, emplacements, nombre de sorts préparés et de sorts mineurs calculés automatiquement.
- Dés des sorts mineurs à dégâts ajustés au niveau (5, 11, 17).
- **Passage de niveau** : le bouton *↑ Niveau N*, à côté du sélecteur, ouvre un assistant en 3 étapes : ce qui change (DD, attaque, emplacements, préparation, Restauration arcanique, sorts mineurs), choix des 2 sorts gratuits (et du sort mineur supplémentaire aux niveaux 4 et 10), validation avec préparation facultative. Annulable. Le sélecteur reste un réglage direct, sans assistant (création, correction).
- Plusieurs grimoires sur le même appareil.

**Onglet Grimoire, mode « Gérer »** (préparer et organiser)
- Une ligne par sort : case *Préparer*, nom, pastilles clés (dégâts, jet ou effet). Toucher le nom déplie le détail complet, les boutons de lancement, l'origine et *Retirer*.
- Compteur *Préparés x / y* dans la barre du bas pendant la préparation. Limite respectée : une fois atteinte, les autres cases sont grisées (toucher l’une d’elles explique pourquoi) ; on décoche un sort pour en préparer un autre.
- *Autres sorts* (race, dons, objets) : une ligne avec la case *utilisé*, l'usage et *Modifier* au toucher du nom.

**Onglet Grimoire, mode « En jeu »** (en partie)
- Seulement les sorts préparés, les sorts mineurs, les rituels et les autres sorts, en lignes compactes avec *Lancer* à droite.
- *Lancer* coche un emplacement du niveau du sort (ou du premier niveau supérieur libre) ; **▲** choisit un niveau supérieur quand le sort y gagne quelque chose ; *Rituel* pour les sorts lancés en rituel. Chaque lancement peut être annulé.
- **Concentration** : avertissement avant de remplacer un sort de concentration, panneau du jet de concentration (DD calculé à partir des dégâts subis).
- **Sorts en cours** : ajoutés automatiquement au lancement, puces dans la barre du bas, volet *En cours* avec note facultative et *Terminer*.
- **Barre du bas** : emplacements restants toujours visibles, accès direct à la section des emplacements.

**Repos**
- *Repos long* : emplacements, capacités et sorts en cours remis à zéro.
- *Repos court* : assistant de Restauration arcanique (choix rapides valides, budget de niveaux, une fois par jour).

**Onglet Bibliothèque**
- Les 213 sorts, filtrables par niveau, école, concentration, rituel, accessibilité et sorts déjà appris.
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
| `src/app.html` | L'application (interface, règles, stockage, fiche imprimable). **À modifier ici.** |
| `data/spells.json` | Les 213 sorts, un par ligne. **À modifier ici.** |
| `src/sw.js` | Modèle du service worker (cache hors connexion). |
| `build.py` | Assemble les sources. |
| `index.html`, `sw.js` | **Générés** par `build.py`, publiés par GitHub Pages. Ne pas modifier à la main. |
| `dist/artifact.html` | Variante générée pour l'artefact claude.ai. |
| `manifest.webmanifest`, `icons/` | Installation sur l'écran d'accueil. |
| `fonts/` | Polices Alegreya (licence SIL OFL), servies localement. |

## Modifier l'application

1. Modifier `src/app.html` et/ou `data/spells.json`.
2. Lancer `python3 build.py` (Python 3, aucune dépendance).
3. Envoyer les modifications sur la branche `main` : GitHub Pages republie en une minute environ. Les appareils où l'atelier est installé récupèrent la nouvelle version au lancement suivant.

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

Le DD et le bonus d'attaque ne sont pas stockés : l'application les calcule pour le magicien affiché.

## Sources

Liste des sorts et noms français vérifiés sur le *Manuel des joueurs* 2014 et AideDD ; caractéristiques des sorts recoupées avec le SRD 5.1. Les descriptions sont des résumés rédigés pour la table : en cas de doute, le livre fait foi.
