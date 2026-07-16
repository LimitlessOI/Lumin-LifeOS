/**
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 * SYNOPSIS: Service module — Lifeos Natural Build Router.
 */
const parseBuildRequest = (text) => {
  const instructionMatch = text.match(/build\s+(.*)/i);
  const targetMatch = text.match(/(?:for|to)\s+(\S+\.\w+)/i);
  return {
    instruction: instructionMatch ? instructionMatch[1] : null,
    target_file: targetMatch ? targetMatch[1] : null
  };
};

const buildBuildPayload = (parsed) => {
  return {
    task: parsed.instruction,
    target_file: parsed.target_file,
    spec_hint: parsed.instruction,
    product_id: "lifeos"
  };
};

const submitToBuilder = async (payload, { commandKey, baseUrl }) => {
  const response = await fetch(`${baseUrl}/api/v1/lifeos/builder/build`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-command-key': commandKey
    },
    body: JSON.stringify(payload)
  });
  return response.json();
};

const replyFromReceipt = (receipt) => {
  if (receipt.success) {
    return `Build successful: ${receipt.message}`;
  } else {
    return `Build failed: ${receipt.error}`;
  }
};

export { parseBuildRequest, buildBuildPayload, submitToBuilder, replyFromReceipt };