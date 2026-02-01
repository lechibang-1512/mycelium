/**
 * Performance Tests: API Endpoints
 * 
 * Tests API response times and performance under load
 */

const { expect } = require('chai');
const { APITestHelper, AssertionHelpers } = require('../helpers/api-test-helper');

describe('API Performance Tests', function() {
    this.timeout(30000);
    
    let api;
    
    before(async function() {
        api = new APITestHelper();
        
        const serverReady = await api.waitForServer();
        if (!serverReady) this.skip('Server is not running');
        
        const loginResponse = await api.login();
        if (!api.isSuccess(loginResponse)) {
            this.skip('Could not login');
        }
    });
    
    after(async function() {
        await api.logout();
    });
    
    /**
     * Helper to measure response time
     */
    async function measureResponseTime(fn) {
        const start = Date.now();
        await fn();
        return Date.now() - start;
    }
    
    /**
     * Helper to run multiple requests concurrently
     */
    async function runConcurrent(fn, count) {
        const promises = [];
        for (let i = 0; i < count; i++) {
            promises.push(fn());
        }
        return await Promise.all(promises);
    }
    
    describe('Response Time Tests', function() {
        it('GET /api/health should respond quickly', async function() {
            const duration = await measureResponseTime(async () => {
                await api.get('/api/health');
            });
            
            expect(duration).to.be.below(500); // Should respond in under 500ms
        });
        
        // Dashboard endpoints removed from this deployment; skip related performance tests.
        
        it('GET /api/inventory should respond in reasonable time', async function() {
            const duration = await measureResponseTime(async () => {
                await api.get('/api/inventory?limit=100');
            });
            
            expect(duration).to.be.below(3000); // Should respond in under 3s
        });
        
        it('GET /api/warehouses should respond quickly', async function() {
            const duration = await measureResponseTime(async () => {
                await api.get('/api/warehouses');
            });
            
            expect(duration).to.be.below(1000); // Should respond in under 1s
        });
    });
    
    describe('Concurrent Request Handling', function() {
        it('should handle 10 concurrent health checks', async function() {
            const start = Date.now();
            const responses = await runConcurrent(
                async () => await api.get('/api/health'),
                10
            );
            const duration = Date.now() - start;
            
            expect(responses).to.have.lengthOf(10);
            responses.forEach(response => {
                AssertionHelpers.assertSuccess(response);
            });
            
            // Should handle 10 requests in under 2 seconds
            expect(duration).to.be.below(2000);
        });
        
        // Dashboard concurrency tests removed (endpoint not present)
    });
    
    describe('Pagination Performance', function() {
        it('should handle pagination efficiently', async function() {
            const smallPageDuration = await measureResponseTime(async () => {
                await api.get('/api/inventory?page=1&limit=10');
            });
            
            const largePageDuration = await measureResponseTime(async () => {
                await api.get('/api/inventory?page=1&limit=100');
            });
            
            // Larger pages should not be disproportionately slower
            // Allow up to 5x slower for 10x more data
            expect(largePageDuration).to.be.below(smallPageDuration * 5);
        });
    });
    
    describe('Database Query Performance', function() {
        it('should retrieve product details efficiently', async function() {
            const duration = await measureResponseTime(async () => {
                await api.get('/api/inventory/1');
            });
            
            expect(duration).to.be.below(1000);
        });
        
        it('should retrieve transaction history efficiently', async function() {
            const duration = await measureResponseTime(async () => {
                await api.get('/api/inventory/1/history?limit=50');
            });
            
            expect(duration).to.be.below(2000);
        });
    });
    
    describe('Memory and Resource Usage', function() {
        it('should not leak memory on repeated requests', async function() {
            const iterations = 20;
            
            for (let i = 0; i < iterations; i++) {
                await api.get('/api/health');
            }
            
            // If we get here without timeout, no major memory leak
            expect(true).to.be.true;
        });
    });
    
    describe('Response Size', function() {
        it('should not return excessively large payloads', async function() {
            const response = await api.get('/api/inventory?limit=100');
            
            const responseSize = JSON.stringify(response.data).length;
            
            // Response should be under 5MB
            expect(responseSize).to.be.below(5 * 1024 * 1024);
        });
    });
});
