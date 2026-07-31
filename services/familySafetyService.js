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
      filteredContent = filteredContent.replace(/sex|porn|nude|erotic/gi, '[redacted]');
      filteredContent = filteredContent.replace(/fuck|shit|bitch|asshole|cunt/gi, '[censored]');
      filteredContent = filteredContent.replace(/alcohol|beer|wine|liquor/gi, '[beverage]');
      filteredContent = filteredContent.replace(/drugs|weed|cocaine|heroin/gi, '[substance]');
      break;
    case 'classroom':
      // Moderate filtering for classroom mode
      filteredContent = filteredContent.replace(/fuck|shit|bitch|asshole/gi, '[censored]');
      filteredContent = filteredContent.replace(/sex|porn/gi, '[sensitive topic]');
      break;
    case 'family':
    default:
      // Default family mode filtering
      filteredContent = filteredContent.replace(/fuck|shit/gi, '[censored]');
      filteredContent = filteredContent.replace(/porn/gi, '[sensitive]');
      break;
  }

  return filteredContent;
}