# Rapport de Sécurité - ZCOFFEE Admin

## 1. Checklist de Sécurité (Priorisée)

| Priorité | Catégorie | Description | Statut |
| :--- | :--- | :--- | :--- |
| **CRITIQUE** | Autorisation | Remplacer la whitelist d'emails côté client par des **Custom Claims (RBAC)**. | ✅ Implémenté |
| **CRITIQUE** | Validation | Mettre en place une **sanitisation stricte des entrées** pour prévenir les failles XSS. | ✅ Implémenté |
| **HAUTE** | Réseau | Configurer les **Security Headers HTTP** (CSP, HSTS, X-Frame-Options). | ✅ Implémenté |
| **HAUTE** | Audit | Implémenter un **Audit Trail** pour tracer les actions administratives critiques. | ✅ Implémenté |
| **MOYENNE** | Authentification | Activer le **MFA (Multi-Factor Authentication)** pour tous les comptes admins. | 📝 Recommandé |
| **MOYENNE** | Infrastructure | Configurer un **WAF (Cloud Armor)** avec IP Whitelisting. | 📝 Recommandé |

## 2. Extraits de Code & Implémentations

### A. Middleware d'Autorisation (RBAC via Custom Claims)
Le contrôle d'accès ne repose plus sur une liste d'emails statique mais sur un attribut `admin` injecté dans le jeton JWT de l'utilisateur.

**Script pour définir un administrateur (Node.js Admin SDK) :**
```javascript
const admin = require('firebase-admin');

// À exécuter dans un environnement sécurisé (Cloud Function ou Script local avec Service Account)
async function setAdminClaim(email) {
  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, { admin: true });
  console.log(`Droits admin accordés à : ${email}`);
}
```

### B. Headers de Sécurité (firebase.json)
Configuration appliquée pour protéger contre le clickjacking, le sniffing de MIME types et les injections de scripts via une CSP stricte.
```json
"headers": [
  {
    "source": "**",
    "headers": [
      { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" },
      { "key": "X-Frame-Options", "value": "DENY" },
      { "key": "X-Content-Type-Options", "value": "nosniff" },
      { "key": "Content-Security-Policy", "value": "default-src 'self' https://*.gstatic.com ..." }
    ]
  }
]
```

### C. Assainissement des entrées (XSS Prevention)
Utilisation d'une fonction d'échappement pour neutraliser tout code malveillant dans les noms de produits ou catégories.
```javascript
export function sanitize(str) {
    if (typeof str !== 'string') return str;
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' };
    return str.replace(/[&<>"']/ig, (m) => map[m]);
}
```

## 3. Configuration Infrastructure (WAF / Cloud Armor)

Pour une protection optimale, nous recommandons l'architecture suivante :

1.  **Google Cloud Armor (WAF)** :
    *   **Règles de filtrage** : Activer les `WAF rules` pour SQLi et XSS.
    *   **IP Whitelisting** : Créer une règle de sécurité restreignant l'accès au chemin `/admin/*` aux adresses IP autorisées uniquement.
    *   **Rate Limiting** : Limiter le nombre de requêtes sur les endpoints d'authentification pour prévenir le brute-force.

2.  **Firebase Security Rules (Backend Security)** :
    *   Les règles Firestore ont été durcies pour vérifier la présence du claim `admin`.
    *   Le journal d'audit (`audit_logs`) est configuré en "Append-Only" pour les admins, interdisant toute suppression ou modification ultérieure des preuves.

3.  **Authentification MFA** :
    *   Il est impératif d'activer le **Multi-Factor Authentication** dans la console Firebase (Identity Platform) et d'obliger l'enrôlement pour les comptes ayant le privilège `admin`.
