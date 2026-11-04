# Réception HACCP — Lycée St Vincent de Paul

Appli de saisie des livraisons pour la cuisine. Les données vont dans un Google Sheet, et les photos des étiquettes dans un dossier Google Drive (compte de l'établissement).

## Mise à jour vers la version 2.2 (à faire une fois)

L'appli se met à jour toute seule. Il faut seulement mettre à jour le script Google :

1. Ouvre le Google Sheet du registre, puis **Extensions > Apps Script** (dans une fenêtre où seul le compte de l'établissement est connecté).
2. Remplace tout le contenu de `Code.gs` par le nouveau fichier `Code.gs`, puis enregistre (Ctrl+S).
3. Menu de gauche : **Services** (+) > **Drive API** > **Ajouter**. Cela sert à lire le texte des étiquettes et à mettre les vignettes dans le registre PDF.
4. En haut, choisis la fonction **installer**, puis **Exécuter**. Accepte les nouvelles autorisations : envoi d'e-mails, documents, tâches automatiques.
   Elle ajoute les nouveaux onglets (*Relevés frigos*, *Frigos et chambres froides*) et les nouveaux réglages, sans rien effacer.
5. **Déployer > Gérer les déploiements** > crayon ✏ > Version : **Nouvelle version** > **Déployer**. L'adresse `/exec` ne change pas.

Nouveautés : plusieurs photos par livraison et bon de livraison, recherche par numéro de lot, relevé des frigos, e-mails au responsable, registre PDF mensuel, espace responsable et mode hors ligne.

## Les 3 morceaux

| Fichier | Rôle | Où il va |
|---|---|---|
| `Code.gs` | Le « serveur » : il range les livraisons dans le Sheet et les photos dans Drive | Dans le Google Sheet, menu Extensions > Apps Script |
| `index.html`, `sw.js`, `manifest.webmanifest`, les icônes `.png` (dont `favicon.png`) | L'appli elle-même | Sur GitHub Pages, comme le carnet de la Lexus |
| `README.md` | Ce guide | GitHub (facultatif) |

## Étape 1 — Le Google Sheet (compte de l'établissement)

> Sur iPhone, l'éditeur Apps Script est pénible. Si possible, fais cette étape sur un ordinateur. Sinon, dans Safari, touche « aA » puis « Demander le site pour ordinateur ».

1. Connecté au compte Google de l'établissement, crée un Google Sheet vide nommé **Registre réception HACCP**.
2. Menu **Extensions > Apps Script**.
3. Efface le contenu de `Code.gs` et colle tout le fichier `Code.gs` fourni. Enregistre (icône disquette).
4. En haut, choisis la fonction **installer**, puis clique sur **Exécuter**. Google demande des autorisations : accepte. Si tu vois « Google n'a pas validé cette appli », clique sur *Paramètres avancés > Accéder au projet*. C'est normal pour un script perso.
5. Reviens dans le Sheet. Il contient maintenant 5 onglets : *Réceptions*, *Agents*, *Fournisseurs*, *Types de produit* et *Réglages*. Dans **Réglages**, note le **code d'accès** (6 caractères) et le **code responsable** (4 chiffres).
6. Dans Apps Script : **Déployer > Nouveau déploiement**. Clique sur la roue dentée et choisis **Application Web**.
   - Exécuter en tant que : **Moi**
   - Qui a accès : **Tout le monde**
   - Clique sur **Déployer**, puis copie l'**URL de l'application Web** (elle se termine par `/exec`).

« Tout le monde » veut dire que n'importe qui ayant l'adresse peut envoyer une requête. Le script la refuse quand même s'il n'y a pas le bon code d'accès.

**Si tu modifies `Code.gs` plus tard :** Déployer > Gérer les déploiements > crayon > Version : *Nouvelle version* > Déployer. L'URL ne change pas.

## Étape 2 — L'appli sur GitHub Pages

1. Sur GitHub (compte Heikefr), crée un nouveau dépôt public, par exemple `reception-haccp`.
2. **Add file > Upload files** : glisse `index.html`, `sw.js`, `manifest.webmanifest`, `icon-192.png`, `icon-512.png` et `apple-touch-icon.png`. Valide avec *Commit changes*.
3. **Settings > Pages** : Source = *Deploy from a branch*, branche `main`, dossier `/ (root)`. Enregistre.
4. Au bout d'une minute, l'appli est en ligne à l'adresse `https://heikefr.github.io/reception-haccp/`.

## Étape 3 — Mise en service avec ton iPhone

1. Ouvre l'adresse GitHub Pages dans Safari.
2. Colle l'URL `/exec` et le code d'accès, puis touche **Relier cet appareil**.
3. Fais une livraison de test (photo, température…). Vérifie qu'une ligne apparaît dans l'onglet *Réceptions* et qu'une photo arrive dans le dossier Drive **HACCP - Photos étiquettes**.
4. Dans **Réglages** de l'appli, mets la bonne liste du personnel. Elle te demandera le code responsable.
5. Supprime la ligne de test dans le Sheet si tu veux.

## Étape 4 — Les appareils Android de la cuisine

1. Sur ton iPhone : appli > **Réglages > Copier** le lien d'installation. Ce lien contient déjà l'adresse et le code.
2. Envoie-le à la tablette (mail, SMS, QR code…) et ouvre-le dans **Chrome**.
3. Dans Chrome, menu ⋮ > **Ajouter à l'écran d'accueil** (ou *Installer l'application*).
4. Ouvre l'appli une première fois et autorise l'appareil photo.

Le personnel n'a plus rien à configurer. Il touche l'icône **Réception**, puis **Nouvelle livraison**.

## Ce que le personnel fait à chaque livraison

1. Toucher son prénom (l'appareil s'en souvient)
2. Toucher le fournisseur, ou « Autre… » pour en taper un nouveau. Il sera ajouté à la liste automatiquement.
3. Toucher le type de produit
4. Prendre la photo de l'étiquette (lot + DLC)
5. Taper la température. Pour le surgelé, le signe « − » est déjà mis.
6. Conforme / Non conforme. Une température hors norme fait passer la livraison en non conforme automatiquement.

Les non-conformités apparaissent en rouge sur l'accueil jusqu'à ce que quelqu'un décide : **Accepté** ou **Refusé**.

## Réglages côté Google Sheet

- **Types de produit** : les seuils de température (idéal / limite). Vérifie-les avec le plan de maîtrise sanitaire de l'établissement.
- **Agents** / **Fournisseurs** : mettre « Non » dans la colonne *Actif* masque un nom dans l'appli sans effacer l'historique.
- **Réglages** : changer le code d'accès oblige à relier de nouveau chaque appareil.

L'appli affiche les 13 derniers mois. Le Sheet garde tout, et sert de registre officiel à montrer en cas de contrôle.
