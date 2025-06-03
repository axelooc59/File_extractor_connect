# Connect File Extractor

![Version](https://img.shields.io/badge/version-1.0-blue.svg)

Une extension de navigateur conçue pour extraire les informations sur les fichiers (nom, auteur, version, taille, dates, etc.) et les structures de dossiers depuis le site `connect.bontaz.com` et les exporter sous forme de fichier CSV.  
Elle peut fonctionner de manière récursive pour parcourir les sous-dossiers à un niveau de profondeur choisi.

<p align="center">
  <img src="https://github.com/user-attachments/assets/276bf6b3-b413-4bdc-8f84-45fe1bcedc78" alt="Capture d'écran de l'extension Bontaz File Extractor">
</p>



## Table des matières

- [Bontaz File Extractor](#bontaz-file-extractor)
  - [Table des matières](#table-des-matières)
  - [Fonctionnalités](#fonctionnalités)
  - [Installation](#installation)
    - [Depuis les sources (pour les développeurs)](#depuis-les-sources-pour-les-développeurs)
  - [Utilisation](#utilisation)
    - [1. Accéder au site Bontaz](#1-accéder-au-site-bontaz)
    - [2. Ouvrir la Popup de l'extension](#2-ouvrir-la-popup-de-lextension)
    - [3. Scanner la page](#3-scanner-la-page)
    - [4. Options de scan](#4-options-de-scan)
    - [5. Sélection des colonnes](#5-sélection-des-colonnes)
    - [6. Exporter les données](#6-exporter-les-données)
  - [Structure du Projet](#structure-du-projet)

## Fonctionnalités

* **Extraction de données de fichiers** : Récupère automatiquement le nom, l'URL, l'auteur (BPO), la version, la taille, la date de modification et la date de publication des fichiers.
* **Scan de page unique** : Analyse rapidement les fichiers présents sur la page actuellement ouverte.
* **Scan récursif des sous-dossiers** : Permet d'explorer et d'extraire des fichiers sur plusieurs niveaux de profondeur au sein de l'arborescence des dossiers du site.
* **Profondeur de scan configurable** : Définissez jusqu'à quelle profondeur l'extension doit naviguer dans les sous-dossiers lors d'un scan récursif.
* **Sélection des colonnes CSV** : Choisissez les informations que vous souhaitez inclure dans le fichier CSV exporté.
* **Export CSV** : Génère un fichier CSV structuré, facile à ouvrir avec n'importe quel tableur.
* **Suivi de progression** : Affiche une barre de progression et des informations de statut pendant le scan récursif.
* **Chemin et URL du dossier** : Inclut le chemin complet du dossier et l'URL source pour chaque fichier extrait.

## Installation


Actuellement, cette extension n'est pas publiée sur le Chrome Web Store. Vous pouvez l'installer manuellement à partir des sources.

### Depuis les sources (pour les développeurs)

1.  **Téléchargez ou clonez le dépôt** :
    ```bash
    git clone https://github.com/axelooc59/File_extractor_connect.git
    ```
2.  **Ouvrez Google Chrome** et accédez à `chrome://extensions` (`edges://extensions` sur Microsoft Edge)  
3.  **Activez le "Mode développeur"** en haut à droite de la page.
4.  Cliquez sur le bouton "**Charger l'extension non empaquetée**".
5.  Sélectionnez le dossier où vous avez téléchargé/cloné les fichiers de l'extension (`bontaz-file-extractor`).
6.  L'extension devrait maintenant apparaître dans votre liste d'extensions.

## Utilisation

### 1. Accéder au connect de Bontaz

Ouvrez votre navigateur Chrome et naviguez vers `https://connect.bontaz.com/`. Assurez-vous d'être connecté.

### 2. Ouvrir la Popup de l'extension

Cliquez sur l'icône de l'extension Bontaz File Extractor (un petit icône qui devrait ressembler à celui défini dans `icon48.png`) dans la barre d'outils de Chrome. Cela ouvrira la fenêtre pop-up de l'extension.

### 3. Scanner la page

* Une fois la popup ouverte, cliquez sur le bouton "**Scanner**".
* L'extension commencera à analyser la page actuelle pour y trouver des fichiers.
* Le nombre de fichiers trouvés s'affichera, ainsi que d'autres statistiques (nombre de dossiers, auteurs, etc. si applicable).

### 4. Options de scan

* **Scan récursif des sous-dossiers** : Cochez cette option si vous souhaitez que l'extension navigue automatiquement dans les sous-dossiers pour extraire tous les fichiers.
    * **Profondeur max.** : Si le scan récursif est activé, vous pouvez spécifier le nombre maximal de niveaux de sous-dossiers à explorer (par exemple, 3 pour le dossier actuel + 3 niveaux de sous-dossiers).

    > ⚠️ **Avertissement** : Le scan récursif peut prendre plusieurs minutes selon le nombre de dossiers et de fichiers. Une barre de progression vous tiendra informé.


<p align="center">
  <img src="https://github.com/user-attachments/assets/94883b42-893a-468e-ab6c-a190dc1dba19" alt="Capture d'écran de l'extension Bontaz File Extractor">
</p>

### 5. Sélection des colonnes

Avant l'exportation, vous pouvez choisir les colonnes que vous souhaitez inclure dans votre fichier CSV :

* Nom du fichier
* Lien du fichier
* Auteur (BPO)
* Version
* Taille du fichier
* Date de modification
* Date de publication
* Chemin du dossier
* Profondeur (du dossier dans l'arborescence)
* Horodatage d'extraction

Cochez ou décochez les cases selon vos besoins. Vos préférences sont sauvegardées automatiquement.

### 6. Exporter les données

* Après avoir scanné la page et si des fichiers ont été trouvés, le bouton "**Exporter CSV**" deviendra actif.
* Cliquez sur ce bouton pour générer et télécharger un fichier CSV contenant les données extraites.
* Le nom du fichier CSV sera `bontaz_files_[recursive_if_applicable]_YYYY-MM-DD_HH-MM-SS.csv`.

## Structure du Projet

* `manifest.json` : Le fichier de manifeste de l'extension, définissant ses permissions, son nom, ses scripts de contenu, etc.
* `popup.html` : L'interface utilisateur de la popup de l'extension.
* `popup.js` : Le script JavaScript qui gère la logique de l'interface utilisateur de la popup, les interactions avec l'utilisateur et l'envoi de messages au script de contenu.
* `content.js` : Le script de contenu qui s'exécute sur `connect.bontaz.com`. Il est responsable de l'interaction directe avec le DOM de la page pour extraire les données et simuler les clics.
* `icon48.png` : L'icône de l'extension.

## Dépannage

* **"Cette extension ne fonctionne que sur connect.bontaz.com"** : Assurez-vous que vous êtes bien sur une page du domaine `connect.bontaz.com` lorsque vous ouvrez la popup de l'extension.
* **"Erreur de connexion avec l'onglet. Veuillez rafraîchir la page..."** : Si vous voyez cette erreur, cela signifie que le script de contenu n'a pas pu communiquer avec l'onglet. Cela peut arriver si l'onglet a été fermé, rafraîchi manuellement, ou si un problème temporaire est survenu. Rafraîchissez simplement la page sur `connect.bontaz.com` et réessayez.
* **Aucun fichier trouvé** : Vérifiez que la page contient bien des éléments de fichier listés. Il se peut que la structure HTML ait changé ou que la page soit vide.


