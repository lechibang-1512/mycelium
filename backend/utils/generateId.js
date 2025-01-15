/**
 * Shared ID generator using UUIDv7
 * UUIDv7 is time-ordered, making it ideal for database primary keys
 * (better index locality than UUIDv4)
 */
const { v7: uuidv7 } = require('uuid');

function generateId() {
    return uuidv7();
}

module.exports = { generateId };
