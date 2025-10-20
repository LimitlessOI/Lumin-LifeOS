// src/services/escalation-rules.js

class EscalationRules {
    static shouldEscalate(pr) {
        const isMajorArchitectureChange = pr.isMajorArchitectureChange;
        const cost = pr.cost;
        const isBreakingChange = pr.isBreakingChange;

        // Escalate to Council for major architecture changes, costs over $100, or breaking changes
        if (isMajorArchitectureChange || cost > 100 || isBreakingChange) {
            return true;
        }
        return false;
    }

    static notifyAdam(reason) {
        const strategicReasons = ['pricing', 'timing', 'partnerships', 'mission conflicts', 'TAISE violations'];
        const spendingThreshold = 500;

        if (strategicReasons.includes(reason) || (typeof reason === 'number' && reason > spendingThreshold)) {
            return true;
        }
        return false;
    }
}

module.exports = EscalationRules;