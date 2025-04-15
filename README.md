# LUMA API

API pour le projet LUMA, version `LUMA.A-0.0.1-Phoenix`

## Description

Cette API gère l'authentification et la gestion des utilisateurs pour le projet LUMA. Elle est conçue pour être modulaire, évolutive et robuste, avec une gestion complète des journaux et des états.

## Structuration du versionning

Le schéma de versionnage suit le format : `LUMA.A-X.Y.Z-[Nom]`

- **LUMA** : Nom du projet
- **A** : Type (API)
- **X** : Version majeure (Modification de la structure, refonte globale des routes, etc.)
- **Y** : Version mineure (Ajout de routes, modification du contrôleur ou middleware)
- **Z** : Patch (Corrections de bogues, améliorations des fonctions existantes)
- **[Nom]** : Nom de code de la version

## Technologies

- **Node.js** avec Express
- **TypeScript** pour la sécurité du typage
- **MariaDB** comme base de données relationnelle
- **Sequelize** comme ORM
- **JWT** pour l'authentification
- **Winston** pour la journalisation
- **Joi** pour la validation des données

## Fonctionnalités

- Authentification complète (inscription, connexion, gestion de profil)
- Journalisation des activités et des erreurs
- Surveillance de l'état de l'API
- Validation des données entrantes
- Protection contre les attaques courantes (CORS, Helmet, Rate limiting)

## Installation

1. Cloner le dépôt
```bash
git clone https://github.com/Bissiking/luma-api.git
cd luma-api
```

2. Installer les dépendances
```bash
npm install
```

3. Configurer les variables d'environnement
Créez un fichier `.env` à la racine du projet avec les informations suivantes :
```
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=luma
DB_USER=root
DB_PASSWORD=
DB_DIALECT=mariadb
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
LOG_LEVEL=info
```

4. Lancer l'API en mode développement
```bash
npm run dev
```

5. Compiler pour la production
```bash
npm run build
```

6. Lancer en production
```bash
npm start
```

## Structure du projet

```
luma-api/
├── dist/                  # Code compilé
├── logs/                  # Fichiers de journalisation
├── src/
│   ├── config/            # Configuration
│   ├── controllers/       # Contrôleurs
│   ├── middleware/        # Middleware
│   ├── models/            # Modèles de données
│   ├── routes/            # Routes API
│   ├── utils/             # Utilitaires
│   └── index.ts           # Point d'entrée
├── .env                   # Variables d'environnement
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## API Endpoints

### Auth
- `POST /api/v1/auth/register` - Inscription
- `POST /api/v1/auth/login` - Connexion
- `GET /api/v1/auth/profile` - Obtenir le profil (authentifié)

## Logs et Monitoring

L'API génère plusieurs types de logs :
- `api.log` - Journaux généraux de l'API
- `error.log` - Erreurs rencontrées
- `db.log` - Opérations de base de données

L'API enregistre également son état en base de données pour permettre une surveillance externe.

## Licence

ISC 