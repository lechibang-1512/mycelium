// auth.js

const session = require('express-session');

const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin',
};

// Configure session middleware
const sessionMiddleware = session({
  secret: 'your_secret_key',  // Replace with a strong, secret key
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }, // Set to true in production with HTTPS
});

function isAuthenticated(req) {
    return !!req.session.isAdmin;
}

function loginAdmin(req, username, password) {
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        req.session.isAdmin = true;
        return true;
    }
    return false;
}

function logoutAdmin(req) {
    req.session.isAdmin = null;
     req.session.destroy((err) => {
       if (err) {
           console.error('Error destroying session:', err);
       }
    });
}

module.exports = {
    sessionMiddleware,
    isAuthenticated,
    loginAdmin,
    logoutAdmin
};