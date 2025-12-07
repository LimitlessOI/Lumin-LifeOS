/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    LEGAL CHECKER FOR CONTROVERSIAL ITEMS                         ║
 * ║                    Flags potentially illegal or controversial actions            ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

export class LegalChecker {
  constructor(pool) {
    this.pool = pool;
    this.controversialPatterns = [
      /employee.*placement|hire.*ai|ai.*employee|misrepresent|claim.*human/i,
      /gambling|betting|lottery/i,
      /pharmaceutical|prescription|medical.*advice/i,
      /financial.*advice.*without.*license|investment.*advice/i,
      /copyright.*infringement|pirate|illegal.*download/i,
    ];
  }

  /**
   * Check if action requires approval
   */
  async checkRequiresApproval(action, description, data = {}) {
    const issues = [];
    let requiresApproval = false;

    // Check patterns
    for (const pattern of this.controversialPatterns) {
      if (pattern.test(description) || pattern.test(action)) {
        requiresApproval = true;
        issues.push('Matches controversial pattern');
        break;
      }
    }

    // Check specific action types
    if (action === 'ai_employee_placement' || action === 'hire_ai_as_employee') {
      requiresApproval = true;
      issues.push('AI employee placement may have legal implications');
      issues.push('Requires disclosure that it is AI-powered');
      issues.push('May need to be structured as freelance/contract service');
    }

    // Check for misrepresentation
    if (description.toLowerCase().includes('claim to be human') ||
        description.toLowerCase().includes('pretend to be human')) {
      requiresApproval = true;
      issues.push('Misrepresentation - claiming AI is human is illegal');
    }

    if (requiresApproval) {
      // Create approval request
      await this.createApprovalRequest(action, description, issues, data);
    }

    return {
      requiresApproval,
      issues,
      recommendation: requiresApproval 
        ? 'Submit for approval before proceeding'
        : 'Proceed with caution',
    };
  }

  /**
   * Create approval request
   */
  async createApprovalRequest(type, description, issues, data) {
    try {
      const requestId = `approval_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      
      await this.pool.query(
        `INSERT INTO approval_requests 
         (request_id, type, description, potential_issues, request_data, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          requestId,
          type,
          description,
          JSON.stringify(issues),
          JSON.stringify(data),
          'pending',
        ]
      );

      console.log(`⚠️ [LEGAL] Approval request created: ${requestId}`);
      return requestId;
    } catch (error) {
      console.error('Error creating approval request:', error.message);
      return null;
    }
  }

  /**
   * Check if AI employee placement is legal
   */
  async checkAIEmployeePlacementLegality() {
    return {
      legal: false, // Default to false until reviewed
      issues: [
        'Misrepresentation if not disclosed as AI',
        'May violate labor laws if structured as employment',
        'Tax implications unclear',
        'Contract terms need review',
      ],
      recommendations: [
        'Structure as "AI Development Service" not "employee"',
        'Clearly disclose it is AI-powered',
        'Include human oversight in terms',
        'Use freelance/contract model, not employment',
        'Get legal review before implementation',
      ],
      saferAlternative: 'AI Development Assistant Service - clearly labeled as AI, freelance basis',
    };
  }
}
