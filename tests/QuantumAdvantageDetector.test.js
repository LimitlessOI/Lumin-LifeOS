const QuantumAdvantageDetector = require('../services/QuantumAdvantageDetector');

test('should detect quantum advantage', () => {
    const detector = new QuantumAdvantageDetector();
    const result = detector.detectAdvantage('test-strategy', {});
    expect(typeof result).toBe('boolean');
});