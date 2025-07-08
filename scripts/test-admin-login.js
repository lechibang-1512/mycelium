#!/usr/bin/env node

/**
 * Test Login Functionality
 * Tests if the admin user can login successfully
 */

const http = require('http');
const { URLSearchParams } = require('url');

const BASE_URL = 'http://localhost:3000';

function makeRequest(method, path, headers = {}, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            method,
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            headers: {
                'User-Agent': 'Admin-Login-Test/1.0',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });

        req.on('error', reject);
        
        if (body) {
            req.write(body);
        }
        req.end();
    });
}

function extractCsrfToken(html) {
    const match = html.match(/name="_csrf"\s+value="([^"]+)"/);
    return match ? match[1] : null;
}

function extractCookies(response) {
    const cookies = {};
    const setCookieHeaders = response.headers['set-cookie'] || [];
    
    setCookieHeaders.forEach(cookie => {
        const [nameValue] = cookie.split(';');
        const [name, value] = nameValue.split('=');
        if (name && value) {
            cookies[name.trim()] = value.trim();
        }
    });
    
    return cookies;
}

async function testAdminLogin() {
    console.log('🧪 Testing Admin Login...');
    console.log('========================');
    
    try {
        // Step 1: Get login page and CSRF token
        console.log('1. 📄 Fetching login page...');
        const loginPageResponse = await makeRequest('GET', '/login');
        
        if (loginPageResponse.statusCode !== 200) {
            throw new Error(`Failed to get login page: ${loginPageResponse.statusCode}`);
        }
        
        const csrfToken = extractCsrfToken(loginPageResponse.body);
        const cookies = extractCookies(loginPageResponse);
        
        console.log(`   ✅ Login page loaded (${loginPageResponse.statusCode})`);
        console.log(`   🔑 CSRF token: ${csrfToken ? csrfToken.substring(0, 16) + '...' : 'NOT_FOUND'}`);
        
        if (!csrfToken) {
            throw new Error('CSRF token not found');
        }
        
        // Step 2: Attempt login with admin credentials
        console.log('\\n2. 🔐 Attempting admin login...');
        
        const cookieHeader = Object.entries(cookies)
            .map(([name, value]) => `${name}=${value}`)
            .join('; ');
        
        const formData = new URLSearchParams({
            '_csrf': csrfToken,
            'username': 'admin',
            'password': 'admin123'
        });
        
        const loginResponse = await makeRequest('POST', '/login', {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookieHeader,
            'Content-Length': Buffer.byteLength(formData.toString())
        }, formData.toString());
        
        console.log(`   📥 Response: ${loginResponse.statusCode}`);
        console.log(`   📍 Location: ${loginResponse.headers.location || 'none'}`);
        
        if (loginResponse.statusCode === 302) {
            const location = loginResponse.headers.location;
            if (location === '/' || location === '/dashboard') {
                console.log('   ✅ Login successful! Redirected to dashboard');
                return true;
            } else if (location === '/login') {
                console.log('   ❌ Login failed! Redirected back to login');
                return false;
            } else {
                console.log(`   ⚠️  Unexpected redirect: ${location}`);
                return false;
            }
        } else if (loginResponse.statusCode === 200) {
            // Check if we're on the dashboard/home page
            if (loginResponse.body.includes('Dashboard') || loginResponse.body.includes('Welcome')) {
                console.log('   ✅ Login successful! Got dashboard page');
                return true;
            } else {
                console.log('   ❌ Login failed! Still on login page');
                return false;
            }
        } else {
            console.log(`   ❌ Unexpected response: ${loginResponse.statusCode}`);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return false;
    }
}

async function checkServerRunning() {
    try {
        const response = await makeRequest('GET', '/');
        return response.statusCode < 500; // Server is responding
    } catch (error) {
        return false;
    }
}

async function main() {
    console.log('🔐 Admin Login Test Suite');
    console.log('=========================\\n');
    
    // Check if server is running
    console.log('🔍 Checking if server is running...');
    const serverRunning = await checkServerRunning();
    
    if (!serverRunning) {
        console.log('❌ Server is not running. Please start the server first:');
        console.log('   npm run dev');
        process.exit(1);
    }
    
    console.log('✅ Server is running\\n');
    
    // Test admin login
    const loginSuccess = await testAdminLogin();
    
    console.log('\\n📊 Test Results:');
    console.log(`   🔐 Admin login: ${loginSuccess ? '✅ PASS' : '❌ FAIL'}`);
    
    if (loginSuccess) {
        console.log('\\n🎉 Admin login test passed! You can now access the application.');
        console.log('🔗 Login at: http://localhost:3000/login');
        console.log('📋 Credentials: admin / admin123');
    } else {
        console.log('\\n❌ Admin login test failed. Check the admin user setup.');
    }
    
    process.exit(loginSuccess ? 0 : 1);
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { testAdminLogin };
