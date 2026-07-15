/**
 * SYNOPSIS: Service module — SafeOutputService.
 */
let defaultSafetyLevel = 'family';

function ensureSafeOutput(content, safetyLevel = defaultSafetyLevel) {
  const safetySettings = {
    family: ['violence', 'profanity', 'sensitive'],
    church: ['profanity', 'sensitive'],
    classroom: ['sensitive']
  };

  const restrictedKeywords = safetySettings[safetyLevel] || [];
  let safeContent = content;

  restrictedKeywords.forEach(keyword => {
    const regex = new RegExp(keyword, 'gi');
    safeContent = safeContent.replace(regex, '[REDACTED]');
  });

  return safeContent;
}

function setDefaultSafety(level) {
  const allowedLevels = ['family', 'church', 'classroom'];
  if (allowedLevels.includes(level)) {
    defaultSafetyLevel = level;
  }
}

export { ensureSafeOutput, setDefaultSafety };
