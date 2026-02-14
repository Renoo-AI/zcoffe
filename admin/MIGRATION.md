# Plan de Migration : Vers l'Authentification Autonome

Suite au durcissement des politiques de sécurité, ZCOFFEE a migré d'un système tiers (Google Login) vers une solution d'authentification locale ultra-sécurisée avec MFA propriétaire.

## 1. Révocation des accès Google
L'intégration OAuth2 avec Google a été désactivée. Les anciens comptes liés à une adresse `@gmail.com` ou autre ne peuvent plus se connecter via le bouton Google.

## 2. Création des Nouveaux Comptes Locaux
Chaque administrateur doit recevoir un nouvel identifiant local.
La création se fait via l'endpoint de setup sécurisé (réservé à l'initialisation) :
- **Endpoint** : `POST /api/admin/setup`
- **Payload** : `{"username": "votre_nom", "password": "un_mot_de_passe_fort"}`

## 3. Initialisation du MFA (TOTP)
Lors de la première connexion ou de la création du compte :
1. Un code QR (DataURL) est généré par le backend.
2. L'administrateur doit scanner ce code avec une application MFA (Google Authenticator, Authy, Bitwarden).
3. Le secret est stocké de manière chiffrée côté serveur.

## 4. Procédure de Connexion Nominale
1. **Accès Réseau** : Connectez-vous d'abord au tunnel sécurisé (VPN ou IAP).
2. **Phase 1** : Saisissez votre identifiant et mot de passe sur `login.html`.
3. **Phase 2** : Saisissez le code à 6 chiffres généré par votre application MFA.
4. **Session** : Un cookie `session` (HttpOnly, Secure, SameSite=Strict) est émis pour une durée de 8 heures.

## 5. Audit et Nettoyage
Toutes les anciennes dépendances Firebase Auth ont été supprimées du frontend pour garantir l'étanchéité du système.
