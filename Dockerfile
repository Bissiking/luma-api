FROM node:18-alpine

# Créer le répertoire de l'application
WORKDIR /app

# Installation de typescript globalement
RUN npm install -g typescript ts-node

# Copie des fichiers de dépendances
COPY package*.json ./

# Installation des dépendances
RUN npm install

# Copie du reste des fichiers du projet
COPY . .

# Compilation du code TypeScript
RUN npm run build

# Exposition du port
EXPOSE 3000

# Démarrage de l'application
CMD ["npm", "start"] 