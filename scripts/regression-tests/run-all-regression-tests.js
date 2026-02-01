require('dotenv').config();
const { runProductRegressionTests } = require('./product-regression');
const { runInventoryRegressionTests } = require('./inventory-regression');

/**
 * Master Regression Test Suite
 * Orchestrates all regression tests to ensure system integrity
 */
async function runAllRegressionTests() {
    console.log('🚀 STARTING COMPREHENSIVE REGRESSION TESTS');
    console.log('='.repeat(60));
    console.log(`Testing Time: ${new Date().toLocaleString()}`);
    console.log('='.repeat(60));
    
    const overallResults = {
        totalSuites: 0,
        passedSuites: 0,
        failedSuites: 0,
        totalTests: 0,
        totalPassed: 0,
        totalFailed: 0,
        suiteResults: []
    };
    
    const testSuites = [
        {
            name: 'Product Operations',
            runner: runProductRegressionTests,
            description: 'Core product functionality and data integrity'
        },
        {
            name: 'Inventory Operations',
            runner: runInventoryRegressionTests,
            description: 'Warehouse, inventory tracking, and transaction systems'
        }
    ];
    
    for (const suite of testSuites) {
        console.log(`\n🧪 RUNNING: ${suite.name} Tests`);
        console.log(`📝 ${suite.description}`);
        console.log('-'.repeat(50));
        
        overallResults.totalSuites++;
        
        try {
            const suiteResult = await suite.runner();
            
            overallResults.totalTests += suiteResult.total;
            overallResults.totalPassed += suiteResult.passed;
            overallResults.totalFailed += suiteResult.failed;
            
            if (suiteResult.failed === 0) {
                overallResults.passedSuites++;
                console.log(`✅ ${suite.name} Suite: ALL TESTS PASSED`);
            } else {
                overallResults.failedSuites++;
                console.log(`❌ ${suite.name} Suite: ${suiteResult.failed} TESTS FAILED`);
            }
            
            overallResults.suiteResults.push({
                name: suite.name,
                ...suiteResult
            });
            
        } catch (error) {
            overallResults.failedSuites++;
            overallResults.totalFailed++;
            console.error(`💥 ${suite.name} Suite: CRITICAL FAILURE - ${error.message}`);
            
            overallResults.suiteResults.push({
                name: suite.name,
                total: 1,
                passed: 0,
                failed: 1,
                failures: [{ test: 'Suite Execution', error: error.message }]
            });
        }
        
        console.log('-'.repeat(50));
    }
    
    // Print comprehensive final report
    printFinalReport(overallResults);
    
    // Close database pool
    const pool = require('../../backend/config/database');
    await pool.end();
    
    return overallResults;
}

function printFinalReport(results) {
    console.log('\n');
    console.log('🏁 FINAL REGRESSION TEST REPORT');
    console.log('='.repeat(70));
    
    // Overall summary
    console.log('📊 OVERALL SUMMARY');
    console.log(`Test Suites: ${results.passedSuites}/${results.totalSuites} passed`);
    console.log(`Individual Tests: ${results.totalPassed}/${results.totalTests} passed`);
    console.log(`Overall Success Rate: ${((results.totalPassed / results.totalTests) * 100).toFixed(1)}%`);
    
    console.log('\n📋 DETAILED RESULTS BY SUITE');
    console.log('-'.repeat(70));
    
    results.suiteResults.forEach((suite, index) => {
        const status = suite.failed === 0 ? '✅ PASS' : '❌ FAIL';
        const successRate = ((suite.passed / suite.total) * 100).toFixed(1);
        
        console.log(`${index + 1}. ${suite.name}: ${status}`);
        console.log(`   Tests: ${suite.passed}/${suite.total} passed (${successRate}%)`);
        
        if (suite.failures && suite.failures.length > 0) {
            console.log(`   Failures:`);
            suite.failures.slice(0, 3).forEach(failure => {
                console.log(`     • ${failure.test}: ${failure.error}`);
            });
            if (suite.failures.length > 3) {
                console.log(`     • ... and ${suite.failures.length - 3} more failures`);
            }
        }
        console.log('');
    });
    
    // Regression analysis
    console.log('🔍 REGRESSION ANALYSIS');
    console.log('-'.repeat(70));
    
    if (results.totalFailed === 0) {
        console.log('🎉 EXCELLENT! No regressions detected.');
        console.log('✅ All existing functionality is working correctly');
        console.log('✅ Invoice receiving integration has not broken existing systems');
        console.log('✅ System is ready for production use');
    } else {
        console.log('⚠️  ATTENTION REQUIRED - Issues detected:');
        
        const criticalIssues = results.suiteResults.filter(suite => 
            suite.failures && suite.failures.some(f => 
                f.error.includes('not found') || 
                f.error.includes('failed') || 
                f.error.includes('integrity')
            )
        );
        
        if (criticalIssues.length > 0) {
            console.log('🔥 CRITICAL ISSUES:');
            criticalIssues.forEach(suite => {
                console.log(`   • ${suite.name}: Critical system components affected`);
            });
        }
        
        const dataIssues = results.suiteResults.filter(suite => 
            suite.failures && suite.failures.some(f => 
                f.error.includes('duplicate') || 
                f.error.includes('unnamed') || 
                f.error.includes('invalid')
            )
        );
        
        if (dataIssues.length > 0) {
            console.log('📊 DATA QUALITY ISSUES:');
            dataIssues.forEach(suite => {
                console.log(`   • ${suite.name}: Data integrity problems detected`);
            });
        }
    }
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS');
    console.log('-'.repeat(70));
    
    if (results.totalFailed === 0) {
        console.log('1. ✅ Proceed with deployment - all tests passed');
        console.log('2. 📊 Consider adding more edge case tests for comprehensive coverage');
        console.log('3. 🔄 Run these regression tests regularly as part of CI/CD pipeline');
    } else {
        console.log('1. 🔧 Address failing tests before production deployment');
        console.log('2. 📋 Review data integrity issues and clean up as needed');
        console.log('3. 🧪 Re-run regression tests after fixes are implemented');
        console.log('4. 📝 Document any intentional breaking changes');
    }
    
    console.log('\n' + '='.repeat(70));
    
    const finalStatus = results.totalFailed === 0 ? 
        '🎉 REGRESSION TESTS COMPLETED SUCCESSFULLY' : 
        '⚠️  REGRESSION TESTS COMPLETED WITH ISSUES';
    
    console.log(finalStatus);
    console.log('='.repeat(70));
}

// Run all tests if this file is executed directly
if (require.main === module) {
    runAllRegressionTests()
        .then((results) => {
            const exitCode = results.totalFailed === 0 ? 0 : 1;
            console.log(`\nExiting with code: ${exitCode}`);
            process.exit(exitCode);
        })
        .catch((error) => {
            console.error('\n💥 REGRESSION TESTING FRAMEWORK FAILURE:', error);
            process.exit(2);
        });
}

module.exports = { 
    runAllRegressionTests,
    runProductRegressionTests,
    runInventoryRegressionTests
};