/**
 * SYNOPSIS: Exports scopeCredentialVerification — services/credentialVerificationScoping.js.
 * @ssot docs/products/lumin-university/PRODUCT_HOME.md
 */
export function scopeCredentialVerification(options) {
    const { useBlockchain, useHashing } = options;

    if (useBlockchain) {
        return 'Using blockchain technology for credential verification.';
    } else if (useHashing) {
        return 'Using cryptographic hashing for credential verification.';
    } else {
        return 'No valid technology option selected for credential verification.';
    }
}
