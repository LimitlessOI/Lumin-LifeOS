/**
 * SYNOPSIS: Exports parseBuildRequest — services/lifeos-natural-build-router.js.
 */
export function parseBuildRequest(text) {
  // Simple heuristic for demonstration:
  // Tries to find a build instruction and a potential target file.
  // In a real scenario, this would involve more sophisticated NLP.

  let buildInstruction = text.trim();
  let targetFile = null;

  // Look for common phrases that might indicate a target file
  const fileHints = [
    /in `([^`]+)`/,
    /for file `([^`]+)`/,
    /in the file `([^`]+)`/,
    /update `([^`]+)`/,
    /to `([^`]+)`/,
  ];

  for (const hint of fileHints) {
    const match = text.match(hint);
    if (match && match[1]) {
      targetFile = match[1];
      // Remove the file hint from the instruction for a cleaner instruction
      buildInstruction = buildInstruction.replace(match[0], '').trim();
      break;
    }
  }

  // Basic cleanup if the instruction still contains "build a" or similar
  if (buildInstruction.toLowerCase().startsWith('build a ')) {
    buildInstruction = buildInstruction.substring('build a '.length).trim();
  } else if (buildInstruction.toLowerCase().startsWith('build an ')) {
    buildInstruction = buildInstruction.substring('build an '.length).trim();
  } else if (buildInstruction.toLowerCase().startsWith('build ')) {
    buildInstruction = buildInstruction.substring('build '.length).trim();
  }


  return { instruction: buildInstruction, targetFile };
}

export function buildBuildPayload(parsed) {
  return {
    task: parsed.instruction,
    target_file: parsed.targetFile,
    spec_hint: "Founder instruction for LifeOS product development.",
    product_id: "lifeos",
  };
}

export async function submitToBuilder(payload, { commandKey, baseUrl }) {
  const url = `${baseUrl}/api/v1/lifeos/builder/build`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'x-command-key': commandKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Builder API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

export function replyFromReceipt(receipt) {
  if (receipt && receipt.status === 'success' && receipt.jobId) {
    return `Build job ${receipt.jobId} submitted successfully. I'll notify you when it's complete.`;
  } else if (receipt && receipt.status === 'failed' && receipt.error) {
    return `Build job failed: ${receipt.error}. Please check the builder logs for more details.`;
  } else if (receipt && receipt.status === 'pending' && receipt.jobId) {
    return `Build job ${receipt.jobId} is pending. I'll notify you when it's complete.`;
  }
  return `Received a build receipt, but the status is unclear. Job ID: ${receipt?.jobId || 'N/A'}`;
}