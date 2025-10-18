// webhookHandler.js
const coachingTips = require('./coachingTips');
const { saveCallSummary } = require('./database');
const { analyzeTranscript } = require('./sampleCalls');

module.exports = (wss) => async (req, res) => {
    const { transcript, callId } = req.body;
    const analysis = await analyzeTranscript(transcript);
    const tips = coachingTips.getTips(analysis);

    // Send tips via WebSocket
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(tips));
        }
    });

    // Save call summary after the call ends
    if (req.body.isCallEnded) {
        await saveCallSummary(callId, analysis);
    }

    res.status(200).send({ success: true });
};