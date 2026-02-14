const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, 'audit.log');

function logAction(user, action, details = {}) {
    const entry = {
        timestamp: new Date().toISOString(),
        user: user || 'anonymous',
        action,
        details,
        ip: 'internal' // In a real app, capture from request
    };

    const logLine = JSON.stringify(entry) + '\n';
    fs.appendFileSync(LOG_FILE, logLine);
    // console.log(`[AUDIT] ${action} by ${user}`);
}

module.exports = { logAction };
