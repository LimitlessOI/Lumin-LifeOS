```plaintext
pragma circom 2.0.0;

template AnomalyDetection() {
  signal input anomalyData;
  signal output valid;

  // Example constraint: anomalyData should be greater than a threshold
  component isValid = LessThan();
  isValid.in[0] <== 100; // Threshold value
  isValid.in[1] <== anomalyData;

  valid <== isValid.out;
}

component main = AnomalyDetection();
```