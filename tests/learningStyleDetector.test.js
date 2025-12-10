const LearningStyleDetector = require('../services/learning-analytics/ml-models/learningStyleDetector');

test('learning style prediction', () => {
    const detector = new LearningStyleDetector();
    detector.train([{ input: [1, 0], output: [1] }]);
    const result = detector.predict([1, 0]);
    expect(result).toBeCloseTo(1, 0.1);
});