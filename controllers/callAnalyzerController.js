const transcriptionService = require('../services/transcriptionService');
const analysisService = require('../services/analysisService');
const crmService = require('../utils/crmService');

exports.analyzeCall = async (req, res) => {
  try {
    const { audioFileUrl } = req.body;
    const transcription = await transcriptionService.transcribeAudio(audioFileUrl);
    const analysis = await analysisService.analyzeText(transcription);
    const actions = analysisService.extractNextActions(analysis);
    await crmService.updateCRM(actions);
    res.status(200).json({ success: true, actions });
  } catch (error) {
    console.error('Error analyzing call:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};