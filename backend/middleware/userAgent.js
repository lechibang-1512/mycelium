// User Agent Detection Middleware
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '../../server.log');

function logToFile(message) {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`);
}

function detectMobile(req, res, next) {
    const userAgent = req.headers['user-agent'] || '';

    // Mobile detection patterns
    const mobilePatterns = [
        /Android/i,
        /webOS/i,
        /iPhone/i,
        /iPad/i,
        /iPod/i,
        /BlackBerry/i,
        /Windows Phone/i,
        /Mobile/i
    ];

    req.isMobile = mobilePatterns.some(pattern => pattern.test(userAgent));
    req.userAgent = userAgent;

    // Log to file instead of console
    logToFile(`[UA] ${req.isMobile ? '📱 Mobile' : '💻 Desktop'} - ${userAgent.substring(0, 50)}...`);

    next();
}

module.exports = { detectMobile };
