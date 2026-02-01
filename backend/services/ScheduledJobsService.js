

class ScheduledJobsService {
    constructor(pool) {
        this.pool = pool;
        this.jobs = [];
        this.isRunning = false;

        // Try to import node-cron, but don't fail if not installed
        try {
            this.cron = require('node-cron');
            this.cronAvailable = true;
        } catch {
            console.warn('⚠️  node-cron not installed. Scheduled jobs disabled.');
            console.warn('   Install with: npm install node-cron');
            this.cronAvailable = false;
        }
    }

    /**
     * Start all scheduled jobs
     */
    start() {
        if (!this.cronAvailable) {
            console.log('⚠️  Scheduled jobs not available (node-cron not installed)');
            return {
                started: false,
                jobs: [],
                reason: 'node-cron not installed'
            };
        }

        if (this.isRunning) {
            console.log('⚠️  Scheduled jobs already running');
            return {
                started: false,
                jobs: this.jobs.map(job => job.name),
                reason: 'already running'
            };
        }

        console.log('⏰ Starting scheduled jobs...');

        // Job 1: Check expiring batches - Daily at 8:00 AM
        const expiryJob = this.cron.schedule('0 8 * * *', async () => {
            console.log('🔍 Running scheduled job: Check Expiring Batches');
            try {
                const checkExpiringBatches = require('../../scripts/jobs/check-expiring-batches');
                await checkExpiringBatches();
            } catch (error) {
                console.error('❌ Expiry check job failed:', error);
            }
        }, {
            scheduled: false,
            timezone: process.env.TZ || 'UTC'
        });

        // Job 2: Check expiring warranties - Daily at 8:30 AM
        const warrantyJob = this.cron.schedule('30 8 * * *', async () => {
            console.log('🔍 Running scheduled job: Check Expiring Warranties');
            try {
                const checkExpiringWarranties = require('../../scripts/jobs/check-expiring-warranties');
                await checkExpiringWarranties();
            } catch (error) {
                console.error('❌ Warranty check job failed:', error);
            }
        }, {
            scheduled: false,
            timezone: process.env.TZ || 'UTC'
        });


        // Job 4: Generate reorder recommendations - Daily at 7:00 AM
        const recommendationsJob = this.cron.schedule('0 7 * * *', async () => {
            console.log('📦 Running scheduled job: Generate Reorder Recommendations');
            try {
                const generateReorderRecommendations = require('../../scripts/jobs/generate-reorder-recommendations');
                await generateReorderRecommendations();
            } catch (error) {
                console.error('❌ Recommendations job failed:', error);
            }
        }, {
            scheduled: false,
            timezone: process.env.TZ || 'UTC'
        });


        // Job 6: Generate efficiency reports - Weekly on Monday at 9:00 AM
        const efficiencyReportsJob = this.cron.schedule('0 9 * * 1', async () => {
            console.log('📊 Running scheduled job: Generate Efficiency Reports');
            try {
                const generateEfficiencyReports = require('../../scripts/jobs/generate-efficiency-reports');
                await generateEfficiencyReports();
            } catch (error) {
                console.error('❌ Efficiency reports job failed:', error);
            }
        }, {
            scheduled: false,
            timezone: process.env.TZ || 'UTC'
        });

        // Start all jobs
        expiryJob.start();
        warrantyJob.start();
        recommendationsJob.start();
        efficiencyReportsJob.start();

        this.jobs = [
            { name: 'Reorder Recommendations', schedule: 'Daily at 7:00 AM', job: recommendationsJob },
            { name: 'Expiry Check', schedule: 'Daily at 8:00 AM', job: expiryJob },
            { name: 'Warranty Check', schedule: 'Daily at 8:30 AM', job: warrantyJob },
            { name: 'Efficiency Reports', schedule: 'Weekly on Monday at 9:00 AM', job: efficiencyReportsJob }
        ];

        this.isRunning = true;

        console.log('✅ Scheduled jobs started:');
        this.jobs.forEach(job => {
            console.log(`   - ${job.name}: ${job.schedule}`);
        });

        return {
            started: true,
            jobs: this.jobs.map(job => job.name),
            reason: 'success'
        };
    }

    /**
     * Stop all scheduled jobs
     */
    stop() {
        if (!this.isRunning) {
            return;
        }

        console.log('🛑 Stopping scheduled jobs...');

        this.jobs.forEach(job => {
            job.job.stop();
        });

        this.jobs = [];
        this.isRunning = false;

        console.log('✅ Scheduled jobs stopped');
    }

    /**
     * Get status of scheduled jobs
     */
    getStatus() {
        return {
            running: this.isRunning,
            cronAvailable: this.cronAvailable,
            jobs: this.jobs.map(job => ({
                name: job.name,
                schedule: job.schedule
            }))
        };
    }


    async runJob(jobName) {
        console.log(`▶️  Running job immediately: ${jobName}`);

        try {
            switch (jobName) {
                case 'recommendations': {
                    const generateReorderRecommendations = require('../../scripts/jobs/generate-reorder-recommendations');
                    return await generateReorderRecommendations();
                }
                case 'expiry': {
                    const checkExpiringBatches = require('../../scripts/jobs/check-expiring-batches');
                    return await checkExpiringBatches();
                }
                case 'warranty': {
                    const checkExpiringWarranties = require('../../scripts/jobs/check-expiring-warranties');
                    return await checkExpiringWarranties();
                }
                case 'efficiency': {
                    const generateEfficiencyReports = require('../../scripts/jobs/generate-efficiency-reports');
                    return await generateEfficiencyReports();
                }
                default:
                    throw new Error(`Unknown job: ${jobName}`);
            }
        } catch (error) {
            console.error(`❌ Failed to run job ${jobName}:`, error);
            throw error;
        }
    }
}

module.exports = ScheduledJobsService;
