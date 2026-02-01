/* global require, module */
/**
 * Centralized Message Management
 * 
 * Provides utilities for loading and formatting error and notification messages.
 * Supports variable interpolation using {placeholder} syntax.
 * 
 * Usage:
 *   const { errors, notifications, getMessage } = require('./messages');
 *   
 *   // Simple usage
 *   throw new Error(errors.BATCH_NOT_FOUND);
 *   
 *   // With interpolation
 *   throw new Error(getMessage(errors.BATCH_INSUFFICIENT_QUANTITY, { available: 10, requested: 20 }));
 * 
 * @module messages
 */

const errors = require('./errors.json');
const notifications = require('./notifications.json');

/**
 * Interpolate variables in a message template
 * @param {string} template - Message template with {placeholder} syntax
 * @param {Object} variables - Key-value pairs for interpolation
 * @returns {string} Formatted message
 * 
 * @example
 * getMessage('Insufficient stock. Available: {available}, Requested: {requested}', { available: 10, requested: 20 })
 * // Returns: 'Insufficient stock. Available: 10, Requested: 20'
 */
function getMessage(template, variables = {}) {
    if (!template) return '';

    return template.replace(/\{(\w+)\}/g, (match, key) => {
        return Object.prototype.hasOwnProperty.call(variables, key) ? variables[key] : match;
    });
}

/**
 * Get an error message with optional variable interpolation
 * @param {string} key - Error message key from errors.json
 * @param {Object} variables - Optional variables for interpolation
 * @returns {string} Formatted error message
 */
function getError(key, variables = {}) {
    const template = errors[key];
    if (!template) {
        console.warn(`Unknown error key: ${key}`);
        return key;
    }
    return getMessage(template, variables);
}

/**
 * Get a notification message with optional variable interpolation
 * @param {string} key - Notification message key from notifications.json
 * @param {Object} variables - Optional variables for interpolation
 * @returns {string} Formatted notification message
 */
function getNotification(key, variables = {}) {
    const template = notifications[key];
    if (!template) {
        console.warn(`Unknown notification key: ${key}`);
        return key;
    }
    return getMessage(template, variables);
}

module.exports = {
    errors,
    notifications,
    getMessage,
    getError,
    getNotification
};
