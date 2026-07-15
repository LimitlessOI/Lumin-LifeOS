/**
 * SYNOPSIS: Exports formalizeConsentContract — services/consentContract.js.
 */
export function formalizeConsentContract(contractDetails) {
  if (!contractDetails || typeof contractDetails !== 'object') {
    throw new Error('Invalid contract details provided.');
  }

  const { participantName, participantSignature, date, terms } = contractDetails;

  if (!participantName || !participantSignature || !date || !terms) {
    throw new Error('Incomplete contract details.');
  }

  return {
    participantName,
    participantSignature,
    date: new Date(date),
    terms,
    isFormalized: true,
  };
}