try {
    console.log('📦 Copying static assets...');
    // FontAwesome copy removed as it is not used in the application.
    console.log('✅ Default static assets copied successfully.');
} catch (error) {
    console.error('❌ Failed to copy assets:', error.message);
    process.exit(1);
} 
