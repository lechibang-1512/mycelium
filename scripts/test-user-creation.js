#!/usr/bin/env node

/**
 * Test User Creation Flow
 * Tests the complete flow: login -> access user management -> create user
 */

const http = require('http');
const { URLSearchParams } = require('url');

function makeRequest(options, body = null) {
    return new Promise((resolve, reject) => {
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

async function testCompleteFlow() {
    console.log('🧪 Testing Complete User Management Flow');
    console.log('========================================');
    
    try {
        // Step 1: Get login page
        console.log('1. 📄 Getting login page...');
        const loginPageResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/login',
            method: 'GET'
        });
        
        if (loginPageResponse.statusCode !== 200) {
            throw new Error(`Failed to get login page: ${loginPageResponse.statusCode}`);
        }
        
        const csrfToken = extractCsrfToken(loginPageResponse.body);
        let cookies = extractCookies(loginPageResponse);
        
        console.log(`   ✅ Login page loaded (${loginPageResponse.statusCode})`);
        console.log(`   🔑 CSRF token: ${csrfToken ? csrfToken.substring(0, 16) + '...' : 'NOT_FOUND'}`);
        
        if (!csrfToken) {
            throw new Error('CSRF token not found');
        }
        
        // Step 2: Login
        console.log('\n2. 🔐 Logging in as admin...');
        
        let cookieHeader = Object.entries(cookies)
            .map(([name, value]) => `${name}=${value}`)
            .join('; ');
        
        const loginData = new URLSearchParams({
            '_csrf': csrfToken,
            'username': 'admin',
            'password': 'admin123'
        });
        
        const loginResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookieHeader,
                'Content-Length': Buffer.byteLength(loginData.toString())
            }
        }, loginData.toString());
        
        console.log(`   📥 Login response: ${loginResponse.statusCode}`);
        console.log(`   📍 Location: ${loginResponse.headers.location || 'none'}`);
        
        // Update cookies after login
        const loginCookies = extractCookies(loginResponse);
        cookies = {...cookies, ...loginCookies};
        cookieHeader = Object.entries(cookies)
            .map(([name, value]) => `${name}=${value}`)
            .join('; ');
        
        if (loginResponse.statusCode !== 302 || !loginResponse.headers.location?.includes('success=login')) {
            throw new Error('Login failed');
        }
        
        console.log('   ✅ Login successful!');
        
        // Step 3: Access user management
        console.log('\n3. 👥 Accessing user management...');
        
        const usersResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/users',
            method: 'GET',
            headers: {
                'Cookie': cookieHeader
            }
        });
        
        console.log(`   📥 Users page response: ${usersResponse.statusCode}`);
        
        if (usersResponse.statusCode === 302) {
            console.log(`   ❌ Redirected to: ${usersResponse.headers.location}`);
            throw new Error('Cannot access user management - redirected');
        } else if (usersResponse.statusCode !== 200) {
            throw new Error(`User management access failed: ${usersResponse.statusCode}`);
        }
        
        console.log('   ✅ User management accessible!');
        
        // Step 4: Get new user form
        console.log('\n4. 📝 Getting new user form...');
        
        const newUserFormResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/users/new',
            method: 'GET',
            headers: {
                'Cookie': cookieHeader
            }
        });
        
        console.log(`   📥 New user form response: ${newUserFormResponse.statusCode}`);
        
        if (newUserFormResponse.statusCode !== 200) {
            throw new Error(`New user form access failed: ${newUserFormResponse.statusCode}`);
        }
        
        const formCsrfToken = extractCsrfToken(newUserFormResponse.body);
        console.log(`   🔑 Form CSRF token: ${formCsrfToken ? formCsrfToken.substring(0, 16) + '...' : 'NOT_FOUND'}`);
        
        if (!formCsrfToken) {
            throw new Error('Form CSRF token not found');
        }
        
        console.log('   ✅ New user form accessible!');
        
        // Step 5: Create a test user
        console.log('\n5. ➕ Creating test user...');
        
        const crypto = require('crypto');
        const randomId = crypto.randomBytes(2).readUInt16BE(0);
        const createUserData = new URLSearchParams({
            '_csrf': formCsrfToken,
            'username': `testuser${randomId}`,
            'password': 'TestPassword123!',
            'fullName': `Test User ${randomId}`,
            'email': `testuser${randomId}@example.com`,
            'role': 'staff'
        });
        
        const createUserResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/users',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookieHeader,
                'Content-Length': Buffer.byteLength(createUserData.toString())
            }
        }, createUserData.toString());
        
        console.log(`   📥 Create user response: ${createUserResponse.statusCode}`);
        console.log(`   📍 Location: ${createUserResponse.headers.location || 'none'}`);
        
        // Check for error response body
        if (createUserResponse.body) {
            const hasError = createUserResponse.body.includes('error') || createUserResponse.body.includes('Error');
            if (hasError) {
                console.log('   ⚠️  Response may contain errors');
            }
        };
        
        if (createUserResponse.statusCode === 302) {
            const location = createUserResponse.headers.location;
            if (location && location.startsWith('/users/') && location !== '/users/new') {
                console.log('   ✅ User created successfully!');
                console.log(`   🎉 Redirected to user details: ${location}`);
                return true;
            } else if (location === '/users/new') {
                console.log('   ❌ User creation failed - redirected back to form');
                return false;
            } else {
                console.log(`   ⚠️  Unexpected redirect: ${location}`);
                return false;
            }
        } else {
            console.log(`   ❌ Unexpected response: ${createUserResponse.statusCode}`);
            return false;
        }
        
    } catch (err) {
        console.error('❌ Test failed:', err.message);
        return false;
    }
}

// Run the test
testCompleteFlow().then(success => {
    console.log('\n📊 Test Results:');
    console.log(`   Complete flow: ${success ? '✅ PASS' : '❌ FAIL'}`);
    process.exit(success ? 0 : 1);
}).catch(err => {
    console.error('❌ Test error:', err);
    process.exit(1);
});
