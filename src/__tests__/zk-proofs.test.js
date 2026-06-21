/**
 * SYNOPSIS: js — src/__tests__/zk-proofs.test.js.
 */
```javascript
const { generateProof, verifyProof } = require('../zk-proofs');

test('generates and verifies a zero-knowledge proof', () => {
    const proof = generateProof();
    expect(verifyProof(proof)).toBe(true);
});
```