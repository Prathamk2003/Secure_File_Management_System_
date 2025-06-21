const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: String,
  file: String,
  user: String,
  ip: String,
  status: String,
  timestamp: { type: Date, default: Date.now },
  hash: String,         // Add this field
  prevHash: String      // Add this field
});

module.exports = mongoose.model('AuditLog', auditLogSchema);