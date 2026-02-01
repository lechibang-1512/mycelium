/**
 * CasbinRule Model (replaces security_db.casbin_rules)
 * Casbin policy rules for RBAC
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const CasbinRuleSchema = new Schema({
    ptype: { type: String, index: true },  // p, g, g2, etc.
    v0: { type: String, index: true },
    v1: String,
    v2: String,
    v3: String,
    v4: String,
    v5: String
}, {
    collection: 'casbin_rules'
});

// Compound index for policy lookups
CasbinRuleSchema.index({ ptype: 1, v0: 1, v1: 1, v2: 1 });

module.exports = mongoose.model('CasbinRule', CasbinRuleSchema);
