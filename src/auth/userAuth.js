const bcrypt = require('bcryptjs');

// Demo users with hashed passwords (in a real app, these would be in a database)
const demoUsers = [
    {
        id: 1,
        username: 'admin',
        password: '1212', // admin123
        role: 'admin',
        permissions: ['read', 'write', 'delete', 'manage_users', 'view_reports']
    },
    {
        id: 2,
        username: 'manager',
        password: '1212', // manager123
        role: 'manager',
        permissions: ['read', 'write', 'delete', 'view_reports']
    },
    {
        id: 3,
        username: 'staff',
        password: '1212', // staff123
        role: 'staff',
        permissions: ['read']
    }
];

// Hash demo passwords (for reference)
async function generateDemoPasswords() {
    const passwords = ['admin123', 'manager123', 'staff123'];
    for (const password of passwords) {
        const hashed = await bcrypt.hash(password, 10);
        console.log(`${password}: ${hashed}`);
    }
}

/**
 * Authenticate user with username and password
 */
async function authenticateUser(username, password) {
    try {
        const user = demoUsers.find(u => u.username === username);
        
        if (!user) {
            return { success: false, message: 'User not found' };
        }

        // For demo purposes, we'll use simple password comparison
        // In production, you'd use bcrypt.compare()
        const validPasswords = {
            'admin': 'admin123',
            'manager': 'manager123',
            'staff': 'staff123'
        };

        if (validPasswords[username] === password) {
            // Remove password from user object
            const { password: _, ...userWithoutPassword } = user;
            return { 
                success: true, 
                user: userWithoutPassword 
            };
        } else {
            return { success: false, message: 'Invalid password' };
        }
    } catch (error) {
        console.error('Authentication error:', error);
        return { success: false, message: 'Authentication failed' };
    }
}

/**
 * Get user by ID (for session management)
 */
function getUserById(userId) {
    const user = demoUsers.find(u => u.id === userId);
    if (user) {
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    return null;
}

/**
 * Check if user has specific permission
 */
function hasPermission(user, permission) {
    return user && user.permissions && user.permissions.includes(permission);
}

/**
 * Middleware to check if user is authenticated
 */
function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        req.user = req.session.user;
        next();
    } else {
        res.redirect('/login');
    }
}

/**
 * Middleware to check specific permissions
 */
function requirePermission(permission) {
    return (req, res, next) => {
        if (!req.session || !req.session.user) {
            return res.redirect('/login');
        }
        
        if (!hasPermission(req.session.user, permission)) {
            return res.status(403).render('error', { 
                message: 'Access denied. Insufficient permissions.' 
            });
        }
        
        next();
    };
}

/**
 * Middleware to check if user has admin role
 */
function requireAdmin(req, res, next) {
    if (!req.session || !req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).render('error', { 
            message: 'Access denied. Admin privileges required.' 
        });
    }
    next();
}

module.exports = {
    authenticateUser,
    getUserById,
    hasPermission,
    requireAuth,
    requirePermission,
    requireAdmin,
    generateDemoPasswords
};
