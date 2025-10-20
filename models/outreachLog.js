const mongoose = require('mongoose');

const outreachLogSchema = new mongoose.Schema({
  lead_id: { type: String, required: true },
  type: { type: String, enum: ['call', 'sms'], required: true },
  timestamp: { type: Date, default: Date.now },
  outcome: { type: String },
  recording_url: { type: String }
});

module.exports = mongoose.model('OutreachLog', outreachLogSchema);