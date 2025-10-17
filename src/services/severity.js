class SeverityClassifier {
    static classify(score) {
        if (score >= 0.9) return 'high';
        if (score >= 0.8) return 'medium';
        return 'low';
    }

    static shouldAutoMerge(score) {
        const severity = this.classify(score);
        return severity === 'low' || severity === 'medium';
    }
}

module.exports = SeverityClassifier;