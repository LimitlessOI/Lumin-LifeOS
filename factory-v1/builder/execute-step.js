/**
 * SYNOPSIS: Exports executeStep — factory-v1/builder/execute-step.js.
 */
import { appendFile, readFile, writeFile } from 'node:fs/promises';

function blocked(step, summary, missingInformation, evidence) {
  return {
    status: 'BLOCKED_RETURN_TO_BPB',
    mission_id: step?.mission_id || null,
    blueprint_id: step?.blueprint_id || null,
    step_id: step?.step_id || null,
    gap_type: 'ambiguous_spec',
    summary,
    attempted_action: 'execute_step',
    missing_information: missingInformation,
    evidence
  };
}

export async function executeStep(step) {
  if (!step || !step.type || !step.target_file) {
    return blocked(step, 'Missing required step fields.', ['type', 'target_file'], ['Step payload missing required execution fields.']);
  }

  if (step.type === 'write_file_exact') {
    if (typeof step.content !== 'string') {
      return blocked(step, 'write_file_exact requires string content.', ['content'], ['step.content was not provided as a string.']);
    }
    await writeFile(step.target_file, step.content, 'utf8');
    return { status: 'DONE', target_file: step.target_file };
  }

  if (step.type === 'append_file_exact') {
    if (typeof step.content !== 'string') {
      return blocked(step, 'append_file_exact requires string content.', ['content'], ['step.content was not provided as a string.']);
    }
    await appendFile(step.target_file, step.content, 'utf8');
    return { status: 'DONE', target_file: step.target_file };
  }

  if (step.type === 'replace_file_exact') {
    if (typeof step.find !== 'string' || typeof step.replace !== 'string') {
      return blocked(step, 'replace_file_exact requires string find and replace fields.', ['find', 'replace'], ['step.find or step.replace was not provided as a string.']);
    }
    const original = await readFile(step.target_file, 'utf8');
    if (!original.includes(step.find)) {
      return blocked(step, 'replace_file_exact could not find target string.', ['find must exist in target_file'], ['Specified find string was not present in target file.']);
    }
    await writeFile(step.target_file, original.split(step.find).join(step.replace), 'utf8');
    return { status: 'DONE', target_file: step.target_file };
  }

  const error = new Error(`Unsupported builder action: ${step.type}`);
  error.code = 'MISSION_VIOLATION';
  throw error;
}
