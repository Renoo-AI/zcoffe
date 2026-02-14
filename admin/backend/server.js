const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const { logAction } = require('./audit_logger');

const app = express();
const PORT = process.env.PORT || 3000;

// SÉCURITÉ : Pas de secret en dur dans le code.
// Doit être défini via ENV ou généré au démarrage si manquant.
let SECRET_KEY = process.env.JWT_SECRET;
if (!SECRET_KEY) {
    // console.log("WARNING: JWT_SECRET not set. Generating a temporary secret for this session.");
    SECRET_KEY = require('crypto').randomBytes(64).toString('hex');
}

app.use(express.json());
app.use(cookieParser());

// --- DATABASE SIMULATION ---
const USERS_FILE = path.join(__dirname, 'users.json');
const MENU_FILE = path.join(__dirname, 'menu.json');

function getUsers() {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}

function getMenu() {
    if (!fs.existsSync(MENU_FILE)) return [];
    return JSON.parse(fs.readFileSync(MENU_FILE, 'utf8'));
}

function saveMenu(menu) {
    fs.writeFileSync(MENU_FILE, JSON.stringify(menu, null, 2));
}

// --- MIDDLEWARES ---

// Protection contre l'accès aux fichiers du backend
app.use('/admin/backend', (req, res, next) => {
    logAction('system', 'unauthorized_access_attempt', { path: req.path });
    return res.status(403).json({ error: 'Accès interdit' });
});

const authenticateToken = (req, res, next) => {
    const token = req.cookies.admin_session;
    if (!token) return res.status(401).json({ error: 'Non authentifié' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            logAction('anonymous', 'invalid_token_attempt');
            return res.status(403).json({ error: 'Session invalide' });
        }
        req.user = user;
        next();
    });
};

// --- AUTH ROUTES ---

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const users = getUsers();
    const user = users.find(u => u.username === username);

    if (user && bcrypt.compareSync(password, user.password)) {
        // Phase 1 : Validé, on génère un token temporaire pour le MFA
        const mfaToken = jwt.sign({ username: user.username, step: 'mfa' }, SECRET_KEY, { expiresIn: '5m' });
        logAction(username, 'login_success_phase1');
        res.json({ mfaToken });
    } else {
        logAction(username || 'unknown', 'login_failure', { reason: 'invalid_credentials' });
        res.status(401).json({ error: 'Identifiants invalides' });
    }
});

app.post('/api/verify-mfa', (req, res) => {
    const { mfaToken, otp } = req.body;

    try {
        const decoded = jwt.verify(mfaToken, SECRET_KEY);
        if (decoded.step !== 'mfa') throw new Error('Invalid step');

        const users = getUsers();
        const user = users.find(u => u.username === decoded.username);

        const verified = speakeasy.totp.verify({
            secret: user.mfaSecret,
            encoding: 'base32',
            token: otp
        });

        if (verified) {
            const sessionToken = jwt.sign(
                { username: user.username, role: user.role },
                SECRET_KEY,
                { expiresIn: '2h' }
            );

            res.cookie('admin_session', sessionToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Strict',
                maxAge: 7200000 // 2h
            });

            logAction(user.username, 'login_success_mfa');
            res.json({ success: true, username: user.username, role: user.role });
        } else {
            logAction(user.username, 'mfa_failure', { reason: 'invalid_otp' });
            res.status(401).json({ error: 'Code MFA invalide' });
        }
    } catch (err) {
        logAction('anonymous', 'mfa_error', { error: err.message });
        res.status(400).json({ error: 'Requête MFA invalide' });
    }
});

app.post('/api/logout', (req, res) => {
    logAction(req.cookies.admin_session ? 'active_user' : 'anonymous', 'logout');
    res.clearCookie('admin_session');
    res.json({ success: true });
});

app.get('/api/me', authenticateToken, (req, res) => {
    res.json({ username: req.user.username, role: req.user.role });
});

// --- MENU CRUD ROUTES ---

app.get('/api/menu', authenticateToken, (req, res) => {
    res.json(getMenu());
});

app.post('/api/menu', authenticateToken, (req, res) => {
    const items = getMenu();
    const newItem = { ...req.body, id: Date.now().toString() };
    items.push(newItem);
    saveMenu(items);
    logAction(req.user.username, 'menu_item_add', { itemId: newItem.id });
    res.status(201).json(newItem);
});

app.put('/api/menu/:id', authenticateToken, (req, res) => {
    let items = getMenu();
    const index = items.findIndex(i => i.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Non trouvé' });

    items[index] = { ...items[index], ...req.body, id: req.params.id };
    saveMenu(items);
    logAction(req.user.username, 'menu_item_update', { itemId: req.params.id });
    res.json(items[index]);
});

app.delete('/api/menu/:id', authenticateToken, (req, res) => {
    let items = getMenu();
    items = items.filter(i => i.id !== req.params.id);
    saveMenu(items);
    logAction(req.user.username, 'menu_item_delete', { itemId: req.params.id });
    res.json({ success: true });
});

app.post('/api/menu/clear', authenticateToken, (req, res) => {
    saveMenu([]);
    logAction(req.user.username, 'menu_clear');
    res.json({ success: true });
});

app.post('/api/menu/restore', authenticateToken, (req, res) => {
    // Simulation : restaurer depuis un backup interne
    const backup = [
        { id: "1", category: "Cafés", categoryAr: "قهوة", nameFr: "Espresso", nameAr: "إسبرسو", price: "4.5" },
        { id: "2", category: "Cafés", categoryAr: "قهوة", nameFr: "Cappuccino", nameAr: "كابوتشينو", price: "6.5" }
    ];
    saveMenu(backup);
    logAction(req.user.username, 'menu_restore');
    res.json({ success: true });
});

// --- SERVE FRONTEND ---
// On sert uniquement les fichiers du dossier admin, en excluant explicitement le dossier backend
app.use(express.static(path.join(__dirname, '..'), {
    index: "login.html",
    // Empêche de lister les répertoires ou d'accéder à des fichiers sensibles si le middleware précédent a échoué
    dotfiles: 'deny'
}));

// Route par défaut pour l'admin
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../login.html'));
});

app.listen(PORT, () => {
    // console.log(\`Serveur Admin Sécurisé démarré sur le port \${PORT}\`);
});
