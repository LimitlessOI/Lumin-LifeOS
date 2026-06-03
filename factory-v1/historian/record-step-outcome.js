const REQUIRED_FIELDS = ['mission_id', 'blueprint_id', 'step_id', 'builder_status', 'verifier_status', 'timestamp'];

export async function recordStepOutcome(receipt) {
  for (const field of REQUIRED_FIELDS) {
    if (!(field in receipt)) {
      throw new Error(`MISSING_RECEIPT_FIELD:${field}`);
    }
  }

  return receipt;
}
