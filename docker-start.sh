#!/bin/bash

# Assurer que le script s'arrête à la première erreur
set -e

echo "🚀 Démarrage de l'API LUMA avec Docker Compose"

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé. Veuillez installer Docker et réessayer."
    exit 1
fi

# Vérifier si Docker Compose est installé
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé. Veuillez installer Docker Compose et réessayer."
    exit 1
fi

# Arrêter les conteneurs existants si demandé
if [ "$1" == "--clean" ] || [ "$1" == "-c" ]; then
    echo "🧹 Nettoyage des conteneurs existants..."
    docker-compose down
    echo "✅ Nettoyage terminé"
fi

# Construire et démarrer les conteneurs
echo "🏗️  Construction et démarrage des conteneurs..."
docker-compose up --build -d

# Attendre que les services soient prêts
echo "⏳ Attente du démarrage des services..."
sleep 5

# Afficher les logs pour vérifier que tout fonctionne
echo "📋 Logs de l'API LUMA:"
docker-compose logs -f api 