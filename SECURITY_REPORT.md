# Rapport de Sécurité - ZCOFFEE Admin (Version Autonome)

## 1. Checklist de Sécurité (Post-Migration)

| Priorité | Catégorie | Description | Statut |
| :--- | :--- | :--- | :--- |
| **CRITIQUE** | Identité | **Suppression du Google Login** (OAuth2 tiers) au profit d'une base locale. | ✅ Implémenté |
| **CRITIQUE** | Chiffrement | Utilisation de **BCrypt (12 rounds)** pour le hachage des mots de passe locaux. | ✅ Implémenté |
| **HAUTE** | Authentification | **MFA (TOTP)** via secret autonome avec support de l'activation progressive. | ✅ Implémenté |
| **HAUTE** | Session | Gestion des sessions via **Cookies HttpOnly & Secure** (JWT). | ✅ Implémenté |
| **HAUTE** | Réseau | Accès restreint via **Tunnel Sécurisé (IAP/VPN)**. | ✅ Configuré |
| **MOYENNE** | Audit | Système d'**Audit Trail** (`audit.log`) pour toutes les actions critiques. | ✅ Implémenté |

## 2. Architecture de l'Authentification Autonome

### A. Flux d'Authentification Adaptatif
1.  **Vérification des Identifiants** : Validation du couple utilisateur/mot de passe haché.
2.  **Décision MFA** : Si le MFA est activé pour l'utilisateur, émission d'un jeton `mfa_pending` pour la phase 2. Sinon, émission immédiate du cookie de session.
3.  **Validation TOTP (Si requis)** : Saisie du code à 6 chiffres et validation serveur.

### B. Sécurisation des Sessions
Le cycle de vie des sessions est géré par le backend Node.js.
- **Cookie `session`** : `HttpOnly` (inaccessible au JS), `Secure` (HTTPS uniquement), `SameSite=Strict`.
- **Isolation du Backend** : Les fichiers sensibles du dossier `backend/` sont protégés contre tout accès direct via le serveur web.
- **Expiration** : 8 heures d'inactivité entraînent la révocation du jeton.

### C. Protection XSS & CSRF
- **Input Sanitization** : Échappement systématique des caractères spéciaux avant rendu.
- **CSP** : Content Security Policy configurée dans `firebase.json` pour interdire l'exécution de scripts tiers non autorisés.

## 3. Procédures de Connexion & Infrastructure

### Accès via Tunnel Sécurisé
L'interface d'administration n'est plus exposée directement.
- **Tunnel VPN/IAP** : Recommandé pour isoler le endpoint `/admin/`.
- **Whitelist IP** : Configuration recommandée sur le WAF pour n'autoriser que les passerelles du tunnel.

### Diagnostic de Connectivité
Un script de diagnostic est fourni pour tester la liaison avec le backend sans compromettre les credentials.
`bash admin/test_connection.sh`

## 4. Plan de Migration (Résumé)
Les anciens accès Google ont été révoqués. Les nouveaux comptes doivent être initialisés via le script de setup interne et enrôlés dans une application MFA compatible (Google Authenticator, Authy).
Voir `admin/MIGRATION.md` pour les détails.
