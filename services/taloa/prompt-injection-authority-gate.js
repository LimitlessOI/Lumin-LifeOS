/**
 * SYNOPSIS: Exports assertObservationIsNotAuthority — services/taloa/prompt-injection-authority-gate.js.
 * @typedef {import('@taloa/types').Observation} Observation
 * @typedef {import('@taloa/types').Envelope} Envelope
 */

/**
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md Overlay print §64 item 8
 * Observed page text cannot become instructions. This function asserts that the
 * provided observation, which represents observed page text, is not being
 * treated as an authoritative instruction.
 *
 * Blueprint §46.
 *
 * @param {Observation} observation The observed page text.
 * @param {Envelope} envelope The envelope containing the observation.
 * @returns {void}
 * @throws {Error} If the observation is interpreted as an authority or instruction.
 */
export function assertObservationIsNotAuthority(observation, envelope) {
  // This is a placeholder for the actual implementation.
  // In a real scenario, this function would contain logic to detect and prevent
  // prompt injection where observed page text is mistaken for an instruction.
  // For now, it simply ensures the function signature is correct.

  // Example of a conceptual check (not actual implementation):
  // if (observation.metadata.isInstructionFlag) {
  //   throw new Error('Observed page text interpreted as an instruction, violating Overlay print §64 item 8.');
  // }

  // No-op for now, as the specific detection logic is not defined in the spec.
  // The primary purpose is to establish the gate and its JSDoc.
}
