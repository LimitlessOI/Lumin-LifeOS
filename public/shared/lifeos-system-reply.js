(function (global) {
  'use strict';

  function formatLifeOSSystemReply(data) {
    if (!data || typeof data !== 'object') return 'No response from system.';
    const lines = [];
    const passFail = data.pass_fail || (data.ok === true ? 'PASS' : data.ok === false ? 'FAIL' : null);
    const action = data.action || 'response';
    const icon = passFail === 'PASS' ? '✅' : passFail === 'FAIL' ? '❌' : passFail === 'NO_COMMAND_RAN' ? 'ℹ️' : '◎';

    if (passFail) lines.push(`${icon} ${passFail} · ${action}`);
    if (data.command_truth) lines.push(`Command: ${data.command_truth}`);
    if (data.execution_path) lines.push(`Path: ${data.execution_path}`);
    if (data.sha) lines.push(`Commit: ${String(data.sha).slice(0, 12)}`);

    const blocker = data.first_blocker || data.error || data.reason;
    if (blocker) lines.push(`Blocker: ${blocker}`);

    const receipt = data.execution_receipt;
    if (receipt) {
      if (receipt.lesson) lines.push(`Lesson: ${receipt.lesson}`);
      if (receipt.fix) lines.push(`Fix: ${receipt.fix}`);
    }

    const gap = data.gap_recommendation || receipt?.gap_recommendation;
    if (gap?.next_platform_fix) lines.push(`Next: ${gap.next_platform_fix}`);

    const summary = String(data.human_summary || '').trim();
    if (summary) {
      if (lines.length) lines.push('');
      lines.push(summary);
    }

    if (!lines.length) return summary || data.response || 'No response from system.';
    return lines.join('\n');
  }

  global.LifeOSSystemReply = { format: formatLifeOSSystemReply };
})(typeof window !== 'undefined' ? window : globalThis);
