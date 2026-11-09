# Lewys — Générateur de rapports de fin de mois (version Netlify)

Une seule adresse pour toute l'équipe. L'historique des rapports et les profils (nom, prénom, photo) sont enregistrés sur Netlify (Netlify Blobs) et partagés entre tous les utilisateurs. Le fichier Excel central n'est jamais envoyé : il est lu dans le navigateur de chaque utilisateur.

## Contenu du dossier

- `public/index.html` : l'application (accueil, rapport, historique)
- `netlify/functions/history.mjs` : API de l'historique (`/api/history`, `/api/ping`)
- `netlify/functions/profiles.mjs` : API des profils (`/api/profiles`)
- `netlify/functions/hotels.mjs` : liste des hôtels suivis (`/api/hotels`), mise à jour à chaque chargement du fichier central
- `netlify/functions/checklist.mjs` : coches manuelles de la checklist, une liste par mois (`/api/checklist`)
- `netlify/lib/shared.mjs` : code commun (code d'accès)
- `netlify.toml`, `package.json`, `package-lock.json` : configuration Netlify

## Mise en ligne (une seule fois)

Le glisser-déposer de Netlify (« Netlify Drop ») ne déploie que des pages statiques : il ne met pas en ligne les fonctions serveur, donc l'historique ne serait pas partagé. Utilisez l'une des deux méthodes suivantes.

### Méthode A : via GitHub (recommandée, sans ligne de commande)

1. Créez un dépôt privé sur GitHub (ex. `lewys-rapports`) et déposez-y tout le contenu de ce dossier (bouton « Add file » → « Upload files »).
2. Sur app.netlify.com : « Add new project » → « Import an existing project » → GitHub → choisissez le dépôt. Les réglages sont lus dans `netlify.toml` : ne changez rien, cliquez sur « Deploy ».
3. Code d'accès de l'équipe (fortement conseillé, les rapports contiennent des chiffres d'affaires) : « Project configuration » → « Environment variables » → ajoutez `ACCESS_CODE` avec le code de votre choix, puis « Deploys » → « Trigger deploy ». Chaque utilisateur saisit ce code une fois par navigateur.
4. Adresse : « Domain management » pour renommer le site (ex. `lewys-rapports.netlify.app`) ou brancher un sous-domaine (ex. `rapports.lewys.fr`, via un enregistrement CNAME chez votre hébergeur de domaine).

Pour mettre à jour l'application plus tard, remplacez `public/index.html` dans GitHub : Netlify redéploie automatiquement. L'historique et les profils sont conservés.

### Méthode B : via la ligne de commande Netlify

```
npm install -g netlify-cli
netlify login
cd dossier-du-projet
netlify deploy --prod
```

Puis définissez `ACCESS_CODE` comme à l'étape 3.

## Bon à savoir

- Connexion : à la première visite sur un poste, l'application demande « Qui êtes-vous ? ». Le profil choisi est mémorisé sur ce navigateur (case « Se souvenir de moi »). L'adresse IP n'est pas utilisée : elle est partagée par tous les postes d'un même bureau et change en déplacement.
- Checklist : un hôtel est coché dès que son rapport est enregistré dans l'historique pendant le mois en cours (ou coché à la main). Le 1er du mois, la checklist repart à zéro ; l'historique, lui, est conservé.

- Le badge en haut à droite indique « Historique partagé » quand le serveur répond. S'il affiche « Mode local », l'application fonctionne mais enregistre seulement dans le navigateur (cas d'un fichier ouvert directement depuis l'ordinateur, ou d'un code d'accès erroné : videz le code en effaçant les données du site dans le navigateur).
- Les rapports enregistrés sont des instantanés complets : ils s'ouvrent depuis l'historique sans recharger le fichier Excel.
- Les anciens historiques enregistrés dans l'ancienne version (fichier HTML ouvert en local) restent dans le navigateur où ils ont été créés : ils ne peuvent pas être repris automatiquement sur la nouvelle adresse.
