const mongoose = require('mongoose');

const outreachLogSchema = new mongoose.Schema({
  type: String,
  outcome: String,
  timestamp: { type: Date, default: Date.now },
  details: Object
});

module.exports = mongoose.model('OutreachLog', outreachLogSchema);