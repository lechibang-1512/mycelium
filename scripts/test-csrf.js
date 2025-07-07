#!/usr/bin/env node

/**
 * CSRF Token Test Script
 * Tests CSRF token generation and validation for the login endpoint
 */

const http = require('http');
const https = require('https');
const { URLSearchParams } = require('url');

const BASE_URL = 'http://localhost:3000';

async function makeRequest(method, path, headers = {}, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            method,
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            headers: {
                'User-Agent': 'CSRF-Test-Client/1.0',
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

async function extractCsrfToken(html) {
    const match = html.match(/name="_csrf"\s+value="([^"]+)"/);
    return match ? match[1] : null;
}

async function extractCookies(response) {
    const setCookieHeaders = response.headers['set-cookie'];
    if (!setCookieHeaders) return {};
    
    const cookies = {};
    setCookieHeaders.forEach(cookie => {
        const [nameValue] = cookie.split(';');
        const [name, value] = nameValue.split('=');
        cookies[name.trim()] = value ? value.trim() : '';
    });
    return cookies;
}

async function testCsrfTokenFlow() {
    console.log('🧪 Testing CSRF Token Flow...\n');
    
    try {
        // Step 1: Get login page and extract CSRF token
        console.log('1. Fetching login page...');
        const loginPageResponse = await makeRequest('GET', '/login');
        
        if (loginPageResponse.statusCode !== 200) {
            throw new Error(`Failed to get login page: ${loginPageResponse.statusCode}`);
        }
        
        const csrfToken = await extractCsrfToken(loginPageResponse.body);
        const cookies = await extractCookies(loginPageResponse);
        
        console.log(`   ✅ Login page loaded (${loginPageResponse.statusCode})`);
        console.log(`   🔑 CSRF token: ${csrfToken ? csrfToken.substring(0, 16) + '...' : 'NOT_FOUND'}`);
        console.log(`   🍪 Cookies: ${Object.keys(cookies).join(', ')}`);
        
        if (!csrfToken) {
            throw new Error('CSRF token not found in login page');
        }
        
        // Step 2: Prepare cookie header for subsequent requests
        const cookieHeader = Object.entries(cookies)
            .map(([name, value]) => `${name}=${value}`)
            .join('; ');
        
        console.log(`   📤 Cookie header: ${cookieHeader}\n`);
        
        // Step 3: Test POST with valid CSRF token
        console.log('2. Testing login with valid CSRF token...');
        
        const formData = new URLSearchParams({
            '_csrf': csrfToken,
            'username': 'testuser',
            'password': 'testpass'
        });
        
        const loginResponse = await makeRequest('POST', '/login', {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookieHeader,
            'Content-Length': Buffer.byteLength(formData.toString())
        }, formData.toString());
        
        console.log(`   📤 POST data: ${formData.toString()}`);
        console.log(`   📥 Response: ${loginResponse.statusCode}`);
        console.log(`   📍 Location: ${loginResponse.headers.location || 'none'}`);
        
        if (loginResponse.statusCode === 403) {
            console.log('   ❌ CSRF validation failed - this is the issue!');
            console.log('   📄 Response body:', loginResponse.body.substring(0, 200) + '...');
            return false;
        } else if (loginResponse.statusCode === 302) {
            console.log('   ✅ CSRF validation passed (redirect response)');
        } else {
            console.log(`   ⚠️  Unexpected status code: ${loginResponse.statusCode}`);
        }
        
        // Step 4: Test POST without CSRF token
        console.log('\n3. Testing login without CSRF token...');
        
        const invalidFormData = new URLSearchParams({
            'username': 'testuser',
            'password': 'testpass'
        });
        
        const invalidResponse = await makeRequest('POST', '/login', {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookieHeader,
            'Content-Length': Buffer.byteLength(invalidFormData.toString())
        }, invalidFormData.toString());
        
        console.log(`   📤 POST data: ${invalidFormData.toString()}`);
        console.log(`   📥 Response: ${invalidResponse.statusCode}`);
        
        if (invalidResponse.statusCode === 403) {
            console.log('   ✅ CSRF protection working (rejected invalid token)');
        } else {
            console.log('   ❌ CSRF protection not working (should have rejected)');
            return false;
        }
        
        console.log('\n🎉 CSRF token flow test completed successfully!');
        return true;
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        return false;
    }
}

async function testCsrfTokenEndpoint() {
    console.log('\n🧪 Testing CSRF Token Endpoint...\n');
    
    try {
        const response = await makeRequest('GET', '/csrf-token');
        
        console.log(`   📥 Response: ${response.statusCode}`);
        
        if (response.statusCode === 200) {
            const data = JSON.parse(response.body);
            console.log(`   🔑 CSRF token: ${data.csrfToken ? data.csrfToken.substring(0, 16) + '...' : 'NOT_FOUND'}`);
            
            if (data.csrfToken) {
                console.log('   ✅ CSRF token endpoint working');
                return true;
            } else {
                console.log('   ❌ CSRF token not found in response');
                return false;
            }
        } else {
            console.log('   ❌ CSRF token endpoint failed');
            return false;
        }
    } catch (error) {
        console.error('\n❌ CSRF endpoint test failed:', error.message);
        return false;
    }
}

async function main() {
    console.log('🔒 CSRF Token Validation Test Suite');
    console.log('====================================\n');
    
    const endpointTest = await testCsrfTokenEndpoint();
    const flowTest = await testCsrfTokenFlow();
    
    console.log('\n📊 Test Results:');
    console.log(`   🔑 CSRF endpoint: ${endpointTest ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   🔄 CSRF flow: ${flowTest ? '✅ PASS' : '❌ FAIL'}`);
    
    if (endpointTest && flowTest) {
        console.log('\n🎉 All tests passed! CSRF protection is working correctly.');
        process.exit(0);
    } else {
        console.log('\n❌ Some tests failed. CSRF protection needs fixing.');
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { testCsrfTokenFlow, testCsrfTokenEndpoint };
