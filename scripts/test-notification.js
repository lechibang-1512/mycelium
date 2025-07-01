// Test script for NotificationManager (Node.js usage)
const NotificationManager = require('../services/notifications');

const notifier = new NotificationManager();

console.log('='.repeat(60));
console.log('🔔 NOTIFICATION SYSTEM TEST');
console.log('='.repeat(60));

console.log('\n📝 Testing Basic Notification Types:');
console.log('-'.repeat(40));
notifier.showSuccess('This is a success message!');
notifier.showError('This is an error message!');
notifier.showWarning('This is a warning message!');
notifier.showInfo('This is an info message!');

console.log('\n🎯 Testing CRUD Operation Notifications:');
console.log('-'.repeat(40));
notifier.showSuccess('Phone created successfully!');
notifier.showSuccess('Phone updated successfully!');
notifier.showSuccess('Phone deleted successfully!');

console.log('\n📦 Testing Inventory Operation Notifications:');
console.log('-'.repeat(40));
notifier.showSuccess('Stock received successfully!');
notifier.showSuccess('Stock sold successfully!');

console.log('\n👥 Testing User Management Notifications:');
console.log('-'.repeat(40));
notifier.showSuccess('User created successfully!');
notifier.showSuccess('User updated successfully!');
notifier.showSuccess('User deleted successfully!');
notifier.showSuccess('Profile updated successfully!');

console.log('\n🔐 Testing Authentication Notifications:');
console.log('-'.repeat(40));
notifier.showSuccess('Welcome! You have been logged in successfully.');
notifier.showInfo('You have been logged out successfully.');

console.log('\n📊 Testing Filter Notifications:');
console.log('-'.repeat(40));
notifier.showInfo('Filters have been applied to the report results');
notifier.showInfo('Analytics filtered for custom time period');

console.log('\n⚠️  Testing Error Scenarios:');
console.log('-'.repeat(40));
notifier.showError('Login failed. Please check your credentials.');
notifier.showError('Access denied. Insufficient permissions.');
notifier.showError('Database error occurred. Please try again.');
notifier.showWarning('Quantity cannot exceed available stock');

console.log('\n🤔 Testing Confirmation Dialog:');
console.log('-'.repeat(40));
notifier.showConfirmDialog('Delete Confirmation', 'Are you sure you want to delete this item?',
    () => console.log('✅ User confirmed deletion'),
    () => console.log('❌ User cancelled deletion')
);

console.log('\n✨ All notification types tested successfully!');
console.log('='.repeat(60));
