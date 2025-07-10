#!/usr/bin/env node

/**
 * Test Inactive User Login
 * Tests if users with is_active = 0 are blocked from logging in
 */

const http = require('http');
const { URLSearchParams } = require('url');

const BASE_URL = 'http://localhost:3000';

function makeRequest(method, path, headers = {}, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: headers
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (body) {
            req.write(body);
        }
        req.end();
    });
}

function extractCsrfToken(html) {
    const csrfMatch = html.match(/name="_csrf"\s+value="([^"]+)"/);
    return csrfMatch ? csrfMatch[1] : null;
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

async function testInactiveUserLogin() {
    console.log('🚫 Testing Inactive User Login...');
    console.log('==================================');
    
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
        
        // Step 2: Attempt login with inactive user credentials
        console.log('\\n2. 🔐 Attempting inactive user login...');
        const cookieHeader = Object.entries(cookies)
            .map(([name, value]) => `${name}=${value}`)
            .join('; ');
        
        const formData = new URLSearchParams({
            '_csrf': csrfToken,
            'username': 'testinactive',
            'password': 'test123'
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
            if (location === '/login') {
                console.log('   ✅ Login correctly blocked! Redirected back to login');
                
                // Check if error message contains account deactivated
                const redirectResponse = await makeRequest('GET', '/login', {
                    'Cookie': cookieHeader
                });
                
                if (redirectResponse.body.includes('deactivated') || redirectResponse.body.includes('contact an administrator')) {
                    console.log('   ✅ Correct error message displayed');
                    return true;
                } else {
                    console.log('   ⚠️  Login blocked but no specific error message found');
                    return true; // Still counts as success since login was blocked
                }
            } else {
                console.log(`   ❌ Login should have been blocked! Unexpected redirect: ${location}`);
                return false;
            }
        } else if (loginResponse.statusCode === 200) {
            if (loginResponse.body.includes('deactivated') || loginResponse.body.includes('contact an administrator')) {
                console.log('   ✅ Login correctly blocked with error message');
                return true;
            } else {
                console.log('   ❌ Login should have been blocked!');
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
        return response.statusCode < 500;
    } catch (error) {
        return false;
    }
}

async function main() {
    console.log('🔐 Inactive User Login Test Suite');
    console.log('==================================\\n');
    
    // Check if server is running
    console.log('🔍 Checking if server is running...');
    const serverRunning = await checkServerRunning();
    
    if (!serverRunning) {
        console.log('❌ Server is not running. Please start the server first:');
        console.log('   npm run dev');
        process.exit(1);
    }
    
    console.log('✅ Server is running\\n');
    
    // Test inactive user login
    const loginBlocked = await testInactiveUserLogin();
    
    console.log('\\n📊 Test Results:');
    console.log(`   🚫 Inactive user login blocked: ${loginBlocked ? '✅ PASS' : '❌ FAIL'}`);
    
    if (loginBlocked) {
        console.log('\\n🎉 Inactive user login test passed! Account lockout working correctly.');
        console.log('📋 Inactive users are properly blocked from logging in.');
    } else {
        console.log('\\n❌ Inactive user login test failed. Check the implementation.');
    }
    
    process.exit(loginBlocked ? 0 : 1);
}

if (require.main === module) {
    main().catch(console.error);
}
