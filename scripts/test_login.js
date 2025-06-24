const axios = require('axios');

async function testLogin() {
    try {
        console.log('=== Testing Login Process ===');
        
        // First, get the login page to get the CSRF token
        console.log('1. Getting login page...');
        const loginPageResponse = await axios.get('http://localhost:3000/login');
        
        // Extract CSRF token from the HTML response
        const csrfTokenMatch = loginPageResponse.data.match(/name="_csrf" value="([^"]+)"/);
        if (!csrfTokenMatch) {
            console.error('Could not find CSRF token in login page');
            return;
        }
        
        const csrfToken = csrfTokenMatch[1];
        console.log(`2. CSRF token found: ${csrfToken}`);
        
        // Extract cookies from the response
        const cookies = loginPageResponse.headers['set-cookie'];
        console.log(`3. Cookies received: ${cookies}`);
        
        // Prepare login data
        const loginData = {
            username: 'admin',
            password: '123456',
            _csrf: csrfToken
        };
        
        console.log('4. Attempting login with admin/123456...');
        
        // Make login request
        const loginResponse = await axios.post('http://localhost:3000/login', loginData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookies ? cookies.join('; ') : ''
            },
            maxRedirects: 0,
            validateStatus: function (status) {
                return status < 400; // Accept redirects
            }
        });
        
        console.log(`5. Login response status: ${loginResponse.status}`);
        console.log(`6. Login response headers:`, loginResponse.headers);
        
        if (loginResponse.status === 302) {
            console.log(`7. Redirected to: ${loginResponse.headers.location}`);
            if (loginResponse.headers.location === '/') {
                console.log('✅ Login successful! User redirected to home page.');
            } else if (loginResponse.headers.location === '/login') {
                console.log('❌ Login failed! User redirected back to login page.');
            }
        }
        
    } catch (error) {
        console.error('Error during login test:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

testLogin();
