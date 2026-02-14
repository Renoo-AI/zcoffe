#!/bin/bash
# ZCOFFEE Admin Connectivity Diagnostic Script
# Vérifie la liaison avec le backend de sécurité sans exposer de credentials.

API_URL="http://localhost:3000/api"

echo "--- Diagnostic de Connexion ZCOFFEE ---"

# 1. Vérification de la disponibilité du serveur
echo -n "[1/3] Test de portée réseau... "
STATUS=$(curl -o /dev/null -s -w "%{http_code}" $API_URL/verify-session)

if [ "$STATUS" == "401" ] || [ "$STATUS" == "200" ]; then
    echo "OK (Code $STATUS)"
else
    echo "ÉCHEC (Code $STATUS)"
    echo "Erreur: Le backend n'est pas joignable ou le tunnel est fermé."
    exit 1
fi

# 2. Vérification des Headers de sécurité
echo -n "[2/3] Test des en-têtes de sécurité... "
HEADERS=$(curl -s -I $API_URL/verify-session)
if echo "$HEADERS" | grep -q "X-Frame-Options: DENY" && echo "$HEADERS" | grep -q "Strict-Transport-Security"; then
    echo "CONFORME"
else
    echo "AVERTISSEMENT: Headers de sécurité manquants ou incomplets."
fi

# 3. Test de l'endpoint de Login
echo -n "[3/3] Test de l'endpoint d'authentification... "
LOGIN_STATUS=$(curl -o /dev/null -s -w "%{http_code}" -X POST $API_URL/login)
if [ "$LOGIN_STATUS" == "400" ] || [ "$LOGIN_STATUS" == "401" ]; then
    echo "OPÉRATIONNEL"
else
    echo "ANOMALIE (Code $LOGIN_STATUS)"
fi

echo "----------------------------------------"
echo "Diagnostic terminé."
