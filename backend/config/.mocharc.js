const path = require('path');

module.exports = {
    // Test execution
    require: [path.join(process.cwd(), 'scripts/tests/setup.js')],
    spec: 'scripts/tests/**/*.test.js',
    timeout: 10000,
    slow: 2000,

    // Reporting
    reporter: 'spec',
    'reporter-option': [
        'maxDiffSize=0'
    ],

    // Test patterns
    ignore: [
        'node_modules/**',
        'build/**',
        'dist/**'
    ],

    // File watching
    watch: false,
    'watch-files': ['scripts/tests/**/*.js', 'services/**/*.js', 'routes/**/*.js'],
    'watch-ignore': ['node_modules/**', 'build/**'],

    // Parallel execution
    parallel: false, // Set to true for faster execution (may cause issues with shared DB)
    jobs: 1,

    // Retries
    retries: 0,

    // Colors
    color: true,

    // Exit behavior
    exit: true,

    // Diff
    diff: true,
    'inline-diffs': false,

    // Coverage (when using nyc)
    recursive: true
};
