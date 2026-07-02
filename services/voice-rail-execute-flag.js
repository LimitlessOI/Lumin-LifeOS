/**
 * SYNOPSIS: Voice Rail execute-flag leaf — VOICE_RAIL_EXECUTE_COMMANDS gate, dependency-free.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

/** True unless VOICE_RAIL_EXECUTE_COMMANDS is explicitly disabled (0/false/off). */
export function isVoiceRailCommandExecuteEnabled() {
  const v = String(process.env.VOICE_RAIL_EXECUTE_COMMANDS ?? '1').trim().toLowerCase();
  return v !== '0' && v !== 'false' && v !== 'off';
}
