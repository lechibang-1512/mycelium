/**
 * Test URL Validation Security Fix
 * 
 * Tests the custom URL validation implementation that replaces the vulnerable
 * validator.isURL function (CVE: GHSA-9965-vmph-33xx)
 * 
 * Run: node scripts/test-url-validation.js
 */

const BaseValidationService = require('../services/BaseValidationService');

const service = new BaseValidationService();

// Test cases
const testCases = [
    // Valid URLs
    { url: 'https://www.example.com', expected: true, description: 'Valid HTTPS URL' },
    { url: 'http://www.example.com', expected: true, description: 'Valid HTTP URL' },
    { url: 'https://subdomain.example.com', expected: true, description: 'Valid URL with subdomain' },
    { url: 'https://example.com/path/to/page', expected: true, description: 'Valid URL with path' },
    { url: 'https://example.com:8080', expected: true, description: 'Valid URL with port' },
    { url: 'https://example.com?query=param', expected: true, description: 'Valid URL with query' },
    { url: 'http://localhost', expected: true, description: 'Valid localhost URL' },
    
    // Invalid URLs - Security risks
    { url: 'javascript:alert(1)', expected: false, description: 'JavaScript protocol (XSS risk)' },
    { url: 'data:text/html,<script>alert(1)</script>', expected: false, description: 'Data protocol (XSS risk)' },
    { url: 'file:///etc/passwd', expected: false, description: 'File protocol (security risk)' },
    { url: 'ftp://example.com', expected: false, description: 'FTP protocol (not allowed)' },
    { url: 'http://user:pass@example.com', expected: false, description: 'URL with credentials (security risk)' },
    
    // Invalid URLs - Malformed
    { url: 'not-a-url', expected: false, description: 'Not a valid URL format' },
    { url: 'http://', expected: false, description: 'URL without hostname' },
    { url: 'http://exam ple.com', expected: false, description: 'URL with space in hostname' },
    { url: 'http://example<script>.com', expected: false, description: 'URL with XSS attempt in hostname' },
    { url: 'http://example".com', expected: false, description: 'URL with quote in hostname' },
    { url: '', expected: false, description: 'Empty string' },
    { url: null, expected: false, description: 'Null value' },
    { url: undefined, expected: false, description: 'Undefined value' },
    
    // Edge cases
    { url: 'example.com', expected: false, description: 'URL without protocol (requireProtocol=true)' },
    { url: 'https://example', expected: false, description: 'URL without TLD' },
];

console.log('\n🔒 Testing URL Validation Security Fix');
console.log('=====================================\n');
console.log('Testing custom URL validation to mitigate GHSA-9965-vmph-33xx\n');

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
    const result = service.isSecureURL(test.url, true);
    const status = result === test.expected ? '✅ PASS' : '❌ FAIL';
    
    if (result === test.expected) {
        passed++;
    } else {
        failed++;
    }
    
    console.log(`Test ${index + 1}: ${status}`);
    console.log(`  Description: ${test.description}`);
    console.log(`  URL: ${test.url === null ? 'null' : test.url === undefined ? 'undefined' : `"${test.url}"`}`);
    console.log(`  Expected: ${test.expected}, Got: ${result}`);
    console.log('');
});

console.log('=====================================');
console.log(`Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests\n`);

if (failed === 0) {
    console.log('✅ All tests passed! URL validation is secure.\n');
    process.exit(0);
} else {
    console.log('❌ Some tests failed. Please review the implementation.\n');
    process.exit(1);
}
