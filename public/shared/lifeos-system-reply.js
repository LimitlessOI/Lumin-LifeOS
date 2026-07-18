/**
 * SYNOPSIS: Format founder-interface replies for the LifeOS drawer (PASS/COMMITTED receipts).
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
(function (global) {
  // founder-comms-test-2026-06-20
  'use strict';
  function formatLifeOSSystemReply(data) {
    if (!data || typeof data !== 'object') return 'No response from system.';
    // Committed builds must keep PASS / Command / Transport / Commit lines visible in the drawer.
    // Prefer structured receipt when the turn actually shipped code.
    if (
      data.pass_fail === 'PASS'
      && (data.command_truth === 'COMMITTED' || data.command_truth === 'COMMAND_RAN')
      && (data.sha || data.commit_sha || data.transport_status || data.build_receipt?.commit_sha)
    ) {
      return formatStructured(data);
    }
    // Counsel / Chair turns: show only the human words. Receipt theater
    // (NO_COMMAND_RAN · Command · Channel) is for build/execute, not conversation.
    const counselOnly = (data.lumin_chair || data.direct_connection)
      && (data.command_truth === 'NO_COMMAND_RAN' || data.pass_fail === 'NO_COMMAND_RAN' || data.chair_direct_agent)
      && !(data.pass_fail === 'PASS' && (data.sha || data.commit_sha));
    if (counselOnly && String(data.human_summary || '').trim()) {
      return String(data.human_summary).trim();
    }
    if ((data.lumin_chair || data.direct_connection) && String(data.human_summary || '').trim()) {
      return String(data.human_summary).trim();
    }
    if (data.autopsy && data.pass_fail === 'FAIL') {
      return formatStructured(data);
    }
    if (data.receipt_truth && data.pass_fail && !counselOnly) {
      return formatStructured(data);
    }
    const summary = String(data.human_summary || '').trim();
    if (summary.startsWith('✅') || summary.startsWith('❌') || summary.startsWith('ℹ️')) {
      return summary;
    }
    return formatStructured(data);
  }
  function formatStructured(data) {
    const lines = [];
    const passFail = data.pass_fail || (data.ok === true ? 'PASS' : data.ok === false ? 'FAIL' : null);
    const action = data.action || 'response';
    const icon = passFail === 'PASS' ? '✅' : passFail === 'FAIL' ? '❌' : passFail === 'NO_COMMAND_RAN' ? 'ℹ️' : '◎';
    if (passFail) lines.push(`${icon} ${passFail} · ${action}`);
    if (data.command_truth) lines.push(`Command: ${data.command_truth}`);
    if (data.receipt_truth) lines.push(`Receipt: ${data.receipt_truth}`);
    if (data.transport_status) lines.push(`Transport: ${data.transport_status}`);
    if (data.failure_code && passFail === 'FAIL') lines.push(`Code: ${data.failure_code}`);
    if (data.execution_path) lines.push(`Path: ${data.execution_path}`);
    if (data.target_file) lines.push(`File: ${data.target_file}`);
    const sha = data.sha || data.commit_sha;
    if (sha) lines.push(`Commit: ${String(sha).slice(0, 12)}`);
    if (data.founder_verification?.ok === true) {
      lines.push(`Founder visual: VERIFIED (${data.founder_verification.code || 'live'})`);
      const colors = data.founder_verification.client_check?.expected_colors;
      if (colors) lines.push(`Expected bubbles: bg ${colors.background} · text ${colors.color}`);
      if (data.founder_verification.deploy_warning) lines.push(`Deploy note: ${data.founder_verification.deploy_warning}`);
    } else if (data.founder_verification?.code && passFail === 'FAIL') {
      lines.push(`Founder visual: ${data.founder_verification.code}`);
    }
    const blocker = data.first_blocker || data.error || data.reason;
    if (blocker) lines.push(`Blocker: ${blocker}`);
    if (data.persist_warning === 'HISTORY_NOT_SAVED') {
      lines.push('Warning: chat history was not saved — refresh may lose this turn.');
    }
    const autopsy = data.autopsy;
    if (autopsy && passFail === 'FAIL') {
      lines.push('');
      lines.push('── Autopsy: what happened ──');
      for (const step of autopsy.what_happened || []) lines.push(`• ${step}`);
      lines.push('');
      lines.push('── Lessons ──');
      for (const L of autopsy.lessons || []) lines.push(`• ${L}`);
      lines.push('');
      lines.push('── Fix path (execute in order) ──');
      (autopsy.fix_steps || []).forEach((s, i) => lines.push(`${i + 1}. ${s}`));
    } else {
      const receipt = data.execution_receipt;
      if (receipt) {
        if (receipt.lesson) lines.push(`Lesson: ${receipt.lesson}`);
        if (receipt.fix) lines.push(`Fix: ${receipt.fix}`);
      }
    }
    const gap = data.gap_recommendation || data.execution_receipt?.gap_recommendation;
    if (gap?.next_platform_fix) lines.push(`Next platform: ${gap.next_platform_fix}`);
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