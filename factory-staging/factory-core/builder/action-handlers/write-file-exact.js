/**
 * SYNOPSIS: Exports writeFileExactContract — builderos-reboot/MISSIONS/FACTORY-REBOOT-0003/ARTIFACTS/factory-core/builder/action-handlers/write-file-exact.js.
 */
export function writeFileExactContract(step) {
  return {
    actionType: 'write_file_exact',
    targetFile: step.target_file,
    exactInputs: step.exact_inputs,
    exactOutputContract: step.exact_output_contract
  };
}
