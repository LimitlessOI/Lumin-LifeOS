/**
 * SYNOPSIS: Protected content start
 * @ssot docs/products/business-tools/PRODUCT_HOME.md
 */

// Protected content start
// Existing code and logic here
// Protected content end

import { setTimeout } from 'timers/promises';

export async function applyApprovalTimeout(approvalId, approvals, rejectApproval) {
    const approval = approvals.find(a => a.id === approvalId);
    if (!approval) {
        throw new Error('Approval not found');
    }

    const isControversial = checkIfControversial(approval);
    if (isControversial) {
        await setTimeout(48 * 60 * 60 * 1000); // 48 hours in milliseconds
        rejectApproval(approvalId);
    }
}

function checkIfControversial(approval) {
    // Logic to determine if an approval is controversial
    return approval.isControversial;
}
