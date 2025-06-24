const puppeteer = require('puppeteer');

async function testWebLogin() {
    let browser;
    try {
        console.log('=== Testing Web Login Interface ===');
        
        // Launch browser
        browser = await puppeteer.launch({ 
            headless: false, // Set to false to see the browser
            defaultViewport: null,
            args: ['--no-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Go to login page
        console.log('1. Navigating to login page...');
        await page.goto('http://localhost:3000/login');
        
        // Wait for the form to load
        await page.waitForSelector('#loginForm');
        
        // Fill in the login form
        console.log('2. Filling in login form...');
        await page.type('#username', 'admin');
        await page.type('#password', '123456');
        
        // Submit the form
        console.log('3. Submitting form...');
        await page.click('#loginBtn');
        
        // Wait for navigation
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        
        // Check the current URL
        const currentUrl = page.url();
        console.log(`4. Current URL after login: ${currentUrl}`);
        
        if (currentUrl === 'http://localhost:3000/') {
            console.log('✅ Login successful! Redirected to home page.');
        } else if (currentUrl.includes('/login')) {
            console.log('❌ Login failed! Still on login page.');
            
            // Check for error messages
            const errorMessage = await page.$eval('.alert-danger', el => el.textContent).catch(() => 'No error message found');
            console.log(`Error message: ${errorMessage}`);
        }
        
        // Keep browser open for 5 seconds to see the result
        await page.waitForTimeout(5000);
        
    } catch (error) {
        console.error('Error during web login test:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

testWebLogin();
