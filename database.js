// database.js
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/salesCoach', { useNewUrlParser: true, useUnifiedTopology: true });

const callSummarySchema = new mongoose.Schema({
    callId: String,
    analysis: Object,
    createdAt: { type: Date, default: Date.now }
});

const CallSummary = mongoose.model('CallSummary', callSummarySchema);

const saveCallSummary = async (callId, analysis) => {
    const summary = new CallSummary({ callId, analysis });
    await summary.save();
};

module.exports = { saveCallSummary };