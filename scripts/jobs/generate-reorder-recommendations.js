#!/usr/bin/env node

/**
 * Scheduled Job: Generate Reorder Recommendations
 * Runs daily to identify products that need reordering
 * UC-7: Recommendation & Reporting System
 */

require('dotenv').config();
const mariadb = require('mariadb');
const RecommendationService = require('../../backend/services/RecommendationService');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'master_db',
  connectionLimit: 5
};

const pool = mariadb.createPool(dbConfig);

async function generateDailyRecommendations() {
  console.log('='.repeat(70));
  console.log('Starting Daily Reorder Recommendations Generation');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('='.repeat(70));

  try {
    // Initialize the service with database pool
    RecommendationService.setPool(pool);

    // Generate recommendations for all products across all warehouses
    const recommendations = await RecommendationService.generateRecommendations({
      recalculate_usage: true // Recalculate average daily usage
    });

    console.log(`\n✓ Generated ${recommendations.length} new recommendations`);

    // Get statistics
    const stats = await RecommendationService.getRecommendationStats({ status: 'PENDING' });

    console.log('\nRecommendation Statistics:');
    console.log(`  Total Pending: ${stats.pending_count}`);
    console.log(`  Critical: ${stats.critical_count}`);
    console.log(`  High: ${stats.high_count}`);
    console.log(`  Medium: ${stats.medium_count}`);
    console.log(`  Total Recommended Quantity: ${stats.total_recommended_quantity}`);

    if (stats.critical_count > 0) {
      console.log('\n⚠️  WARNING: There are CRITICAL stockout alerts requiring immediate attention!');
    }

    console.log('\n' + '='.repeat(70));
    console.log('✓ Daily Recommendations Generation Completed Successfully');
    console.log('='.repeat(70));

    return {
      generated: recommendations.length,
      pending: stats.pending_count,
      critical: stats.critical_count,
      high: stats.high_count,
      medium: stats.medium_count
    };
  } catch (error) {
    console.error('\n' + '✗'.repeat(70));
    console.error('Error generating recommendations:', error);
    console.error('✗'.repeat(70));
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  generateDailyRecommendations()
    .then((summary) => {
      console.log('\n📋 Final Summary:');
      console.log(`  Generated: ${summary.generated}`);
      console.log(`  Total Pending: ${summary.pending}`);
      console.log(`  Critical: ${summary.critical}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    })
    .finally(() => {
      pool.end();
    });
}

module.exports = generateDailyRecommendations;

