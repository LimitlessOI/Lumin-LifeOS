```plaintext
// consent.circom
pragma circom 2.0.0;

template ConsentVerification() {
    signal input consentHash;
    signal input providedHash;
    
    signal output isValid;

    isValid <== (consentHash === providedHash);
}

component main = ConsentVerification();
```