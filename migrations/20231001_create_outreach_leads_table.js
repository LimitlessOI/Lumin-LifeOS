const mongoose = require('mongoose');

const outreachLeadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const OutreachLead = mongoose.model('OutreachLead', outreachLeadSchema);

async function createTable() {
  await OutreachLead.init();
  console.log('Outreach leads table created.');
}

createTable();