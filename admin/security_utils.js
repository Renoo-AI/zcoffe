/**
 * Security Utilities for ZCOFFEE Admin
 */

/**
 * Basic Input Sanitization to prevent XSS
 * @param {string} str
 * @returns {string}
 */
export function sanitize(str) {
    if (typeof str !== 'string') return str;
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        "/": '&#x2F;',
    };
    const reg = /[&<>"'/]/ig;
    return str.replace(reg, (match) => (map[match]));
}

/**
 * Check if user has the admin custom claim
 * @param {import("firebase/auth").User} user
 * @returns {Promise<boolean>}
 */
export async function checkAdminStatus(user) {
    if (!user) return false;
    // Force refresh the token to get the latest claims
    const idTokenResult = await user.getIdTokenResult(true);
    return !!idTokenResult.claims.admin;
}

/**
 * Check if MFA is enabled and required
 * @param {import("firebase/auth").User} user
 * @returns {boolean}
 */
export function isMFAEnabled(user) {
    return user.multiFactor && user.multiFactor.enrolledFactors.length > 0;
}

/**
 * Log an action to the audit trail
 */
export async function logAuditAction(db, addDoc, collection, serverTimestamp, user, action, details) {
    try {
        await addDoc(collection(db, "audit_logs"), {
            userId: user.uid,
            userEmail: user.email,
            action: action,
            details: details,
            timestamp: serverTimestamp(),
            userAgent: navigator.userAgent
        });
    } catch (error) {
        console.error("Audit logging failed:", error);
    }
}
