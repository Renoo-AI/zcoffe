/**
 * ZCOFFEE Security Utilities - Autonomous Version
 * Gestion de l'authentification locale, MFA et protection des routes.
 */

const API_BASE = '/api'; // Configurable selon l'environnement

/**
 * Assainit les entrées utilisateur pour prévenir les failles XSS
 */
export function sanitize(text) {
    if (typeof text !== 'string') return text;
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Phase 1 de la connexion : Identifiants
 */
export async function login(username, password) {
    const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Identifiants invalides');
    return data;
}

/**
 * Phase 2 de la connexion : Vérification MFA
 */
export async function verifyMFA(mfaToken, otp) {
    const response = await fetch(`${API_BASE}/mfa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mfaToken, otp })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Code MFA invalide');
    return data.success;
}

/**
 * Vérifie si la session est active et valide
 */
export async function checkSession() {
    try {
        const response = await fetch(`${API_BASE}/verify-session`);
        if (!response.ok) return false;
        const data = await response.json();
        return data.authenticated;
    } catch (error) {
        console.error("Session check failed:", error);
        return false;
    }
}

/**
 * Déconnexion sécurisée
 */
export async function logout() {
    await fetch(`${API_BASE}/logout`, { method: 'POST' });
    window.location.href = "login.html";
}

/**
 * Enregistre une action critique dans l'audit trail via le backend
 * Note: Dans cette version autonome, l'audit est géré par le serveur
 */
export async function logAudit(action, details) {
     // console.log(`[AUDIT] Action: ${action} | Details:`, details);
    // Optionnel: Envoyer à un endpoint d'audit dédié si implémenté au backend
}

/**
 * Protection de route pour le dashboard
 */
export async function protectRoute() {
    const isAuthenticated = await checkSession();
    if (!isAuthenticated) {
        window.location.href = "login.html";
        return false;
    }
    return true;
}

/**
 * API Menu
 */
export async function getMenuItems() {
    const response = await fetch(`${API_BASE}/menu`);
    if (!response.ok) throw new Error('Failed to fetch menu');
    return await response.json();
}

export async function addMenuItem(item) {
    const response = await fetch(`${API_BASE}/menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
    });
    if (!response.ok) throw new Error('Failed to add item');
    return await response.json();
}

export async function updateMenuItem(id, item) {
    const response = await fetch(`${API_BASE}/menu/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
    });
    if (!response.ok) throw new Error('Failed to update item');
    return await response.json();
}

export async function deleteMenuItem(id) {
    const response = await fetch(`${API_BASE}/menu/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete item');
    return await response.json();
}

export async function clearMenu() {
    const response = await fetch(`${API_BASE}/menu/clear`, { method: 'POST' });
    if (!response.ok) throw new Error('Failed to clear menu');
    return await response.json();
}

export async function restoreMenu() {
    const response = await fetch(`${API_BASE}/menu/restore`, { method: 'POST' });
    if (!response.ok) throw new Error('Failed to restore menu');
    return await response.json();
}
