/**
 * SYNOPSIS: Exports applyFamilySafetyFilters — services/familySafetyService.js.
 */
export function applyFamilySafetyFilters(content, safetyMode = 'family') {
  if (!content || typeof content !== 'string') {
    return '';
  }

  let filteredContent = content;

  switch (safetyMode) {
    case 'church':
      // Stricter filtering for church mode
      filteredContent = filteredContent.replace(/sex|porn|nude|erotic|masturbate|orgasm|intercourse|penis|vagina|clitoris|anal|oral/gi, '[redacted]');
      filteredContent = filteredContent.replace(/fuck|shit|bitch|asshole|cunt|bastard|damn|hell|piss|tits|dick/gi, '[censored]');
      filteredContent = filteredContent.replace(/alcohol|beer|wine|liquor|whiskey|vodka|gin|rum/gi, '[beverage]');
      filteredContent = filteredContent.replace(/drugs|weed|cocaine|heroin|meth|opioid|psychedelic/gi, '[substance]');
      filteredContent = filteredContent.replace(/violence|kill|murder|slaughter|torture|rape|assault/gi, '[harmful act]');
      // Additional terms for church mode
      filteredContent = filteredContent.replace(/blasphemy|heresy|apostasy|sacrilege/gi, '[theological term]');
      filteredContent = filteredContent.replace(/cult|sect|pagan|witchcraft|occult/gi, '[religious term]');
      break;
    case 'classroom':
      // Moderate filtering for classroom mode
      filteredContent = filteredContent.replace(/fuck|shit|bitch|asshole|cunt|bastard|damn/gi, '[censored]');
      filteredContent = filteredContent.replace(/sex|porn|nude|erotic|masturbate/gi, '[sensitive topic]');
      filteredContent = filteredContent.replace(/alcohol|drugs/gi, '[restricted content]');
      filteredContent = filteredContent.replace(/kill|murder|rape/gi, '[harmful act]');
      // Additional terms for classroom mode
      filteredContent = filteredContent.replace(/suicide|self-harm/gi, '[sensitive topic]');
      filteredContent = filteredContent.replace(/gambling|betting/gi, '[restricted activity]');
      break;
    case 'family':
    default:
      // Default family mode filtering
      filteredContent = filteredContent.replace(/fuck|shit|bitch/gi, '[censored]');
      filteredContent = filteredContent.replace(/porn|nude/gi, '[sensitive]');
      filteredContent = filteredContent.replace(/drugs/gi, '[substance]');
      // Additional terms for family mode
      filteredContent = filteredContent.replace(/violence|gore/gi, '[graphic content]');
      filteredContent = filteredContent.replace(/profanity|cursing/gi, '[inappropriate language]');
      break;
  }

  return filteredContent;
}